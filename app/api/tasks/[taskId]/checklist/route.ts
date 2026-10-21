import { NextRequest, NextResponse, after } from "next/server";
import { toggleChecklistItem, addChecklistItem, getTaskById } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { broadcastRealtimeEvent } from "@/lib/realtime/server";
import { requireTaskWorkspaceAccess } from "@/lib/rbac/server";

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

    const access = await requireTaskWorkspaceAccess(user.id, taskId, "task:edit");
    if (!access) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to edit this task" }, { status: 403 });
    }

    const body = await request.json();
    const { action, checklistId, itemId, content } = body;

    if (action === "toggle") {
      if (!checklistId || !itemId) {
        return NextResponse.json({ error: "checklistId and itemId are required for toggle" }, { status: 400 });
      }
      const ok = await toggleChecklistItem(taskId, checklistId, itemId);
      if (!ok) {
        return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
      }
    } else if (action === "add") {
      if (!content || typeof content !== "string" || !content.trim()) {
        return NextResponse.json({ error: "Content is required for checklist item" }, { status: 400 });
      }
      const ok = await addChecklistItem(taskId, checklistId || "", content.trim());
      if (!ok) {
        return NextResponse.json({ error: "Failed to add checklist item" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Invalid action. Must be 'toggle' or 'add'" }, { status: 400 });
    }

    const updated = await getTaskById(taskId);
    if (updated) {
      after(async () => {
        await broadcastRealtimeEvent(`project-${access.task.projectId}`, {
          type: "task:updated",
          payload: { task: updated, projectId: access.task.projectId },
        });
      });
    }

    return NextResponse.json({ success: true, task: updated });
  } catch (error) {
    console.error("[API] Checklist operation failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}