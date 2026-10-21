import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireWorkspaceAccess } from "@/lib/rbac/server";
import { canCreateProject } from "@/lib/rbac/permissions";
import { createProject } from "@/lib/db";

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
    if (!access || !canCreateProject(access.role)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to create projects in this workspace." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, key, description, color, teamId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Project name is required." }, { status: 400 });
    }

    const cleanKey = (key || name.replace(/[^a-zA-Z]/g, "").slice(0, 4))
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]/g, "");

    if (!cleanKey || cleanKey.length < 2) {
      return NextResponse.json(
        { error: "Project key must be at least 2 alphanumeric characters (e.g. 'DEV', 'MOB')." },
        { status: 400 }
      );
    }

    const reservedKeys = ["CREATE", "NEW", "API", "SETTINGS", "ACTIVITY"];
    if (reservedKeys.includes(cleanKey)) {
      return NextResponse.json(
        { error: `The project key "${cleanKey}" is reserved. Please pick a different key.` },
        { status: 400 }
      );
    }


    if (!teamId || typeof teamId !== "string" || !teamId.trim()) {
      return NextResponse.json(
        { error: "Team is required. Please select a squad/team for this project." },
        { status: 400 }
      );
    }

    const project = await createProject({
      workspaceId: access.workspaceId,
      name: name.trim(),
      key: cleanKey,
      description: description?.trim() || undefined,
      color: color || "#6366f1",
      teamId: teamId.trim(),
      leadId: currentUser.id,
    });


    return NextResponse.json(
      {
        success: true,
        project,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[API] Create Project error:", error);
    const message = error instanceof Error ? error.message : "Failed to create project.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
