"use client";

import { useState, memo } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { BoardColumn as ColumnType, Task } from "@/lib/types";
import { TaskCard } from "./task-card";
import { Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const BoardColumn = memo(function BoardColumn({
  column,
  tasks,
  isDragDisabled,
  onTaskClick,
  onQuickAdd,
}: {
  column: ColumnType;
  tasks: Task[];
  isDragDisabled?: boolean;
  onTaskClick: (task: Task) => void;
  onQuickAdd: (columnId: string, title: string) => Promise<void>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isWipExceeded =
    Boolean(column.wipLimit && column.wipLimit > 0) &&
    tasks.length > (column.wipLimit || 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await onQuickAdd(column.id, newTitle.trim());
      setNewTitle("");
      setIsAdding(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-80 shrink-0 flex flex-col max-h-full bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden">
      {/* Column Header */}
      <div className="p-3.5 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: column.color || "#64748b" }}
          />
          <h3 className="font-semibold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            {column.name}
          </h3>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              isWipExceeded
                ? "bg-rose-100 dark:bg-rose-950/60 text-rose-600 border border-rose-300 dark:border-rose-800"
                : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            {tasks.length}
            {column.wipLimit ? ` / ${column.wipLimit}` : ""}
          </span>
        </div>

        {isWipExceeded && (
          <span
            className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-medium"
            title="WIP Limit Exceeded"
          >
            <AlertTriangle className="w-3 h-3" />
            WIP limit!
          </span>
        )}
      </div>

      {/* Droppable Task List Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2.5 space-y-2.5 overflow-y-auto min-h-[150px] transition-colors ${
              snapshot.isDraggingOver
                ? "bg-indigo-50/50 dark:bg-indigo-950/20"
                : ""
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                isDragDisabled={isDragDisabled}
                onClick={() => onTaskClick(task)}
              />
            ))}
            {provided.placeholder}

            {/* Inline Add Task Form */}
            {isAdding ? (
              <form
                onSubmit={handleCreate}
                className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-indigo-500 shadow-sm space-y-2"
              >
                <textarea
                  autoFocus
                  placeholder="What needs to be done?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleCreate(e);
                    }
                    if (e.key === "Escape") setIsAdding(false);
                  }}
                  className="w-full text-xs text-slate-900 dark:text-white bg-transparent resize-none focus:outline-none placeholder-slate-400"
                  rows={2}
                />
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 px-2 py-1 rounded"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={isSubmitting}
                    disabled={!newTitle.trim()}
                  >
                    Add
                  </Button>
                </div>
              </form>
            ) : (
              !isDragDisabled && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add card
                </button>
              )
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
});
