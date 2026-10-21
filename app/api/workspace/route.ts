import { NextRequest, NextResponse } from "next/server";
import { createWorkspace, getUserWorkspaces } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized: Please log in to create a workspace" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, description, projectName, projectKey } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!cleanSlug || cleanSlug.length < 2) {
      return NextResponse.json(
        { error: "Workspace URL slug must be at least 2 alphanumeric characters" },
        { status: 400 }
      );
    }

    const reservedSlugs = ["create", "new", "api", "login", "unauthorized", "settings", "activity"];
    if (reservedSlugs.includes(cleanSlug)) {
      return NextResponse.json(
        { error: `Slug "${cleanSlug}" is reserved. Please choose a different URL slug.` },
        { status: 400 }
      );
    }

    const result = await createWorkspace({
      name: name.trim(),
      slug: cleanSlug,
      description: description?.trim(),
      ownerId: user.id,
      projectName: projectName?.trim(),
      projectKey: projectKey?.trim(),
    });

    const redirectUrl = `/workspace/${result.workspace.slug}/project/${result.primaryProjectKey}`;

    return NextResponse.json(
      {
        success: true,
        workspace: result.workspace,
        redirectUrl,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[API] Create workspace error:", error);
    const message = error instanceof Error ? error.message : "Failed to create workspace";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await getUserWorkspaces(user.id);
    return NextResponse.json({ user, workspaces });
  } catch (error) {
    console.error("[API] Get workspaces error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
