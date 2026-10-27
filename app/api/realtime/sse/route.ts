import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { realtimeBus } from "@/lib/realtime/server";
import { RealtimeEvent } from "@/lib/types";
import { requireProjectWorkspaceAccess, requireWorkspaceAccess } from "@/lib/rbac/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "SSE realtime is available only for single-process development. Configure Pusher for production." },
      { status: 503 }
    );
  }

  // 1. Authenticate user
  const user = await getCurrentUser();
  if (!user) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ type: "unauthorized", message: "Authentication required" })}\n\n`
          )
        );
        controller.close();
      },
    });
    return new Response(stream, {
      status: 401,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // 2. Validate requested channel against user's tenant permissions
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel");

  if (!channel) {
    return new Response("Missing channel parameter", { status: 400 });
  }

  let isAuthorized = false;

  // Pattern: project-${projectId}
  const projectMatch = channel.match(/^project-([a-zA-Z0-9_-]+)$/);
  if (projectMatch) {
    const projectId = projectMatch[1];
    const access = await requireProjectWorkspaceAccess(user.id, projectId);
    isAuthorized = Boolean(access);
  }

  // Pattern: workspace-${workspaceId}
  const workspaceMatch = channel.match(/^workspace-([a-zA-Z0-9_-]+)$/);
  if (workspaceMatch) {
    const workspaceId = workspaceMatch[1];
    const access = await requireWorkspaceAccess(user.id, workspaceId);
    isAuthorized = Boolean(access);
  }

  // Pattern: user-${userId}
  const userMatch = channel.match(/^user-([a-zA-Z0-9_-]+)$/);
  if (userMatch) {
    const targetUserId = userMatch[1];
    isAuthorized = user.id === targetUserId;
  }

  if (!isAuthorized) {
    return new Response("Forbidden: You do not have access to this channel", { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", channel })}\n\n`)
      );

      const listener = (event: RealtimeEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          realtimeBus.off(channel, listener);
        }
      };

      realtimeBus.on(channel, listener);

      // Keepalive ping every 15s
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
          realtimeBus.off(channel, listener);
        }
      }, 15000);

      // Cleanup when connection closes or aborts
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        realtimeBus.off(channel, listener);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}