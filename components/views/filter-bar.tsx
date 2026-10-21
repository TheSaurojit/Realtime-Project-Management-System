"use client";

import { useState, useEffect } from "react";
import { TaskPriority, User, Label } from "@/lib/types";
import { X, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

export interface FilterState {
  search: string;
  assigneeId: string | null;
  priority: TaskPriority | null;
  labelId: string | null;
}

export function FilterBar({
  filters,
  onChange,
  users,
  labels,
  totalTasks,
  filteredCount,
}: {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  users: User[];
  labels: Label[];
  totalTasks: number;
  filteredCount: number;
}) {
  const priorities: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];

  // Debounced search state
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const [prevSearch, setPrevSearch] = useState(filters.search);

  if (filters.search !== prevSearch) {
    setPrevSearch(filters.search);
    setSearchTerm(filters.search);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.search) {
        onChange({ ...filters, search: searchTerm });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, filters, onChange]);

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.assigneeId) ||
    Boolean(filters.priority) ||
    Boolean(filters.labelId);

  const resetFilters = () => {
    setSearchTerm("");
    onChange({
      search: "",
      assigneeId: null,
      priority: null,
      labelId: null,
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-center gap-2">
        {/* Debounced Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
          />
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          {priorities.map((p) => {
            const isSelected = filters.priority === p;
            return (
              <button
                key={p}
                onClick={() =>
                  onChange({
                    ...filters,
                    priority: isSelected ? null : p,
                  })
                }
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>

        {/* Assignee Filter */}
        <div className="flex items-center gap-1 pl-1">
          {users.map((u) => {
            const isSelected = filters.assigneeId === u.id;
            return (
              <button
                key={u.id}
                onClick={() =>
                  onChange({
                    ...filters,
                    assigneeId: isSelected ? null : u.id,
                  })
                }
                title={`Filter by ${u.name}`}
                className={`rounded-full p-0.5 transition-transform cursor-pointer ${
                  isSelected ? "ring-2 ring-indigo-500 scale-110" : "opacity-75 hover:opacity-100"
                }`}
              >
                <Avatar user={u} size="xs" />
              </button>
            );
          })}
        </div>

        {/* Label Filter */}
        <select
          value={filters.labelId || ""}
          onChange={(e) =>
            onChange({
              ...filters,
              labelId: e.target.value ? e.target.value : null,
            })
          }
          className="text-xs py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
        >
          <option value="">All Labels</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Task Count Summary */}
      <div className="text-xs text-slate-400">
        Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredCount}</span> of {totalTasks} tasks
      </div>
    </div>
  );
}
