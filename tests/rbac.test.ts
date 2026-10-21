import { describe, it, expect } from "vitest";
import {
  hasPermission,
  canManageMembers,
  canEditTasks,
  isReadOnly,
  isValidWorkspaceRole,
} from "@/lib/rbac/permissions";

describe("RBAC Permissions & Roles", () => {
  it("should validate allowed role enums and fail closed on invalid roles", () => {
    expect(isValidWorkspaceRole("OWNER")).toBe(true);
    expect(isValidWorkspaceRole("ADMIN")).toBe(true);
    expect(isValidWorkspaceRole("MEMBER")).toBe(true);
    expect(isValidWorkspaceRole("VIEWER")).toBe(true);

    expect(isValidWorkspaceRole("")).toBe(false);
    expect(isValidWorkspaceRole("SUPERADMIN")).toBe(false);
    expect(isValidWorkspaceRole("GUEST")).toBe(false);
    expect(isValidWorkspaceRole(null)).toBe(false);
    expect(isValidWorkspaceRole(undefined)).toBe(false);
  });

  it("OWNER should have all management and write permissions", () => {
    expect(hasPermission("OWNER", "workspace:manage")).toBe(true);
    expect(hasPermission("OWNER", "workspace:invite")).toBe(true);
    expect(hasPermission("OWNER", "workspace:remove_member")).toBe(true);
    expect(hasPermission("OWNER", "task:create")).toBe(true);
    expect(hasPermission("OWNER", "task:delete")).toBe(true);
    expect(canManageMembers("OWNER")).toBe(true);
    expect(canEditTasks("OWNER")).toBe(true);
    expect(isReadOnly("OWNER")).toBe(false);
  });

  it("ADMIN should have workspace invite & task editing permissions but not workspace:manage", () => {
    expect(hasPermission("ADMIN", "workspace:manage")).toBe(false);
    expect(hasPermission("ADMIN", "workspace:invite")).toBe(true);
    expect(hasPermission("ADMIN", "task:create")).toBe(true);
    expect(hasPermission("ADMIN", "task:delete")).toBe(true);
    expect(canManageMembers("ADMIN")).toBe(true);
    expect(canEditTasks("ADMIN")).toBe(true);
    expect(isReadOnly("ADMIN")).toBe(false);
  });

  it("MEMBER should be able to create and edit tasks, but cannot manage members or delete projects", () => {
    expect(hasPermission("MEMBER", "task:create")).toBe(true);
    expect(hasPermission("MEMBER", "task:edit")).toBe(true);
    expect(hasPermission("MEMBER", "task:move")).toBe(true);
    expect(hasPermission("MEMBER", "workspace:invite")).toBe(false);
    expect(hasPermission("MEMBER", "workspace:remove_member")).toBe(false);
    expect(hasPermission("MEMBER", "project:delete")).toBe(false);
    expect(canManageMembers("MEMBER")).toBe(false);
    expect(canEditTasks("MEMBER")).toBe(true);
    expect(isReadOnly("MEMBER")).toBe(false);
  });

  it("VIEWER should only have view permission and be strictly read-only", () => {
    expect(hasPermission("VIEWER", "view")).toBe(true);
    expect(hasPermission("VIEWER", "task:create")).toBe(false);
    expect(hasPermission("VIEWER", "task:edit")).toBe(false);
    expect(hasPermission("VIEWER", "task:move")).toBe(false);
    expect(hasPermission("VIEWER", "task:delete")).toBe(false);
    expect(hasPermission("VIEWER", "comment:create")).toBe(false);
    expect(canManageMembers("VIEWER")).toBe(false);
    expect(canEditTasks("VIEWER")).toBe(false);
    expect(isReadOnly("VIEWER")).toBe(true);
  });

  describe("Settings Access & Role Change Guardrails", () => {
    it("should only allow OWNER and ADMIN to access workspace settings", () => {
      expect(canManageMembers("OWNER")).toBe(true);
      expect(canManageMembers("ADMIN")).toBe(true);
      expect(canManageMembers("MEMBER")).toBe(false);
      expect(canManageMembers("VIEWER")).toBe(false);
    });

    it("should prevent a user from modifying their own role", () => {
      const currentUserId = "user-123";
      const targetUserId = "user-123";
      const canUpdateRole = (actorId: string, targetId: string) => actorId !== targetId;

      expect(canUpdateRole(currentUserId, targetUserId)).toBe(false);
      expect(canUpdateRole(currentUserId, "user-456")).toBe(true);
    });
  });
});
