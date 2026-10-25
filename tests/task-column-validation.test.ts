import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn((cb: () => any) => {
      // Mock after() to execute synchronously or no-op in test environment
    }),
  };
});

import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/rbac/server", () => ({
  requireTaskWorkspaceAccess: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    boardColumn: {
      findUnique: vi.fn(),
    },
    task: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/realtime/server", () => ({
  broadcastRealtimeEvent: vi.fn(),
}));

import { PATCH } from "@/app/api/tasks/[taskId]/route";
import { getCurrentUser } from "@/lib/auth/session";
import { requireTaskWorkspaceAccess } from "@/lib/rbac/server";
import { prisma } from "@/lib/prisma";
import { updateTask } from "@/lib/db";

describe("Cross-Project Column Validation in Task PATCH & updateTask", () => {
  const kanTaskId = "task-kan-101";
  const kanProjectId = "proj-kan";
  const mobProjectId = "proj-mob";
  const kanColId = "col-kan-todo";
  const mobColId = "col-mob-todo";

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      role: "MEMBER",
    });

    vi.mocked(requireTaskWorkspaceAccess).mockResolvedValue({
      task: {
        id: kanTaskId,
        projectId: kanProjectId,
        columnId: kanColId,
        reporterId: "user-1",
      },
      project: { id: kanProjectId, key: "KAN", workspaceId: "ws-1" },
      projectId: kanProjectId,
      workspaceId: "ws-1",
      role: "MEMBER",
    } as any);
  });

  describe("PATCH /api/tasks/[taskId] Column Validation", () => {
    it("should reject with 400 when patching a KAN task into a MOB column (cross-project move)", async () => {
      // The target column belongs to the MOB project, not KAN
      vi.mocked(prisma.boardColumn.findUnique).mockResolvedValue({
        id: mobColId,
        projectId: mobProjectId, // DIFFERENT project!
        name: "To Do",
      } as any);

      const req = new NextRequest(`http://localhost:3000/api/tasks/${kanTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId: mobColId }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ taskId: kanTaskId }) });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toBe("Destination column does not belong to the task's project.");
    });

    it("should reject with 400 when target column does not exist", async () => {
      vi.mocked(prisma.boardColumn.findUnique).mockResolvedValue(null);

      const req = new NextRequest(`http://localhost:3000/api/tasks/${kanTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId: "non-existent-col" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ taskId: kanTaskId }) });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toBe("Column not found");
    });

    it("should reject with 400 when columnId is empty or whitespace", async () => {
      const req = new NextRequest(`http://localhost:3000/api/tasks/${kanTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId: "   " }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ taskId: kanTaskId }) });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toBe("ColumnId must be a non-empty string");
    });

    it("should accept valid columnId when column belongs to the same project", async () => {
      const validColId = "col-kan-done";
      vi.mocked(prisma.boardColumn.findUnique).mockResolvedValue({
        id: validColId,
        projectId: kanProjectId, // SAME project!
        name: "Done",
      } as any);

      // Mock updateTask transaction
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          task: {
            findUnique: vi.fn().mockResolvedValue({
              id: kanTaskId,
              projectId: kanProjectId,
              project: { id: kanProjectId, workspaceId: "ws-1" },
            }),
            update: vi.fn().mockResolvedValue({
              id: kanTaskId,
              projectId: kanProjectId,
              columnId: validColId,
              title: "Updated Task",
              status: "DONE",
              reporter: { id: "user-1", name: "User" },
              assignees: [],
              comments: [],
            }),
          },
          boardColumn: {
            findUnique: vi.fn().mockResolvedValue({
              id: validColId,
              projectId: kanProjectId,
              name: "Done",
            }),
          },
          activityLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const req = new NextRequest(`http://localhost:3000/api/tasks/${kanTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId: validColId }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ taskId: kanTaskId }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.columnId).toBe(validColId);
    });
  });

  describe("updateTask Data Layer Invariant", () => {
    it("should throw error if column does not belong to the task's project inside transaction", async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          task: {
            findUnique: vi.fn().mockResolvedValue({
              id: kanTaskId,
              projectId: kanProjectId,
              project: { id: kanProjectId, workspaceId: "ws-1" },
            }),
          },
          boardColumn: {
            findUnique: vi.fn().mockResolvedValue({
              id: mobColId,
              projectId: mobProjectId, // DIFFERENT PROJECT
              name: "Done",
            }),
          },
        };
        return callback(tx);
      });

      await expect(
        updateTask(kanTaskId, { columnId: mobColId }, "user-1")
      ).rejects.toThrow("Destination column does not belong to the task's project.");
    });

    it("should throw error if column does not exist inside transaction", async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          task: {
            findUnique: vi.fn().mockResolvedValue({
              id: kanTaskId,
              projectId: kanProjectId,
              project: { id: kanProjectId, workspaceId: "ws-1" },
            }),
          },
          boardColumn: {
            findUnique: vi.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(
        updateTask(kanTaskId, { columnId: "non-existent-col" }, "user-1")
      ).rejects.toThrow("Column not found.");
    });
  });
});
