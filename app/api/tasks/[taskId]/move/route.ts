import { NextRequest, NextResponse, after } from "next/server";
import { moveTask } from "@/lib/db";
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

    const access = await requireTaskWorkspaceAccess(user.id, taskId, "task:move");
    if (!access) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to move this task" }, { status: 403 });
    }

    const body = await request.json();
    const { destColumnId, newPosition } = body;

    if (!destColumnId || typeof destColumnId !== "string") {
      return NextResponse.json({ error: "destColumnId is required" }, { status: 400 });
    }

    if (typeof newPosition !== "number") {
      return NextResponse.json({ error: "newPosition must be a number" }, { status: 400 });
    }

    const sourceColumnId = access.task.columnId;
    const result = await moveTask(taskId, destColumnId, newPosition, user.id);
    if (!result) {
      return NextResponse.json({ error: "Failed to move task: column may not exist or belongs to another project" }, { status: 400 });
    }

    after(async () => {
      await broadcastRealtimeEvent(`project-${access.task.projectId}`, {
        type: "task:moved",
        payload: {
          taskId,
          sourceColumnId,
          destColumnId,
          newPosition,
          projectId: access.task.projectId,
        },
      });
    });

    return NextResponse.json({ success: true, task: sanitizeSensitiveFields(result) });
  } catch (error: unknown) {
    console.error("[API] Task move failed:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}