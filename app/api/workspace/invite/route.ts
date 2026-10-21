import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { acceptWorkspaceInvitation } from "@/lib/db";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const wsSlug = searchParams.get("ws");

  if (!token) {
    const errorUrl = new URL("/invite", request.url);
    errorUrl.searchParams.set("error", "Missing invitation token.");
    return NextResponse.redirect(errorUrl);
  }

  const currentUser = await getCurrentUser();

  // Look up invitation by token
  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { token },
    include: {
      workspace: true,
      inviter: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // If token is NOT in database
  if (!invitation) {
    // If user is logged in, check if they are already a member of the workspace
    if (currentUser) {
      if (wsSlug) {
        const existingMembership = await prisma.workspaceMember.findFirst({
          where: {
            workspace: { OR: [{ slug: wsSlug }, { id: wsSlug }] },
            userId: currentUser.id,
          },
          include: { workspace: true },
        });

        if (existingMembership) {
          // User already belongs to this workspace! Seamlessly redirect inside
          return NextResponse.redirect(new URL(`/workspaces`, request.url));
        }
      }

      // Check if user has recently joined matching workspace
      const anyMembership = await prisma.workspaceMember.findFirst({
        where: { userId: currentUser.id },
        include: { workspace: true },
        orderBy: { joinedAt: "desc" },
      });

      if (anyMembership && wsSlug && anyMembership.workspace.slug === wsSlug) {
        return NextResponse.redirect(new URL(`/workspace/${anyMembership.workspace.slug}`, request.url));
      }
    }

    // Token was already used or not found
    const invitePageUrl = new URL("/invite", request.url);
    invitePageUrl.searchParams.set("error", "This invitation link is invalid or has already been accepted.");
    if (wsSlug) invitePageUrl.searchParams.set("ws", wsSlug);
    return NextResponse.redirect(invitePageUrl);
  }

  // Token is found! Check expiration
  if (new Date() > invitation.expiresAt) {
    const errorUrl = new URL("/invite", request.url);
    errorUrl.searchParams.set("error", "This workspace invitation has expired. Please ask an administrator to send a new invite.");
    errorUrl.searchParams.set("workspaceName", invitation.workspace.name);
    return NextResponse.redirect(errorUrl);
  }

  // If user is not logged in, redirect to login with redirect param and pre-filled email
  if (!currentUser) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "redirect",
      `/api/workspace/invite?token=${token}&ws=${encodeURIComponent(invitation.workspace.slug)}`
    );
    loginUrl.searchParams.set("email", invitation.email);
    return NextResponse.redirect(loginUrl);
  }

  // If user is logged in: Check if they are already a member of this workspace
  const alreadyMember = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: invitation.workspaceId,
      userId: currentUser.id,
    },
  });

  if (alreadyMember) {
    // Clean up lingering invitation if any
    await prisma.workspaceInvitation.delete({
      where: { id: invitation.id },
    }).catch(() => {});

    return NextResponse.redirect(new URL(`/workspace/${invitation.workspace.slug}`, request.url));
  }

  // Check if current user email matches the invited email
  const isEmailMatch = currentUser.email.toLowerCase().trim() === invitation.email.toLowerCase().trim();

  if (isEmailMatch) {
    // Seamless automatic acceptance
    try {
      const membership = await acceptWorkspaceInvitation(token, currentUser.id);
      return NextResponse.redirect(new URL(`/workspace/${membership.workspace.slug}`, request.url));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to accept invitation";
      const errorUrl = new URL("/invite", request.url);
      errorUrl.searchParams.set("error", message);
      return NextResponse.redirect(errorUrl);
    }
  }

  // Logged in with a different email account than the one invited:
  // Route to the /invite page so they can choose to accept as current user OR switch accounts
  const invitePageUrl = new URL("/invite", request.url);
  invitePageUrl.searchParams.set("token", token);
  invitePageUrl.searchParams.set("invitedEmail", invitation.email);
  invitePageUrl.searchParams.set("currentEmail", currentUser.email);
  invitePageUrl.searchParams.set("workspaceName", invitation.workspace.name);
  invitePageUrl.searchParams.set("role", invitation.role);
  invitePageUrl.searchParams.set("inviterName", invitation.inviter?.name || "A workspace admin");
  return NextResponse.redirect(invitePageUrl);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Invitation token is required" }, { status: 400 });
    }

    const membership = await acceptWorkspaceInvitation(token, user.id);
    return NextResponse.json({ success: true, workspace: membership.workspace });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to accept invitation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
