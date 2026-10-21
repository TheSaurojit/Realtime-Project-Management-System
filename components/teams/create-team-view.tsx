"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Workspace, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  Users2,
  ArrowLeft,
  Check,
  AlertCircle,
  Sparkles,
  Search,
  Crown,
} from "lucide-react";

const TEAM_COLORS = [
  { name: "Indigo", hex: "#6366f1" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Rose", hex: "#ef4444" },
  { name: "Pink", hex: "#ec4899" },
];

export function CreateTeamView({
  workspace,
  currentUser,
}: {
  workspace: Workspace;
  currentUser: User;
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([currentUser.id]);
  const [leadId, setLeadId] = useState<string>(currentUser.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fallbackHref =
    workspace.projects && workspace.projects.length > 0
      ? `/workspace/${workspace.slug}/project/${workspace.projects[0].key}`
      : `/workspaces`;

  const workspaceMembers = workspace.members || [];

  const filteredMembers = workspaceMembers.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = m.user.name?.toLowerCase().includes(q);
    const emailMatch = m.user.email?.toLowerCase().includes(q);
    return nameMatch || emailMatch;
  });

  const toggleMember = (userId: string) => {
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

  const selectAll = () => {
    const allIds = workspaceMembers.map((m) => m.userId);
    setSelectedUserIds(allIds);
    if (!leadId && allIds.length > 0) {
      setLeadId(allIds[0]);
    }
  };

  const deselectAll = () => {
    setSelectedUserIds([]);
    setLeadId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/workspace/${workspace.id}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          memberIds: selectedUserIds,
          leadId: leadId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create team");
      }

      // Navigate to newly created team's dedicated page and refresh sidebar
      if (data.team?.id) {
        router.push(`/workspace/${workspace.slug}/teams/${data.team.id}`);
      } else {
        router.push(fallbackHref);
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  const selectedMembersData = workspaceMembers.filter((m) =>
    selectedUserIds.includes(m.userId)
  );

  const teamLeadUser = workspaceMembers.find((m) => m.userId === leadId)?.user;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Link
            href={fallbackHref}
            className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Workspace</span>
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-semibold">New Team</span>
        </div>

        {/* Page Title & Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"
                style={{ backgroundColor: color }}
              >
                <Users2 className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Create New Team
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Group workspace members into a dedicated squad or department in{" "}
              <strong className="text-slate-700 dark:text-slate-200">{workspace.name}</strong>.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-3 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Card 1: Team Information */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
              Team Information
            </h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Team Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Core Engineering, Product Design, Marketing & Growth"
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this squad's core responsibilities and focus areas..."
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all resize-none font-normal"
                />
              </div>

              {/* Accent Color Palette */}
              <div className="space-y-2.5 pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Team Color
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  {TEAM_COLORS.map((c) => {
                    const isSelected = color === c.hex;
                    return (
                      <button
                        type="button"
                        key={c.hex}
                        onClick={() => setColor(c.hex)}
                        disabled={isSubmitting}
                        style={{ backgroundColor: c.hex }}
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900 scale-110 shadow-lg"
                            : "opacity-80 hover:opacity-100 hover:scale-105"
                        }`}
                        title={c.name}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Assign Workspace Members */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                  Assign Members ({selectedUserIds.length} of {workspaceMembers.length} selected)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select which workspace members belong to this team, and optionally designate a Team Lead.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Member Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter members by name or email..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Members List */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredMembers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No workspace members found matching &quot;{searchQuery}&quot;.
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = selectedUserIds.includes(member.userId);
                  const isLead = leadId === member.userId;

                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleMember(member.userId)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 shadow-xs"
                          : "bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Custom checkbox */}
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        {/* User avatar and details */}
                        <Avatar user={member.user} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {member.user.name || member.user.email}
                            </span>
                            {member.userId === currentUser.id && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                You
                              </span>
                            )}
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold uppercase">
                              {member.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {member.user.email}
                          </p>
                        </div>
                      </div>

                      {/* Designate Lead Action */}
                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLeadId(member.userId);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                            isLead
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                          title={isLead ? "Current Team Lead" : "Make Team Lead"}
                        >
                          <Crown className={`w-3.5 h-3.5 ${isLead ? "text-amber-500 fill-amber-500" : ""}`} />
                          <span>{isLead ? "Team Lead" : "Set as Lead"}</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 3: Live Summary & Preview */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
              Live Team Preview
            </h2>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {name.trim() || "Untitled Team"}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {description.trim() || "No description provided"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {teamLeadUser && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
                    <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>Lead: {teamLeadUser.name || teamLeadUser.email}</span>
                  </div>
                )}

                <div className="flex items-center -space-x-2">
                  {selectedMembersData.slice(0, 5).map((m) => (
                    <Avatar key={m.userId} user={m.user} size="xs" className="ring-2 ring-white dark:ring-slate-900" />
                  ))}
                  {selectedMembersData.length > 5 && (
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                      +{selectedMembersData.length - 5}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href={fallbackHref}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Team...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create Team</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
