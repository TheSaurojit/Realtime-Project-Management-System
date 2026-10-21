"use client";

import { useState } from "react";
import {
  Task,
  User,
  BoardColumn,
  Label,
  TaskPriority,
  WorkspaceRole,
} from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { PriorityBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ChecklistManager } from "./checklist-manager";
import { CommentsStream } from "./comments-stream";
import { AttachmentUploader } from "./attachment-uploader";
import { isReadOnly, hasPermission } from "@/lib/rbac/permissions";
import {
  CheckCircle2,
  Trash2,
  Share2,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateToInput } from "@/lib/utils";

export function TaskDetailModal({
  task,
  columns,
  currentUser,
  users,
  labels,
  isOpen,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onAddComment,
  onToggleChecklistItem,
  onAddChecklistItem,
  onAddAttachment,
  onDeleteAttachment,
  readOnly: readOnlyProp,
}: {
  task: Task | null;
  columns: BoardColumn[];
  currentUser: User;
  users?: User[];
  labels?: Label[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onAddComment: (taskId: string, content: string) => Promise<void>;
  onToggleChecklistItem: (taskId: string, checklistId: string, itemId: string) => Promise<void>;
  onAddChecklistItem: (taskId: string, checklistId: string, content: string) => Promise<void>;
  onAddAttachment: (
    taskId: string,
    fileOrData: File | { name: string; fileUrl: string; fileType: string; fileSize: number }
  ) => Promise<void>;
  onDeleteAttachment?: (taskId: string, attachmentId: string) => Promise<void>;
  readOnly?: boolean;
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");
  const [copied, setCopied] = useState(false);

  if (!task) return null;

  const readOnly =
    readOnlyProp !== undefined
      ? readOnlyProp
      : isReadOnly((currentUser.role as WorkspaceRole) || "MEMBER");
  const canDelete = readOnly
    ? false
    : hasPermission((currentUser.role as WorkspaceRole) || "MEMBER", "task:delete");

  const priorities: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveTitle = async () => {
    if (!titleValue.trim() || titleValue === task.title) {
      setIsEditingTitle(false);
      return;
    }
    await onUpdateTask(task.id, { title: titleValue.trim() });
    setIsEditingTitle(false);
  };

  const handleSaveDesc = async () => {
    await onUpdateTask(task.id, { description: descValue });
    setIsEditingDesc(false);
  };

  const availableUsers = users && users.length > 0 ? users : (task.assignees?.map((a) => a.user) || [currentUser]);
  const availableLabels = labels && labels.length > 0 ? labels : (task.labels?.map((l) => l.label) || []);

  const handleAssigneeToggle = async (userId: string) => {
    if (readOnly) return;
    const exists = task.assignees?.some((a) => a.user.id === userId);
    let newAssignees;
    if (exists) {
      newAssignees = task.assignees.filter((a) => a.user.id !== userId);
    } else {
      const user = availableUsers.find((u) => u.id === userId);
      if (!user) return;
      newAssignees = [...(task.assignees || []), { user }];
    }
    await onUpdateTask(task.id, { assignees: newAssignees });
  };

  const handleLabelToggle = async (labelId: string) => {
    if (readOnly) return;
    const exists = task.labels?.some((l) => l.label.id === labelId);
    let newLabels;
    if (exists) {
      newLabels = task.labels.filter((l) => l.label.id !== labelId);
    } else {
      const label = availableLabels.find((l) => l.id === labelId);
      if (!label) return;
      newLabels = [...(task.labels || []), { label }];
    }
    await onUpdateTask(task.id, { labels: newLabels });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="4xl">
      <div className="space-y-6 mt-40">
        {/* Modal Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
              {task.taskKey}
            </span>

            {/* Column Selector */}
            <select
              value={task.columnId}
              disabled={readOnly}
              onChange={(e) => onUpdateTask(task.id, { columnId: e.target.value })}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copied ? "Copied Link!" : "Copy Link"}</span>
            </button>

            {canDelete && (
              <button
                onClick={async () => {
                  if (confirm("Are you sure you want to delete this task?")) {
                    await onDeleteTask(task.id);
                    onClose();
                  }
                }}
                className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Delete task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Grid Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 spans): Title, Description, Checklists, Attachments, Comments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div>
              {isEditingTitle && !readOnly ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    autoFocus
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") setIsEditingTitle(false);
                    }}
                    className="w-full text-lg font-bold p-2 rounded-lg border border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveTitle}>
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingTitle(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <h3
                  onClick={() => {
                    if (!readOnly) {
                      setTitleValue(task.title);
                      setIsEditingTitle(true);
                    }
                  }}
                  className={`text-lg font-bold text-slate-900 dark:text-white leading-snug rounded-lg p-1 -ml-1 transition-colors ${readOnly
                      ? ""
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    }`}
                >
                  {task.title}
                </h3>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Description
                </h4>
                {!readOnly && !isEditingDesc && (
                  <button
                    onClick={() => {
                      setDescValue(task.description || "");
                      setIsEditingDesc(true);
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
              </div>

              {isEditingDesc && !readOnly ? (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={descValue}
                    onChange={(e) => setDescValue(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none resize-y"
                    placeholder="Add a detailed description..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveDesc}>
                      Save Description
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingDesc(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    if (!readOnly) {
                      setDescValue(task.description || "");
                      setIsEditingDesc(true);
                    }
                  }}
                  className={`text-xs text-slate-700 dark:text-slate-300 leading-relaxed p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 min-h-[60px] ${readOnly
                      ? ""
                      : "hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
                    }`}
                >
                  {task.description ? (
                    <p className="whitespace-pre-wrap">{task.description}</p>
                  ) : (
                    <span className="text-slate-400 italic">
                      Click to add a description...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Checklists */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <ChecklistManager
                checklists={task.checklists || []}
                taskId={task.id}
                readOnly={readOnly}
                onToggleItem={(chkId, itemId) =>
                  onToggleChecklistItem(task.id, chkId, itemId)
                }
                onAddItem={(chkId, content) =>
                  onAddChecklistItem(task.id, chkId, content)
                }
              />
            </div>

            {/* Attachments */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <AttachmentUploader
                attachments={task.attachments || []}
                taskId={task.id}
                currentUser={currentUser}
                readOnly={readOnly}
                onAddAttachment={(file) => onAddAttachment(task.id, file)}
                onDeleteAttachment={
                  onDeleteAttachment
                    ? (attachmentId) => onDeleteAttachment(task.id, attachmentId)
                    : undefined
                }
              />
            </div>

            {/* Comments Stream */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <CommentsStream
                comments={task.comments || []}
                taskId={task.id}
                currentUser={currentUser}
                users={availableUsers}
                readOnly={readOnly}
                onAddComment={(content) => onAddComment(task.id, content)}
              />
            </div>
          </div>

          {/* Right Sidebar (1 span): Priority, Assignees, Due Date, Labels, Points */}
          <div className="space-y-5 bg-slate-50/60 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            {/* Priority */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Priority
              </label>
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
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
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
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Assignees
              </label>
              <div className="space-y-1">
                {availableUsers.map((user) => {
                  const isAssigned = task.assignees?.some(
                    (a) => a.user.id === user.id
                  );
                  return (
                    <button
                      key={user.id}
                      type="button"
                      disabled={readOnly}
                      onClick={() => handleAssigneeToggle(user.id)}
                      className={`w-full flex items-center justify-between p-1.5 rounded-lg text-left transition-colors cursor-pointer ${isAssigned
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar user={user} size="xs" />
                        <span className="text-xs font-medium">{user.name}</span>
                      </div>
                      {isAssigned && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                disabled={readOnly}
                value={formatDateToInput(task.dueDate)}
                onChange={(e) =>
                  onUpdateTask(task.id, {
                    dueDate: e.target.value ? `${e.target.value}T12:00:00.000Z` : null,
                  })
                }
                className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Story Points */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Story Points
              </label>
              <input
                type="number"
                min={0}
                max={100}
                disabled={readOnly}
                value={task.points || 0}
                onChange={(e) =>
                  onUpdateTask(task.id, { points: parseInt(e.target.value) || 0 })
                }
                className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>

            {/* Labels */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Labels
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableLabels.map((lbl) => {
                  const isSelected = task.labels?.some(
                    (l) => l.label.id === lbl.id
                  );
                  return (
                    <button
                      key={lbl.id}
                      type="button"
                      disabled={readOnly}
                      onClick={() => handleLabelToggle(lbl.id)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-medium border transition-transform cursor-pointer ${isSelected
                          ? "ring-2 ring-indigo-500 scale-105"
                          : "opacity-60 hover:opacity-100"
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

            {/* Reporter info */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[11px] text-slate-400 block mb-1">
                Reporter:
              </span>
              <div className="flex items-center gap-2">
                <Avatar user={task.reporter} size="xs" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {task.reporter?.name || "System"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
