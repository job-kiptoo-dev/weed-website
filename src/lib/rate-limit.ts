/**
 * Pure helpers for app-level rate limiting: fixed windows, client IPs and
 * key building. The counters themselves live in the `rate_limits` table and
 * are read and written by `@/services/rate-limit.service`.
 */
import { createHash } from "node:crypto";

/** `limit` hits per `windowMs`, counted in fixed windows aligned to the epoch. */
export interface RateLimitBudget {
  limit: number;
  windowMs: number;
}

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;

/**
 * Start of the fixed window `nowMs` falls in. Windows are aligned to the
 * epoch, so every instance of the app agrees on them without coordinating,
 * and two keys sharing a window length roll over together.
 */
export function windowStartMs(nowMs: number, windowMs: number): number {
  return Math.floor(nowMs / windowMs) * windowMs;
}

/** No identifiable client: every such caller shares one bucket. */
export const UNKNOWN_CLIENT_IP = "unknown";

/**
 * The client's IP. `x-forwarded-for` is a comma-separated chain and the
 * first entry is the original client; Vercel sets it on every request (and
 * overwrites whatever the caller sent), so it is trustworthy in production.
 * Locally there is no proxy and neither header is set, which is why the
 * fallback is a shared bucket rather than a per-request one: a missing
 * header must never mean "unlimited".
 */
export function resolveClientIp(
  forwardedFor: string | null,
  realIp: string | null = null,
): string {
  const forwarded = forwardedFor?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const real = realIp?.trim();
  return real ? real : UNKNOWN_CLIENT_IP;
}

/** Short, stable digest. Long enough that collisions aren't a concern here. */
function hashIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

/**
 * `scope:<hash>[:<hash>]`. Identifiers are hashed, so the counter table
 * never holds a raw IP, email address or coupon code, and a value taken
 * from a header can't shape the key (or match other keys by prefix).
 */
export function rateLimitKey(
  scope: string,
  ...identifiers: readonly string[]
): string {
  return [scope, ...identifiers.map(hashIdentifier)].join(":");
}
