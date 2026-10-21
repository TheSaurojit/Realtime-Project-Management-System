"use client";

import { useState } from "react";
import {
  Project,
  User,
  Notification,
  WorkspaceRole,
} from "@/lib/types";
import {
  Kanban,
  CheckSquare,
  Calendar,
  Activity,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/ui/avatar";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { canEditTasks, canDeleteProject, ProjectRole } from "@/lib/rbac/permissions";
import { DeleteProjectModal } from "@/components/project/delete-project-modal";
import { ProjectMembersModal } from "@/components/project/project-members-modal";

export function Navbar({
  project,
  currentUser,
  currentView,
  onViewChange,
  onOpenCreateTask,
  onOpenSearch,
  notifications,
  isRealtimeConnected,
  realtimeTransport,
  effectiveAccess,
  workspaceMembers = [],
}: {
  project: Project;
  currentUser: User;
  currentView: "board" | "list" | "calendar" | "activity";
  onViewChange: (view: "board" | "list" | "calendar" | "activity") => void;
  onOpenCreateTask: () => void;
  onOpenSearch: () => void;
  notifications: Notification[];
  isRealtimeConnected: boolean;
  realtimeTransport: string;
  effectiveAccess?: {
    accessLevel: "MANAGE" | "WRITE" | "READ";
    projectRole: ProjectRole;
    workspaceRole: WorkspaceRole;
  };
  workspaceMembers?: { user: User; role: string; id: string; userId: string }[];
}) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  const canCreate = effectiveAccess
    ? effectiveAccess.accessLevel !== "READ"
    : canEditTasks((currentUser.role as WorkspaceRole) || "MEMBER");

  const canDelete = effectiveAccess
    ? effectiveAccess.projectRole === "OWNER" || effectiveAccess.projectRole === "ADMIN"
    : canDeleteProject((currentUser.role as WorkspaceRole) || "MEMBER");

  const canManageMembers = effectiveAccess
    ? effectiveAccess.projectRole === "OWNER" ||
      effectiveAccess.projectRole === "ADMIN" ||
      effectiveAccess.projectRole === "LEAD"
    : currentUser.role === "OWNER" || currentUser.role === "ADMIN";

  const viewTabs = [
    { id: "board", label: "Board", icon: Kanban },
    { id: "list", label: "List", icon: CheckSquare },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "activity", label: "Activity", icon: Activity },
  ] as const;

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md pl-14 pr-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Left: Project title & View Tabs */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-md"
            style={{ backgroundColor: project.color || "#3b82f6" }}
          />
          <h2 className="font-bold text-sm text-slate-900 dark:text-white">
            {project.name}
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
            {project.key}
          </span>

          {/* Project Members & Access Button */}
          <button
            type="button"
            onClick={() => setIsMembersModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
            title="View & manage project access"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Access</span>
          </button>

          {canDelete && (
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Delete Project"
              aria-label="Delete Project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Switcher Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          {viewTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onViewChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Quick Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Quick Search...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono text-slate-500">
            Ctrl+K
          </kbd>
        </button>

        {/* Real-time Status Badge */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300"
          title={`Real-Time Engine: ${realtimeTransport.toUpperCase()} connected`}
        >
          <span className="relative flex h-2 w-2">
            {isRealtimeConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="hidden md:inline font-mono uppercase text-[10px]">
            {realtimeTransport === "pusher" ? "Pusher Live" : "SSE Live"}
          </span>
        </div>

        {/* Presence Avatars */}
        <div className="hidden lg:flex items-center gap-1">
          <AvatarStack users={[currentUser]} max={3} size="xs" />
        </div>

        {/* Notification Dropdown */}
        <NotificationDropdown
          initialNotifications={notifications}
          userId={currentUser.id}
        />

        {/* Create Task Button */}
        {canCreate ? (
          <Button
            size="sm"
            onClick={onOpenCreateTask}
            className="shadow-xs shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Task
          </Button>
        ) : (
          <span
            className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/60"
            title={
              effectiveAccess?.projectRole === "NON_MEMBER"
                ? "You are not a member of this project squad (Read-only guest)"
                : "Read-only access"
            }
          >
            {effectiveAccess?.projectRole === "NON_MEMBER"
              ? "Guest (Read-only)"
              : "Viewer (Read-only)"}
          </span>
        )}
      </div>

      {isDeleteModalOpen && (
        <DeleteProjectModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          project={project}
        />
      )}

      {isMembersModalOpen && (
        <ProjectMembersModal
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          project={project}
          canManage={canManageMembers}
          currentUser={currentUser}
          workspaceMembers={workspaceMembers}
        />
      )}
    </header>
  );
}
