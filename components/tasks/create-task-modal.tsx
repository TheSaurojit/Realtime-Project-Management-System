"use client";

import { useState } from "react";
import { BoardColumn, TaskPriority, User, Label } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

export function CreateTaskModal({
  isOpen,
  columns,
  currentUser,
  users,
  labels,
  onClose,
  onCreateTask,
}: {
  isOpen: boolean;
  columns: BoardColumn[];
  currentUser: User;
  users?: User[];
  labels?: Label[];
  onClose: () => void;
  onCreateTask: (data: {
    columnId: string;
    title: string;
    description: string;
    priority: TaskPriority;
    assigneeIds: string[];
    labelIds: string[];
    dueDate?: string | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState(columns[0]?.id || "col-1");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([currentUser.id]);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateTask({
        columnId,
        title: title.trim(),
        description: description.trim(),
        priority,
        assigneeIds,
        labelIds,
        dueDate: dueDate ? `${dueDate}T12:00:00.000Z` : null,
      });
      setTitle("");
      setDescription("");
      setDueDate("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAssignee = (id: string) => {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const toggleLabel = (id: string) => {
    setLabelIds((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Task" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Task Title *
          </label>
          <input
            type="text"
            required
            autoFocus
            placeholder="e.g. Implement WebSocket heartbeat & reconnection backoff"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Column & Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Column / Status
            </label>
            <select
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
              className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Details, acceptance criteria, or links..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Due Date */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>

        {/* Assignees */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Assignees
          </label>
          <div className="flex flex-wrap gap-2">
            {(users && users.length > 0 ? users : [currentUser]).map((u) => {
              const isSelected = assigneeIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleAssignee(u.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 text-indigo-700 dark:text-indigo-300"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Avatar user={u} size="xs" />
                  <span>{u.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Labels */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Labels
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(labels || []).map((lbl) => {
              const isSelected = labelIds.includes(lbl.id);
              return (
                <button
                  key={lbl.id}
                  type="button"
                  onClick={() => toggleLabel(lbl.id)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium border transition-transform cursor-pointer ${
                    isSelected ? "ring-2 ring-indigo-500 scale-105" : "opacity-60"
                  }`}
                  style={{
                    backgroundColor: `${lbl.color}20`,
                    borderColor: `${lbl.color}60`,
                    color: lbl.color,
                  }}
                >
                  {lbl.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!title.trim()}>
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
