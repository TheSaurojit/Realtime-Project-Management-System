import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { env } from "@/lib/env";
import { isValidWorkspaceRole } from "@/lib/rbac/permissions";

const SESSION_COOKIE = "pm_session_user";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  workspaceId?: string;
}

/**
 * Extracts and verifies the authenticated user from session cookies.
 * Only accepts signed JWT tokens. No raw user-ID fallback.
 */
async function getAuthenticatedUser(request: NextRequest): Promise<AuthUser | null> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  try {
    const { payload } = await jwtVerify(sessionCookie, env.JWT_SECRET_BYTES);
    if (payload.userId) {
      return {
        id: payload.userId as string,
        email: (payload.email as string) || "",
        name: (payload.name as string) || "",
        role: isValidWorkspaceRole(payload.role) ? (payload.role as string) : undefined,
        workspaceId: payload.workspaceId as string | undefined,
      };
    }
  } catch {
    // Unauthenticated (no raw-ID fallback)
  }

  return null;
}

/**
 * Next.js 16 Proxy handler.
 * Validates authentication optimistically before allowing access.
 * Deep authorization is enforced in Server Components (DAL) and Route Handlers.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");

  // Allow invitation verification endpoint to handle authentication and redirection
  if (pathname === "/api/workspace/invite" || pathname.startsWith("/api/workspace/invite")) {
    return NextResponse.next();
  }

  // 1. Authenticate user (JWT only, no raw-ID fallback)
  const user = await getAuthenticatedUser(request);

  if (!user) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Unauthorized: You must be logged in to access this resource" },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    loginUrl.searchParams.set("error", "unauthenticated");
    return NextResponse.redirect(loginUrl);
  }

  // 2. Redirect bare workspace path to workspaces list
  if (pathname === "/workspace" || pathname === "/workspace/") {
    return NextResponse.redirect(new URL("/workspaces", request.url));
  }

  // 3. Pass through with validated user headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", user.id);
  requestHeaders.set("x-user-email", user.email);
  if (user.role) {
    requestHeaders.set("x-user-role", user.role);
  }
  if (user.workspaceId) {
    requestHeaders.set("x-workspace-id", user.workspaceId);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/workspaces",
    "/workspace",
    "/workspace/:path*",
    "/api/workspace",
    "/api/workspace/:path*",
    "/api/tasks/:path*",
    "/api/notifications/:path*",
    "/api/realtime/:path*",
  ],
};