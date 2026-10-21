"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Workspace, User, WorkspaceRole } from "@/lib/types";
import { canManageMembers, canViewActivityLog, canCreateProject, canManageTeams } from "@/lib/rbac/permissions";
import {
  Layers,
  Settings,
  Activity,
  Plus,
  LayoutGrid,
  Menu,
  X,
} from "lucide-react";
import { UserSwitcher } from "./user-switcher";

export function Sidebar({
  workspace,
  currentUser,
}: {
  workspace: Workspace;
  currentUser: User;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  const userRole = (workspace.ownerId === currentUser.id
    ? "OWNER"
    : workspace.members?.find((m) => m.userId === currentUser.id)?.role || currentUser.role || "VIEWER") as WorkspaceRole;

  const canAccessSettings = canManageMembers(userRole);
  const canAccessActivity = canViewActivityLog(userRole);
  const canAddProject = canCreateProject(userRole);
  const canAddTeam = canManageTeams(userRole);




  // Automatically close sidebar when navigating to a new route on mobile
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent background scroll when mobile sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation sidebar"
        className={`md:hidden fixed top-2.5 left-3 z-30 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] h-screen bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none md:static md:translate-x-0 md:w-64 md:shrink-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top section: Workspace branding */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Workspace Brand */}
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {workspace.name}
                </h1>
                <p className="text-[10px] text-slate-400 font-mono truncate">
                  /{workspace.slug}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Link
                href="/workspaces"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                title="All Workspaces (Switch)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/workspace/create"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                title="Create another workspace"
              >
                <Plus className="w-4 h-4" />
              </Link>
              {/* Close Button on Mobile */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="md:hidden p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close sidebar"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Projects Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              <span>Projects</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-medium">
                  {workspace.projects?.length ?? 0}
                </span>
                {canAddProject && (
                  <Link
                    href={`/workspace/${workspace.slug}/project/create`}
                    onClick={() => setIsOpen(false)}
                    className={`p-1 rounded-md transition-colors ${
                      pathname.endsWith("/project/create")
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                    }`}
                    title="Create new project"
                    aria-label="Create new project"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {(workspace.projects || []).map((proj) => {
              const href = `/workspace/${workspace.slug}/project/${proj.key}`;
              const isActive = pathname.includes(proj.key);

              return (
                <Link
                  key={proj.id}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/30"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: proj.color || "#6366f1" }}
                  />
                  <span className="truncate flex-1">{proj.name}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isActive
                        ? "bg-indigo-700/50 text-indigo-100"
                        : "bg-slate-200/60 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {proj.key}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Teams Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              <span>Teams</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-medium">
                  {workspace.teams?.length ?? 0}
                </span>
                {canAddTeam && (
                  <Link
                    href={`/workspace/${workspace.slug}/teams/create`}
                    onClick={() => setIsOpen(false)}
                    className={`p-1 rounded-md transition-colors ${
                      pathname.endsWith("/teams/create") || pathname.endsWith("/team/create")
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                    }`}
                    title="Create new team"
                    aria-label="Create new team"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {(workspace.teams || []).map((team) => {
              const href = `/workspace/${workspace.slug}/teams/${team.id}`;
              const isActive = pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={team.id}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                  title={`View ${team.name} squad & members`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: team.color || "#6366f1" }}
                  />
                  <span className="truncate flex-1">{team.name}</span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {team.members?.length ?? 0}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Workspace Management & Overview */}
          {(canAccessActivity || canAccessSettings) && (
            <div className="space-y-1">
              <div className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                <span>Workspace</span>
              </div>

              {canAccessActivity && (
                <Link
                  href={`/workspace/${workspace.slug}/activity`}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname.endsWith("/activity")
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Activity className="w-4 h-4 text-purple-500" />
                  <span>Activity Audit Log</span>
                </Link>
              )}

              {canAccessSettings && (
                <Link
                  href={`/workspace/${workspace.slug}/settings`}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname.endsWith("/settings")
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Settings & Members (RBAC)</span>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Bottom section: Current User and Role Switcher */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <UserSwitcher currentUser={currentUser} />
        </div>
      </aside>
    </>
  );
}


