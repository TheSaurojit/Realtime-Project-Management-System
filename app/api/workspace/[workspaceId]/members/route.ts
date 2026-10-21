import { NextRequest, NextResponse } from "next/server";
import {
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  createWorkspaceInvitation,
} from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { WorkspaceRole } from "@/lib/types";
import { requireWorkspaceAccess } from "@/lib/rbac/server";
import {
  isValidWorkspaceRole,
  canManageMembers,
} from "@/lib/rbac/permissions";
import { sendWorkspaceInvitationEmail } from "@/lib/email/resend";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has permission to invite to this workspace
    const access = await requireWorkspaceAccess(user.id, workspaceId, "workspace:invite");
    if (!access) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to invite members" }, { status: 403 });
    }

    const { email, role } = await request.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    // Strictly validate role enum - fail closed (no fallback to "MEMBER")
    if (!role || !isValidWorkspaceRole(role)) {
      return NextResponse.json(
        { error: `Invalid role specified. Role must be one of: OWNER, ADMIN, MEMBER, VIEWER` },
        { status: 400 }
      );
    }

    // Only OWNER can invite another OWNER
    if (role === "OWNER" && access.role !== "OWNER") {
      return NextResponse.json({ error: "Only workspace owners can invite members with the OWNER role" }, { status: 403 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: { email: cleanEmail },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "This user is already a member of this workspace" }, { status: 409 });
    }

    // Issue a cryptographically secure workspace invitation token
    const invitation = await createWorkspaceInvitation(
      workspaceId,
      user.id,
      cleanEmail,
      role as WorkspaceRole
    );

    // Dispatch invitation email via Resend with the invite link
    const emailResult = await sendWorkspaceInvitationEmail({
      email: cleanEmail,
      inviterName: user.name || "A workspace admin",
      workspaceName: invitation.workspace.name,
      workspaceSlug: invitation.workspace.slug,
      role: role as WorkspaceRole,
      token: invitation.token,
    });

    const fullInvitation = {
      ...invitation,
      inviter: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    };

    const inviteLink = `/api/workspace/invite?token=${invitation.token}&ws=${encodeURIComponent(invitation.workspace.slug)}`;

    return NextResponse.json(
      {
        success: true,
        invitationToken: invitation.token,
        inviteLink,
        emailSent: emailResult.success,
        invitation: fullInvitation,
        member: null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] Member invite failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await requireWorkspaceAccess(user.id, workspaceId);
    if (!access || !canManageMembers(access.role)) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to manage members" }, { status: 403 });
    }

    const { userId, role } = await request.json();
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // A user cannot update their own role
    if (userId === user.id) {
      return NextResponse.json(
        { error: "Forbidden: You cannot update your own role" },
        { status: 403 }
      );
    }

    // Strictly validate role enum - fail closed
    if (!role || !isValidWorkspaceRole(role)) {
      return NextResponse.json(
        { error: `Invalid role specified. Role must be one of: OWNER, ADMIN, MEMBER, VIEWER` },
        { status: 400 }
      );
    }

    // Only OWNER can assign OWNER role
    if (role === "OWNER" && access.role !== "OWNER") {
      return NextResponse.json(
        { error: "Forbidden: Only workspace owners can assign the OWNER role" },
        { status: 403 }
      );
    }

    // Prevent removing or downgrading the last OWNER
    const targetMember = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId },
    });
    if (!targetMember) {
      return NextResponse.json({ error: "Member not found in workspace" }, { status: 404 });
    }

    if (targetMember.role === "OWNER" && role !== "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        return NextResponse.json({ error: "Cannot downgrade the last workspace owner" }, { status: 403 });
      }
    }

    const success = await updateWorkspaceMemberRole(workspaceId, userId, role as WorkspaceRole);
    if (!success) {
      return NextResponse.json({ error: "Failed to update role" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Member role update failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await requireWorkspaceAccess(user.id, workspaceId, "workspace:remove_member");
    if (!access) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to remove members" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Check if target is last OWNER
    const targetMember = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId },
    });
    if (!targetMember) {
      return NextResponse.json({ error: "Member not found in workspace" }, { status: 404 });
    }

    if (targetMember.role === "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        return NextResponse.json({ error: "Cannot remove the last workspace owner" }, { status: 403 });
      }
    }

    const success = await removeWorkspaceMember(workspaceId, userId);
    if (!success) {
      return NextResponse.json({ error: "Failed to remove member from workspace" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Member delete failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}