import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/rbac/server", () => ({
  requireProjectWorkspaceAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  createTask: vi.fn(),
  getProjectTasksPage: vi.fn(),
  searchProjectTasks: vi.fn(),
}));

vi.mock("@/lib/realtime/server", () => ({
  broadcastRealtimeEvent: vi.fn(),
}));

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireProjectWorkspaceAccess } from "@/lib/rbac/server";
import { getProjectTasksPage, searchProjectTasks } from "@/lib/db";
import { GET } from "@/app/api/tasks/route";

describe("GET /api/tasks project pagination and search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-id",
      email: "user@example.com",
      name: "User",
      role: "MEMBER",
    });
    vi.mocked(requireProjectWorkspaceAccess).mockResolvedValue({
      projectId: "project-id",
      workspaceId: "workspace-id",
      role: "MEMBER",
      projectRole: "CONTRIBUTOR",
      accessLevel: "WRITE",
    });
    vi.mocked(getProjectTasksPage).mockResolvedValue({ tasks: [], hasMore: false });
    vi.mocked(searchProjectTasks).mockResolvedValue([]);
  });

  it("uses the authorized project and cursor for a page request", async () => {
    const request = new NextRequest(
      "http://localhost/api/tasks?projectId=project-id&columnId=column-id&afterPosition=1000&afterId=task-30"
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(requireProjectWorkspaceAccess).toHaveBeenCalledWith(
      "user-id",
      "project-id",
      "view"
    );
    expect(getProjectTasksPage).toHaveBeenCalledWith("project-id", "column-id", {
      position: 1000,
      id: "task-30",
    });
  });

  it("rejects malformed cursors", async () => {
    const request = new NextRequest(
      "http://localhost/api/tasks?projectId=project-id&columnId=column-id&afterPosition=NaN&afterId=task-id"
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(getProjectTasksPage).not.toHaveBeenCalled();
  });

  it("searches only within the authorized project", async () => {
    const request = new NextRequest(
      "http://localhost/api/tasks?projectId=project-id&search=login"
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(searchProjectTasks).toHaveBeenCalledWith("project-id", "login");
  });
});
