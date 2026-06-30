// Only relative, same-origin paths are allowed — blocks open-redirect via "//evil.com" or absolute URLs.
export function sanitizeRedirect(raw: string | undefined, fallback: string): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return fallback;
}
