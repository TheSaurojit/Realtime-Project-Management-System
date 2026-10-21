"use client";

import Link from "next/link";
import {
  Kanban,
  Radio,
  Layers,
  ArrowRight,
  Database,
  ShieldCheck,
  LayoutGrid,
  LogIn,
  PlusCircle,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between overflow-x-hidden">
      {/* Navbar */}
      <header className="px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-md sm:shadow-lg shadow-indigo-500/30 shrink-0">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight leading-tight truncate">SyncBoard Realtime</h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate hidden xs:block">Team Project Management</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link
            href="/workspaces"
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            title="Workspaces"
          >
            <LayoutGrid className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden md:inline">Workspaces</span>
          </Link>
          <Link
            href="/login"
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            title="Sign In"
          >
            <LogIn className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Sign In</span>
          </Link>
          <Link
            href="/workspace/create"
            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span><span className="hidden sm:inline">Create </span>Workspace</span>
          </Link>
        </div>
      </header>

      {/* Hero Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 flex flex-col items-center text-center w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] sm:text-xs font-medium mb-5 sm:mb-6 animate-pulse max-w-full">
          <Radio className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Next.js 16 + PostgreSQL + WebSockets &amp; RBAC</span>
        </div>

        <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight max-w-3xl leading-tight">
          Real-time collaborative workspaces for high-velocity teams.
        </h2>

        <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed px-1 sm:px-2">
          A full-featured Jira &amp; Trello workspace built with interactive Kanban drag-and-drop, multi-tenant teams, live WebSocket synchronization, calendar views, checklists, and role-based permissions.
        </p>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-8 sm:mt-10 max-w-4xl w-full text-left">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start sm:block gap-3 sm:gap-0">
            <Kanban className="w-5 h-5 text-indigo-500 mb-0 sm:mb-2 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Interactive Kanban</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">Fluid drag-and-drop, WIP limits &amp; optimistic updates.</p>
            </div>
          </div>
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start sm:block gap-3 sm:gap-0">
            <Radio className="w-5 h-5 text-emerald-500 mb-0 sm:mb-2 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Live Real-Time</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">Instant task moves, live comments &amp; user mentions.</p>
            </div>
          </div>
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start sm:block gap-3 sm:gap-0">
            <ShieldCheck className="w-5 h-5 text-purple-500 mb-0 sm:mb-2 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Granular RBAC</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">Owner, Admin, Member &amp; Viewer role policies.</p>
            </div>
          </div>
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start sm:block gap-3 sm:gap-0">
            <Database className="w-5 h-5 text-amber-500 mb-0 sm:mb-2 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">PostgreSQL &amp; Prisma</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">Full relational schema ready for local or remote DB.</p>
            </div>
          </div>
        </div>

        {/* Primary Action Hub */}
        <div className="mt-8 sm:mt-12 w-full max-w-xl bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg sm:shadow-xl text-center space-y-4 sm:space-y-5">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Get Started with SyncBoard
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sign in to access your squad&apos;s boards, or create a brand new workspace.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3">
            <Link
              href="/login"
              className="w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Sign In / Test Accounts</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/workspaces"
              className="w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <LayoutGrid className="w-4 h-4 text-slate-400" />
              <span>View All Workspaces</span>
            </Link>
          </div>

          <p className="text-[11px] text-slate-400 leading-normal">
            Need demo accounts? 1-click test personas are available on the{" "}
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
              Sign In page
            </Link>
            .
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-5 sm:py-6 border-t border-slate-200/60 dark:border-slate-800/60 text-center text-[11px] sm:text-xs text-slate-400 leading-relaxed">
        SyncBoard Platform • Built with Next.js 16, Tailwind CSS v4, PostgreSQL &amp; Prisma
      </footer>
    </div>
  );
}
