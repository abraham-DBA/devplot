import { headers } from "next/headers";

// x-forwarded-host/x-forwarded-proto are only honored when this is "true" —
// set it in .env.production if a reverse proxy/CDN terminates TLS in front
// of the app. Otherwise these headers are attacker-settable on a direct
// request and must be ignored, matching Better Auth's own trustedProxyHeaders gate.
const TRUST_PROXY_HEADERS = process.env.TRUST_PROXY_HEADERS === "true";

const DOMAIN_PATTERN =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(:[0-9]{1,5})?$/;
const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}(:[0-9]{1,5})?$/;
const IPV6_PATTERN = /^\[[0-9a-fA-F:]+\](:[0-9]{1,5})?$/;

function isValidHost(value: string | null): value is string {
  if (!value) return false;
  return DOMAIN_PATTERN.test(value) || IPV4_PATTERN.test(value) || IPV6_PATTERN.test(value);
}

function isLoopback(host: string): boolean {
  const hostname = host
    .replace(/:\d+$/, "")
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

// Derives the app's public origin from the live request instead of
// NEXT_PUBLIC_APP_URL. That env var is baked into the client bundle at
// Docker build time and silently becomes "" if the build arg is forgotten,
// producing domain-less links (e.g. "/join/abc") that browsers misread as
// file:// paths. Reading headers per-request avoids depending on it at all
// for server-only link generation.
export async function getRequestOrigin(): Promise<string> {
  const h = await headers();

  const forwardedHost = TRUST_PROXY_HEADERS ? h.get("x-forwarded-host") : null;
  const rawHost = h.get("host");
  const host = isValidHost(forwardedHost) ? forwardedHost : isValidHost(rawHost) ? rawHost : "localhost:3000";

  const forwardedProto = TRUST_PROXY_HEADERS ? h.get("x-forwarded-proto") : null;
  const protocol =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : isLoopback(host)
        ? "http"
        : "https";

  return `${protocol}://${host}`;
}
