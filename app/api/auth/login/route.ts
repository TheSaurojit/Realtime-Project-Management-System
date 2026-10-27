import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { getSafeInternalRedirect } from "@/lib/auth/redirect";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, redirect } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Require email verification
    if (user.emailVerified === false) {
      return NextResponse.json(
        {
          error: "Please verify your email address before signing in. Check your inbox for the verification link.",
          emailVerificationRequired: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    });

    await setSessionCookie(token);

    const fallbackUrl = user.workspaceSlug
      ? `/workspace/${user.workspaceSlug}/project/${user.projectKey || "KAN"}`
      : `/workspaces`;

    const redirectUrl = getSafeInternalRedirect(redirect, fallbackUrl);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      redirectUrl,
    });
  } catch (error) {
    console.error("[Auth] Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
