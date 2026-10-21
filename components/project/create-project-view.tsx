"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Workspace, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  FolderPlus,
  Hash,
  ArrowLeft,
  Check,
  AlertCircle,
  Users,
  Sparkles,
} from "lucide-react";

const PROJECT_COLORS = [
  { name: "Indigo", hex: "#6366f1" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Rose", hex: "#ef4444" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Pink", hex: "#ec4899" },
];

const DEFAULT_STAGES = [
  { name: "Backlog", color: "bg-slate-400" },
  { name: "To Do", color: "bg-blue-500" },
  { name: "In Progress", color: "bg-amber-500" },
  { name: "In Review", color: "bg-purple-500" },
  { name: "Done", color: "bg-emerald-500" },
];

export function CreateProjectView({
  workspace,
}: {
  workspace: Workspace;
  currentUser?: User;
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [teamId, setTeamId] = useState<string>(workspace.teams?.[0]?.id || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fallbackHref =
    workspace.projects && workspace.projects.length > 0
      ? `/workspace/${workspace.slug}/project/${workspace.projects[0].key}`
      : `/workspaces`;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isKeyManuallyEdited) {
      const clean = val.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase();
      setKey(clean);
    }
  };

  const handleKeyChange = (val: string) => {
    setIsKeyManuallyEdited(true);
    setKey(val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    if (!teamId.trim()) {
      setError("Please select a team for this project. Team is required.");
      return;
    }

    const finalKey = key.trim() || name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase();
    if (!finalKey || finalKey.length < 2) {
      setError("Project key must be at least 2 alphanumeric characters (e.g. 'DEV', 'MOB').");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/workspace/${workspace.id}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          key: finalKey,
          description: description.trim() || undefined,
          color,
          teamId: teamId.trim(),
        }),
      });


      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      router.push(`/workspace/${workspace.slug}/project/${data.project.key}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">
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
          <span className="text-slate-900 dark:text-white font-semibold">New Project</span>
        </div>

        {/* Page Title & Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"
                style={{ backgroundColor: color }}
              >
                <FolderPlus className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Create New Project
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure a dedicated project board and issue tracker in workspace{" "}
              <strong className="text-slate-700 dark:text-slate-200">{workspace.name}</strong> (/{workspace.slug}).
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

          {/* Card: Project Details */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
              Project Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Mobile App Redesign, Marketing Campaign"
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Project Key <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={key}
                    onChange={(e) => handleKeyChange(e.target.value)}
                    placeholder="MOB"
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-bold uppercase rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <Hash className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              The project key is used as a short prefix for tasks (e.g.{" "}
              <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                {key || "PRJ"}-101
              </span>
              ).
            </p>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Give your team an overview of goals, scope, and objectives for this project..."
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all resize-none font-normal"
              />
            </div>
          </div>

          {/* Card: Accent Color & Preview */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
              Visual Appearance
            </h2>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Project Accent Color
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {PROJECT_COLORS.map((c) => {
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

            {/* Live Card Preview */}
            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
                Live Sidebar & Task Badge Preview
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {name.trim() || "Untitled Project"}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      /{workspace.slug}/project/{(key || "PRJ").toLowerCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md text-white shadow-xs"
                    style={{ backgroundColor: color }}
                  >
                    {key || "PRJ"}-1
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">To Do</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Team Squad & Kanban Workflow */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
              Workflow & Organization
            </h2>

            {/* Team Dropdown */}
            {workspace.teams && workspace.teams.length > 0 ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Assign to Squad / Team <span className="text-rose-500">* (Required)</span>
                </label>
                <div className="relative max-w-md">
                  <select
                    required
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer font-medium"
                  >
                    <option value="" disabled>Select a squad/team...</option>
                    {workspace.teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.members?.length ?? 0} members)
                      </option>
                    ))}
                  </select>
                  <Users className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Every project must be assigned to an active team in this workspace.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
                <div className="space-y-0.5">
                  <p className="font-bold">No teams found in this workspace</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    A team is required to create a project. Please create a team first.
                  </p>
                </div>
                <Link
                  href={`/workspace/${workspace.slug}/teams/create`}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Create Team First</span>
                </Link>
              </div>
            )}

            {/* Generated Columns Overview */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Default Kanban Board Stages
              </label>
              <p className="text-[11px] text-slate-400">
                Every new project automatically starts with a standard 5-stage Kanban board. You can customize limits and columns anytime.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
                {DEFAULT_STAGES.map((stage, idx) => (
                  <div
                    key={stage.name}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`w-2 h-2 rounded-full ${stage.color}`} />
                      <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {stage.name}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">Stage #{idx + 1}</span>
                  </div>
                ))}
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
              disabled={isSubmitting || !name.trim() || !teamId.trim() || !(workspace.teams && workspace.teams.length > 0)}
              className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Project...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create Project</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
