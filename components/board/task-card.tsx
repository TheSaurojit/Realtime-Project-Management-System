"use client";

import { memo } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Task } from "@/lib/types";
import { PriorityBadge, LabelBadge } from "@/components/ui/badge";
import { AvatarStack } from "@/components/ui/avatar";
import { formatDueDate } from "@/lib/utils";
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
} from "lucide-react";

export const TaskCard = memo(function TaskCard({
  task,
  index,
  isDragDisabled,
  onClick,
}: {
  task: Task;
  index: number;
  isDragDisabled?: boolean;
  onClick: () => void;
}) {
  const { text: dueText, isOverdue, isToday } = formatDueDate(task.dueDate);

  // Checklists summary
  const totalChecklistItems =
    task.checklists?.reduce((acc, c) => acc + (c.items?.length || 0), 0) || 0;
  const completedChecklistItems =
    task.checklists?.reduce(
      (acc, c) => acc + (c.items?.filter((i) => i.isCompleted).length || 0),
      0
    ) || 0;

  const commentsCount = task._count?.comments ?? task.comments?.length ?? 0;
  const attachmentsCount = task._count?.attachments ?? task.attachments?.length ?? 0;

  return (
    <Draggable
      draggableId={task.id}
      index={index}
      isDragDisabled={isDragDisabled}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`group relative bg-white dark:bg-slate-900 rounded-xl p-3.5 border transition-all duration-150 cursor-pointer select-none ${
            snapshot.isDragging
              ? "shadow-2xl border-indigo-500 scale-102 rotate-1 z-50 ring-2 ring-indigo-500/20"
              : "shadow-xs border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
          }`}
        >
          {/* Top Row: Key, Priority, Points */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 transition-colors">
              {task.taskKey}
            </span>
            <div className="flex items-center gap-1.5">
              {task.points && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold" title="Story Points">
                  {task.points} pts
                </span>
              )}
              <PriorityBadge priority={task.priority} />
            </div>
          </div>

          {/* Title */}
          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-relaxed mb-2.5">
            {task.title}
          </h4>

          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {task.labels.map(({ label }) => (
                <LabelBadge
                  key={label.id}
                  name={label.name}
                  color={label.color}
                  className="text-[10px] px-1.5 py-0.2"
                />
              ))}
            </div>
          )}

          {/* Footer Metadata */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 gap-2">
            {/* Left stats: Due date & Checklists */}
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              {dueText && (
                <span
                  className={`flex items-center gap-1 font-medium ${
                    isOverdue
                      ? "text-rose-600 dark:text-rose-400"
                      : isToday
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                  title={isOverdue ? "Overdue" : "Due Date"}
                >
                  <Calendar className="w-3 h-3" />
                  {dueText}
                </span>
              )}

              {totalChecklistItems > 0 && (
                <span
                  className={`flex items-center gap-1 font-mono ${
                    completedChecklistItems === totalChecklistItems
                      ? "text-emerald-600 font-medium"
                      : "text-slate-400"
                  }`}
                  title="Checklist progress"
                >
                  <CheckSquare className="w-3 h-3" />
                  {completedChecklistItems}/{totalChecklistItems}
                </span>
              )}

              {commentsCount > 0 && (
                <span className="flex items-center gap-0.5" title="Comments">
                  <MessageSquare className="w-3 h-3" />
                  {commentsCount}
                </span>
              )}

              {attachmentsCount > 0 && (
                <span className="flex items-center gap-0.5" title="Attachments">
                  <Paperclip className="w-3 h-3" />
                  {attachmentsCount}
                </span>
              )}
            </div>

            {/* Right: Assignees */}
            {task.assignees && task.assignees.length > 0 && (
              <AvatarStack users={task.assignees} max={2} size="xs" />
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
});
