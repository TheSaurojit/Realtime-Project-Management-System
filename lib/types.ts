export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role?: WorkspaceRole;
  passwordHash?: string;
  workspaceSlug?: string;
  projectKey?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
}

export interface VerificationToken {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  expiresAt: string;
  inviterId: string;
  createdAt: string;
  inviter?: User;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: User;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  user: User;
}

export interface Team {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  members: TeamMember[];
}

export interface Label {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  content: string;
  isCompleted: boolean;
  position: number;
}

export interface Checklist {
  id: string;
  taskId: string;
  title: string;
  position: number;
  items: ChecklistItem[];
}

export interface Attachment {
  id: string;
  taskId: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploaderId: string;
  createdAt: string;
  uploader?: User;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: User;
}

export interface Task {
  id: string;
  projectId: string;
  columnId: string;
  taskKey: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  position: number;
  dueDate?: string | null;
  startDate?: string | null;
  points?: number | null;
  reporterId: string;
  createdAt: string;
  updatedAt: string;
  reporter?: User;
  assignees: { user: User }[];
  labels: { label: Label }[];
  checklists: Checklist[];
  attachments: Attachment[];
  comments: Comment[];
}

export interface BoardColumn {
  id: string;
  projectId: string;
  name: string;
  position: number;
  wipLimit?: number | null;
  color?: string | null;
  tasks: Task[];
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: User;
}

export interface Project {
  id: string;
  workspaceId: string;
  teamId?: string | null;
  name: string;
  key: string;
  description?: string | null;
  status: string;
  priority: TaskPriority;
  leadId?: string | null;
  icon?: string | null;
  color?: string | null;
  createdAt: string;
  columns: BoardColumn[];
  team?: (Team & { members?: { id: string; userId: string; role: string; user?: User }[] }) | null;
  lead?: User | null;
  members?: ProjectMember[];
  _count?: { tasks: number };
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  ownerId: string;
  members: WorkspaceMember[];
  teams: Team[];
  projects: Project[];
  labels: Label[];
  invitations?: WorkspaceInvitation[];
}

export interface ActivityLog {
  id: string;
  workspaceId: string;
  projectId: string;
  taskId?: string | null;
  actorId: string;
  action: string;
  details?: string | null;
  createdAt: string;
  actor?: User;
  task?: { id: string; taskKey: string; title: string } | null;
}

export interface Notification {
  id: string;
  userId: string;
  actorId: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
  actor?: User;
}

export type RealtimeEvent =
  | { type: "task:created"; payload: { task: Task; projectId: string } }
  | { type: "task:updated"; payload: { task: Task; projectId: string } }
  | { type: "task:moved"; payload: { taskId: string; sourceColumnId: string; destColumnId: string; newPosition: number; projectId: string } }
  | { type: "task:deleted"; payload: { taskId: string; columnId: string; projectId: string } }
  | { type: "comment:created"; payload: { comment: Comment; taskId: string; projectId: string } }
  | { type: "activity:created"; payload: { activity: ActivityLog; projectId: string } }
  | { type: "notification:created"; payload: { notification: Notification; userId: string } }
  | { type: "project:deleted"; payload: { projectId: string; workspaceId: string } };
