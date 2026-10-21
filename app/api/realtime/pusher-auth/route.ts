import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getPusherServer } from "@/lib/realtime/server";
import { requireProjectWorkspaceAccess, requireWorkspaceAccess } from "@/lib/rbac/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pusher = getPusherServer();
    if (!pusher) {
      return NextResponse.json({ error: "Pusher is not configured" }, { status: 503 });
    }

    let socketId: string | null = null;
    let channelName: string | null = null;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      socketId = body.socket_id;
      channelName = body.channel_name;
    } else {
      const formData = await request.formData();
      socketId = formData.get("socket_id") as string;
      channelName = formData.get("channel_name") as string;
    }

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
    }

    // Verify channel authorization
    let isAuthorized = false;

    // Pattern 1: private-project-${projectId}
    const projectMatch = channelName.match(/^private-project-([a-zA-Z0-9_-]+)$/);
    if (projectMatch) {
      const projectId = projectMatch[1];
      const access = await requireProjectWorkspaceAccess(user.id, projectId);
      isAuthorized = Boolean(access);
    }

    // Pattern 2: private-workspace-${workspaceId}
    const workspaceMatch = channelName.match(/^private-workspace-([a-zA-Z0-9_-]+)$/);
    if (workspaceMatch) {
      const workspaceId = workspaceMatch[1];
      const access = await requireWorkspaceAccess(user.id, workspaceId);
      isAuthorized = Boolean(access);
    }

    // Pattern 3: private-user-${userId}
    const userMatch = channelName.match(/^private-user-([a-zA-Z0-9_-]+)$/);
    if (userMatch) {
      const targetUserId = userMatch[1];
      isAuthorized = user.id === targetUserId;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: You do not have access to this channel" }, { status: 403 });
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("[Pusher Auth] Authorization failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
