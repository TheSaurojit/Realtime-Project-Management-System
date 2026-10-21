"use client";

import { useState } from "react";
import Link from "next/link";
import { User } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { ChevronDown, LogOut, LayoutGrid, PlusCircle, ArrowLeftRight } from "lucide-react";
import { ROLE_COLORS } from "@/lib/rbac/permissions";

export function UserSwitcher({
  currentUser,
}: {
  currentUser: User;
  onUserChange?: (user: User) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);


  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors
    }
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
        title="View user account menu"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Avatar user={currentUser} size="md" showOnline />
          <div className="text-left truncate">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {currentUser.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                  ROLE_COLORS[currentUser.role || "VIEWER"]
                }`}
              >
                {currentUser.role || "VIEWER"}
              </span>
              <span className="text-[11px] text-slate-400 truncate max-w-[100px]">
                {currentUser.email}
              </span>
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {/* Account Info Header */}
            <div className="p-2.5 mb-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Avatar user={currentUser} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Workspace Role:</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-[10px] border ${
                    ROLE_COLORS[currentUser.role || "VIEWER"]
                  }`}
                >
                  {currentUser.role || "VIEWER"}
                </span>
              </div>
            </div>

            {/* Navigation Options */}
            <div className="space-y-0.5">
              <Link
                href="/workspaces"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LayoutGrid className="w-4 h-4 text-indigo-500" />
                <span>All Workspaces</span>
              </Link>

              <Link
                href="/workspace/create"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <PlusCircle className="w-4 h-4 text-emerald-500" />
                <span>Create Workspace</span>
              </Link>

              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4 text-amber-500" />
                <span>Switch Account (Login Page)</span>
              </Link>
            </div>

            {/* Sign Out Button */}
            <div className="pt-2 mt-1.5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
