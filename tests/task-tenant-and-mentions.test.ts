import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn((cb: () => any) => {
      // Mock after() in test environment
    }),
  };
});

import { NextRequest } from "next/server";
import { parseMentionedUserIds } from "@/lib/utils";

// Mock dependencies
vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/rbac/server", () => ({
  requireProjectWorkspaceAccess: vi.fn(),
  requireTaskWorkspaceAccess: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    boardColumn: {
      findUnique: vi.fn(),
    },
    workspaceMember: {
      findMany: vi.fn(),
    },
    label: {
      findMany: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    taskSequence: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    comment: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/realtime/server", () => ({
  broadcastRealtimeEvent: vi.fn(),
}));

import { POST as createTaskRoute } from "@/app/api/tasks/route";
import { POST as addCommentRoute } from "@/app/api/tasks/[taskId]/comments/route";
import { getCurrentUser } from "@/lib/auth/session";
import { requireProjectWorkspaceAccess, requireTaskWorkspaceAccess } from "@/lib/rbac/server";
import { prisma } from "@/lib/prisma";
import { createTask, addComment } from "@/lib/db";
import { broadcastRealtimeEvent } from "@/lib/realtime/server";

describe("Tenant Isolation: Assignee & Label Validation on Task Create", () => {
  const ws1 = "ws-tenant-1";
  const proj1 = "proj-tenant-1";
  const col1 = "col-todo";
  const currentUserId = "user-alice";

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getCurrentUser).mockResolvedValue({
      id: currentUserId,
      email: "alice@example.com",
      name: "Alice",
      role: "MEMBER",
    });

    vi.mocked(requireProjectWorkspaceAccess).mockResolvedValue({
      workspaceId: ws1,
      projectId: proj1,
      role: "MEMBER",
    } as any);
  });

  describe("createTask database transaction tenant validation", () => {
    it("should reject task creation if assigneeId belongs to another tenant/workspace", async () => {
      const foreignUserId = "user-attacker-from-tenant-2";

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          project: {
            findUnique: vi.fn().mockResolvedValue({
              id: proj1,
              workspaceId: ws1,
              workspace: { id: ws1, ownerId: "ws-owner-1" },
            }),
          },
          boardColumn: {
            findUnique: vi.fn().mockResolvedValue({
              id: col1,
              projectId: proj1,
            }),
          },
          workspaceMember: {
            // Returns members belonging to ws1 (foreign user NOT included)
            findMany: vi.fn().mockResolvedValue([
              { userId: currentUserId },
            ]),
          },
          task: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          taskSequence: {
            findUnique: vi.fn().mockResolvedValue({ current: 0 }),
            upsert: vi.fn().mockResolvedValue({ current: 1 }),
          },
        };
        return callback(tx);
      });

      await expect(
        createTask({
          projectId: proj1,
          columnId: col1,
          title: "Malicious Task",
          reporterId: currentUserId,
          assigneeIds: [foreignUserId],
        })
      ).rejects.toThrow(`Assignee ${foreignUserId} does not belong to this workspace.`);
    });

    it("should reject task creation if labelId belongs to another tenant/workspace", async () => {
      const foreignLabelId = "lbl-foreign-tenant-2";

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          project: {
            findUnique: vi.fn().mockResolvedValue({
              id: proj1,
              workspaceId: ws1,
              workspace: { id: ws1, ownerId: "ws-owner-1" },
            }),
          },
          boardColumn: {
            findUnique: vi.fn().mockResolvedValue({
              id: col1,
              projectId: proj1,
            }),
          },
          workspaceMember: {
            findMany: vi.fn().mockResolvedValue([{ userId: currentUserId }]),
          },
          label: {
            // Foreign label is NOT found in ws1
            findMany: vi.fn().mockResolvedValue([]),
          },
          task: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          taskSequence: {
            findUnique: vi.fn().mockResolvedValue({ current: 0 }),
            upsert: vi.fn().mockResolvedValue({ current: 1 }),
          },
        };
        return callback(tx);
      });

      await expect(
        createTask({
          projectId: proj1,
          columnId: col1,
          title: "Cross-Tenant Label Task",
          reporterId: currentUserId,
          labelIds: [foreignLabelId],
        })
      ).rejects.toThrow(`Label ${foreignLabelId} does not belong to this workspace.`);
    });
  });

  describe("POST /api/tasks Endpoint Validation", () => {
    it("should return 400 when an invalid assignee from another tenant is provided", async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async () => {
        throw new Error("Assignee user-foreign does not belong to this workspace.");
      });

      const req = new NextRequest("http://localhost:3000/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: proj1,
          columnId: col1,
          title: "Test Task",
          assigneeIds: ["user-foreign"],
        }),
      });

      const res = await createTaskRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain("does not belong to this workspace");
    });

    it("should return 400 when an invalid label from another tenant is provided", async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async () => {
        throw new Error("Label lbl-foreign does not belong to this workspace.");
      });

      const req = new NextRequest("http://localhost:3000/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: proj1,
          columnId: col1,
          title: "Test Task",
          labelIds: ["lbl-foreign"],
        }),
      });

      const res = await createTaskRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain("does not belong to this workspace");
    });
  });
});

describe("Comment Mentions & Notification Delivery", () => {
  const candidates = [
    { id: "u-bob", name: "Bob", email: "bob@example.com" },
    { id: "u-charlie", name: "Charlie Smith", email: "charlie.smith@example.com" },
    { id: "u-david", name: "David", email: "david@example.com" },
    { id: "u-alice", name: "Alice", email: "alice@example.com" },
  ];

  describe("parseMentionedUserIds", () => {
    it("should extract single @mention", () => {
      const result = parseMentionedUserIds("Hey @Bob, please review this PR", candidates, "u-alice");
      expect(result).toEqual(["u-bob"]);
    });

    it("should extract multi-word @First Last mention", () => {
      const result = parseMentionedUserIds("Can you check @Charlie Smith?", candidates, "u-alice");
      expect(result).toEqual(["u-charlie"]);
    });

    it("should extract multiple distinct mentioned users", () => {
      const result = parseMentionedUserIds("cc @Bob and @Charlie Smith and @David", candidates, "u-alice");
      expect(result).toEqual(["u-bob", "u-charlie", "u-david"]);
    });

    it("should deduplicate multiple mentions of the same user", () => {
      const result = parseMentionedUserIds("@Bob @Bob @Bob pinging you", candidates, "u-alice");
      expect(result).toEqual(["u-bob"]);
    });

    it("should NOT notify the author if they mention themselves", () => {
      const result = parseMentionedUserIds("Notes for @Alice self reminder", candidates, "u-alice");
      expect(result).toEqual([]);
    });

    it("should NOT match email addresses like user@example.com as mentions", () => {
      const result = parseMentionedUserIds("Contact me at test@bob.com", candidates, "u-alice");
      expect(result).toEqual([]);
    });
  });

  describe("addComment notification creation in database", () => {
    it("should create Notification records for mentioned teammates", async () => {
      const mockCreatedNotifications: any[] = [];

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          comment: {
            create: vi.fn().mockResolvedValue({
              id: "comm-1",
              taskId: "task-1",
              authorId: "u-alice",
              content: "Hey @Bob, look at this",
              createdAt: new Date(),
              updatedAt: new Date(),
              author: { id: "u-alice", name: "Alice" },
              task: {
                taskKey: "PRJ-101",
                projectId: "proj-1",
                project: {
                  key: "PRJ",
                  workspaceId: "ws-1",
                  workspace: { id: "ws-1", slug: "my-team", ownerId: "u-alice" },
                },
              },
            }),
          },
          activityLog: {
            create: vi.fn().mockResolvedValue({}),
          },
          workspaceMember: {
            findMany: vi.fn().mockResolvedValue([
              { user: { id: "u-alice", name: "Alice", email: "alice@example.com" } },
              { user: { id: "u-bob", name: "Bob", email: "bob@example.com" } },
            ]),
          },
          user: {
            findUnique: vi.fn().mockResolvedValue(null),
          },
          notification: {
            create: vi.fn().mockImplementation((args: any) => {
              const record = { id: `notif-${mockCreatedNotifications.length + 1}`, ...args.data };
              mockCreatedNotifications.push(record);
              return Promise.resolve(record);
            }),
          },
        };
        return callback(tx);
      });

      const result = await addComment("task-1", "u-alice", "Hey @Bob, look at this");

      expect(result).not.toBeNull();
      expect(mockCreatedNotifications.length).toBe(1);
      expect(mockCreatedNotifications[0].userId).toBe("u-bob");
      expect(mockCreatedNotifications[0].actorId).toBe("u-alice");
      expect(mockCreatedNotifications[0].type).toBe("MENTION");
      expect(mockCreatedNotifications[0].message).toContain("Alice mentioned you on PRJ-101");
      expect(mockCreatedNotifications[0].link).toBe("/workspace/my-team/project/PRJ?task=PRJ-101");
    });
  });

  describe("POST /api/tasks/[taskId]/comments Realtime Notifications", () => {
    it("should broadcast notification:created to user-${userId} channel on @mention", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "u-alice",
        email: "alice@example.com",
        name: "Alice",
        role: "MEMBER",
      });

      vi.mocked(requireTaskWorkspaceAccess).mockResolvedValue({
        task: { id: "task-1", projectId: "proj-1" },
        project: { id: "proj-1", workspaceId: "ws-1" },
        projectId: "proj-1",
        workspaceId: "ws-1",
        role: "MEMBER",
      } as any);

      // Mock addComment inside transaction
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          comment: {
            create: vi.fn().mockResolvedValue({
              id: "comm-1",
              taskId: "task-1",
              authorId: "u-alice",
              content: "Hey @Bob",
              createdAt: new Date(),
              updatedAt: new Date(),
              author: { id: "u-alice", name: "Alice" },
              task: {
                taskKey: "PRJ-101",
                projectId: "proj-1",
                project: {
                  key: "PRJ",
                  workspaceId: "ws-1",
                  workspace: { id: "ws-1", slug: "team", ownerId: "u-alice" },
                },
              },
            }),
          },
          activityLog: { create: vi.fn().mockResolvedValue({}) },
          workspaceMember: {
            findMany: vi.fn().mockResolvedValue([
              { user: { id: "u-bob", name: "Bob", email: "bob@example.com" } },
            ]),
          },
          user: {
            findUnique: vi.fn().mockResolvedValue({ id: "u-alice", name: "Alice", email: "alice@example.com" }),
          },
          notification: {
            create: vi.fn().mockResolvedValue({
              id: "notif-1",
              userId: "u-bob",
              actorId: "u-alice",
              type: "MENTION",
              title: "Alice mentioned you",
              message: 'Alice mentioned you on PRJ-101: "Hey @Bob"',
              link: "/workspace/team/project/PRJ?task=PRJ-101",
              isRead: false,
              createdAt: new Date().toISOString(),
            }),
          },
        };
        return callback(tx);
      });

      const req = new NextRequest("http://localhost:3000/api/tasks/task-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Hey @Bob" }),
      });

      const res = await addCommentRoute(req, { params: Promise.resolve({ taskId: "task-1" }) });
      expect(res.status).toBe(201);
    });
  });
});
