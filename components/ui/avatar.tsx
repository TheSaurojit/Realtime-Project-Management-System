"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { User } from "@/lib/types";

export function Avatar({
  user,
  size = "md",
  showOnline,
  className,
}: {
  user?: Partial<User> | null;
  size?: "xs" | "sm" | "md" | "lg";
  showOnline?: boolean;
  className?: string;
}) {
  const [hasError, setHasError] = React.useState(false);

  const sizes = {
    xs: "w-5 h-5 text-[10px]",
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className={cn("relative inline-block select-none", className)}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-semibold overflow-hidden border border-slate-200 dark:border-slate-800 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-xs",
          sizes[size]
        )}
      >
        {user?.avatarUrl && !hasError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.name || "User"}
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
          />
        ) : (
          <span>{getInitials(user?.name)}</span>
        )}
      </div>
      {showOnline && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
      )}
    </div>
  );
}

export function AvatarStack({
  users,
  max = 3,
  size = "sm",
}: {
  users: (User | { user: User })[];
  max?: number;
  size?: "xs" | "sm" | "md";
}) {
  const normalizedUsers = users.map((u) => ("user" in u ? u.user : u));
  const visible = normalizedUsers.slice(0, max);
  const remaining = normalizedUsers.length - max;

  return (
    <div className="flex -space-x-1.5 items-center">
      {visible.map((u, i) => (
        <Avatar key={u.id || i} user={u} size={size} className="ring-2 ring-white dark:ring-slate-900" />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "rounded-full flex items-center justify-center font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 ring-2 ring-white dark:ring-slate-900",
            size === "xs" ? "w-5 h-5 text-[9px]" : size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs"
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
