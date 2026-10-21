import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/rbac/server";
import { canManageMembers } from "@/lib/rbac/permissions";

export async function GET(
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
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view invitations" },
        { status: 403 }
      );
    }

    const invitations = await prisma.workspaceInvitation.findMany({
      where: {
        workspaceId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, invitations });
  } catch (error) {
    console.error("[API] Get invitations failed:", error);
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

    const access = await requireWorkspaceAccess(user.id, workspaceId);
    if (!access || !canManageMembers(access.role)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to revoke invitations" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    const invitation = await prisma.workspaceInvitation.findFirst({
      where: { id: invitationId, workspaceId },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    await prisma.workspaceInvitation.delete({
      where: { id: invitationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Revoke invitation failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
