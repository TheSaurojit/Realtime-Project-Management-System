"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Workspace, User, Team } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { DeleteProjectModal } from "@/components/project/delete-project-modal";
import {
  Users,
  Users2,
  ArrowLeft,
  Crown,
  Search,
  Plus,
  Trash2,
  AlertCircle,
  Kanban,
  Check,
  ArrowRight,
  UserPlus,
} from "lucide-react";

interface TeamWithDetails extends Team {
  workspace: {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    members: { user: User; role: string; id: string; userId: string }[];
  };
  projects?: {
    id: string;
    name: string;
    key: string;
    color?: string | null;
    status: string;
    description?: string | null;
    _count?: { tasks: number };
  }[];
}

export function TeamDetailView({
  team,
  workspace,
  currentUser,
  canManage,
}: {
  team: TeamWithDetails;
  workspace: Workspace;
  currentUser: User;
  canManage: boolean;
}) {
  const router = useRouter();

  const [members, setMembers] = useState(team.members || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{
    id: string;
    name: string;
    key: string;
    workspaceId: string;
  } | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    (team.members || []).map((m) => m.userId)
  );
  const [leadId, setLeadId] = useState<string>(
    team.members?.find((m) => m.role === "LEAD")?.userId ||
      team.members?.[0]?.userId ||
      ""
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if team changes via client router navigation or revalidation
  const [prevTeam, setPrevTeam] = useState(team);
  if (team !== prevTeam) {
    setPrevTeam(team);
    setMembers(team.members || []);
    setSelectedUserIds((team.members || []).map((m) => m.userId));
    setLeadId(
      team.members?.find((m) => m.role === "LEAD")?.userId ||
        team.members?.[0]?.userId ||
        ""
    );
    setSearchQuery("");
    setError(null);
  }

  const fallbackHref =
    workspace.projects && workspace.projects.length > 0
      ? `/workspace/${workspace.slug}/project/${workspace.projects[0].key}`
      : `/workspaces`;

  const workspaceMembers = workspace?.members?.length
    ? workspace.members
    : team.workspace?.members || [];

  const teamLead =
    members.find((m) => m.role === "LEAD") ||
    (members.length > 0 ? members[0] : null);

  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = m.user?.name?.toLowerCase().includes(q);
    const emailMatch = m.user?.email?.toLowerCase().includes(q);
    const roleMatch = m.role?.toLowerCase().includes(q);
    return Boolean(nameMatch || emailMatch || roleMatch);
  });

  const handleOpenManageModal = () => {
    setSelectedUserIds(members.map((m) => m.userId));
    setLeadId(members.find((m) => m.role === "LEAD")?.userId || members[0]?.userId || "");
    setError(null);
    setIsManageModalOpen(true);
  };

  const handleToggleMember = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      const next = selectedUserIds.filter((id) => id !== userId);
      setSelectedUserIds(next);
      if (leadId === userId) {
        setLeadId(next[0] || "");
      }
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
      if (!leadId) {
        setLeadId(userId);
      }
    }
  };

  const handleSaveMembers = async () => {
    setIsUpdating(true);
    setError(null);

    try {
      const res = await fetch(`/api/workspace/${workspace.id}/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: selectedUserIds,
          leadId: leadId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update team members");
      }

      setMembers(data.team.members || []);
      setIsManageModalOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveSingleMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member from the team?")) return;

    const remainingIds = members.map((m) => m.userId).filter((id) => id !== userId);
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/workspace/${workspace.id}/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: remainingIds,
          leadId: leadId === userId ? remainingIds[0] || undefined : leadId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove member");
      }

      setMembers(data.team.members || []);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetLead = async (userId: string) => {
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/workspace/${workspace.id}/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: userId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to set team lead");
      }

      setMembers(data.team.members || []);
      setLeadId(userId);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to set team lead");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirm(`Are you sure you want to delete the team "${team.name}"? Assigned projects will remain in the workspace.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/workspace/${workspace.id}/teams/${team.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete team");
      }

      router.push(fallbackHref);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete team");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Link
            href={fallbackHref}
            className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Workspace</span>
          </Link>
          <span>/</span>
          <span className="text-slate-500">Teams</span>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-semibold">{team.name}</span>
        </div>

        {/* Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: team.color || "#6366f1" }}
              >
                <Users2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {team.name}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {team.description || `Squad in workspace /${workspace.slug}`}
                </p>
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2.5 pt-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-500" />
                <span>{members.length} member{members.length === 1 ? "" : "s"}</span>
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Kanban className="w-3 h-3 text-slate-500" />
                <span>{team.projects?.length ?? 0} project{team.projects?.length === 1 ? "" : "s"}</span>
              </span>
            </div>
          </div>

          {/* Action Buttons for Owners / Admins */}
          {canManage && (
            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                type="button"
                onClick={handleOpenManageModal}
                className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Manage Members</span>
              </Button>

              <button
                type="button"
                onClick={handleDeleteTeam}
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                title="Delete Team"
                aria-label="Delete Team"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Team Lead Spotlight (if designated) */}
        {teamLead && (
          <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <Avatar user={teamLead.user} size="lg" className="ring-2 ring-amber-500/50" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Crown className="w-3 h-3 fill-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Team Lead
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-semibold font-mono">
                    {teamLead.role === "LEAD" ? "LEAD" : "REPRESENTATIVE"}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {teamLead.user?.name || teamLead.user?.email || "Team Lead"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {teamLead.user?.email}
                </p>
              </div>
            </div>

            <span className="text-xs text-slate-400 font-medium">
              Overseeing squad operations and project coordination
            </span>
          </div>
        )}

        {/* Team Members List Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                Squad Members ({members.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                All workspace collaborators assigned to {team.name}.
              </p>
            </div>

            {/* Filter */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team members..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Members Grid / List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredMembers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-3">
                {searchQuery ? (
                  <p>No members found matching &quot;{searchQuery}&quot;.</p>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-200">No members assigned to this squad yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Assign workspace collaborators to give them access to this squad.</p>
                    </div>
                    {canManage && (
                      <Button
                        type="button"
                        onClick={handleOpenManageModal}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                        <span>Add Members Now</span>
                      </Button>
                    )}
                  </>
                )}
              </div>
            ) : (
              filteredMembers.map((member) => {
                const isLead = member.role === "LEAD";
                const isCurrent = member.userId === currentUser.id;
                const wsMember = workspaceMembers.find((m) => m.userId === member.userId);
                const workspaceRole = wsMember?.role || "MEMBER";

                return (
                  <div
                    key={member.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar user={member.user} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {member.user?.name || member.user?.email || "Workspace Member"}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                              You
                            </span>
                          )}
                          {isLead ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center gap-1 border border-amber-200 dark:border-amber-900">
                              <Crown className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                              <span>Team Lead</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase">
                              {member.role || "MEMBER"}
                            </span>
                          )}
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-medium">
                            {workspaceRole}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {member.user?.email}
                        </p>
                      </div>
                    </div>

                    {/* Member actions for authorized admins */}
                    {canManage && (
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {!isLead && (
                          <button
                            type="button"
                            onClick={() => handleSetLead(member.userId)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            title="Promote to Team Lead"
                          >
                            <Crown className="w-3 h-3 text-slate-400 hover:text-amber-500" />
                            <span>Make Lead</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveSingleMember(member.userId)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Remove member from squad"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Assigned Projects Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                Assigned Projects ({team.projects?.length ?? 0})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Active boards and workflows owned by this squad.
              </p>
            </div>

            <Link
              href={`/workspace/${workspace.slug}/project/create`}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </Link>
          </div>

          {team.projects && team.projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {team.projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/60 dark:hover:border-indigo-500/60 transition-all group flex items-center justify-between"
                >
                  <Link
                    href={`/workspace/${workspace.slug}/project/${proj.key}`}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: proj.color || "#6366f1" }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {proj.name}
                        </h4>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {proj.key}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {proj._count?.tasks ?? 0} task{(proj._count?.tasks ?? 0) === 1 ? "" : "s"}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-1 shrink-0 pl-2">
                    {canManage && (
                      <button
                        type="button"
                        onClick={() =>
                          setProjectToDelete({
                            id: proj.id,
                            name: proj.name,
                            key: proj.key,
                            workspaceId: workspace.id,
                          })
                        }
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title={`Delete ${proj.name}`}
                        aria-label={`Delete ${proj.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <Link
                      href={`/workspace/${workspace.slug}/project/${proj.key}`}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Open Project"
                    >
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <Kanban className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No projects assigned to this squad yet
              </p>
              <p className="text-[11px] text-slate-400">
                You can assign new or existing projects to this squad when creating them.
              </p>
              <div className="pt-2">
                <Link
                  href={`/workspace/${workspace.slug}/project/create`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Project</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manage Members Modal */}
      <Modal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        maxWidth="lg"
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Manage Squad Members
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Assign or remove collaborators from <strong>{team.name}</strong>.
              </p>
            </div>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>
              <strong>{selectedUserIds.length}</strong> of {workspaceMembers.length} members selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedUserIds(workspaceMembers.map((m) => m.userId))}
                className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span>|</span>
              <button
                type="button"
                onClick={() => setSelectedUserIds([])}
                className="text-[11px] font-semibold text-slate-500 hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {workspaceMembers.map((m) => {
              const isSelected = selectedUserIds.includes(m.userId);
              const isLead = leadId === m.userId;

              return (
                <div
                  key={m.id}
                  onClick={() => handleToggleMember(m.userId)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60"
                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <Avatar user={m.user} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {m.user?.name || m.user?.email}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold uppercase">
                          {m.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{m.user?.email}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLeadId(m.userId);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        isLead
                          ? "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Crown className={`w-3 h-3 ${isLead ? "text-amber-500 fill-amber-500" : ""}`} />
                      <span>{isLead ? "Lead" : "Set Lead"}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsManageModalOpen(false)}
              disabled={isUpdating}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveMembers}
              disabled={isUpdating}
              className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {projectToDelete && (
        <DeleteProjectModal
          isOpen={Boolean(projectToDelete)}
          onClose={() => setProjectToDelete(null)}
          project={projectToDelete}
          workspaceSlug={workspace.slug}
          onSuccess={() => {
            setProjectToDelete(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
