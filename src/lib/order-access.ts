import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/lib/env";

/**
 * Guest access to an order confirmation. The token is an HMAC-SHA256 of the
 * order id keyed by `BETTER_AUTH_SECRET`, so nothing is stored and nothing
 * can be guessed from the order number. It travels in the confirmation URL
 * and therefore lands in browser history and any forwarded link — accepted
 * deliberately for a guest checkout with no account (see the spec, R7).
 *
 * Rotating `BETTER_AUTH_SECRET` invalidates every issued link; signed-in
 * owners still reach their orders through the session.
 */

/** Characters kept from the base64url digest. 32 chars = 192 bits. */
export const ORDER_TOKEN_LENGTH = 32;

export function createOrderToken(orderId: string): string {
  return createHmac("sha256", getServerEnv().BETTER_AUTH_SECRET)
    .update(orderId)
    .digest("base64url")
    .slice(0, ORDER_TOKEN_LENGTH);
}

/** Constant-time compare; a wrong length is rejected before comparing. */
export function verifyOrderToken(
  orderId: string,
  token: string | null | undefined,
): boolean {
  if (!token || token.length !== ORDER_TOKEN_LENGTH) return false;
  const expected = Buffer.from(createOrderToken(orderId), "utf8");
  const candidate = Buffer.from(token, "utf8");
  if (expected.length !== candidate.length) return false;
  return timingSafeEqual(expected, candidate);
}
