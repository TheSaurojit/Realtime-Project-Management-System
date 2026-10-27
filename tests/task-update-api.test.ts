import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: vi.fn() };
});

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/rbac/server", () => ({
  requireTaskWorkspaceAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getTaskById: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    boardColumn: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/realtime/server", () => ({
  broadcastRealtimeEvent: vi.fn(),
}));

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireTaskWorkspaceAccess } from "@/lib/rbac/server";
import { updateTask } from "@/lib/db";
import { PATCH } from "@/app/api/tasks/[taskId]/route";

describe("PATCH task relation updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-id",
      email: "user@example.com",
      name: "User",
      role: "MEMBER",
    });
    vi.mocked(requireTaskWorkspaceAccess).mockResolvedValue({
      task: {
        id: "task-id",
        projectId: "project-id",
        columnId: "column-id",
        reporterId: "user-id",
        project: { id: "project-id", workspaceId: "workspace-id", key: "PRJ" },
      },
      project: { id: "project-id", workspaceId: "workspace-id", key: "PRJ" },
      projectId: "project-id",
      workspaceId: "workspace-id",
      role: "MEMBER",
      projectRole: "CONTRIBUTOR",
      accessLevel: "WRITE",
    });
    vi.mocked(updateTask).mockResolvedValue({
      id: "task-id",
      projectId: "project-id",
    } as never);
  });

  it("accepts assignee and label ID arrays and passes them to the data layer", async () => {
    const request = new NextRequest("http://localhost/api/tasks/task-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeIds: ["user-2"], labelIds: ["label-3"] }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ taskId: "task-id" }),
    });

    expect(response.status).toBe(200);
    expect(updateTask).toHaveBeenCalledWith(
      "task-id",
      { assigneeIds: ["user-2"], labelIds: ["label-3"] },
      "user-id"
    );
  });

  it("rejects malformed relation ID arrays", async () => {
    const request = new NextRequest("http://localhost/api/tasks/task-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeIds: [""] }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ taskId: "task-id" }),
    });

    expect(response.status).toBe(400);
    expect(updateTask).not.toHaveBeenCalled();
  });
});
