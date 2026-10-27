import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const pusherTrigger = vi.hoisted(() => vi.fn());

vi.mock("pusher", () => ({
  default: class MockPusher {
    trigger = pusherTrigger;
  },
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/rbac/server", () => ({
  requireProjectWorkspaceAccess: vi.fn(),
  requireWorkspaceAccess: vi.fn(),
}));

const event = {
  type: "task:deleted" as const,
  payload: { taskId: "task-1", columnId: "column-1", projectId: "project-1" },
};

describe("production and development realtime transports", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function setPusherEnvironment() {
    vi.stubEnv("PUSHER_APP_ID", "app-id");
    vi.stubEnv("NEXT_PUBLIC_PUSHER_KEY", "public-key");
    vi.stubEnv("PUSHER_SECRET", "secret");
    vi.stubEnv("NEXT_PUBLIC_PUSHER_CLUSTER", "mt1");
  }

  it("broadcasts production events through Pusher without using the local bus", async () => {
    vi.stubEnv("NODE_ENV", "production");
    setPusherEnvironment();
    const { broadcastRealtimeEvent, realtimeBus } = await import("@/lib/realtime/server");
    const localListener = vi.fn();
    realtimeBus.on("project-project-1", localListener);

    await broadcastRealtimeEvent("project-project-1", event);

    expect(pusherTrigger).toHaveBeenCalledWith(
      "private-project-project-1",
      "task:deleted",
      event.payload
    );
    expect(localListener).not.toHaveBeenCalled();
    realtimeBus.off("project-project-1", localListener);
  });

  it("does not fall back to the local bus when a production Pusher broadcast fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    setPusherEnvironment();
    pusherTrigger.mockRejectedValueOnce(new Error("provider unavailable"));
    const { broadcastRealtimeEvent, realtimeBus } = await import("@/lib/realtime/server");
    const localListener = vi.fn();
    realtimeBus.on("project-project-1", localListener);

    await expect(broadcastRealtimeEvent("project-project-1", event)).rejects.toThrow(
      "provider unavailable"
    );
    expect(localListener).not.toHaveBeenCalled();
    realtimeBus.off("project-project-1", localListener);
  });

  it("keeps the in-process SSE bus available in development without Pusher", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PUSHER_APP_ID", "");
    vi.stubEnv("NEXT_PUBLIC_PUSHER_KEY", "");
    vi.stubEnv("PUSHER_SECRET", "");
    const { broadcastRealtimeEvent, realtimeBus } = await import("@/lib/realtime/server");
    const localListener = vi.fn();
    realtimeBus.on("project-project-1", localListener);

    await broadcastRealtimeEvent("project-project-1", event);

    expect(localListener).toHaveBeenCalledWith(event);
    expect(pusherTrigger).not.toHaveBeenCalled();
    realtimeBus.off("project-project-1", localListener);
  });

  it("rejects production SSE subscriptions", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { getCurrentUser } = await import("@/lib/auth/session");
    const { GET } = await import("@/app/api/realtime/sse/route");

    const response = await GET(
      new NextRequest("http://localhost/api/realtime/sse?channel=project-project-1")
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error:
        "SSE realtime is available only for single-process development. Configure Pusher for production.",
    });
    expect(getCurrentUser).not.toHaveBeenCalled();
  });
});
