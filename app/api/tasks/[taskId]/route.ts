import { NextRequest, NextResponse, after } from "next/server";
import { updateTask, deleteTask } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { broadcastRealtimeEvent } from "@/lib/realtime/server";
import { requireTaskWorkspaceAccess } from "@/lib/rbac/server";
import { TaskPriority, TaskStatus } from "@/lib/types";

const VALID_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const VALID_STATUSES: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const ALLOWED_UPDATE_FIELDS = new Set([
  "title",
  "description",
  "priority",
  "status",
  "points",
  "dueDate",
  "columnId",
]);

export async function PATCH(
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
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload body" }, { status: 400 });
    }

    // Whitelist validation
    const updates: Parameters<typeof updateTask>[1] = {};
    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_UPDATE_FIELDS.has(key)) {
        return NextResponse.json({ error: `Field '${key}' is not allowed for task update` }, { status: 400 });
      }

      if (key === "title") {
        if (typeof value !== "string" || !value.trim()) {
          return NextResponse.json({ error: "Title must be a non-empty string" }, { status: 400 });
        }
        updates.title = value.trim();
      } else if (key === "description") {
        if (value !== null && typeof value !== "string") {
          return NextResponse.json({ error: "Description must be a string or null" }, { status: 400 });
        }
        updates.description = value as string | null;
      } else if (key === "priority") {
        if (!VALID_PRIORITIES.includes(value as TaskPriority)) {
          return NextResponse.json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` }, { status: 400 });
        }
        updates.priority = value as TaskPriority;
      } else if (key === "status") {
        if (!VALID_STATUSES.includes(value as TaskStatus)) {
          return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
        }
        updates.status = value as TaskStatus;
      } else if (key === "points") {
        if (value !== null && (typeof value !== "number" || value < 0)) {
          return NextResponse.json({ error: "Points must be a non-negative number or null" }, { status: 400 });
        }
        updates.points = value as number | null;
      } else if (key === "dueDate") {
        if (value !== null && typeof value !== "string") {
          return NextResponse.json({ error: "DueDate must be an ISO date string or null" }, { status: 400 });
        }
        updates.dueDate = value as string | null;
      } else if (key === "columnId") {
        if (typeof value !== "string") {
          return NextResponse.json({ error: "ColumnId must be a string" }, { status: 400 });
        }
        updates.columnId = value as string;
      }
    }

    const updated = await updateTask(taskId, updates, user.id);
    if (!updated) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Broadcast after response via Next.js 16 after() API
    after(async () => {
      await broadcastRealtimeEvent(`project-${updated.projectId}`, {
        type: "task:updated",
        payload: { task: updated, projectId: updated.projectId },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API] Task update failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await requireTaskWorkspaceAccess(user.id, taskId, "task:delete");
    if (!access) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to delete this task" }, { status: 403 });
    }

    const success = await deleteTask(taskId, user.id);
    if (!success) {
      return NextResponse.json({ error: "Task not found or failed to delete" }, { status: 404 });
    }

    // Broadcast after response via Next.js 16 after() API
    after(async () => {
      await broadcastRealtimeEvent(`project-${access.task.projectId}`, {
        type: "task:deleted",
        payload: { taskId, columnId: access.task.columnId, projectId: access.task.projectId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Task delete failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}