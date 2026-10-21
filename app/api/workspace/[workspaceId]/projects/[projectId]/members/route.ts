import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getEffectiveProjectAccess } from "@/lib/rbac/server";
import { canManageProjectMembers } from "@/lib/rbac/permissions";
import { addProjectMember, removeProjectMember, getProjectMembers } from "@/lib/db";
import { prisma } from "@/lib/prisma";

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

    // Resolve project access (at least view access in the workspace)
    const access = await getEffectiveProjectAccess(currentUser.id, projectId);
    if (!access || access.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const directMembers = await getProjectMembers(projectId);

    // Also get squad members if project has an assigned team
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        team: {
          select: {
            id: true,
            name: true,
            members: {
              include: { user: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      members: directMembers,
      squad: project?.team || null,
      currentUserAccess: access,
    });
  } catch (error) {
    console.error("[API] Get project members error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; projectId: string }> }
) {
  try {
    const { workspaceId, projectId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getEffectiveProjectAccess(currentUser.id, projectId);
    if (!access || access.workspaceId !== workspaceId || !canManageProjectMembers(access.projectRole)) {
      return NextResponse.json(
        { error: "Forbidden: Only Project Leads and Workspace Admins can assign project members." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const member = await addProjectMember({
      projectId,
      userId,
      role: role || "CONTRIBUTOR",
    });

    return NextResponse.json({ success: true, member });
  } catch (error: unknown) {
    console.error("[API] Add project member error:", error);
    const message = error instanceof Error ? error.message : "Failed to add project member";
    return NextResponse.json({ error: message }, { status: 400 });
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getEffectiveProjectAccess(currentUser.id, projectId);
    if (!access || access.workspaceId !== workspaceId || !canManageProjectMembers(access.projectRole)) {
      return NextResponse.json(
        { error: "Forbidden: Only Project Leads and Workspace Admins can remove project members." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    await removeProjectMember(projectId, userId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[API] Remove project member error:", error);
    const message = error instanceof Error ? error.message : "Failed to remove project member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
