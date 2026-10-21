import { NextRequest, NextResponse, after } from "next/server";
import { addAttachment, deleteAttachment, getTaskById } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { broadcastRealtimeEvent } from "@/lib/realtime/server";
import { requireTaskWorkspaceAccess } from "@/lib/rbac/server";
import {
  validateAttachmentImage,
  uploadTaskAttachmentToSupabase,
  deleteTaskAttachmentFromSupabase,
} from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

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
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to attach files to this task" },
        { status: 403 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let uploadedFile: {
      name: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    };

    if (contentType.includes("multipart/form-data")) {
      // 1. Direct Multipart File Upload to Supabase
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        return NextResponse.json(
          { error: "Failed to parse upload. Please ensure file does not exceed the 10MB maximum limit." },
          { status: 400 }
        );
      }

      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided in form data" }, { status: 400 });
      }

      // Validate image format and 10MB maximum size limit
      const validation = validateAttachmentImage({
        size: file.size,
        type: file.type,
        name: file.name,
      });

      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Supabase Storage
      const { fileUrl } = await uploadTaskAttachmentToSupabase({
        taskId,
        fileName: file.name,
        fileType: file.type || "image/jpeg",
        fileSize: file.size,
        buffer,
      });

      uploadedFile = {
        name: file.name,
        fileUrl,
        fileType: file.type || "image/jpeg",
        fileSize: file.size,
      };
    } else {
      // 2. JSON Body (Fallback or pre-uploaded)
      const body = await request.json();
      const { name, fileUrl, fileType, fileSize } = body;

      if (!name || !fileUrl) {
        return NextResponse.json({ error: "name and fileUrl are required" }, { status: 400 });
      }

      const validation = validateAttachmentImage({
        size: Number(fileSize) || 0,
        type: String(fileType || ""),
        name: String(name),
      });

      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      if (!fileUrl.startsWith("http://") && !fileUrl.startsWith("https://")) {
        return NextResponse.json({ error: "Invalid file URL scheme. Must be an HTTP(S) URL." }, { status: 400 });
      }

      uploadedFile = {
        name: String(name),
        fileUrl: String(fileUrl),
        fileType: String(fileType || "image/jpeg"),
        fileSize: Number(fileSize) || 0,
      };
    }

    // Persist attachment in database
    const createdAttachment = await addAttachment(taskId, user.id, uploadedFile);

    const updated = await getTaskById(taskId);
    if (updated) {
      after(async () => {
        await broadcastRealtimeEvent(`project-${access.task.projectId}`, {
          type: "task:updated",
          payload: { task: updated, projectId: access.task.projectId },
        });
      });
    }

    return NextResponse.json({
      success: true,
      task: updated,
      attachment: createdAttachment,
    });
  } catch (error) {
    console.error("[API] Attachment upload error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
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

    const access = await requireTaskWorkspaceAccess(user.id, taskId, "task:edit");
    if (!access) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to remove attachments from this task" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const attachmentId =
      searchParams.get("attachmentId") ||
      (await request.json().catch(() => ({})))?.attachmentId;

    if (!attachmentId) {
      return NextResponse.json({ error: "attachmentId is required" }, { status: 400 });
    }

    // Find attachment in this task
    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, taskId },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Remove from Supabase Storage if it's hosted there
    await deleteTaskAttachmentFromSupabase(attachment.fileUrl);

    // Delete record from database and log activity
    await deleteAttachment(attachmentId, user.id);

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
    console.error("[API] Delete attachment error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
