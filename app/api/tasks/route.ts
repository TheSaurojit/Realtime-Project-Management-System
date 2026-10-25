import { NextRequest, NextResponse, after } from "next/server";
import { createTask } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { broadcastRealtimeEvent } from "@/lib/realtime/server";
import { requireProjectWorkspaceAccess } from "@/lib/rbac/server";
import { TaskPriority } from "@/lib/types";
import { sanitizeSensitiveFields } from "@/lib/utils";

const VALID_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, columnId, title, description, priority, assigneeIds, labelIds, dueDate } = body;

    if (!projectId || !columnId || !title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Missing required fields: projectId, columnId, and title are required" }, { status: 400 });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: `Invalid priority value. Must be one of: ${VALID_PRIORITIES.join(", ")}` }, { status: 400 });
    }

    if (assigneeIds !== undefined && (!Array.isArray(assigneeIds) || assigneeIds.some((id) => typeof id !== "string"))) {
      return NextResponse.json({ error: "assigneeIds must be an array of string user IDs" }, { status: 400 });
    }

    if (labelIds !== undefined && (!Array.isArray(labelIds) || labelIds.some((id) => typeof id !== "string"))) {
      return NextResponse.json({ error: "labelIds must be an array of string label IDs" }, { status: 400 });
    }

    // Authorization layer check
    const access = await requireProjectWorkspaceAccess(user.id, projectId, "task:create");
    if (!access) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create tasks in this project" }, { status: 403 });
    }

    const task = await createTask({
      projectId,
      columnId,
      title: title.trim(),
      description: typeof description === "string" ? description : undefined,
      priority: priority as TaskPriority | undefined,
      reporterId: user.id,
      assigneeIds: Array.isArray(assigneeIds) ? assigneeIds : undefined,
      labelIds: Array.isArray(labelIds) ? labelIds : undefined,
      dueDate: dueDate || null,
    });

    const safeTask = sanitizeSensitiveFields(task);

    // Broadcast after response via Next.js 16 after() API to eliminate double-broadcast race conditions
    after(async () => {
      await broadcastRealtimeEvent(`project-${projectId}`, {
        type: "task:created",
        payload: { task: safeTask, projectId },
      });
    });

    return NextResponse.json(safeTask, { status: 201 });
  } catch (error: unknown) {
    console.error("[API] Task create failed:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const isClientError =
      message.includes("not found") ||
      message.includes("does not belong") ||
      message.includes("do not belong") ||
      message.includes("Target column") ||
      message.includes("Assignee") ||
      message.includes("Label") ||
      message.includes("Invalid");
    const status = isClientError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}