import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn(),
  };
});

import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspaceInvitation: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    workspaceMember: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { POST } from "@/app/api/workspace/invite/route";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { acceptWorkspaceInvitation } from "@/lib/db";

describe("Workspace Invitation Acceptance & Email Binding", () => {
  const validToken = "valid-token-123456789";
  const invitedEmail = "invited.user@example.com";
  const differentEmail = "other.user@example.com";
  const workspace = { id: "ws-1", name: "Acme Corp", slug: "acme-corp" };

  const validInvitation = {
    id: "inv-1",
    token: validToken,
    email: invitedEmail,
    role: "MEMBER",
    workspaceId: workspace.id,
    workspace,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days in future
  };

  const loggedInInvitedUser = {
    id: "user-invited-id",
    name: "Invited User",
    email: invitedEmail,
  };

  const loggedInDifferentUser = {
    id: "user-different-id",
    name: "Different User",
    email: differentEmail,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default transaction mock to execute callback with tx
    (prisma.$transaction as any).mockImplementation(async (cb: (tx: any) => Promise<any>) => {
      const tx = {
        workspaceInvitation: {
          findUnique: vi.fn().mockResolvedValue(validInvitation),
          delete: vi.fn().mockResolvedValue(validInvitation),
        },
        user: {
          findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => {
            if (where.id === loggedInInvitedUser.id) return Promise.resolve(loggedInInvitedUser);
            if (where.id === loggedInDifferentUser.id) return Promise.resolve(loggedInDifferentUser);
            return Promise.resolve(null);
          }),
        },
        workspaceMember: {
          upsert: vi.fn().mockResolvedValue({
            id: "wm-1",
            workspaceId: workspace.id,
            userId: "some-user-id",
            role: "MEMBER",
            workspace,
          }),
        },
      };
      return await cb(tx);
    });
  });

  describe("Data Layer: acceptWorkspaceInvitation", () => {
    it("should accept invitation when user email matches the invited email", async () => {
      const result = await acceptWorkspaceInvitation(validToken, loggedInInvitedUser.id);
      expect(result).toBeDefined();
      expect(result.workspaceId).toBe(workspace.id);
    });

    it("should throw an error when email does NOT match and confirmDifferentAccount is NOT set", async () => {
      await expect(
        acceptWorkspaceInvitation(validToken, loggedInDifferentUser.id)
      ).rejects.toThrow(/different email address/i);
    });

    it("should succeed when email does NOT match but confirmDifferentAccount is true", async () => {
      const result = await acceptWorkspaceInvitation(validToken, loggedInDifferentUser.id, {
        confirmDifferentAccount: true,
      });
      expect(result).toBeDefined();
      expect(result.workspaceId).toBe(workspace.id);
    });

    it("should reject expired invitations", async () => {
      (prisma.$transaction as any).mockImplementationOnce(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          workspaceInvitation: {
            findUnique: vi.fn().mockResolvedValue({
              ...validInvitation,
              expiresAt: new Date(Date.now() - 1000), // expired
            }),
          },
        };
        return await cb(tx);
      });

      await expect(
        acceptWorkspaceInvitation(validToken, loggedInInvitedUser.id)
      ).rejects.toThrow(/expired/i);
    });
  });

  describe("API Route: POST /api/workspace/invite", () => {
    it("should return 401 if user is not authenticated", async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: validToken }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if token is missing", async () => {
      (getCurrentUser as any).mockResolvedValue(loggedInInvitedUser);

      const req = new NextRequest("http://localhost:3000/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toMatch(/token is required/i);
    });

    it("should succeed seamlessly when logged in user email matches the invited email", async () => {
      (getCurrentUser as any).mockResolvedValue(loggedInInvitedUser);
      (prisma.workspaceInvitation.findUnique as any).mockResolvedValue(validInvitation);

      const req = new NextRequest("http://localhost:3000/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: validToken }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.workspace.slug).toBe(workspace.slug);
    });

    it("should reject with 400 and emailMismatch=true when user email differs and confirmation is missing", async () => {
      (getCurrentUser as any).mockResolvedValue(loggedInDifferentUser);
      (prisma.workspaceInvitation.findUnique as any).mockResolvedValue(validInvitation);

      const req = new NextRequest("http://localhost:3000/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: validToken }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.emailMismatch).toBe(true);
      expect(data.invitedEmail).toBe(invitedEmail);
      expect(data.currentEmail).toBe(differentEmail);
      expect(data.error).toMatch(/different email address/i);
    });

    it("should succeed with 200 when user email differs but confirmDifferentAccount: true is explicitly provided", async () => {
      (getCurrentUser as any).mockResolvedValue(loggedInDifferentUser);
      (prisma.workspaceInvitation.findUnique as any).mockResolvedValue(validInvitation);

      const req = new NextRequest("http://localhost:3000/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: validToken,
          confirmDifferentAccount: true,
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.workspace.slug).toBe(workspace.slug);
    });

    it("should return 400 if invitation is expired", async () => {
      (getCurrentUser as any).mockResolvedValue(loggedInInvitedUser);
      (prisma.workspaceInvitation.findUnique as any).mockResolvedValue({
        ...validInvitation,
        expiresAt: new Date(Date.now() - 1000),
      });

      const req = new NextRequest("http://localhost:3000/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: validToken }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toMatch(/expired/i);
    });
  });
});
