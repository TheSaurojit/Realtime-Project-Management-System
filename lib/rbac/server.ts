import { prisma } from "@/lib/prisma";
import { WorkspaceRole } from "@/lib/types";
import {
  isValidWorkspaceRole,
  hasPermission,
  Permission,
  ProjectRole,
} from "@/lib/rbac/permissions";

export type ProjectAccessLevel = "MANAGE" | "WRITE" | "READ";

/**
 * Resolves a user's effective project-level access and role.
 * Considers Workspace Role (Owner/Admin global override), Project Lead,
 * Direct Project Membership (ProjectMember), and Squad/Team Membership (TeamMember).
 * Fails closed.
 */
export async function getEffectiveProjectAccess(
  userId: string,
  projectId: string
): Promise<{
  accessLevel: ProjectAccessLevel;
  projectRole: ProjectRole;
  workspaceRole: WorkspaceRole;
  workspaceId: string;
} | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      workspaceId: true,
      teamId: true,
      leadId: true,
      workspace: {
        select: {
          id: true,
          ownerId: true,
          members: {
            where: { userId },
            select: { role: true },
            take: 1,
          },
        },
      },
      members: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
      team: {
        select: {
          id: true,
          members: {
            where: { userId },
            select: { role: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!project) return null;

  // Determine workspace role
  let wsRole: WorkspaceRole | null = null;
  if (project.workspace.members.length > 0 && isValidWorkspaceRole(project.workspace.members[0].role)) {
    wsRole = project.workspace.members[0].role;
  } else if (project.workspace.ownerId === userId) {
    wsRole = "OWNER";
  }

  if (!wsRole) return null; // Not a member of the parent workspace

  // 1. Workspace OWNER & ADMIN have global management across all projects
  if (wsRole === "OWNER") {
    return {
      accessLevel: "MANAGE",
      projectRole: "OWNER",
      workspaceRole: "OWNER",
      workspaceId: project.workspaceId,
    };
  }
  if (wsRole === "ADMIN") {
    return {
      accessLevel: "MANAGE",
      projectRole: "ADMIN",
      workspaceRole: "ADMIN",
      workspaceId: project.workspaceId,
    };
  }

  // 2. Workspace VIEWER is globally read-only
  if (wsRole === "VIEWER") {
    return {
      accessLevel: "READ",
      projectRole: "VIEWER",
      workspaceRole: "VIEWER",
      workspaceId: project.workspaceId,
    };
  }

  // 3. Workspace MEMBER -> Evaluate project isolation:
  // A) Is Project Lead?
  if (project.leadId === userId) {
    return {
      accessLevel: "MANAGE",
      projectRole: "LEAD",
      workspaceRole: "MEMBER",
      workspaceId: project.workspaceId,
    };
  }

  // B) Explicit ProjectMember assignment?
  if (project.members.length > 0) {
    const pRole = project.members[0].role;
    if (pRole === "LEAD") {
      return {
        accessLevel: "MANAGE",
        projectRole: "LEAD",
        workspaceRole: "MEMBER",
        workspaceId: project.workspaceId,
      };
    }
    if (pRole === "CONTRIBUTOR") {
      return {
        accessLevel: "WRITE",
        projectRole: "CONTRIBUTOR",
        workspaceRole: "MEMBER",
        workspaceId: project.workspaceId,
      };
    }
    return {
      accessLevel: "READ",
      projectRole: "VIEWER",
      workspaceRole: "MEMBER",
      workspaceId: project.workspaceId,
    };
  }

  // C) Inherit from assigned Squad / Team
  if (project.team && project.team.members.length > 0) {
    const tRole = project.team.members[0].role;
    return {
      accessLevel: "WRITE",
      projectRole: tRole === "LEAD" ? "LEAD" : "CONTRIBUTOR",
      workspaceRole: "MEMBER",
      workspaceId: project.workspaceId,
    };
  }

  // D) Workspace member not assigned to this squad or project -> Read-only guest
  return {
    accessLevel: "READ",
    projectRole: "NON_MEMBER",
    workspaceRole: "MEMBER",
    workspaceId: project.workspaceId,
  };
}

/**
 * Gets a user's role for a specific workspace.
 * Indexed lookup on workspaceMember (userId, workspaceId).
 * Fails closed: returns null if the user has no role in the workspace.
 */
export async function getRoleForWorkspace(
  userId: string,
  workspaceIdOrSlug: string
): Promise<WorkspaceRole | null> {
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      OR: [
        { workspaceId: workspaceIdOrSlug },
        { workspace: { slug: workspaceIdOrSlug } },
      ],
    },
    select: { role: true },
  });

  if (!membership || !isValidWorkspaceRole(membership.role)) {
    return null;
  }

  return membership.role;
}

/**
 * Requires the user to have access to the specified workspace, optionally verifying a permission.
 * Fails closed: returns null if access is denied.
 */
export async function requireWorkspaceAccess(
  userId: string,
  workspaceIdOrSlug: string,
  requiredPermission?: Permission
): Promise<{ workspaceId: string; role: WorkspaceRole } | null> {
  const workspace = await prisma.workspace.findFirst({
    where: {
      OR: [
        { id: workspaceIdOrSlug },
        { slug: workspaceIdOrSlug },
      ],
    },
    select: {
      id: true,
      ownerId: true,
      members: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!workspace) return null;

  let role: WorkspaceRole | null = null;
  if (workspace.members.length > 0 && isValidWorkspaceRole(workspace.members[0].role)) {
    role = workspace.members[0].role;
  } else if (workspace.ownerId === userId) {
    role = "OWNER";
  }

  if (!role) return null;

  if (requiredPermission && !hasPermission(role, requiredPermission)) {
    return null;
  }

  return { workspaceId: workspace.id, role };
}

/**
 * Requires the user to have access to a project, enforcing project-level RBAC.
 * Fails closed.
 */
export async function requireProjectWorkspaceAccess(
  userId: string,
  projectId: string,
  requiredPermission?: Permission
) {
  const effective = await getEffectiveProjectAccess(userId, projectId);
  if (!effective) return null;

  // Check required permissions
  if (requiredPermission) {
    // 1. project:delete is strictly reserved for Workspace OWNER and ADMIN
    if (requiredPermission === "project:delete") {
      if (effective.projectRole !== "OWNER" && effective.projectRole !== "ADMIN") {
        return null;
      }
    }
    // 2. Project management permissions (column:manage, project:edit) require MANAGE access
    else if (requiredPermission === "column:manage" || requiredPermission === "project:edit") {
      if (effective.accessLevel !== "MANAGE") {
        return null;
      }
    }
    // 3. Task write permissions require at least WRITE access
    else if (
      [
        "task:create",
        "task:edit",
        "task:move",
        "task:delete",
        "comment:create",
      ].includes(requiredPermission)
    ) {
      if (effective.accessLevel === "READ") {
        return null;
      }
    }
  }

  return {
    projectId,
    workspaceId: effective.workspaceId,
    role: effective.workspaceRole,
    projectRole: effective.projectRole,
    accessLevel: effective.accessLevel,
  };
}

/**
 * Requires the user to have access to the task's project, enforcing project-level RBAC.
 * Fails closed.
 */
export async function requireTaskWorkspaceAccess(
  userId: string,
  taskId: string,
  requiredPermission?: Permission
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
      columnId: true,
      reporterId: true,
      project: {
        select: {
          id: true,
          key: true,
          workspaceId: true,
        },
      },
    },
  });

  if (!task || !task.project) return null;

  const access = await requireProjectWorkspaceAccess(userId, task.projectId, requiredPermission);
  if (!access) return null;

  return {
    task,
    project: task.project,
    projectId: task.projectId,
    workspaceId: access.workspaceId,
    role: access.role,
    projectRole: access.projectRole,
    accessLevel: access.accessLevel,
  };
}

