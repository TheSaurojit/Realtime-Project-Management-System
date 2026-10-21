"use client";

import { useState, useRef } from "react";
import { Comment, User } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatTimeAgo } from "@/lib/utils";
import { MessageSquare, AtSign, Send } from "lucide-react";

export function CommentsStream({
  comments,
  currentUser,
  users,
  readOnly,
  onAddComment,
}: {
  comments: Comment[];
  taskId: string;
  currentUser: User;
  users?: User[];
  readOnly?: boolean;
  onAddComment: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    // Detect mention trigger
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf("@");

    if (lastAtPos !== -1 && (lastAtPos === 0 || /\s/.test(textBeforeCursor[lastAtPos - 1]))) {
      const query = textBeforeCursor.slice(lastAtPos + 1);
      if (!query.includes(" ")) {
        setShowMentionMenu(true);
        setMentionFilter(query.toLowerCase());
        return;
      }
    }
    setShowMentionMenu(false);
  };

  const insertMention = (user: User) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = content.slice(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf("@");
    const textAfterCursor = content.slice(cursorPos);

    const newText = textBeforeCursor.slice(0, lastAtPos) + `@${user.name} ` + textAfterCursor;
    setContent(newText);
    setShowMentionMenu(false);
    textareaRef.current.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddComment(content.trim());
      setContent("");
      setShowMentionMenu(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const mentionableUsers = users && users.length > 0 ? users : [currentUser];
  const filteredUsers = mentionableUsers.filter((u) =>
    u.name.toLowerCase().includes(mentionFilter)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-indigo-500" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Activity & Comments ({comments.length})
        </h4>
      </div>

      {/* Comment Input */}
      {!readOnly && (
        <form onSubmit={handleSubmit} className="relative space-y-2">
          <div className="flex gap-2.5">
            <Avatar user={currentUser} size="sm" />
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                rows={3}
                placeholder="Write a comment or type @ to mention a teammate..."
                value={content}
                onChange={handleTextChange}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none shadow-xs"
              />

              {/* Mention Suggestion Dropdown */}
              {showMentionMenu && (
                <div className="absolute left-0 bottom-full mb-1 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50">
                  <p className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                    Mention Teammate
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => insertMention(u)}
                        className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left transition-colors cursor-pointer"
                      >
                        <Avatar user={u} size="xs" />
                        <div>
                          <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                            {u.name}
                          </p>
                          <p className="text-[10px] text-slate-400">{u.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <AtSign className="w-3 h-3 text-indigo-500" /> Supports @mentions
                </span>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmitting}
                  disabled={!content.trim()}
                >
                  <Send className="w-3.5 h-3.5 mr-1" /> Send
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-3 pt-2">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="flex gap-2.5 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
          >
            <Avatar user={comment.author} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  {comment.author?.name || "Teammate"}
                </span>
                <span className="text-[10px] text-slate-400">
                  {formatTimeAgo(comment.createdAt)}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">
                {/* Highlight @mentions in purple */}
                {comment.content.split(/(@[\w\s]+?)(?=\s|$|[.,!?])/g).map((part, i) => {
                  if (part.startsWith("@")) {
                    return (
                      <span
                        key={i}
                        className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1 py-0.2 rounded"
                      >
                        {part}
                      </span>
                    );
                  }
                  return part;
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
