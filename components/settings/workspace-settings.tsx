"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Workspace, User, WorkspaceRole, WorkspaceInvitation, Project } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { canManageMembers, ROLE_COLORS } from "@/lib/rbac/permissions";
import { DeleteProjectModal } from "@/components/project/delete-project-modal";
import {
  Mail,
  UserMinus,
  UserPlus,
  Check,
  AlertCircle,
  Clock,
  Copy,
  Trash2,
  CheckCircle2,
  X,
  Kanban,
  Plus,
  ArrowRight,
} from "lucide-react";

export function WorkspaceSettingsView({
  workspace,
  currentUser,
}: {
  workspace: Workspace;
  currentUser: User;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(workspace.members || []);
  const [projects, setProjects] = useState<Project[]>(workspace.projects || []);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>(
    workspace.invitations || []
  );
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("MEMBER");
  const [isInviting, setIsInviting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Success Popup Modal state
  const [inviteSuccessModal, setInviteSuccessModal] = useState<{
    email: string;
    role: WorkspaceRole;
    inviteLink: string;
    emailSent: boolean;
  } | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modalCopied, setModalCopied] = useState(false);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);

  const canManage = canManageMembers((currentUser.role as WorkspaceRole) || "MEMBER");

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleModalCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setModalCopied(true);
    setTimeout(() => setModalCopied(false), 2000);
  };

  const handleRoleChange = async (userId: string, newRole: WorkspaceRole) => {
    if (!canManage || userId === currentUser.id) {
      if (userId === currentUser.id) {
        setMessage({ type: "error", text: "You cannot change your own role." });
      }
      return;
    }

    setMembers((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, role: newRole } : m))
    );

    try {
      const res = await fetch(`/api/workspace/${workspace.id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to update member role." });
        return;
      }
      setMessage({ type: "success", text: "Member role updated successfully." });
    } catch {
      setMessage({ type: "error", text: "Failed to update member role." });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!canManage) return;
    if (!confirm("Are you sure you want to remove this member from the workspace?")) return;

    setMembers((prev) => prev.filter((m) => m.userId !== userId));

    try {
      await fetch(`/api/workspace/${workspace.id}/members?userId=${userId}`, {
        method: "DELETE",
      });
      setMessage({ type: "success", text: "Member removed from workspace." });
    } catch {
      setMessage({ type: "error", text: "Failed to remove member." });
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!canManage) return;
    if (!confirm("Are you sure you want to revoke this pending invitation?")) return;

    setIsRevoking(invitationId);
    try {
      const res = await fetch(
        `/api/workspace/${workspace.id}/invitations?invitationId=${invitationId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
        setMessage({ type: "success", text: "Invitation revoked successfully." });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to revoke invitation." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to revoke invitation." });
    } finally {
      setIsRevoking(null);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !canManage) return;

    setIsInviting(true);
    try {
      const res = await fetch(`/api/workspace/${workspace.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();

      if (res.ok) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const fullLink = data.inviteLink ? `${origin}${data.inviteLink}` : "";

        // Open the success popup modal
        setInviteSuccessModal({
          email: inviteEmail.trim(),
          role: inviteRole,
          inviteLink: fullLink,
          emailSent: Boolean(data.emailSent),
        });

        // Add to pending invitations list if returned
        if (data.invitation) {
          setInvitations((prev) => [
            data.invitation,
            ...prev.filter((i) => i.id !== data.invitation.id && i.email !== data.invitation.email),
          ]);
        }

        // If user already existed and was directly added as member
        if (data.member) {
          setMembers((prev) => [
            ...prev.filter((m) => m.userId !== data.member.userId),
            data.member,
          ]);
        }

        setInviteEmail("");
        setMessage(null);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to invite user." });
      }
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="flex-1 p-4 pt-16 md:p-6 bg-slate-50/50 dark:bg-slate-950 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Workspace Settings & Access Control (RBAC)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure workspace permissions, team structures, and membership roles.
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
              message.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-xs font-bold">
              ×
            </button>
          </div>
        )}

        {!canManage && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              You are signed in as <strong>{currentUser.role}</strong>. Only <strong>OWNER</strong> and <strong>ADMIN</strong> roles can invite or modify member permissions. Use the user switcher in the bottom-left sidebar to test with an Owner/Admin account!
            </span>
          </div>
        )}

        {/* Workspace Info Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Workspace Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-1 font-medium">Name</span>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                {workspace.name}
              </p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1 font-medium">Slug</span>
              <p className="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block">
                /{workspace.slug}
              </p>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 block mb-1 font-medium">Description</span>
              <p className="text-slate-600 dark:text-slate-300">
                {workspace.description}
              </p>
            </div>
          </div>
        </div>

        {/* Projects Management Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Kanban className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Workspace Projects ({projects.length})
              </h3>
            </div>
            <Link
              href={`/workspace/${workspace.slug}/project/create`}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </Link>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage projects, boards, and workflows associated with this workspace.
          </p>

          {projects.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: proj.color || "#6366f1" }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/workspace/${workspace.slug}/project/${proj.key}`}
                          className="text-xs font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate"
                        >
                          {proj.name}
                        </Link>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {proj.key}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        {proj.team ? (
                          <span>
                            Squad: <strong className="text-slate-600 dark:text-slate-300">{proj.team.name}</strong>
                          </span>
                        ) : (
                          <span>General</span>
                        )}
                        <span>•</span>
                        <span>
                          {proj._count?.tasks ??
                            proj.columns?.reduce((acc, col) => acc + (col.tasks?.length || 0), 0) ??
                            0}{" "}
                          tasks
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/workspace/${workspace.slug}/project/${proj.key}`}
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors inline-flex items-center gap-1"
                    >
                      <span>Open Board</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setProjectToDelete(proj)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title={`Delete ${proj.name}`}
                        aria-label={`Delete ${proj.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              No projects in this workspace yet.
            </div>
          )}
        </div>

        {/* Invite Member Section */}
        {canManage && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Invite Workspace Member
              </h3>
            </div>
            <form onSubmit={handleInvite} className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px]">
                <input
                  type="email"
                  required
                  placeholder="colleague@acme.io"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                className="text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="MEMBER">Member (Create & Edit tasks)</option>
                <option value="ADMIN">Admin (Full project & user control)</option>
                <option value="VIEWER">Viewer (Read-only access)</option>
              </select>

              <Button type="submit" size="sm" isLoading={isInviting} disabled={!inviteEmail.trim()}>
                Send Invite
              </Button>
            </form>
          </div>
        )}

        {/* Pending Invitations Section */}
        {canManage && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Pending Invitations ({invitations.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Awaiting teammate acceptance
              </span>
            </div>

            {invitations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No pending invitations. When you invite new teammates by email, they will appear here.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {invitations.map((inv) => {
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const inviteLink = `${origin}/api/workspace/invite?token=${inv.token}&ws=${encodeURIComponent(workspace.slug)}`;
                  const isCopied = copiedId === inv.id;

                  return (
                    <div
                      key={inv.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {inv.email}
                            </p>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                ROLE_COLORS[inv.role] || ""
                              }`}
                            >
                              {inv.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              Invited {inv.inviter ? `by ${inv.inviter.name}` : ""} • Expires{" "}
                              {new Date(inv.expiresAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleCopy(inviteLink, inv.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Copy invitation link"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                Copied!
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isRevoking === inv.id}
                          onClick={() => handleRevokeInvitation(inv.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Revoke invitation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Members List Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Workspace Members ({members.length})
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {members.map((member) => {
              const isOwner = member.role === "OWNER";
              const isSelf = member.userId === currentUser.id;

              return (
                <div
                  key={member.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar user={member.user} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {member.user.name}
                        </p>
                        {isSelf && (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold px-1.5 py-0.2 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {member.user.email}
                      </p>
                    </div>
                  </div>

                  {/* Role Selector & Actions */}
                  <div className="flex items-center gap-3">
                    {isOwner ? (
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 px-2.5 py-1 rounded-lg">
                        OWNER
                      </span>
                    ) : isSelf ? (
                      <span
                        className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                        title="You cannot modify your own role"
                      >
                        {member.role}
                      </span>
                    ) : canManage ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(member.userId, e.target.value as WorkspaceRole)
                        }
                        className="text-xs py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    ) : (
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        {member.role}
                      </span>
                    )}

                    {canManage && !isOwner && !isSelf && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Invitation Sent Success Modal Popup */}
      {inviteSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setInviteSuccessModal(null)}
              className="absolute right-4 top-4 p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Success icon & title */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Invitation Sent Successfully!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {inviteSuccessModal.emailSent
                    ? "An email invitation has been dispatched via Resend."
                    : "Invitation link generated (email logged in terminal)."}
                </p>
              </div>
            </div>

            {/* Recipient summary card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Recipient:</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[220px]">
                  {inviteSuccessModal.email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Role:</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    ROLE_COLORS[inviteSuccessModal.role] || ""
                  }`}
                >
                  {inviteSuccessModal.role}
                </span>
              </div>
            </div>

            {/* Shareable Invite Link */}
            {inviteSuccessModal.inviteLink && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Shareable Invitation Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteSuccessModal.inviteLink}
                    className="flex-1 text-[11px] font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 select-all focus:outline-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleModalCopy(inviteSuccessModal.inviteLink)}
                    className="shrink-0 text-xs h-9"
                  >
                    {modalCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400">
                  This invitation link is valid for 7 days. Anyone with this link can join the workspace.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2">
              <Button
                type="button"
                className="w-full"
                size="md"
                onClick={() => setInviteSuccessModal(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {projectToDelete && (
        <DeleteProjectModal
          isOpen={Boolean(projectToDelete)}
          onClose={() => setProjectToDelete(null)}
          project={projectToDelete}
          workspaceSlug={workspace.slug}
          onSuccess={() => {
            const deleted = projectToDelete;
            setProjects((prev) => prev.filter((p) => p.id !== deleted.id));
            setProjectToDelete(null);
            setMessage({
              type: "success",
              text: `Project "${deleted.name}" (${deleted.key}) was deleted successfully.`,
            });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
