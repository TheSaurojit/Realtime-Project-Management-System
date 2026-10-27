import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/rbac/server", () => ({
  requireWorkspaceAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  updateWorkspaceMemberRole: vi.fn(),
  removeWorkspaceMember: vi.fn(),
  createWorkspaceInvitation: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspaceMember: {
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireWorkspaceAccess } from "@/lib/rbac/server";
import { updateWorkspaceMemberRole, removeWorkspaceMember } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { PATCH, DELETE } from "@/app/api/workspace/[workspaceId]/members/route";

describe("workspace owner protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "admin-id",
      email: "admin@example.com",
      name: "Admin",
      role: "ADMIN",
    });
    vi.mocked(requireWorkspaceAccess).mockResolvedValue({
      workspaceId: "workspace-id",
      role: "ADMIN",
    });
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({
      role: "OWNER",
    } as never);
  });

  it("prevents an admin from demoting another owner", async () => {
    const request = new NextRequest("http://localhost/api/workspace/workspace-id/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "owner-id", role: "MEMBER" }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ workspaceId: "workspace-id" }),
    });

    expect(response.status).toBe(403);
    expect(updateWorkspaceMemberRole).not.toHaveBeenCalled();
  });

  it("prevents an admin from removing another owner", async () => {
    const request = new NextRequest(
      "http://localhost/api/workspace/workspace-id/members?userId=owner-id",
      { method: "DELETE" }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ workspaceId: "workspace-id" }),
    });

    expect(response.status).toBe(403);
    expect(removeWorkspaceMember).not.toHaveBeenCalled();
  });
});
