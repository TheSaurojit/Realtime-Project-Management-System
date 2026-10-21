import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  findUserByEmail,
  createUserWithWorkspace,
  createEmailVerificationToken,
} from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email/resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await findUserByEmail(cleanEmail);

    if (existingUser) {
      if (existingUser.emailVerified) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in." },
          { status: 409 }
        );
      }

      // If user exists but is unverified, re-issue a verification token and email
      const tokenRecord = await createEmailVerificationToken(cleanEmail);
      await sendVerificationEmail({
        email: cleanEmail,
        name: existingUser.name,
        token: tokenRecord.token,
      });

      return NextResponse.json({
        success: true,
        emailVerificationRequired: true,
        email: cleanEmail,
        message: "An unverified account with this email already exists. A fresh verification link has been sent to your inbox.",
      }, { status: 200 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and initial workspace with emailVerified: false
    const { user } = await createUserWithWorkspace({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      emailVerified: false,
    });

    // Create email verification token
    const tokenRecord = await createEmailVerificationToken(cleanEmail);

    // Dispatch verification email via Resend
    await sendVerificationEmail({
      email: cleanEmail,
      name: user.name,
      token: tokenRecord.token,
    });

    return NextResponse.json({
      success: true,
      emailVerificationRequired: true,
      email: cleanEmail,
      message: "Account created! Please check your email to verify your account before logging in.",
    }, { status: 201 });
  } catch (error) {
    console.error("[Auth] Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

