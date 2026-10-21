import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireWorkspaceAccess } from "@/lib/rbac/server";
import { canManageTeams } from "@/lib/rbac/permissions";
import { getTeamById, updateTeam } from "@/lib/db";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; teamId: string }> }
) {
  try {
    const { workspaceId, teamId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await requireWorkspaceAccess(currentUser.id, workspaceId);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const team = await getTeamById(teamId, access.workspaceId);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error("[API] Get Team details error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; teamId: string }> }
) {
  try {
    const { workspaceId, teamId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await requireWorkspaceAccess(currentUser.id, workspaceId);
    if (!access || !canManageTeams(access.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only workspace Owners and Admins can update teams." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, color, memberIds, leadId } = body;

    const updated = await updateTeam({
      teamId,
      workspaceId: access.workspaceId,
      name,
      description,
      color,
      memberIds,
      leadId,
      actorId: currentUser.id,
    });

    return NextResponse.json({ success: true, team: updated });
  } catch (error: unknown) {
    console.error("[API] Update Team error:", error);
    const message = error instanceof Error ? error.message : "Failed to update team";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; teamId: string }> }
) {
  try {
    const { workspaceId, teamId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await requireWorkspaceAccess(currentUser.id, workspaceId);
    if (!access || !canManageTeams(access.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only workspace Owners and Admins can delete teams." },
        { status: 403 }
      );
    }

    const existing = await prisma.team.findFirst({
      where: { id: teamId, workspaceId: access.workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Unassign team from any associated projects so projects are not deleted
    await prisma.project.updateMany({
      where: { teamId },
      data: { teamId: null },
    });

    await prisma.team.delete({
      where: { id: teamId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[API] Delete Team error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete team";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
