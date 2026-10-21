import * as React from "react";
import { cn } from "@/lib/utils";
import { TaskPriority, TaskStatus } from "@/lib/types";
import { AlertCircle, ArrowUp, ArrowRight, ArrowDown, Flame, CheckCircle2, Clock, PlayCircle, Eye } from "lucide-react";

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const configs: Record<
    TaskPriority,
    { label: string; icon: React.ComponentType<{ className?: string }>; bg: string; text: string }
  > = {
    URGENT: {
      label: "Urgent",
      icon: Flame,
      bg: "bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/30",
      text: "text-rose-600 dark:text-rose-400",
    },
    HIGH: {
      label: "High",
      icon: ArrowUp,
      bg: "bg-orange-500/10 dark:bg-orange-500/20 border-orange-500/30",
      text: "text-orange-600 dark:text-orange-400",
    },
    MEDIUM: {
      label: "Medium",
      icon: ArrowRight,
      bg: "bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30",
      text: "text-amber-600 dark:text-amber-400",
    },
    LOW: {
      label: "Low",
      icon: ArrowDown,
      bg: "bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30",
      text: "text-blue-600 dark:text-blue-400",
    },
  };

  const config = configs[priority] || configs.MEDIUM;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        config.bg,
        config.text,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const configs: Record<
    TaskStatus,
    { label: string; icon: React.ComponentType<{ className?: string }>; bg: string; text: string }
  > = {
    BACKLOG: {
      label: "Backlog",
      icon: Clock,
      bg: "bg-slate-500/10 border-slate-500/30",
      text: "text-slate-600 dark:text-slate-400",
    },
    TODO: {
      label: "To Do",
      icon: AlertCircle,
      bg: "bg-blue-500/10 border-blue-500/30",
      text: "text-blue-600 dark:text-blue-400",
    },
    IN_PROGRESS: {
      label: "In Progress",
      icon: PlayCircle,
      bg: "bg-amber-500/10 border-amber-500/30",
      text: "text-amber-600 dark:text-amber-400",
    },
    IN_REVIEW: {
      label: "In Review",
      icon: Eye,
      bg: "bg-purple-500/10 border-purple-500/30",
      text: "text-purple-600 dark:text-purple-400",
    },
    DONE: {
      label: "Done",
      icon: CheckCircle2,
      bg: "bg-emerald-500/10 border-emerald-500/30",
      text: "text-emerald-600 dark:text-emerald-400",
    },
  };

  const config = configs[status] || configs.TODO;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.bg,
        config.text,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export function LabelBadge({ name, color, className }: { name: string; color?: string; className?: string }) {
  const bgColor = color ? `${color}20` : "#6366f120";
  const borderColor = color ? `${color}50` : "#6366f150";
  const textColor = color || "#6366f1";

  return (
    <span
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        color: textColor,
      }}
      className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border", className)}
    >
      {name}
    </span>
  );
}
