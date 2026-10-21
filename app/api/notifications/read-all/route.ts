import { NextResponse } from "next/server";
import { markAllNotificationsAsRead } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await markAllNotificationsAsRead(user.id);
  return NextResponse.json({ success: true });
}
