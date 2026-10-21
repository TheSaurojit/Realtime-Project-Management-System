"use client";

import { useState, useCallback } from "react";
import { Notification, RealtimeEvent } from "@/lib/types";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { formatTimeAgo } from "@/lib/utils";
import Link from "next/link";
import { useRealtimeSubscription } from "@/lib/realtime/client";

export function NotificationDropdown({
  initialNotifications,
  userId,
}: {
  initialNotifications: Notification[];
  userId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    if (event.type === "notification:created" && event.payload?.notification) {
      const newNotif = event.payload.notification;
      setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
    }
  }, []);

  useRealtimeSubscription(`user-${userId}`, handleRealtimeEvent);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    } catch {
      // Ignore
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch(`/api/notifications/read-all`, { method: "POST" });
    } catch {
      // Ignore
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 flex gap-3 transition-colors ${
                      notif.isRead
                        ? "opacity-75 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        : "bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/70"
                    }`}
                  >
                    <Avatar user={notif.actor} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>
                      {notif.link && (
                        <Link
                          href={notif.link}
                          onClick={() => {
                            markAsRead(notif.id);
                            setIsOpen(false);
                          }}
                          className="inline-block mt-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          View task →
                        </Link>
                      )}
                    </div>
                    {!notif.isRead && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="self-center p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
