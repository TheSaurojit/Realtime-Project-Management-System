import "dotenv/config";

/**
 * Environment configuration and fail-fast validation module.
 */

function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`[CRITICAL] Missing required environment variable: ${name}`);
  }
  return value;
}

export function validateEnv() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      `[CRITICAL] JWT_SECRET must be defined and at least 32 characters long for security compliance.`
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error(`[CRITICAL] DATABASE_URL must be defined.`);
  }
}

// Fail fast in production or dev
if (process.env.NODE_ENV !== "test" || process.env.JWT_SECRET) {
  validateEnv();
}

export const env = {
  get DATABASE_URL(): string {
    return getEnvVar("DATABASE_URL");
  },

  get JWT_SECRET(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim().length < 32) {
      throw new Error(
        `[CRITICAL] JWT_SECRET must be defined and at least 32 characters long for security compliance.`
      );
    }
    return secret;
  },

  get JWT_SECRET_BYTES(): Uint8Array {
    return new TextEncoder().encode(this.JWT_SECRET);
  },

  get NEXT_PUBLIC_APP_URL(): string {
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  },

  get PUSHER_APP_ID(): string | undefined {
    return process.env.PUSHER_APP_ID;
  },

  get NEXT_PUBLIC_PUSHER_KEY(): string | undefined {
    return process.env.NEXT_PUBLIC_PUSHER_KEY;
  },

  get PUSHER_SECRET(): string | undefined {
    return process.env.PUSHER_SECRET;
  },

  get NEXT_PUBLIC_PUSHER_CLUSTER(): string {
    return process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1";
  },

  get isPusherConfigured(): boolean {
    return Boolean(
      process.env.PUSHER_APP_ID &&
      process.env.NEXT_PUBLIC_PUSHER_KEY &&
      process.env.PUSHER_SECRET
    );
  },

  get RESEND_API_KEY(): string | undefined {
    return process.env.RESEND_API_KEY;
  },

  get EMAIL_FROM(): string {
    return process.env.EMAIL_FROM || "SyncBoard <onboarding@resend.dev>";
  },

  get NEXT_PUBLIC_SUPABASE_URL(): string | undefined {
    return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  },

  get NEXT_PUBLIC_SUPABASE_ANON_KEY(): string | undefined {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  },

  get SUPABASE_SERVICE_ROLE_KEY(): string | undefined {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  },

  get SUPABASE_STORAGE_BUCKET(): string {
    return process.env.SUPABASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "attachments";
  },

  get isSupabaseConfigured(): boolean {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return Boolean(url && key);
  },
};
