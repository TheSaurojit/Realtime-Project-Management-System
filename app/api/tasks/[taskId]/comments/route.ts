import { NextRequest, NextResponse, after } from "next/server";
import { addComment } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { broadcastRealtimeEvent } from "@/lib/realtime/server";
import { requireTaskWorkspaceAccess } from "@/lib/rbac/server";
import { sanitizeSensitiveFields } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await requireTaskWorkspaceAccess(user.id, taskId, "comment:create");
    if (!access) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to comment on this task" }, { status: 403 });
    }

    const { content } = await request.json();
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const result = await addComment(taskId, user.id, content.trim());
    if (!result) {
      return NextResponse.json({ error: "Failed to add comment" }, { status: 400 });
    }

    const { notifications, ...commentData } = result;
    const safeComment = sanitizeSensitiveFields(commentData);

    after(async () => {
      await broadcastRealtimeEvent(`project-${access.task.projectId}`, {
        type: "comment:created",
        payload: { comment: safeComment, taskId, projectId: access.task.projectId },
      });

      if (notifications && notifications.length > 0) {
        for (const notif of notifications) {
          await broadcastRealtimeEvent(`user-${notif.userId}`, {
            type: "notification:created",
            payload: {
              notification: sanitizeSensitiveFields(notif),
              userId: notif.userId,
            },
          });
        }
      }
    });

    return NextResponse.json(safeComment, { status: 201 });
  } catch (error) {
    console.error("[API] Comment creation failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}