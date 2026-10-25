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

/**
 * Recursively strips sensitive credentials (e.g. passwordHash, raw secrets)
 * from any object, array, or nested response before returning it to clients.
 */
export function sanitizeSensitiveFields<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeSensitiveFields(item)) as unknown as T;
  }

  if (typeof data === "object") {
    if (data instanceof Date || (typeof Buffer !== "undefined" && Buffer.isBuffer(data))) {
      return data;
    }

    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === "passwordHash") {
        continue;
      }
      cleaned[key] = sanitizeSensitiveFields(value);
    }
    return cleaned as T;
  }

  return data;
}

/**
 * Checks if a payload (or its stringified JSON) contains passwordHash or bcrypt hash strings.
 */
export function containsSensitiveCredentials(data: unknown): boolean {
  if (data === null || data === undefined) return false;
  const str = typeof data === "string" ? data : JSON.stringify(data);
  if (!str) return false;
  if (str.includes("passwordHash")) return true;
  const bcryptRegex = /\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}/;
  return bcryptRegex.test(str);
}

/**
 * Parses user mentions (@name or @emailPrefix) from text content
 * against a list of candidate workspace/project users.
 * Filters out self-mentions and duplicate mentions.
 */
export function parseMentionedUserIds(
  content: string,
  candidateUsers: { id: string; name: string; email?: string }[],
  authorId?: string
): string[] {
  if (!content || !candidateUsers || candidateUsers.length === 0) {
    return [];
  }

  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mentionedIds = new Set<string>();

  for (const user of candidateUsers) {
    if (authorId && user.id === authorId) {
      continue; // Skip self-mentions
    }

    const trimmedName = user.name?.trim();
    if (trimmedName && trimmedName.length >= 2) {
      // Matches @Name at start of text, after whitespace, followed by word boundary, punctuation or whitespace
      const namePattern = new RegExp(`(?:^|\\s)@${escapeRegex(trimmedName)}(?:\\b|\\s|[.,!?:;]|$)`, "i");
      if (namePattern.test(content)) {
        mentionedIds.add(user.id);
        continue;
      }
    }

    // Also support email prefix if at least 3 chars (e.g. @alice for alice@company.com)
    if (user.email) {
      const emailPrefix = user.email.split("@")[0]?.trim();
      if (emailPrefix && emailPrefix.length >= 3) {
        const emailPattern = new RegExp(`(?:^|\\s)@${escapeRegex(emailPrefix)}(?:\\b|\\s|[.,!?:;]|$)`, "i");
        if (emailPattern.test(content)) {
          mentionedIds.add(user.id);
        }
      }
    }
  }

  return Array.from(mentionedIds);
}
