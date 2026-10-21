import { describe, it, expect } from "vitest";
import { mapColumnNameToStatus } from "@/lib/db";
import { parseLocalDate, formatDateToInput, formatDueDate } from "@/lib/utils";

describe("Data Layer & Utils", () => {
  describe("Column to Status Mapping", () => {
    it("should map various column name casings and formats accurately", () => {
      expect(mapColumnNameToStatus("In Progress")).toBe("IN_PROGRESS");
      expect(mapColumnNameToStatus("IN_PROGRESS")).toBe("IN_PROGRESS");
      expect(mapColumnNameToStatus("In-Progress")).toBe("IN_PROGRESS");
      expect(mapColumnNameToStatus("doing")).toBe("IN_PROGRESS");

      expect(mapColumnNameToStatus("In Review")).toBe("IN_REVIEW");
      expect(mapColumnNameToStatus("Review")).toBe("IN_REVIEW");

      expect(mapColumnNameToStatus("Done")).toBe("DONE");
      expect(mapColumnNameToStatus("Completed")).toBe("DONE");
      expect(mapColumnNameToStatus("Finished")).toBe("DONE");

      expect(mapColumnNameToStatus("Backlog")).toBe("BACKLOG");

      expect(mapColumnNameToStatus("To Do")).toBe("TODO");
      expect(mapColumnNameToStatus("Todo")).toBe("TODO");
      expect(mapColumnNameToStatus("Unassigned")).toBe("TODO");
    });
  });

  describe("Date & Timezone Handling", () => {
    it("should parse YYYY-MM-DD strings without backward timezone day-shifting", () => {
      const date = parseLocalDate("2026-10-15");
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(9); // 0-indexed October
      expect(date?.getDate()).toBe(15);
    });

    it("should format date to YYYY-MM-DD input value safely", () => {
      expect(formatDateToInput("2026-10-15T00:00:00.000Z")).toBe("2026-10-15");
      expect(formatDateToInput(new Date(2026, 9, 15))).toBe("2026-10-15");
      expect(formatDateToInput(null)).toBe("");
      expect(formatDateToInput(undefined)).toBe("");
    });

    it("should determine today and overdue dates properly", () => {
      const now = new Date();
      const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      const todayResult = formatDueDate(todayString);
      expect(todayResult.isToday).toBe(true);
      expect(todayResult.text).toBe("Today");

      const pastResult = formatDueDate("2020-01-01");
      expect(pastResult.isOverdue).toBe(true);
      expect(pastResult.isToday).toBe(false);
    });
  });
});
