import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, createEmailVerificationToken } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email/resend";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(cleanEmail);

    if (!user) {
      // Don't leak user existence; return generic success
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a verification link has been sent.",
      });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "This email address is already verified. Please sign in." },
        { status: 400 }
      );
    }

    // Generate fresh verification token
    const tokenRecord = await createEmailVerificationToken(cleanEmail);

    // Send verification email via Resend
    await sendVerificationEmail({
      email: cleanEmail,
      name: user.name,
      token: tokenRecord.token,
    });

    return NextResponse.json({
      success: true,
      message: `A fresh verification link has been sent to ${cleanEmail}. Please check your inbox.`,
    });
  } catch (error) {
    console.error("[Auth] Resend verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
