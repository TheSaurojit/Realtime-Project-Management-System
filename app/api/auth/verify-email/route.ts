import { NextRequest, NextResponse } from "next/server";
import { verifyEmailByToken } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    const errorUrl = new URL("/verify-email", request.url);
    errorUrl.searchParams.set("error", "Missing verification token.");
    return NextResponse.redirect(errorUrl);
  }

  const result = await verifyEmailByToken(token);
  if (!result.success || !result.user) {
    const errorUrl = new URL("/verify-email", request.url);
    errorUrl.searchParams.set("error", result.error || "Failed to verify email.");
    return NextResponse.redirect(errorUrl);
  }

  // Create session for the verified user so they are automatically signed in
  const sessionToken = await createSessionToken(result.user);
  await setSessionCookie(sessionToken);

  const destination = result.user.workspaceSlug
    ? `/workspace/${result.user.workspaceSlug}/project/${result.user.projectKey || "KAN"}`
    : "/workspaces";

  const successUrl = new URL("/verify-email", request.url);
  successUrl.searchParams.set("status", "success");
  successUrl.searchParams.set("redirect", destination);

  return NextResponse.redirect(successUrl);
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    const result = await verifyEmailByToken(token);
    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: result.error || "Failed to verify email" },
        { status: 400 }
      );
    }

    const sessionToken = await createSessionToken(result.user);
    await setSessionCookie(sessionToken);

    const redirectUrl = result.user.workspaceSlug
      ? `/workspace/${result.user.workspaceSlug}/project/${result.user.projectKey || "KAN"}`
      : "/workspaces";

    return NextResponse.json({
      success: true,
      user: result.user,
      redirectUrl,
    });
  } catch (error) {
    console.error("[Auth] Verify email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
