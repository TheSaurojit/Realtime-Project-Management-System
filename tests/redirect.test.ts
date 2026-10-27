import { describe, expect, it } from "vitest";
import { getSafeInternalRedirect } from "@/lib/auth/redirect";

describe("getSafeInternalRedirect", () => {
  const fallback = "/workspaces";

  it("allows same-origin paths and query strings", () => {
    expect(getSafeInternalRedirect("/workspace/acme?view=board", fallback)).toBe(
      "/workspace/acme?view=board"
    );
  });

  it.each([
    "https://attacker.example",
    "//attacker.example",
    "/\\attacker.example",
    "javascript:alert(1)",
    "workspaces",
  ])("falls back for non-internal target %s", (value) => {
    expect(getSafeInternalRedirect(value, fallback)).toBe(fallback);
  });
});
