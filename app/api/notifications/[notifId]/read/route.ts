import { NextRequest, NextResponse } from "next/server";
import { markNotificationAsRead } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ notifId: string }> }
) {
  try {
    const { notifId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!notifId) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
    }

    const success = await markNotificationAsRead(notifId, user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Notification not found or does not belong to the authenticated user" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Mark notification read failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}