"use client";

import { useState } from "react";
import { Attachment, User } from "@/lib/types";
import {
  Paperclip,
  Image as ImageIcon,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  ExternalLink,
  X,
  Eye,
} from "lucide-react";
import { MAX_ATTACHMENT_SIZE_BYTES, ALLOWED_IMAGE_EXTENSIONS } from "@/lib/supabase";

export function AttachmentUploader({
  attachments,
  readOnly,
  onAddAttachment,
  onDeleteAttachment,
}: {
  attachments: Attachment[];
  taskId?: string;
  currentUser?: User;
  readOnly?: boolean;
  onAddAttachment: (
    fileOrData: File | { name: string; fileUrl: string; fileType: string; fileSize: number }
  ) => Promise<void>;
  onDeleteAttachment?: (attachmentId: string) => Promise<void>;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    // 1. Client-Side Validation: Images only
    const mimeType = (file.type || "").toLowerCase().trim();
    const name = (file.name || "").toLowerCase().trim();
    const hasImageExtension = ALLOWED_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
    const isImage = mimeType.startsWith("image/") || hasImageExtension;

    if (!isImage) {
      setErrorMessage("Only image files (JPEG, PNG, WebP, GIF, SVG, AVIF) are allowed.");
      e.target.value = "";
      return;
    }

    // 2. Client-Side Validation: 10MB maximum limit
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(
        `File size (${sizeMb} MB) exceeds the 10 MB maximum limit. Please select an image under 10 MB.`
      );
      e.target.value = "";
      return;
    }

    setIsUploading(true);

    try {
      // Pass raw File object to parent to perform multipart Supabase upload
      await onAddAttachment(file);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload image attachment to Supabase.";
      setErrorMessage(msg);
      console.error("[Attachment] Supabase upload failed:", err);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (attachmentId: string, name: string) => {
    if (readOnly || !onDeleteAttachment) return;
    if (!confirm(`Are you sure you want to remove "${name}" from this task?`)) return;

    setDeletingId(attachmentId);
    setErrorMessage(null);

    try {
      await onDeleteAttachment(attachmentId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete attachment.";
      setErrorMessage(msg);
      console.error("[Attachment] Delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-indigo-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Image Attachments ({attachments.length})
          </h4>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
            Max 10MB
          </span>
        </div>

        {!readOnly && (
          <label className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline flex items-center gap-1 font-medium cursor-pointer">
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Image</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start justify-between gap-2 text-xs text-rose-600 dark:text-rose-400">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="font-medium">{errorMessage}</div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Empty State */}
      {attachments.length === 0 && !isUploading && (
        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
          No image attachments yet. Upload screenshots or diagrams up to 10MB.
        </div>
      )}

      {/* Uploading Placeholder */}
      {isUploading && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs text-indigo-600 dark:text-indigo-400 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span className="font-medium">Uploading image to Supabase Storage...</span>
        </div>
      )}

      {/* Attachments Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {attachments.map((att) => {
          const isImage = (att.fileType || "").startsWith("image/") || att.fileUrl.startsWith("http");
          const isDeleting = deletingId === att.id;

          return (
            <div
              key={att.id}
              className="group relative flex items-center justify-between p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all gap-2 shadow-xs"
            >
              {/* Thumbnail / Info */}
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setPreviewImage({ url: att.fileUrl, name: att.name })}
                  className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 shrink-0 group/thumb cursor-pointer"
                  title="Click to preview image"
                >
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={att.fileUrl}
                      alt={att.name}
                      className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Eye className="w-3.5 h-3.5" />
                  </div>
                </button>

                <div className="min-w-0">
                  <p
                    className="text-xs font-semibold text-slate-900 dark:text-white truncate cursor-pointer hover:underline"
                    onClick={() => setPreviewImage({ url: att.fileUrl, name: att.name })}
                    title={att.name}
                  >
                    {att.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {formatFileSize(att.fileSize)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={att.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Open full image in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {!readOnly && onDeleteAttachment && (
                  <button
                    type="button"
                    onClick={() => handleDelete(att.id, att.name)}
                    disabled={isDeleting}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Delete image attachment"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
              <span className="text-xs font-semibold text-slate-200 truncate pr-4">
                {previewImage.name}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Image Body */}
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[80vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
