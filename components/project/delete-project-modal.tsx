"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    key: string;
    workspaceId: string;
  };
  workspaceSlug?: string;
  onSuccess?: () => void;
}

export function DeleteProjectModal({
  isOpen,
  onClose,
  project,
  workspaceSlug,
  onSuccess,
}: DeleteProjectModalProps) {
  const router = useRouter();
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (isDeleting) return;
    setConfirmInput("");
    setError(null);
    onClose();
  }, [isDeleting, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        handleClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isDeleting, handleClose]);

  if (!isOpen || !isClient) return null;

  const isConfirmed =
    confirmInput.trim().toUpperCase() === project.key.toUpperCase() ||
    confirmInput.trim().toLowerCase() === project.name.toLowerCase();

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/workspace/${project.workspaceId}/projects/${project.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete project.");
      }

      handleClose();

      if (onSuccess) {
        onSuccess();
      } else if (workspaceSlug) {
        router.push(`/workspace/${workspaceSlug}`);
        router.refresh();
      } else {
        router.push("/workspaces");
        router.refresh();
      }
    } catch (err: unknown) {
      console.error("[DeleteProjectModal] error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete project.");
    } finally {
      setIsDeleting(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      aria-labelledby="delete-project-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Card - Centered on screen */}
      <div className="relative w-full max-w-md m-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200 z-10">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isDeleting}
          className="absolute right-4 top-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Danger Icon */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 id="delete-project-title" className="text-base font-bold text-slate-900 dark:text-white">
              Delete Project
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Permanently remove this project and all its data.
            </p>
          </div>
        </div>

        {/* Warning Details Box */}
        <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 text-xs text-rose-900 dark:text-rose-300 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>This action cannot be undone!</span>
          </div>
          <p className="text-[11px] leading-relaxed text-rose-800/90 dark:text-rose-300/80">
            Deleting <strong className="font-bold">{project.name}</strong> (
            <code className="font-mono bg-rose-200/50 dark:bg-rose-900/60 px-1 py-0.5 rounded text-[10px]">
              {project.key}
            </code>
            ) will permanently delete:
          </p>
          <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-1 text-rose-700 dark:text-rose-400">
            <li>All task cards, checklists, and column boards</li>
            <li>All task comments and file attachments</li>
            <li>All sequence counters and project metrics</li>
          </ul>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 font-medium">
            {error}
          </div>
        )}

        {/* Confirmation Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            To confirm, type{" "}
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400 select-all">
              {project.key}
            </span>{" "}
            below:
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={`Type ${project.key} to confirm`}
            disabled={isDeleting}
            className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            autoFocus
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={!isConfirmed || isDeleting}
            onClick={handleDelete}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Project
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

