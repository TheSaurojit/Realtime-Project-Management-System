import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireWorkspaceAccess } from "@/lib/rbac/server";
import { deleteProject } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { broadcastRealtimeEvent } from "@/lib/realtime/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; projectId: string }> }
) {
  try {
    const { workspaceId, projectId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await requireWorkspaceAccess(currentUser.id, workspaceId);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cleanIdOrKey = projectId.trim();
    const project = await prisma.project.findFirst({
      where: {
        workspaceId: access.workspaceId,
        OR: [
          { id: cleanIdOrKey },
          { key: cleanIdOrKey.toUpperCase() },
        ],
      },
      include: {
        team: true,
        lead: true,
        _count: {
          select: { tasks: true, members: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("[API] Get Project error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; projectId: string }> }
) {
  try {
    const { workspaceId, projectId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized: Please sign in." }, { status: 401 });
    }

    // RBAC: strict check - requires "project:delete" permission (granted ONLY to OWNER and ADMIN)
    const access = await requireWorkspaceAccess(currentUser.id, workspaceId, "project:delete");
    if (!access) {
      return NextResponse.json(
        { error: "Forbidden: Only workspace Owners and Admins can delete projects." },
        { status: 403 }
      );
    }

    const result = await deleteProject(projectId, access.workspaceId, currentUser.id);

    // Broadcast project deletion to workspace and project channels
    await broadcastRealtimeEvent(`workspace-${access.workspaceId}`, {
      type: "project:deleted",
      payload: {
        projectId: result.deletedProject.id,
        workspaceId: access.workspaceId,
      },
    }).catch(() => {});

    await broadcastRealtimeEvent(`project-${result.deletedProject.id}`, {
      type: "project:deleted",
      payload: {
        projectId: result.deletedProject.id,
        workspaceId: access.workspaceId,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Project "${result.deletedProject.name}" deleted successfully.`,
      project: result.deletedProject,
    });
  } catch (error: unknown) {
    console.error("[API] Delete Project error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete project.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
