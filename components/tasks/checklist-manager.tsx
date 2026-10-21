"use client";

import { useState } from "react";
import { Checklist } from "@/lib/types";
import { CheckSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChecklistManager({
  checklists,
  readOnly,
  onToggleItem,
  onAddItem,
}: {
  checklists: Checklist[];
  taskId: string;
  readOnly?: boolean;
  onToggleItem: (checklistId: string, itemId: string) => Promise<void>;
  onAddItem: (checklistId: string, content: string) => Promise<void>;
}) {
  const [newItemText, setNewItemText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeChecklist = checklists[0];
  const items = activeChecklist?.items || [];

  const totalItems = items.length;
  const completedItems = items.filter((i) => i.isCompleted).length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    setIsSubmitting(true);
    try {
      const targetChecklistId = activeChecklist?.id || "";
      await onAddItem(targetChecklistId, newItemText.trim());
      setNewItemText("");
      setIsAdding(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-indigo-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Checklist
          </h4>
          {totalItems > 0 && (
            <span className="text-xs font-mono font-medium text-slate-400">
              ({completedItems}/{totalItems})
            </span>
          )}
        </div>

        {!readOnly && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add item
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {totalItems > 0 && (
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Checklist items */}
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              if (!readOnly && activeChecklist) onToggleItem(activeChecklist.id, item.id);
            }}
            className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
              readOnly ? "cursor-default" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
            }`}
          >
            <input
              type="checkbox"
              checked={item.isCompleted}
              disabled={readOnly}
              onChange={() => {}}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 rounded-sm cursor-pointer"
            />
            <span
              className={`text-xs flex-1 ${
                item.isCompleted
                  ? "line-through text-slate-400"
                  : "text-slate-800 dark:text-slate-200"
              }`}
            >
              {item.content}
            </span>
          </div>
        ))}
      </div>

      {/* Inline Form to add item */}
      {isAdding && (
        <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            autoFocus
            placeholder="Add an item..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!newItemText.trim()}>
            Add
          </Button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 px-2 py-1"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
