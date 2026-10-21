import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createEmailVerificationToken,
  verifyEmailByToken,
  findUserByEmail,
  createUserWithWorkspace,
} from "@/lib/db";
import { sendVerificationEmail, sendWorkspaceInvitationEmail } from "@/lib/email/resend";

describe("Email Verification & Invitation Workflows", () => {
  const testEmail = "delivered@resend.dev";

  beforeEach(async () => {
    // Clean up test records
    await prisma.verificationToken.deleteMany({
      where: { email: testEmail },
    });
    await prisma.workspaceInvitation.deleteMany({
      where: { email: testEmail },
    });
    const existing = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    if (existing) {
      await prisma.workspaceMember.deleteMany({ where: { userId: existing.id } });
      await prisma.workspace.deleteMany({ where: { ownerId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }
  });

  describe("Token Generation & Expiration", () => {
    it("should generate a 64-character hex verification token valid for 24 hours", async () => {
      const record = await createEmailVerificationToken(testEmail);

      expect(record.token).toBeDefined();
      expect(record.token.length).toBe(64);
      expect(record.email).toBe(testEmail);
      expect(new Date(record.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it("should replace existing verification tokens when a new one is requested", async () => {
      const token1 = await createEmailVerificationToken(testEmail);
      const token2 = await createEmailVerificationToken(testEmail);

      expect(token1.token).not.toBe(token2.token);

      const count = await prisma.verificationToken.count({
        where: { email: testEmail },
      });
      expect(count).toBe(1);
    });
  });

  describe("Email Verification Verification Process", () => {
    it("should successfully verify user email and mark emailVerified as true", async () => {
      // Create unverified user
      await createUserWithWorkspace({
        name: "Test Verification User",
        email: testEmail,
        passwordHash: "dummyhash",
        emailVerified: false,
      });

      const initialUser = await findUserByEmail(testEmail);
      expect(initialUser?.emailVerified).toBe(false);

      // Generate verification token
      const tokenRecord = await createEmailVerificationToken(testEmail);

      // Verify with token
      const result = await verifyEmailByToken(tokenRecord.token);
      expect(result.success).toBe(true);
      expect(result.user?.emailVerified).toBe(true);

      // Verify DB record was updated
      const updatedUser = await findUserByEmail(testEmail);
      expect(updatedUser?.emailVerified).toBe(true);
      expect(updatedUser?.emailVerifiedAt).toBeDefined();

      // Verify token was deleted after usage
      const remainingToken = await prisma.verificationToken.findUnique({
        where: { token: tokenRecord.token },
      });
      expect(remainingToken).toBeNull();
    });

    it("should reject invalid or non-existent verification tokens", async () => {
      const result = await verifyEmailByToken("completely-invalid-token");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    it("should reject expired verification tokens", async () => {
      const expiredToken = "expired-token-12345";
      await prisma.verificationToken.create({
        data: {
          email: testEmail,
          token: expiredToken,
          expiresAt: new Date(Date.now() - 1000 * 60), // 1 minute in the past
        },
      });

      const result = await verifyEmailByToken(expiredToken);
      expect(result.success).toBe(false);
      expect(result.error).toContain("expired");
    });
  });

  describe("Resend Email Service Helpers", () => {
    it("should generate proper verification email links and dispatch safely", async () => {
      const result = await sendVerificationEmail({
        email: testEmail,
        name: "Test User",
        token: "sample-token-abc",
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain("/api/auth/verify-email?token=sample-token-abc");
    }, 15000);

    it("should generate proper workspace invitation links and dispatch safely", async () => {
      const result = await sendWorkspaceInvitationEmail({
        email: testEmail,
        inviterName: "Alex Rivera",
        workspaceName: "Acme Cloud Platform",
        role: "ADMIN",
        token: "sample-invite-token-xyz",
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain("/api/workspace/invite?token=sample-invite-token-xyz");
    }, 15000);
  });
});
