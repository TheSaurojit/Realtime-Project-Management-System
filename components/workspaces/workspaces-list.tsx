"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  Plus,
  ArrowRight,
  Search,
  Kanban,
  Users2,
  Settings,
  Sparkles,
  LogOut,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Workspace, User, WorkspaceRole } from "@/lib/types";
import { ROLE_COLORS } from "@/lib/rbac/permissions";

interface WorkspaceWithRole extends Workspace {
  currentUserRole?: WorkspaceRole;
}

export function WorkspacesList({
  initialWorkspaces,
  initialUser,
}: {
  initialWorkspaces: WorkspaceWithRole[];
  initialUser: User;
}) {
  const router = useRouter();
  const [currentUser] = useState<User>(initialUser);
  const [search, setSearch] = useState("");


  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors
    }
    router.push("/login");
    router.refresh();
  };

  const filteredWorkspaces = initialWorkspaces.filter((ws) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return ws.name.toLowerCase().includes(q) || ws.slug.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                SyncBoard
              </span>
              <p className="text-[10px] text-slate-400 leading-none">Workspace Hub</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* Current User Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <Avatar user={currentUser} size="xs" />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-slate-900 dark:text-white leading-none">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{currentUser.email}</p>
              </div>
            </div>

            <Link
              href="/workspace/create"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Workspace</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl mx-auto w-full px-6 py-10 flex-1 space-y-8">
        {/* Title & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200/80 dark:border-indigo-800 mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Multi-Tenant Workspace Selector
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Your Workspaces
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select an organization workspace to launch its Kanban board, or switch between squads.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
            />
          </div>
        </div>

        {/* Workspaces Grid */}
        {filteredWorkspaces.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
              <Layers className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {search ? "No matching workspaces" : "No workspaces found"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {search
                  ? `No workspaces matched "${search}". Try searching with another name or slug.`
                  : "Your account does not belong to any workspaces yet. Create your first workspace to start collaborating on boards and tasks."}
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/workspace/create"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Workspace</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkspaces.map((ws) => {
              const primaryProject = ws.projects?.[0];
              const projectKey = primaryProject?.key || "KAN";
              const targetUrl = `/workspace/${ws.slug}/project/${projectKey}`;
              const userRole = ws.currentUserRole || "VIEWER";
              const isOwnerOrAdmin = userRole === "OWNER" || userRole === "ADMIN";

              return (
                <div
                  key={ws.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-indigo-500/60 dark:hover:border-indigo-500/60 transition-all flex flex-col justify-between group space-y-5"
                >
                  <div className="space-y-3">
                    {/* Header: Icon, Name, Slug, Role */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-indigo-500/20 shrink-0 group-hover:scale-105 transition-transform">
                          {ws.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            {ws.name}
                          </h3>
                          <p className="text-[11px] text-slate-400 font-mono truncate">
                            /{ws.slug}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          ROLE_COLORS[userRole] || ROLE_COLORS.VIEWER
                        }`}
                      >
                        {userRole}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {ws.description || "No description provided for this workspace."}
                    </p>

                    {/* Stats badges */}
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Kanban className="w-3.5 h-3.5 text-indigo-500" />
                        <strong>{ws.projects?.length || 0}</strong> projects
                      </span>
                      <span className="flex items-center gap-1">
                        <Users2 className="w-3.5 h-3.5 text-emerald-500" />
                        <strong>{ws.members?.length || 1}</strong> members
                      </span>
                    </div>

                    {/* Projects quick chips */}
                    {ws.projects && ws.projects.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Boards:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ws.projects.map((proj) => (
                            <Link
                              key={proj.id}
                              href={`/workspace/${ws.slug}/project/${proj.key}`}
                              className="text-[10px] font-mono font-semibold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-colors inline-flex items-center gap-1"
                            >
                              <span>[{proj.key}]</span>
                              <span className="truncate max-w-[120px]">{proj.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {isOwnerOrAdmin ? (
                      <Link
                        href={`/workspace/${ws.slug}/settings`}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Workspace Settings & Members"
                      >
                        <Settings className="w-4 h-4" />
                      </Link>
                    ) : (
                      <div />
                    )}

                    <Link
                      href={targetUrl}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 group/btn"
                    >
                      <span>Launch</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-6 border-t border-slate-200/60 dark:border-slate-800/60 max-w-6xl mx-auto w-full">
        SyncBoard Platform • Built with Next.js 16, PostgreSQL, Prisma &amp; WebSockets
      </footer>
    </div>
  );
}
