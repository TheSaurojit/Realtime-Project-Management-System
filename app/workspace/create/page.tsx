"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Kanban,
  AlertCircle,
  Hash,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { User } from "@/lib/types";

export default function CreateWorkspacePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState<User>({
    id: "user-1",
    name: "Account Owner",
    email: "",
    role: "OWNER",
  });

  useEffect(() => {
    // Fetch authenticated user info
    fetch("/api/workspace")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);

    // Auto-derive slug if user hasn't manually customized it
    if (!isSlugManuallyEdited) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setSlug(autoSlug);
    }

    // Auto-derive starter project name and key
    if (!projectName || projectName.endsWith(" Board")) {
      setProjectName(val ? `${val.trim()} Board` : "");
    }

    if (!isKeyManuallyEdited) {
      const letters = val.replace(/[^a-zA-Z]/g, "").toUpperCase();
      const autoKey = letters.slice(0, 3) || "PRJ";
      setProjectKey(autoKey);
    }
  };

  const handleSlugChange = (val: string) => {
    setIsSlugManuallyEdited(true);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
    );
  };

  const handleKeyChange = (val: string) => {
    setIsKeyManuallyEdited(true);
    setProjectKey(val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter a workspace name.");
      return;
    }

    if (!slug.trim()) {
      setError("Please specify a URL slug.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          projectName: projectName.trim() || `${name.trim()} Board`,
          projectKey: projectKey.trim() || "PRJ",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create workspace.");
        return;
      }

      // Successfully created workspace -> redirect directly to project board!
      router.push(data.redirectUrl || `/workspace/${data.workspace.slug}`);
      router.refresh();
    } catch {
      setError("A network error occurred. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6">
      {/* Top Navbar */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
            SyncBoard
          </span>
        </Link>

        {/* Current User Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <Avatar user={currentUser} size="xs" />
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-900 dark:text-white leading-none">
                {currentUser.name}
              </p>
              {currentUser.email && (
                <p className="text-[10px] text-slate-400 mt-0.5">{currentUser.email}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Form Card */}
      <main className="max-w-2xl mx-auto w-full my-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 animate-in fade-in zoom-in-98 duration-200">
          {/* Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200/80 dark:border-indigo-800">
              <Sparkles className="w-3.5 h-3.5" /> Workspace Setup Wizard
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Create a new workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Workspaces are collaborative environments where your squad organizes projects, Kanban boards, tasks, and role-based permissions.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-400 hover:text-rose-600 font-bold ml-2 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Workspace Name */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                Workspace Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Acme Engineering or Core Platform"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full text-sm px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400 font-medium"
              />
            </div>

            {/* 2. Workspace URL Slug */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                Workspace URL Slug <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                <span className="px-3.5 py-3 text-xs text-slate-400 font-mono select-none border-r border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> /workspace/
                </span>
                <input
                  type="text"
                  required
                  placeholder="acme-engineering"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="flex-1 text-xs px-3.5 py-3 bg-transparent text-slate-900 dark:text-white focus:outline-none font-mono font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Direct URL:{" "}
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  https://syncboard.io/workspace/{slug || "your-slug"}
                </span>
              </p>
            </div>

            {/* 3. Description (Optional) */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="What is the mission or focus of this workspace?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400 resize-none"
              />
            </div>

            {/* 4. Initial Starter Project Settings Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 space-y-4">
              <div className="flex items-center gap-2">
                <Kanban className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Initial Project &amp; Kanban Board
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Board Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Sprint 1 Board"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Key Prefix
                  </label>
                  <div className="relative">
                    <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="ACME"
                      value={projectKey}
                      onChange={(e) => handleKeyChange(e.target.value)}
                      className="w-full text-xs pl-8 pr-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tasks in this board will be identified with this prefix (e.g.{" "}
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {projectKey || "PRJ"}-1
                </span>
                ,{" "}
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {projectKey || "PRJ"}-2
                </span>
                ). Five Kanban columns (Backlog, To Do, In Progress, In Review, Done) will be automatically created.
              </p>
            </div>

            {/* 5. Owner Badge Info */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Owner Privileges (RBAC)
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  As the creator, <strong>{currentUser.name}</strong> will be granted the <strong>OWNER</strong> role with full authority to invite teammates, manage squad teams, and configure columns.
                </p>
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/workspaces"
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
              >
                Cancel
              </Link>

              <Button
                type="submit"
                size="md"
                isLoading={isLoading}
                disabled={!name.trim() || !slug.trim()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Create Workspace &amp; Board</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 max-w-4xl mx-auto w-full pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
        SyncBoard Platform • Built with Next.js 16, PostgreSQL, Prisma &amp; WebSockets
      </footer>
    </div>
  );
}
