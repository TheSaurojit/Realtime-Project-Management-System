import { describe, it, expect } from "vitest";
import { SignJWT, jwtVerify } from "jose";

describe("Auth Hardening & JWT Secrets", () => {
  const validSecret = "super-secret-jwt-key-project-mgmt-platform-2026";
  const weakSecret = "short-secret";

  it("should fail fast if JWT_SECRET is shorter than 32 characters", () => {
    const validateSecret = (secret?: string) => {
      if (!secret || secret.trim().length < 32) {
        throw new Error("[CRITICAL] JWT_SECRET must be defined and at least 32 characters long");
      }
      return secret;
    };

    expect(() => validateSecret("")).toThrow();
    expect(() => validateSecret(undefined)).toThrow();
    expect(() => validateSecret(weakSecret)).toThrow();
    expect(validateSecret(validSecret)).toBe(validSecret);
  });

  it("should sign and verify valid JWT session tokens", async () => {
    const secretKey = new TextEncoder().encode(validSecret);
    const token = await new SignJWT({
      userId: "user-123",
      email: "test@example.com",
      role: "ADMIN",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secretKey);

    expect(token).toBeDefined();

    const { payload } = await jwtVerify(token, secretKey);
    expect(payload.userId).toBe("user-123");
    expect(payload.role).toBe("ADMIN");
  });

  it("should reject raw-user-ID cookie without valid JWT signature", async () => {
    const rawUserIdCookie = "user-123";
    const secretKey = new TextEncoder().encode(validSecret);

    await expect(jwtVerify(rawUserIdCookie, secretKey)).rejects.toThrow();
  });
});
