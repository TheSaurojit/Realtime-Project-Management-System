import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireWorkspaceAccess } from "@/lib/rbac/server";
import { canManageTeams } from "@/lib/rbac/permissions";
import { createTeam, SAFE_USER_SELECT } from "@/lib/db";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized: Please sign in." }, { status: 401 });
    }

    const access = await requireWorkspaceAccess(currentUser.id, workspaceId);
    if (!access || !canManageTeams(access.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only workspace Owners and Admins can create teams." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, color, memberIds, leadId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Team name is required." }, { status: 400 });
    }

    const team = await createTeam({
      workspaceId: access.workspaceId,
      name: name.trim(),
      description: description?.trim() || undefined,
      color: color || "#6366f1",
      memberIds: Array.isArray(memberIds) ? memberIds : [],
      leadId: leadId || undefined,
      actorId: currentUser.id,
    });

    return NextResponse.json(
      {
        success: true,
        team,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[API] Create Team error:", error);
    const message = error instanceof Error ? error.message : "Failed to create team.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await requireWorkspaceAccess(currentUser.id, workspaceId);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const teams = await prisma.team.findMany({
      where: { workspaceId: access.workspaceId },
      include: {
        members: {
          include: {
            user: { select: SAFE_USER_SELECT },
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            key: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("[API] Get Teams error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
