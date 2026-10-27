const REDIRECT_BASE_URL = "https://syncboard.invalid";

export function getSafeInternalRedirect(value: unknown, fallbackUrl: string): string {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return fallbackUrl;
  }

  try {
    const parsed = new URL(value, REDIRECT_BASE_URL);
    return parsed.origin === REDIRECT_BASE_URL ? value : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}
