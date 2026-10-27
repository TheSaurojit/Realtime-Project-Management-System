import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { Prisma } from "../../generated/prisma/client";
import {
  User,
  Workspace,
  Project,
  Task,
  Comment,
  ActivityLog,
  Notification,
  WorkspaceRole,
  TaskPriority,
  TaskStatus,
  Attachment,
  Team,
} from "@/lib/types";
import { parseMentionedUserIds } from "@/lib/utils";

export { parseMentionedUserIds };

const TASK_PAGE_SIZE = 30;

/**
 * Normalizes column names into canonical TaskStatus enum values.
 */
export function mapColumnNameToStatus(columnName: string): TaskStatus {
  const norm = columnName.toUpperCase().replace(/[-_]/g, " ").trim();
  if (norm.includes("IN PROGRESS") || norm.includes("PROGRESS") || norm.includes("DOING")) {
    return "IN_PROGRESS";
  }
  if (norm.includes("IN REVIEW") || norm.includes("REVIEW")) {
    return "IN_REVIEW";
  }
  if (norm.includes("DONE") || norm.includes("COMPLETE") || norm.includes("FINISHED") || norm.includes("CLOSED")) {
    return "DONE";
  }
  if (norm.includes("BACKLOG")) {
    return "BACKLOG";
  }
  return "TODO";
}

/**
 * Reusable projection for User relations to ensure sensitive fields (like passwordHash)
 * are NEVER retrieved from the database during regular queries or sent to the browser.
 */
export const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  emailVerified: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const TASK_SUMMARY_SELECT = {
  id: true,
  projectId: true,
  columnId: true,
  taskKey: true,
  title: true,
  priority: true,
  status: true,
  position: true,
  dueDate: true,
  startDate: true,
  points: true,
  reporterId: true,
  createdAt: true,
  updatedAt: true,
  assignees: {
    select: {
      user: { select: SAFE_USER_SELECT },
    },
  },
  labels: {
    select: {
      label: {
        select: { id: true, name: true, color: true },
      },
    },
  },
  checklists: {
    select: {
      id: true,
      items: {
        select: { isCompleted: true },
      },
    },
  },
  _count: {
    select: {
      comments: true,
      attachments: true,
    },
  },
} satisfies Prisma.TaskSelect;

/**
 * Lightweight query specifically for rendering the navigation sidebar.
 * Trims the massive query tree to avoid fetching all tasks, comments, and attachments.
 */
export async function getWorkspaceSidebarData(slug: string) {
  const cleanSlug = slug.toLowerCase().trim();
  try {
    const ws = await prisma.workspace.findFirst({
      where: {
        OR: [
          { slug: cleanSlug },
          { id: cleanSlug },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        ownerId: true,
        projects: {
          select: {
            id: true,
            name: true,
            key: true,
            icon: true,
            color: true,
            status: true,
          },
          orderBy: { createdAt: "asc" },
        },
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        teams: {
          select: {
            id: true,
            name: true,
            color: true,
            members: {
              select: {
                id: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    return ws as unknown as Workspace | null;
  } catch (error) {
    console.error("[DB] getWorkspaceSidebarData error:", error);
    return null;
  }
}

export async function getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
  const cleanSlug = slug.toLowerCase().trim();

  try {
    const ws = await prisma.workspace.findFirst({
      where: {
        OR: [
          { slug: cleanSlug },
          { id: cleanSlug },
        ],
      },
      include: {
        members: {
          include: {
            user: { select: SAFE_USER_SELECT },
          },
        },
        teams: {
          include: {
            members: {
              include: {
                user: { select: SAFE_USER_SELECT },
              },
            },
          },
        },
        projects: {
          include: {
            columns: {
              orderBy: { position: "asc" },
            },
            team: true,
            _count: {
              select: { tasks: true },
            },
          },
        },
        labels: true,
        invitations: {
          orderBy: { createdAt: "desc" },
          include: {
            inviter: {
              select: SAFE_USER_SELECT,
            },
          },
        },
      },
    });

    if (ws) {
      return ws as unknown as Workspace;
    }
  } catch (error) {
    console.error("[DB] getWorkspaceBySlug error:", error);
  }

  return null;
}

export async function getProjectByKey(workspaceSlug: string, projectKey: string): Promise<Project | null> {
  const cleanSlug = workspaceSlug.toLowerCase().trim();
  const cleanKey = projectKey.toUpperCase().trim();

  try {
    const project = await prisma.project.findFirst({
      where: {
        key: cleanKey,
        workspace: {
          OR: [
            { slug: cleanSlug },
            { id: cleanSlug },
          ],
        },
      },
      include: {
        lead: { select: SAFE_USER_SELECT },
        team: {
          include: {
            members: {
              include: { user: { select: SAFE_USER_SELECT } },
            },
          },
        },
        members: {
          include: { user: { select: SAFE_USER_SELECT } },
        },
        columns: {
          orderBy: { position: "asc" },
          include: {
            _count: {
              select: { tasks: true },
            },
            tasks: {
              take: TASK_PAGE_SIZE,
              orderBy: [{ position: "asc" }, { id: "asc" }],
              select: TASK_SUMMARY_SELECT,
            },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (project) {
      return project as unknown as Project;
    }
  } catch (error) {
    console.error("[DB] getProjectByKey error:", error);
  }

  return null;
}

export async function getProjectTasksPage(
  projectId: string,
  columnId: string,
  cursor?: { position: number; id: string }
): Promise<{ tasks: Task[]; hasMore: boolean }> {
  const rows = await prisma.task.findMany({
    where: {
      projectId,
      columnId,
      ...(cursor
        ? {
            OR: [
              { position: { gt: cursor.position } },
              { position: cursor.position, id: { gt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    take: TASK_PAGE_SIZE + 1,
    select: TASK_SUMMARY_SELECT,
  });

  return {
    tasks: rows.slice(0, TASK_PAGE_SIZE) as unknown as Task[],
    hasMore: rows.length > TASK_PAGE_SIZE,
  };
}

export async function searchProjectTasks(projectId: string, searchTerm: string): Promise<Task[]> {
  const term = searchTerm.trim();
  if (!term) return [];

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { taskKey: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ],
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: 30,
    select: TASK_SUMMARY_SELECT,
  });

  return tasks as unknown as Task[];
}

export async function createProject(data: {
  workspaceId: string;
  name: string;
  key: string;
  description?: string;
  color?: string;
  teamId: string;
  leadId?: string;
}): Promise<Project> {
  const cleanName = data.name.trim();
  const cleanKey = data.key.toUpperCase().trim().replace(/[^A-Z0-9]/g, "");

  if (!cleanName || cleanName.length < 2) {
    throw new Error("Project name must be at least 2 characters.");
  }

  if (!cleanKey || cleanKey.length < 2 || cleanKey.length > 10) {
    throw new Error("Project key must be between 2 and 10 alphanumeric characters.");
  }

  if (!data.teamId || !data.teamId.trim()) {
    throw new Error("A team is required for this project. Please select or create a team.");
  }

  const team = await prisma.team.findFirst({
    where: {
      id: data.teamId,
      workspaceId: data.workspaceId,
    },
  });

  if (!team) {
    throw new Error("The selected team does not exist in this workspace.");
  }

  const existing = await prisma.project.findFirst({
    where: {
      workspaceId: data.workspaceId,
      key: cleanKey,
    },
  });

  if (existing) {
    throw new Error(`A project with key "${cleanKey}" already exists in this workspace.`);
  }

  const project = await prisma.project.create({
    data: {
      workspaceId: data.workspaceId,
      name: cleanName,
      key: cleanKey,
      description: data.description?.trim() || null,
      color: data.color || "#6366f1",
      teamId: data.teamId,
      leadId: data.leadId || null,
      status: "ACTIVE",
      priority: "MEDIUM",
      columns: {
        create: [
          { name: "Backlog", position: 0, wipLimit: null, color: "#64748b" },
          { name: "To Do", position: 1, wipLimit: 8, color: "#3b82f6" },
          { name: "In Progress", position: 2, wipLimit: 4, color: "#eab308" },
          { name: "In Review", position: 3, wipLimit: 3, color: "#a855f7" },
          { name: "Done", position: 4, wipLimit: null, color: "#22c55e" },
        ],
      },
    },
    include: {
      lead: { select: SAFE_USER_SELECT },
      team: true,
      columns: {
        orderBy: { position: "asc" },
        include: {
          tasks: true,
        },
      },
    },
  });

  // Initialize TaskSequence counter
  await prisma.taskSequence.upsert({
    where: { projectId: project.id },
    create: { projectId: project.id, current: 0 },
    update: {},
  });

  if (data.leadId) {
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: data.leadId,
        role: "LEAD",
      },
    }).catch(() => {});

    await prisma.activityLog.create({
      data: {
        workspaceId: data.workspaceId,
        projectId: project.id,
        actorId: data.leadId,
        action: "PROJECT_CREATED",
        details: `Created project "${cleanName}" (${cleanKey})`,
      },
    }).catch(() => {});
  }

  return project as unknown as Project;
}

export async function deleteProject(
  projectIdOrKey: string,
  workspaceId: string,
  actorId?: string
): Promise<{ success: boolean; deletedProject: { id: string; name: string; key: string } }> {
  const cleanIdOrKey = projectIdOrKey.trim();

  const project = await prisma.project.findFirst({
    where: {
      workspaceId,
      OR: [
        { id: cleanIdOrKey },
        { key: cleanIdOrKey.toUpperCase() },
      ],
    },
  });

  if (!project) {
    throw new Error("Project not found in this workspace.");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Delete task sequences if any for this project
    await tx.taskSequence.deleteMany({
      where: { projectId: project.id },
    });

    // 2. Cascade delete project (deletes columns, tasks, members, activities)
    await tx.project.delete({
      where: { id: project.id },
    });

    // 3. If there is another project in the workspace and actorId is provided, log the deletion activity
    if (actorId) {
      const remainingProject = await tx.project.findFirst({
        where: { workspaceId },
        select: { id: true },
      });
      if (remainingProject) {
        await tx.activityLog.create({
          data: {
            workspaceId,
            projectId: remainingProject.id,
            actorId,
            action: "PROJECT_DELETED",
            details: `Deleted project "${project.name}" (${project.key})`,
          },
        }).catch(() => {});
      }
    }
  });

  return {
    success: true,
    deletedProject: {
      id: project.id,
      name: project.name,
      key: project.key,
    },
  };
}

export async function getProjectMembers(projectId: string) {
  return await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: { select: SAFE_USER_SELECT },
    },
    orderBy: { joinedAt: "asc" },
  });
}

export async function addProjectMember(data: {
  projectId: string;
  userId: string;
  role?: string;
}) {
  const project = await prisma.project.findUnique({
    where: { id: data.projectId },
    include: {
      workspace: {
        include: {
          members: { where: { userId: data.userId } },
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  const isWsMember =
    project.workspace.ownerId === data.userId ||
    project.workspace.members.length > 0;

  if (!isWsMember) {
    throw new Error("User must be a member of the workspace first.");
  }

  const role = data.role === "LEAD" ? "LEAD" : data.role === "VIEWER" ? "VIEWER" : "CONTRIBUTOR";

  return await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: data.projectId,
        userId: data.userId,
      },
    },
    update: {
      role,
    },
    create: {
      projectId: data.projectId,
      userId: data.userId,
      role,
    },
    include: {
      user: { select: SAFE_USER_SELECT },
    },
  });
}

export async function removeProjectMember(projectId: string, userId: string) {
  return await prisma.projectMember.deleteMany({
    where: {
      projectId,
      userId,
    },
  });
}

export async function createTeam(data: {
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
  memberIds?: string[];
  leadId?: string;
  actorId?: string;
}): Promise<Team> {
  const cleanName = data.name.trim();

  if (!cleanName || cleanName.length < 2) {
    throw new Error("Team name must be at least 2 characters.");
  }

  // Check if team name already exists in workspace (case-insensitive)
  const existing = await prisma.team.findFirst({
    where: {
      workspaceId: data.workspaceId,
      name: {
        equals: cleanName,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    throw new Error(`A team named "${cleanName}" already exists in this workspace.`);
  }

  // Deduplicate and validate memberIds against workspace memberships
  let memberIds = Array.from(new Set(data.memberIds || []));
  if (data.leadId && !memberIds.includes(data.leadId)) {
    memberIds = [data.leadId, ...memberIds];
  }

  if (memberIds.length > 0) {
    const validMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: data.workspaceId,
        userId: { in: memberIds },
      },
      select: { userId: true },
    });
    const validSet = new Set(validMembers.map((m) => m.userId));
    memberIds = memberIds.filter((id) => validSet.has(id));
  }

  const team = await prisma.team.create({
    data: {
      workspaceId: data.workspaceId,
      name: cleanName,
      description: data.description?.trim() || null,
      color: data.color || "#6366f1",
      members: {
        create: memberIds.map((userId) => ({
          userId,
          role: userId === data.leadId ? "LEAD" : "MEMBER",
        })),
      },
    },
    include: {
      members: {
        include: {
          user: { select: SAFE_USER_SELECT },
        },
      },
    },
  });

  if (data.actorId) {
    const firstProject = await prisma.project.findFirst({
      where: { workspaceId: data.workspaceId },
      select: { id: true },
    });

    if (firstProject) {
      await prisma.activityLog.create({
        data: {
          workspaceId: data.workspaceId,
          projectId: firstProject.id,
          actorId: data.actorId,
          action: "TEAM_CREATED",
          details: `Created team "${cleanName}" with ${team.members.length} member(s)`,
        },
      }).catch(() => {});
    }
  }

  return team as unknown as Team;
}

export async function getTeamById(teamId: string, workspaceIdOrSlug?: string) {
  try {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        ...(workspaceIdOrSlug
          ? {
              workspace: {
                OR: [
                  { id: workspaceIdOrSlug },
                  { slug: workspaceIdOrSlug },
                ],
              },
            }
          : {}),
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
            members: {
              include: {
                user: { select: SAFE_USER_SELECT },
              },
            },
          },
        },
        members: {
          include: {
            user: { select: SAFE_USER_SELECT },
          },
          orderBy: { joinedAt: "asc" },
        },
        projects: {
          select: {
            id: true,
            name: true,
            key: true,
            color: true,
            status: true,
            description: true,
            _count: {
              select: { tasks: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return team;
  } catch (error) {
    console.error("[DB] getTeamById error:", error);
    return null;
  }
}

export async function updateTeam(data: {
  teamId: string;
  workspaceId: string;
  name?: string;
  description?: string;
  color?: string;
  memberIds?: string[];
  leadId?: string;
  actorId?: string;
}) {
  const currentTeam = await prisma.team.findFirst({
    where: { id: data.teamId, workspaceId: data.workspaceId },
    include: { members: true },
  });

  if (!currentTeam) {
    throw new Error("Team not found in this workspace.");
  }

  const updateData: Prisma.TeamUpdateInput = {};
  if (data.name !== undefined) {
    const cleanName = data.name.trim();
    if (!cleanName || cleanName.length < 2) {
      throw new Error("Team name must be at least 2 characters.");
    }
    updateData.name = cleanName;
  }

  if (data.description !== undefined) {
    updateData.description = data.description.trim() || null;
  }

  if (data.color !== undefined) {
    updateData.color = data.color;
  }

  if (data.memberIds !== undefined) {
    const requestedIds = Array.from(new Set(data.memberIds));
    const validMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: data.workspaceId,
        userId: { in: requestedIds },
      },
      select: { userId: true },
    });
    const validUserIds = new Set(validMembers.map((m) => m.userId));
    const safeMemberIds = requestedIds.filter((id) => validUserIds.has(id));

    // Delete existing team members and recreate
    await prisma.teamMember.deleteMany({
      where: { teamId: data.teamId },
    });

    await prisma.teamMember.createMany({
      data: safeMemberIds.map((userId) => ({
        teamId: data.teamId,
        userId,
        role: userId === data.leadId ? "LEAD" : "MEMBER",
      })),
    });
  } else if (data.leadId !== undefined) {
    await prisma.teamMember.updateMany({
      where: { teamId: data.teamId },
      data: { role: "MEMBER" },
    });
    await prisma.teamMember.updateMany({
      where: { teamId: data.teamId, userId: data.leadId },
      data: { role: "LEAD" },
    });
  }

  const updatedTeam = await prisma.team.update({
    where: { id: data.teamId },
    data: updateData,
    include: {
      members: {
        include: {
          user: { select: SAFE_USER_SELECT },
        },
      },
      projects: true,
    },
  });

  return updatedTeam;
}

export async function getTaskById(taskId: string): Promise<Task | null> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: true,
        reporter: { select: SAFE_USER_SELECT },
        assignees: { include: { user: { select: SAFE_USER_SELECT } } },
        labels: { include: { label: true } },
        checklists: {
          include: {
            items: { orderBy: { position: "asc" } },
          },
        },
        attachments: true,
        comments: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: SAFE_USER_SELECT } },
        },
      },
    });

    if (task) {
      return task as unknown as Task;
    }
  } catch (error) {
    console.error("[DB] getTaskById error:", error);
  }

  return null;
}

/**
 * Creates a task with a per-project sequential key inside a transaction with retry.
 */
export async function createTask(data: {
  projectId: string;
  columnId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  reporterId: string;
  assigneeIds?: string[];
  labelIds?: string[];
  dueDate?: string | null;
}): Promise<Task> {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      return await prisma.$transaction(async (tx) => {
        const project = await tx.project.findUnique({
          where: { id: data.projectId },
          include: { workspace: true },
        });

        if (!project) {
          throw new Error(`Project with ID ${data.projectId} not found.`);
        }

        const column = await tx.boardColumn.findUnique({
          where: { id: data.columnId },
        });
        if (!column || column.projectId !== data.projectId) {
          throw new Error("Target column does not belong to the project.");
        }

        // Validate assignees belong to the workspace
        const uniqueAssigneeIds = Array.from(new Set((data.assigneeIds || []).filter(Boolean)));
        if (uniqueAssigneeIds.length > 0) {
          const members = await tx.workspaceMember.findMany({
            where: {
              workspaceId: project.workspaceId,
              userId: { in: uniqueAssigneeIds },
            },
            select: { userId: true },
          });
          const validUserSet = new Set(members.map((m) => m.userId));
          if (project.workspace.ownerId) {
            validUserSet.add(project.workspace.ownerId);
          }

          const invalidAssignee = uniqueAssigneeIds.find((id) => !validUserSet.has(id));
          if (invalidAssignee) {
            throw new Error(`Assignee ${invalidAssignee} does not belong to this workspace.`);
          }
        }

        // Validate labels belong to the workspace
        const uniqueLabelIds = Array.from(new Set((data.labelIds || []).filter(Boolean)));
        if (uniqueLabelIds.length > 0) {
          const labels = await tx.label.findMany({
            where: {
              id: { in: uniqueLabelIds },
              workspaceId: project.workspaceId,
            },
            select: { id: true },
          });
          const validLabelSet = new Set(labels.map((l) => l.id));

          const invalidLabel = uniqueLabelIds.find((id) => !validLabelSet.has(id));
          if (invalidLabel) {
            throw new Error(`Label ${invalidLabel} does not belong to this workspace.`);
          }
        }

        const sequence = await tx.taskSequence.upsert({
          where: { projectId: data.projectId },
          update: { current: { increment: 1 } },
          create: { projectId: data.projectId, current: 1 },
        });

        const nextNum = sequence.current;
        const taskKey = `${project.key}-${nextNum}`;

        const lastTaskInColumn = await tx.task.findFirst({
          where: { columnId: data.columnId, projectId: data.projectId },
          orderBy: { position: "desc" },
        });
        const position = lastTaskInColumn ? lastTaskInColumn.position + 1000 : 1000;

        const status = data.status || mapColumnNameToStatus(column.name);

        let parsedDueDate: Date | null = null;
        if (data.dueDate) {
          const d = new Date(data.dueDate);
          if (!isNaN(d.getTime())) parsedDueDate = d;
        }

        const newTask = await tx.task.create({
          data: {
            projectId: data.projectId,
            columnId: data.columnId,
            taskKey,
            title: data.title.trim(),
            description: data.description || "",
            priority: data.priority || "MEDIUM",
            status,
            position,
            dueDate: parsedDueDate,
            startDate: new Date(),
            points: 1,
            reporterId: data.reporterId,
            assignees: {
              create: uniqueAssigneeIds.map((userId) => ({ userId })),
            },
            labels: {
              create: uniqueLabelIds.map((labelId) => ({ labelId })),
            },
          },
          include: {
            reporter: { select: SAFE_USER_SELECT },
            assignees: { include: { user: { select: SAFE_USER_SELECT } } },
            labels: { include: { label: true } },
            checklists: { include: { items: true } },
            attachments: true,
            comments: { include: { author: { select: SAFE_USER_SELECT } } },
          },
        });

        // Log activity in same transaction
        await tx.activityLog.create({
          data: {
            workspaceId: project.workspaceId,
            projectId: data.projectId,
            taskId: newTask.id,
            actorId: data.reporterId,
            action: `created task ${taskKey}`,
            details: JSON.stringify({ title: newTask.title }),
          },
        });

        return newTask as unknown as Task;
      });
    } catch (err: unknown) {
      const isUniqueErr = err instanceof Error && err.message.includes("Unique constraint");
      if (attempt >= maxRetries || !isUniqueErr) {
        throw err;
      }
    }
  }

  throw new Error("Failed to create task after retry sequence.");
}

export async function updateTask(
  taskId: string,
  updates: {
    title?: string;
    description?: string | null;
    priority?: TaskPriority;
    status?: TaskStatus;
    points?: number | null;
    dueDate?: string | null;
    columnId?: string;
    assigneeIds?: string[];
    labelIds?: string[];
  },
  actorId?: string
): Promise<Task | null> {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.task.findUnique({
        where: { id: taskId },
        include: {
          project: {
            include: {
              workspace: { select: { ownerId: true } },
            },
          },
        },
      });
      if (!existing) return null;

      let parsedDueDate: Date | null | undefined = undefined;
      if (updates.dueDate !== undefined) {
        if (updates.dueDate === null || updates.dueDate === "") {
          parsedDueDate = null;
        } else {
          const d = new Date(updates.dueDate);
          if (!isNaN(d.getTime())) {
            parsedDueDate = d;
          }
        }
      }

      let newStatus: TaskStatus | undefined = updates.status;

      if (updates.columnId !== undefined) {
        const destCol = await tx.boardColumn.findUnique({
          where: { id: updates.columnId },
          select: { id: true, projectId: true, name: true },
        });

        if (!destCol) {
          throw new Error("Column not found.");
        }

        if (destCol.projectId !== existing.projectId) {
          throw new Error("Destination column does not belong to the task's project.");
        }

        if (!newStatus) {
          newStatus = mapColumnNameToStatus(destCol.name);
        }
      }

      if (updates.assigneeIds !== undefined) {
        const uniqueAssigneeIds = Array.from(new Set(updates.assigneeIds));
        const members = await tx.workspaceMember.findMany({
          where: {
            workspaceId: existing.project.workspaceId,
            userId: { in: uniqueAssigneeIds },
          },
          select: { userId: true },
        });
        const validAssigneeIds = new Set(members.map((member) => member.userId));
        validAssigneeIds.add(existing.project.workspace.ownerId);
        const invalidAssignee = uniqueAssigneeIds.find((id) => !validAssigneeIds.has(id));
        if (invalidAssignee) {
          throw new Error(`Assignee ${invalidAssignee} does not belong to this workspace.`);
        }

        await tx.taskAssignee.deleteMany({ where: { taskId } });
        if (uniqueAssigneeIds.length > 0) {
          await tx.taskAssignee.createMany({
            data: uniqueAssigneeIds.map((userId) => ({ taskId, userId })),
          });
        }
      }

      if (updates.labelIds !== undefined) {
        const uniqueLabelIds = Array.from(new Set(updates.labelIds));
        const labels = await tx.label.findMany({
          where: {
            workspaceId: existing.project.workspaceId,
            id: { in: uniqueLabelIds },
          },
          select: { id: true },
        });
        const validLabelIds = new Set(labels.map((label) => label.id));
        const invalidLabel = uniqueLabelIds.find((id) => !validLabelIds.has(id));
        if (invalidLabel) {
          throw new Error(`Label ${invalidLabel} does not belong to this workspace.`);
        }

        await tx.taskLabel.deleteMany({ where: { taskId } });
        if (uniqueLabelIds.length > 0) {
          await tx.taskLabel.createMany({
            data: uniqueLabelIds.map((labelId) => ({ taskId, labelId })),
          });
        }
      }

      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          title: updates.title !== undefined ? updates.title.trim() : undefined,
          description: updates.description !== undefined ? updates.description : undefined,
          priority: updates.priority,
          status: newStatus,
          points: updates.points !== undefined ? updates.points : undefined,
          dueDate: parsedDueDate,
          columnId: updates.columnId !== undefined ? updates.columnId : undefined,
        },
        include: {
          project: true,
          reporter: { select: SAFE_USER_SELECT },
          assignees: { include: { user: { select: SAFE_USER_SELECT } } },
          labels: { include: { label: true } },
          checklists: { include: { items: true } },
          attachments: true,
          comments: { include: { author: { select: SAFE_USER_SELECT } } },
        },
      });

      if (actorId && existing.project) {
        await tx.activityLog.create({
          data: {
            workspaceId: existing.project.workspaceId,
            projectId: existing.projectId,
            taskId: updated.id,
            actorId,
            action: `updated task ${updated.taskKey}`,
            details: JSON.stringify(updates),
          },
        });
      }

      return updated as unknown as Task;
    });
  } catch (error) {
    console.error("[DB] updateTask error:", error);
    throw error;
  }
}

export async function moveTask(
  taskId: string,
  destColumnId: string,
  destinationIndex: number,
  actorId?: string
): Promise<Task | null> {
  try {
    return await prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({
        where: { id: taskId },
        include: { project: true },
      });
      if (!task) return null;

      const destCol = await tx.boardColumn.findUnique({
        where: { id: destColumnId },
      });
      if (!destCol) return null;

      if (destCol.projectId !== task.projectId) {
        throw new Error("Destination column does not belong to the task's project.");
      }

      if (!Number.isSafeInteger(destinationIndex) || destinationIndex < 0) {
        throw new Error("Destination index must be a non-negative integer.");
      }

      const destinationTasks = await tx.task.findMany({
        where: { columnId: destColumnId, id: { not: taskId } },
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { id: true, position: true },
      });
      const insertionIndex = Math.min(destinationIndex, destinationTasks.length);
      const before = destinationTasks[insertionIndex - 1];
      const after = destinationTasks[insertionIndex];
      let position =
        before && after
          ? before.position + (after.position - before.position) / 2
          : before
            ? before.position + 1000
            : after
              ? after.position - 1000
              : 1000;

      if (before && after && after.position - before.position < 0.000001) {
        await Promise.all(
          destinationTasks.map((destinationTask, index) =>
            tx.task.update({
              where: { id: destinationTask.id },
              data: {
                position: (index + (index < insertionIndex ? 1 : 2)) * 1000,
              },
            })
          )
        );
        position = (insertionIndex + 1) * 1000;
      }

      const newStatus = mapColumnNameToStatus(destCol.name);

      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          columnId: destColumnId,
          position,
          status: newStatus,
        },
        include: {
          project: true,
          reporter: { select: SAFE_USER_SELECT },
          assignees: { include: { user: { select: SAFE_USER_SELECT } } },
          labels: { include: { label: true } },
          checklists: { include: { items: true } },
          attachments: true,
          comments: { include: { author: { select: SAFE_USER_SELECT } } },
        },
      });

      if (actorId && updated.project) {
        await tx.activityLog.create({
          data: {
            workspaceId: updated.project.workspaceId,
            projectId: updated.projectId,
            taskId: updated.id,
            actorId,
            action: `moved task ${updated.taskKey}`,
            details: JSON.stringify({ columnId: destColumnId, position, status: newStatus }),
          },
        });
      }

      return updated as unknown as Task;
    });
  } catch (error) {
    console.error("[DB] moveTask error:", error);
    return null;
  }
}

export async function deleteTask(taskId: string, actorId?: string): Promise<boolean> {
  try {
    return await prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({
        where: { id: taskId },
        include: { project: true },
      });
      if (!task) return false;

      // Log activity with taskId: null in the same transaction
      // This guarantees the activity record is permanently preserved even after task is deleted!
      if (actorId && task.project) {
        await tx.activityLog.create({
          data: {
            workspaceId: task.project.workspaceId,
            projectId: task.projectId,
            taskId: null,
            actorId,
            action: `deleted task ${task.taskKey}`,
            details: JSON.stringify({ title: task.title }),
          },
        });
      }

      await tx.task.delete({
        where: { id: taskId },
      });

      return true;
    });
  } catch (error) {
    console.error("[DB] deleteTask error:", error);
    return false;
  }
}

export async function addComment(
  taskId: string,
  authorId: string,
  content: string
): Promise<(Comment & { notifications?: Notification[] }) | null> {
  try {
    return await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          taskId,
          authorId,
          content: content.trim(),
        },
        include: {
          author: { select: SAFE_USER_SELECT },
          task: {
            include: {
              project: {
                include: { workspace: true },
              },
            },
          },
        },
      });

      if (comment.task?.project) {
        await tx.activityLog.create({
          data: {
            workspaceId: comment.task.project.workspaceId,
            projectId: comment.task.projectId,
            taskId,
            actorId: authorId,
            action: `commented on ${comment.task.taskKey}`,
            details: content.slice(0, 100),
          },
        });
      }

      const createdNotifications: Notification[] = [];

      // Parse and process @mentions
      if (comment.task?.project?.workspace) {
        const workspaceId = comment.task.project.workspaceId;
        const workspaceSlug = comment.task.project.workspace.slug;
        const projectKey = comment.task.project.key;
        const taskKey = comment.task.taskKey;

        // Fetch candidate members in this workspace
        const members = await tx.workspaceMember.findMany({
          where: { workspaceId },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        });

        const candidateUsers: { id: string; name: string; email?: string }[] = members
          .map((m) => m.user)
          .filter((u): u is { id: string; name: string; email: string } => Boolean(u));

        // If workspace owner is not in members list, include owner
        if (
          comment.task.project.workspace.ownerId &&
          !candidateUsers.some((u) => u.id === comment.task.project.workspace.ownerId)
        ) {
          const owner = await tx.user.findUnique({
            where: { id: comment.task.project.workspace.ownerId },
            select: { id: true, name: true, email: true },
          });
          if (owner) candidateUsers.push(owner);
        }

        const mentionedUserIds = parseMentionedUserIds(content, candidateUsers, authorId);

        if (mentionedUserIds.length > 0) {
          const authorName = comment.author?.name || "A teammate";
          const preview = content.length > 80 ? content.slice(0, 77) + "..." : content;

          for (const targetUserId of mentionedUserIds) {
            const notif = await tx.notification.create({
              data: {
                userId: targetUserId,
                actorId: authorId,
                type: "MENTION",
                title: `${authorName} mentioned you`,
                message: `${authorName} mentioned you on ${taskKey}: "${preview}"`,
                link: `/workspace/${workspaceSlug}/project/${projectKey}?task=${taskKey}`,
              },
              include: { actor: { select: SAFE_USER_SELECT } },
            });
            createdNotifications.push(notif as unknown as Notification);
          }
        }
      }

      return {
        id: comment.id,
        taskId: comment.taskId,
        authorId: comment.authorId,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        author: comment.author as unknown as User,
        notifications: createdNotifications,
      };
    });
  } catch (error) {
    console.error("[DB] addComment error:", error);
    return null;
  }
}

export async function toggleChecklistItem(taskId: string, checklistId: string, itemId: string): Promise<boolean> {
  try {
    return await prisma.$transaction(async (tx) => {
      const item = await tx.checklistItem.findUnique({
        where: { id: itemId },
        include: { checklist: true },
      });

      if (!item || item.checklist.taskId !== taskId) return false;

      await tx.checklistItem.update({
        where: { id: itemId },
        data: { isCompleted: !item.isCompleted },
      });

      return true;
    });
  } catch (error) {
    console.error("[DB] toggleChecklistItem error:", error);
    return false;
  }
}

export async function addChecklistItem(taskId: string, checklistId: string, content: string): Promise<boolean> {
  try {
    return await prisma.$transaction(async (tx) => {
      let targetChecklist = await tx.checklist.findFirst({
        where: { id: checklistId, taskId },
      });

      if (!targetChecklist) {
        // If target checklist ID is a placeholder or not yet created, attach to task's first checklist or create one
        targetChecklist = await tx.checklist.findFirst({
          where: { taskId },
        });

        if (!targetChecklist) {
          targetChecklist = await tx.checklist.create({
            data: {
              taskId,
              title: "Checklist",
              position: 1000,
            },
          });
        }
      }

      const count = await tx.checklistItem.count({
        where: { checklistId: targetChecklist.id },
      });

      await tx.checklistItem.create({
        data: {
          checklistId: targetChecklist.id,
          content: content.trim(),
          isCompleted: false,
          position: (count + 1) * 1000,
        },
      });

      return true;
    });
  } catch (error) {
    console.error("[DB] addChecklistItem error:", error);
    return false;
  }
}

export async function addAttachment(
  taskId: string,
  uploaderId: string,
  file: { name: string; fileUrl: string; fileType: string; fileSize: number }
): Promise<Attachment | null> {
  try {
    return await prisma.$transaction(async (tx) => {
      const att = await tx.attachment.create({
        data: {
          taskId,
          uploaderId,
          name: file.name,
          fileUrl: file.fileUrl,
          fileType: file.fileType,
          fileSize: file.fileSize,
        },
        include: {
          uploader: { select: SAFE_USER_SELECT },
          task: { include: { project: true } },
        },
      });

      if (att.task?.project) {
        await tx.activityLog.create({
          data: {
            workspaceId: att.task.project.workspaceId,
            projectId: att.task.projectId,
            taskId,
            actorId: uploaderId,
            action: `attached ${file.name} to ${att.task.taskKey}`,
          },
        });
      }

      return {
        id: att.id,
        taskId: att.taskId,
        name: att.name,
        fileUrl: att.fileUrl,
        fileType: att.fileType,
        fileSize: att.fileSize,
        uploaderId: att.uploaderId,
        createdAt: att.createdAt.toISOString(),
        uploader: att.uploader as unknown as User,
      };
    });
  } catch (error) {
    console.error("[DB] addAttachment error:", error);
    return null;
  }
}

export async function deleteAttachment(
  attachmentId: string,
  actorId: string
): Promise<Attachment | null> {
  try {
    return await prisma.$transaction(async (tx) => {
      const att = await tx.attachment.findUnique({
        where: { id: attachmentId },
        include: {
          uploader: { select: SAFE_USER_SELECT },
          task: { include: { project: true } },
        },
      });

      if (!att) return null;

      await tx.attachment.delete({
        where: { id: attachmentId },
      });

      if (att.task?.project) {
        await tx.activityLog.create({
          data: {
            workspaceId: att.task.project.workspaceId,
            projectId: att.task.projectId,
            taskId: att.taskId,
            actorId,
            action: `removed attachment ${att.name} from ${att.task.taskKey}`,
          },
        });
      }

      return {
        id: att.id,
        taskId: att.taskId,
        name: att.name,
        fileUrl: att.fileUrl,
        fileType: att.fileType,
        fileSize: att.fileSize,
        uploaderId: att.uploaderId,
        createdAt: att.createdAt.toISOString(),
        uploader: att.uploader as unknown as User,
      };
    });
  } catch (error) {
    console.error("[DB] deleteAttachment error:", error);
    return null;
  }
}

/**
 * Scoped activity logs query. Requires either workspaceId or projectId.
 * Fails closed if neither is provided.
 */
export async function getActivityLogs(params?: {
  workspaceId?: string;
  projectId?: string;
  limit?: number;
}): Promise<ActivityLog[]> {
  try {
    const where: Prisma.ActivityLogWhereInput = {};
    if (params?.projectId) {
      where.projectId = params.projectId;
    } else if (params?.workspaceId) {
      where.workspaceId = params.workspaceId;
    } else {
      // Must be scoped: prevent cross-tenant data leaks
      return [];
    }

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params?.limit || 50,
      include: {
        actor: { select: SAFE_USER_SELECT },
        task: {
          select: {
            id: true,
            taskKey: true,
            title: true,
          },
        },
      },
    });

    return logs as unknown as ActivityLog[];
  } catch (error) {
    console.error("[DB] getActivityLogs error:", error);
    return [];
  }
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const notifs = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: SAFE_USER_SELECT } },
    });
    return notifs as unknown as Notification[];
  } catch (error) {
    console.error("[DB] getNotifications error:", error);
    return [];
  }
}

export async function markNotificationAsRead(notifId: string, userId: string): Promise<boolean> {
  try {
    const notif = await prisma.notification.findFirst({
      where: { id: notifId, userId },
    });
    if (!notif) return false;

    await prisma.notification.update({
      where: { id: notifId },
      data: { isRead: true },
    });
    return true;
  } catch (error) {
    console.error("[DB] markNotificationAsRead error:", error);
    return false;
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return true;
  } catch (error) {
    console.error("[DB] markAllNotificationsAsRead error:", error);
    return false;
  }
}

export async function createNotification(data: {
  userId: string;
  actorId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}): Promise<Notification | null> {
  try {
    const notif = await prisma.notification.create({
      data: {
        userId: data.userId,
        actorId: data.actorId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
      },
      include: { actor: { select: SAFE_USER_SELECT } },
    });
    return notif as unknown as Notification;
  } catch (error) {
    console.error("[DB] createNotification error:", error);
    return null;
  }
}

export async function addWorkspaceMember(
  workspaceId: string,
  email: string,
  role: WorkspaceRole
) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (!user) {
    throw new Error(`User with email "${email}" not found.`);
  }

  return await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: user.id,
      },
    },
    update: { role },
    create: {
      workspaceId,
      userId: user.id,
      role,
    },
    include: {
      user: { select: SAFE_USER_SELECT },
      workspace: true,
    },
  });
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  newRole: WorkspaceRole
): Promise<boolean> {
  try {
    await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
      data: { role: newRole },
    });
    return true;
  } catch (error) {
    console.error("[DB] updateWorkspaceMemberRole error:", error);
    return false;
  }
}

export async function removeWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
  try {
    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });
    return true;
  } catch (error) {
    console.error("[DB] removeWorkspaceMember error:", error);
    return false;
  }
}

/**
 * Creates an invitation token for a user to join a workspace.
 */
export async function createWorkspaceInvitation(
  workspaceId: string,
  inviterId: string,
  email: string,
  role: WorkspaceRole
) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return await prisma.workspaceInvitation.upsert({
    where: {
      workspaceId_email: {
        workspaceId,
        email: email.toLowerCase().trim(),
      },
    },
    update: {
      role,
      token,
      expiresAt,
      inviterId,
    },
    create: {
      workspaceId,
      email: email.toLowerCase().trim(),
      role,
      token,
      expiresAt,
      inviterId,
    },
    include: {
      workspace: true,
    },
  });
}

/**
 * Accepts an invitation token and adds the user to the workspace.
 */
export async function acceptWorkspaceInvitation(
  token: string,
  userId: string,
  options?: { confirmDifferentAccount?: boolean }
) {
  return await prisma.$transaction(async (tx) => {
    const invitation = await tx.workspaceInvitation.findUnique({
      where: { token },
      include: { workspace: true },
    });

    if (!invitation) {
      throw new Error("Invalid or not found invitation token.");
    }

    if (new Date() > invitation.expiresAt) {
      throw new Error("Invitation has expired.");
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    const isEmailMatch = user.email.toLowerCase().trim() === invitation.email.toLowerCase().trim();
    if (!isEmailMatch && !options?.confirmDifferentAccount) {
      throw new Error(
        "This invitation was sent to a different email address. Please explicitly confirm you want to join with this account."
      );
    }

    const membership = await tx.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId,
        },
      },
      update: { role: invitation.role },
      create: {
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
      },
      include: { workspace: true, user: { select: SAFE_USER_SELECT } },
    });

    await tx.workspaceInvitation.delete({
      where: { id: invitation.id },
    });

    return membership;
  });
}

export async function findUserByEmail(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        workspaceMemberships: {
          include: {
            workspace: {
              include: {
                projects: true,
              },
            },
          },
        },
      },
    });

    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        passwordHash: user.passwordHash,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
        workspaceMemberships: user.workspaceMemberships,
        role: (user.workspaceMemberships[0]?.role as WorkspaceRole) || "VIEWER",
        workspaceSlug: user.workspaceMemberships[0]?.workspace?.slug,
        projectKey: user.workspaceMemberships[0]?.workspace?.projects[0]?.key,
      };
    }
  } catch (error) {
    console.error("[DB] findUserByEmail error:", error);
  }

  return null;
}

export async function findUserById(id: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        workspaceMemberships: {
          include: {
            workspace: {
              include: {
                projects: true,
              },
            },
          },
        },
      },
    });

    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
        workspaceMemberships: user.workspaceMemberships,
        workspaceSlug: user.workspaceMemberships[0]?.workspace?.slug,
        projectKey: user.workspaceMemberships[0]?.workspace?.projects[0]?.key,
      };
    }
  } catch (error) {
    console.error("[DB] findUserById error:", error);
  }

  return null;
}

export async function getUserWorkspaces(userId: string): Promise<(Workspace & { currentUserRole?: WorkspaceRole })[]> {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      include: {
        workspace: {
          include: {
            projects: {
              include: {
                columns: true,
              },
            },
            members: { include: { user: { select: SAFE_USER_SELECT } } },
            teams: true,
          },
        },
      },
    });
    return memberships.map((m) => ({
      ...(m.workspace as unknown as Workspace),
      currentUserRole: m.role as WorkspaceRole,
    }));
  } catch (error) {
    console.error("[DB] getUserWorkspaces error:", error);
    return [];
  }
}

export async function createWorkspace(data: {
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  projectName?: string;
  projectKey?: string;
}): Promise<{ workspace: Workspace; primaryProjectKey: string }> {
  const cleanSlug = data.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  const cleanName = data.name.trim();
  const cleanProjectName = data.projectName?.trim() || `${cleanName} Board`;

  let cleanProjectKey = data.projectKey?.toUpperCase().trim().replace(/[^A-Z0-9]/g, "") || "";
  if (!cleanProjectKey || cleanProjectKey.length < 2) {
    cleanProjectKey = cleanName.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "PRJ";
  }

  const existing = await prisma.workspace.findUnique({
    where: { slug: cleanSlug },
  });
  if (existing) {
    throw new Error(`Workspace with slug "${cleanSlug}" already exists. Please pick a different URL.`);
  }

  const created = await prisma.workspace.create({
    data: {
      name: cleanName,
      slug: cleanSlug,
      description: data.description?.trim() || null,
      ownerId: data.ownerId,
      members: {
        create: {
          userId: data.ownerId,
          role: "OWNER",
        },
      },
      labels: {
        create: [
          { name: "Frontend", color: "#06b6d4" },
          { name: "Backend", color: "#6366f1" },
          { name: "Design", color: "#ec4899" },
          { name: "DevOps", color: "#10b981" },
          { name: "Bug", color: "#ef4444" },
        ],
      },
      teams: {
        create: {
          name: "Engineering",
          description: "Core engineering & product squad",
          color: "#6366f1",
          members: {
            create: {
              userId: data.ownerId,
              role: "LEAD",
            },
          },
        },
      },
      projects: {
        create: {
          name: cleanProjectName,
          key: cleanProjectKey,
          description: `Primary project board for ${cleanName}`,
          status: "ACTIVE",
          priority: "MEDIUM",
          leadId: data.ownerId,
          columns: {
            create: [
              { name: "Backlog", position: 0, wipLimit: null, color: "#64748b" },
              { name: "To Do", position: 1, wipLimit: 8, color: "#3b82f6" },
              { name: "In Progress", position: 2, wipLimit: 4, color: "#eab308" },
              { name: "In Review", position: 3, wipLimit: 3, color: "#a855f7" },
              { name: "Done", position: 4, wipLimit: null, color: "#22c55e" },
            ],
          },
        },
      },
    },
    include: {
      members: {
        include: { user: { select: SAFE_USER_SELECT } },
      },
      projects: {
        include: {
          columns: {
            include: {
              tasks: true,
            },
          },
        },
      },
      labels: true,
      teams: {
        include: {
          members: true,
        },
      },
    },
  });

  // Link initial project to default team
  const defaultTeam = created.teams?.[0];
  if (defaultTeam && created.projects[0]) {
    await prisma.project.update({
      where: { id: created.projects[0].id },
      data: { teamId: defaultTeam.id },
    });
  }

  await prisma.activityLog.create({
    data: {
      workspaceId: created.id,
      projectId: created.projects[0].id,
      actorId: data.ownerId,
      action: "WORKSPACE_CREATED",
      details: `Created workspace ${created.name}`,
    },
  });


  return {
    workspace: created as unknown as Workspace,
    primaryProjectKey: cleanProjectKey,
  };
}

export async function createUserWithWorkspace(data: {
  name: string;
  email: string;
  passwordHash: string;
  emailVerified?: boolean;
}): Promise<{ user: User; workspaceSlug: string; projectKey: string }> {
  const cleanEmail = data.email.toLowerCase().trim();
  const baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 15) || "team";
  const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
  const avatarUrl = `https://avatar.vercel.sh/${encodeURIComponent(cleanEmail)}`;

  const createdUser = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email: cleanEmail,
      passwordHash: data.passwordHash,
      avatarUrl,
      emailVerified: data.emailVerified ?? false,
      emailVerifiedAt: data.emailVerified ? new Date() : null,
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: `${data.name.trim()}'s Workspace`,
      slug: uniqueSlug,
      description: `Personal workspace for ${data.name.trim()}`,
      ownerId: createdUser.id,
      members: {
        create: {
          userId: createdUser.id,
          role: "OWNER",
        },
      },
      projects: {
        create: {
          name: `${data.name.trim()}'s First Board`,
          key: "PRJ",
          description: "Starter Kanban project",
          status: "ACTIVE",
          priority: "MEDIUM",
          leadId: createdUser.id,
          columns: {
            create: [
              { name: "Backlog", position: 0, wipLimit: null, color: "#64748b" },
              { name: "To Do", position: 1, wipLimit: 8, color: "#3b82f6" },
              { name: "In Progress", position: 2, wipLimit: 4, color: "#eab308" },
              { name: "In Review", position: 3, wipLimit: 3, color: "#a855f7" },
              { name: "Done", position: 4, wipLimit: null, color: "#22c55e" },
            ],
          },
        },
      },
    },
    include: {
      projects: true,
    },
  });

  return {
    user: {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name,
      avatarUrl: createdUser.avatarUrl,
      role: "OWNER",
      emailVerified: createdUser.emailVerified,
      emailVerifiedAt: createdUser.emailVerifiedAt ? createdUser.emailVerifiedAt.toISOString() : null,
    },
    workspaceSlug: workspace.slug,
    projectKey: workspace.projects[0]?.key || "PRJ",
  };
}

/**
 * Creates or refreshes an email verification token for a user.
 */
export async function createEmailVerificationToken(email: string) {
  const cleanEmail = email.toLowerCase().trim();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.verificationToken.deleteMany({
    where: { email: cleanEmail },
  });

  return await prisma.verificationToken.create({
    data: {
      email: cleanEmail,
      token,
      expiresAt,
    },
  });
}

/**
 * Validates a verification token, marks user email as verified, and clears the token.
 */
export async function verifyEmailByToken(token: string) {
  const tokenRecord = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!tokenRecord) {
    return { success: false, error: "Invalid or already used verification link." };
  }

  if (new Date() > tokenRecord.expiresAt) {
    await prisma.verificationToken.delete({ where: { id: tokenRecord.id } }).catch(() => {});
    return { success: false, error: "Verification link has expired. Please request a new one." };
  }

  const user = await prisma.user.findUnique({
    where: { email: tokenRecord.email },
    include: {
      workspaceMemberships: {
        include: {
          workspace: {
            include: {
              projects: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return { success: false, error: "Account associated with this email not found." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.verificationToken.delete({
    where: { id: tokenRecord.id },
  }).catch(() => {});

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: (user.workspaceMemberships[0]?.role as WorkspaceRole) || "OWNER",
      workspaceSlug: user.workspaceMemberships[0]?.workspace?.slug,
      projectKey: user.workspaceMemberships[0]?.workspace?.projects[0]?.key,
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString(),
    },
  };
}
