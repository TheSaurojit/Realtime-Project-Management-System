"use client";

import { ActivityLog as ActivityType } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { formatTimeAgo } from "@/lib/utils";
import { Activity, Clock, ArrowRight, CheckCircle2, MessageSquare } from "lucide-react";

export function ActivityLogView({
  activities,
  onTaskClick,
}: {
  activities: ActivityType[];
  onTaskClick?: (taskId: string) => void;
}) {
  const getActionIcon = (action: string) => {
    if (action.includes("moved")) return <ArrowRight className="w-3.5 h-3.5 text-blue-500" />;
    if (action.includes("completed")) return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    if (action.includes("commented")) return <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />;
    if (action.includes("created")) return <Activity className="w-3.5 h-3.5 text-violet-500" />;
    return <Clock className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div className="flex-1 p-4 pt-16 md:p-6 bg-slate-50/50 dark:bg-slate-950 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Workspace Activity Log
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time chronological audit trail of all project changes, movements, and discussions.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {activities.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No activity recorded yet.
            </div>
          ) : (
            activities.map((act) => (
              <div
                key={act.id}
                className="p-4 flex items-start gap-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                <Avatar user={act.actor} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {act.actor?.name || "User"}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {act.action}
                    </span>
                    {act.task && (
                      <button
                        onClick={() => onTaskClick && onTaskClick(act.task!.id)}
                        className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        [{act.task.taskKey}]
                      </button>
                    )}
                  </div>

                  {act.details && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg font-mono">
                      {act.details}
                    </p>
                  )}

                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1.5">
                    {getActionIcon(act.action)}
                    <span>{formatTimeAgo(act.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
