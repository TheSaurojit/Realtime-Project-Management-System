import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parses date inputs without UTC midnight timezone backwards-shifting.
 */
export function parseLocalDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;

  // If string contains YYYY-MM-DD
  const match = String(dateInput).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day, 12, 0, 0); // Noon avoids daylight saving & midnight timezone shifts
  }

  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateToInput(dateInput: string | Date | null | undefined): string {
  const d = parseLocalDate(dateInput);
  if (!d) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTimeAgo(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (!date || isNaN(date.getTime())) return "";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDueDate(dateInput: string | Date | null | undefined): { text: string; isOverdue: boolean; isToday: boolean } {
  if (!dateInput) return { text: "", isOverdue: false, isToday: false };
  const target = parseLocalDate(dateInput);
  if (!target) return { text: "", isOverdue: false, isToday: false };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const targetNoon = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 12, 0, 0);

  const isToday = today.getTime() === targetNoon.getTime();
  const isOverdue = targetNoon.getTime() < today.getTime();

  const formatted = target.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return {
    text: isToday ? "Today" : formatted,
    isOverdue,
    isToday,
  };
}
