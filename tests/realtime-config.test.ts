import { afterEach, describe, expect, it, vi } from "vitest";
import { validateEnv } from "@/lib/env";

describe("realtime environment configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function setBaseEnvironment() {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/test");
    vi.stubEnv("JWT_SECRET", "test-secret-with-at-least-32-characters-long");
  }

  it("requires complete Pusher credentials in production", () => {
    setBaseEnvironment();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUSHER_APP_ID", "");
    vi.stubEnv("NEXT_PUBLIC_PUSHER_KEY", "");
    vi.stubEnv("PUSHER_SECRET", "");

    expect(() => validateEnv()).toThrow(
      "Production requires Pusher realtime. Set PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET"
    );
  });

  it("rejects partially configured Pusher credentials", () => {
    setBaseEnvironment();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PUSHER_APP_ID", "app-id");
    vi.stubEnv("NEXT_PUBLIC_PUSHER_KEY", "");
    vi.stubEnv("PUSHER_SECRET", "secret");

    expect(() => validateEnv()).toThrow(
      "Pusher configuration is incomplete. Set all of PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET"
    );
  });

  it("allows the local development SSE fallback when Pusher is not configured", () => {
    setBaseEnvironment();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PUSHER_APP_ID", "");
    vi.stubEnv("NEXT_PUBLIC_PUSHER_KEY", "");
    vi.stubEnv("PUSHER_SECRET", "");

    expect(() => validateEnv()).not.toThrow();
  });

  it("accepts complete Pusher credentials in production", () => {
    setBaseEnvironment();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUSHER_APP_ID", "app-id");
    vi.stubEnv("NEXT_PUBLIC_PUSHER_KEY", "public-key");
    vi.stubEnv("PUSHER_SECRET", "secret");

    expect(() => validateEnv()).not.toThrow();
  });
});
