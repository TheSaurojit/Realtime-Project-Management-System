"use client";

import { useState } from "react";
import { BoardColumn, Task, User, TaskPriority, WorkspaceRole } from "@/lib/types";
import { PriorityBadge, StatusBadge, LabelBadge } from "@/components/ui/badge";
import { AvatarStack } from "@/components/ui/avatar";
import { formatDueDate } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { isReadOnly } from "@/lib/rbac/permissions";

export function ListView({
  columns,
  tasks,
  currentUser,
  onTaskClick,
  onUpdateTask,
  readOnly: readOnlyProp,
}: {
  columns: BoardColumn[];
  tasks: Task[];
  currentUser: User;
  onTaskClick: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  readOnly?: boolean;
}) {
  const [visibleLimits, setVisibleLimits] = useState<Record<string, number>>({});
  const getLimit = (colId: string) => visibleLimits[colId] || 40;

  const readOnly =
    readOnlyProp !== undefined
      ? readOnlyProp
      : isReadOnly((currentUser.role as WorkspaceRole) || "MEMBER");

  const priorities: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <div className="col-span-2">Key & Status</div>
          <div className="col-span-4">Title & Labels</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-2">Assignees</div>
          <div className="col-span-2 text-right">Due Date</div>
        </div>

        {/* Groups by Column */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {columns.map((column) => {
            const columnTasks = tasks.filter((t) => t.columnId === column.id);
            if (columnTasks.length === 0) return null;

            const limit = getLimit(column.id);
            const visibleColumnTasks = columnTasks.slice(0, limit);

            return (
              <div key={column.id} className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {/* Column Section Divider */}
                <div className="px-6 py-2 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: column.color || "#64748b" }}
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {column.name}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ({columnTasks.length})
                    </span>
                  </div>
                </div>

                {/* Task rows */}
                {visibleColumnTasks.map((task) => {
                  const { text: dueText, isOverdue, isToday } = formatDueDate(task.dueDate);

                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="grid grid-cols-12 gap-4 px-6 py-3.5 items-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Key & Status */}
                      <div className="col-span-2 flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 transition-colors">
                          {task.taskKey}
                        </span>
                        <StatusBadge status={task.status} />
                      </div>

                      {/* Title & Labels */}
                      <div className="col-span-4 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {task.title}
                        </p>
                        {task.labels && task.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {task.labels.map(({ label }) => (
                              <LabelBadge
                                key={label.id}
                                name={label.name}
                                color={label.color}
                                className="text-[9px] py-0 px-1"
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Priority */}
                      <div
                        className="col-span-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {readOnly ? (
                          <PriorityBadge priority={task.priority} />
                        ) : (
                          <select
                            value={task.priority}
                            onChange={(e) =>
                              onUpdateTask(task.id, {
                                priority: e.target.value as TaskPriority,
                              })
                            }
                            className="text-xs py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                          >
                            {priorities.map((p) => (
                              <option key={p} value={p}>
                                {p.charAt(0) + p.slice(1).toLowerCase()}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Assignees */}
                      <div className="col-span-2">
                        {task.assignees && task.assignees.length > 0 ? (
                          <AvatarStack users={task.assignees} max={3} size="xs" />
                        ) : (
                          <span className="text-xs text-slate-400">Unassigned</span>
                        )}
                      </div>

                      {/* Due date */}
                      <div className="col-span-2 text-right">
                        {dueText ? (
                          <span
                            className={`text-xs font-medium inline-flex items-center gap-1 ${
                              isOverdue
                                ? "text-rose-600 dark:text-rose-400"
                                : isToday
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            {dueText}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {columnTasks.length > limit && (
                  <div className="px-6 py-2.5 bg-slate-50/50 dark:bg-slate-800/20 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleLimits((prev) => ({
                          ...prev,
                          [column.id]: (prev[column.id] || 40) + 40,
                        }))
                      }
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                    >
                      Show 40 more ({columnTasks.length - limit} remaining in {column.name})
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
