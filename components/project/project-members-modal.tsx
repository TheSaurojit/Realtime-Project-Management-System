"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { User, Project } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Users,
  X,
  Crown,
  UserPlus,
  Trash2,
  Loader2,
  Users2,
} from "lucide-react";

const emptySubscribe = () => () => {};

interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  canManage: boolean;
  currentUser: User;
  workspaceMembers?: { user: User; role: string; id: string; userId: string }[];
}

export function ProjectMembersModal({
  isOpen,
  onClose,
  project,
  canManage,
  currentUser,
  workspaceMembers = [],
}: ProjectMembersModalProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [members, setMembers] = useState(project.members || []);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("CONTRIBUTOR");
  const [isAdding, setIsAdding] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleClose = useCallback(() => {
    setMessage(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen || !isClient) return null;

  // Existing member IDs to exclude from "Add Member" dropdown
  const directMemberIds = new Set(members.map((m) => m.userId));
  const squadMembers = project.team?.members || [];

  // Eligible workspace members to add as direct project members
  const availableUsers = workspaceMembers.filter(
    (wm) => !directMemberIds.has(wm.userId) && wm.userId !== project.leadId
  );

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setIsAdding(true);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/workspace/${project.workspaceId}/projects/${project.id}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUserId,
            role: selectedRole,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign project member.");
      }

      setMembers((prev) => [...prev, data.member]);
      setSelectedUserId("");
      setMessage({ type: "success", text: "Member added to project successfully." });
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to add project member.",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member from the project?")) return;

    setRemovingUserId(userId);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/workspace/${project.workspaceId}/projects/${project.id}/members?userId=${userId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove project member.");
      }

      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      setMessage({ type: "success", text: "Member removed from project." });
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to remove member.",
      });
    } finally {
      setRemovingUserId(null);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg m-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200 z-10">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Project Access & Members
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Users authorized to view and modify cards on <strong>{project.name}</strong>.
            </p>
          </div>
        </div>

        {/* Feedback message */}
        {message && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
              message.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-xs font-bold cursor-pointer">
              ×
            </button>
          </div>
        )}

        {/* Add Member Form (Only for Leads / Admins) */}
        {canManage && availableUsers.length > 0 && (
          <form onSubmit={handleAddMember} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Grant Direct Project Access</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              >
                <option value="">Select workspace user...</option>
                {availableUsers.map((wm) => (
                  <option key={wm.userId} value={wm.userId}>
                    {wm.user.name} ({wm.user.email}) - {wm.role}
                  </option>
                ))}
              </select>

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="CONTRIBUTOR">Contributor (Edit tasks)</option>
                <option value="VIEWER">Viewer (Read-only)</option>
                <option value="LEAD">Project Lead</option>
              </select>

              <Button
                type="submit"
                size="sm"
                disabled={!selectedUserId || isAdding}
                className="shrink-0 font-semibold"
              >
                {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
              </Button>
            </div>
          </form>
        )}

        {/* Members List Container */}
        <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
          {/* 1. Project Lead */}
          {project.lead && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Project Lead
              </span>
              <div className="p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar user={project.lead} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {project.lead.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{project.lead.email}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Crown className="w-3 h-3 fill-amber-500 text-amber-500" />
                  Lead
                </span>
              </div>
            </div>
          )}

          {/* 2. Squad / Team Members */}
          {project.team && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Assigned Squad: {project.team.name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {squadMembers.length} member{squadMembers.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500 flex items-center gap-2">
                <Users2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>
                  All members of squad <strong>{project.team.name}</strong> automatically inherit task write permissions on this board.
                </span>
              </div>
            </div>
          )}

          {/* 3. Direct Project Members */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Direct Project Members ({members.length})
            </span>

            {members.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                {members.map((m) => {
                  const isLeadRole = m.role === "LEAD";
                  const isSelf = m.userId === currentUser.id;

                  return (
                    <div
                      key={m.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar user={m.user} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {m.user.name}
                            {isSelf && (
                              <span className="ml-1 text-[10px] text-slate-400 font-normal">
                                (You)
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{m.user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isLeadRole
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                              : m.role === "CONTRIBUTOR"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {m.role}
                        </span>

                        {canManage && !isSelf && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.userId)}
                            disabled={removingUserId === m.userId}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Remove project member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2">
                No direct project members assigned yet.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <Button type="button" size="sm" onClick={handleClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
