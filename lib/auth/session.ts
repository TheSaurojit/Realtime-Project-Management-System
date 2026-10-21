import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { User, WorkspaceRole } from "@/lib/types";
import { findUserById } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "pm_session_user";

export async function createSessionToken(user: User): Promise<string> {
  return new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    workspaceId: user.workspaceSlug,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(env.JWT_SECRET_BYTES);
}

export async function verifySessionToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, env.JWT_SECRET_BYTES);
    const userId = payload.userId as string;
    if (!userId) return null;

    const dbUser = await findUserById(userId);
    if (!dbUser) return null;

    let role: WorkspaceRole = "VIEWER";
    const targetWorkspace = payload.workspaceId as string | undefined;

    if (targetWorkspace) {
      const membership = await prisma.workspaceMember.findFirst({
        where: {
          userId: dbUser.id,
          OR: [
            { workspaceId: targetWorkspace },
            { workspace: { slug: targetWorkspace } },
          ],
        },
        orderBy: { joinedAt: "desc" },
      });
      if (membership) {
        role = membership.role as WorkspaceRole;
      }
    } else if (payload.role) {
      role = payload.role as WorkspaceRole;
    } else {
      const firstMembership = dbUser.workspaceMemberships[0];
      if (firstMembership) {
        role = firstMembership.role as WorkspaceRole;
      }
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      avatarUrl: dbUser.avatarUrl,
      passwordHash: dbUser.passwordHash,
      role,
      workspaceSlug: (payload.workspaceId as string) || dbUser.workspaceMemberships[0]?.workspace?.slug,
      projectKey: dbUser.workspaceMemberships[0]?.workspace?.projects[0]?.key,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

    if (sessionCookie) {
      const verified = await verifySessionToken(sessionCookie);
      if (verified) return verified;
    }
  } catch (error) {
    console.error("[Auth] Error getting current user:", error);
  }

  return null;
}

export async function getUserRoleInWorkspace(userId: string, workspaceIdOrSlug?: string): Promise<WorkspaceRole | null> {
  if (!workspaceIdOrSlug) return null;
  try {
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        OR: [
          { workspaceId: workspaceIdOrSlug },
          { workspace: { slug: workspaceIdOrSlug } },
        ],
      },
      orderBy: { joinedAt: "desc" },
    });
    return member ? (member.role as WorkspaceRole) : null;
  } catch {
    return null;
  }
}