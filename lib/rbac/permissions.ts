import { WorkspaceRole } from "@/lib/types";

export const VALID_WORKSPACE_ROLES: WorkspaceRole[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];

export function isValidWorkspaceRole(role: unknown): role is WorkspaceRole {
  return typeof role === "string" && VALID_WORKSPACE_ROLES.includes(role as WorkspaceRole);
}

export const ROLE_COLORS: Record<WorkspaceRole, string> = {
  OWNER: "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  ADMIN: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  MEMBER: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  VIEWER: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
};

export type Permission =
  | "workspace:manage"
  | "workspace:invite"
  | "workspace:remove_member"
  | "project:create"
  | "project:edit"
  | "project:delete"
  | "column:manage"
  | "task:create"
  | "task:edit"
  | "task:move"
  | "task:delete"
  | "comment:create"
  | "view";

const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  OWNER: [
    "workspace:manage",
    "workspace:invite",
    "workspace:remove_member",
    "project:create",
    "project:edit",
    "project:delete",
    "column:manage",
    "task:create",
    "task:edit",
    "task:move",
    "task:delete",
    "comment:create",
    "view",
  ],
  ADMIN: [
    "workspace:invite",
    "workspace:remove_member",
    "project:create",
    "project:edit",
    "project:delete",
    "column:manage",
    "task:create",
    "task:edit",
    "task:move",
    "task:delete",
    "comment:create",
    "view",
  ],
  MEMBER: [
    "project:create",
    "column:manage",
    "task:create",
    "task:edit",
    "task:move",
    "comment:create",
    "view",
  ],
  VIEWER: [
    "view",
  ],
};

export function hasPermission(role: WorkspaceRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export function canManageMembers(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageTeams(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canDeleteProject(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}


export function canViewActivityLog(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canCreateProject(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}

export function canEditTasks(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}

export function isReadOnly(role: WorkspaceRole): boolean {
  return role === "VIEWER";
}

export type ProjectRole = "OWNER" | "ADMIN" | "LEAD" | "CONTRIBUTOR" | "VIEWER" | "NON_MEMBER";

export function canEditProjectTasks(role: ProjectRole): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "LEAD" || role === "CONTRIBUTOR";
}

export function canManageProjectMembers(role: ProjectRole): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "LEAD";
}


