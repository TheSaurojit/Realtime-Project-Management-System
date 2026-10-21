"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Search, Kanban, CheckSquare, Calendar, Activity, ArrowRight } from "lucide-react";
import { Task, Project } from "@/lib/types";
import { PriorityBadge } from "@/components/ui/badge";

export function CommandPalette({
  tasks,
  project,
  onSelectTask,
  onSelectView,
  isOpen: externalIsOpen,
  onClose: externalOnClose,
}: {
  tasks: Task[];
  project: Project;
  onSelectTask: (task: Task) => void;
  onSelectView: (view: "board" | "list" | "calendar" | "activity") => void;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      if (externalOnClose && (val === false || (typeof val === "function" && !val(internalIsOpen)))) {
        externalOnClose();
      }
      setInternalIsOpen(val);
    },
    [externalOnClose, internalIsOpen]
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsOpen]);

  const filteredTasks = useMemo(() => {
    if (!query.trim()) return tasks.slice(0, 5);
    const q = query.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.taskKey.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [tasks, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            aria-label="Search tasks or navigate views"
            placeholder="Type a task key, title, or action..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800">
          {/* Quick View Switches */}
          {!query && (
            <div className="pb-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">
                Views
              </p>
              <div className="grid grid-cols-2 gap-1 px-1">
                <button
                  onClick={() => {
                    onSelectView("board");
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <Kanban className="w-4 h-4 text-indigo-500" /> Kanban Board
                </button>
                <button
                  onClick={() => {
                    onSelectView("list");
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <CheckSquare className="w-4 h-4 text-emerald-500" /> List View
                </button>
                <button
                  onClick={() => {
                    onSelectView("calendar");
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <Calendar className="w-4 h-4 text-amber-500" /> Calendar
                </button>
                <button
                  onClick={() => {
                    onSelectView("activity");
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <Activity className="w-4 h-4 text-purple-500" /> Activity Log
                </button>
              </div>
            </div>
          )}

          {/* Tasks Results */}
          <div className="pt-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">
              Tasks in {project.name}
            </p>
            {filteredTasks.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching tasks found for &quot;{query}&quot;
              </div>
            ) : (
              filteredTasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTask(t);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                      {t.taskKey}
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {t.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={t.priority} />
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
