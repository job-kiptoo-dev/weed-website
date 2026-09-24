import { describe, expect, it } from "vitest";
import {
  HOUR_MS,
  MINUTE_MS,
  rateLimitKey,
  resolveClientIp,
  UNKNOWN_CLIENT_IP,
  windowStartMs,
} from "./rate-limit";

describe("windowStartMs", () => {
  it("aligns windows to the epoch", () => {
    expect(windowStartMs(0, MINUTE_MS)).toBe(0);
    expect(windowStartMs(MINUTE_MS + 1, MINUTE_MS)).toBe(MINUTE_MS);
  });

  it("keeps every instant inside one window on the same start", () => {
    const start = windowStartMs(1_700_000_000_000, HOUR_MS);
    expect(windowStartMs(start, HOUR_MS)).toBe(start);
    expect(windowStartMs(start + HOUR_MS - 1, HOUR_MS)).toBe(start);
  });

  it("moves on once the window is over", () => {
    const start = windowStartMs(1_700_000_000_000, HOUR_MS);
    expect(windowStartMs(start + HOUR_MS, HOUR_MS)).toBe(start + HOUR_MS);
  });
});

describe("resolveClientIp", () => {
  it("takes the first entry of the forwarded chain", () => {
    expect(resolveClientIp("203.0.113.7, 70.41.3.18, 150.172.238.178")).toBe(
      "203.0.113.7",
    );
  });

  it("trims a single-entry header", () => {
    expect(resolveClientIp(" 203.0.113.7 ")).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to a shared bucket", () => {
    expect(resolveClientIp(null, "203.0.113.9")).toBe("203.0.113.9");
    expect(resolveClientIp("", " ")).toBe(UNKNOWN_CLIENT_IP);
    expect(resolveClientIp(null)).toBe(UNKNOWN_CLIENT_IP);
  });
});

describe("rateLimitKey", () => {
  it("is stable for the same scope and identifiers", () => {
    expect(rateLimitKey("checkout:place:ip", "203.0.113.7")).toBe(
      rateLimitKey("checkout:place:ip", "203.0.113.7"),
    );
  });

  it("separates identifiers and scopes", () => {
    expect(rateLimitKey("checkout:place:ip", "203.0.113.7")).not.toBe(
      rateLimitKey("checkout:place:ip", "203.0.113.8"),
    );
    expect(rateLimitKey("checkout:quote:ip", "203.0.113.7")).not.toBe(
      rateLimitKey("checkout:place:ip", "203.0.113.7"),
    );
    expect(rateLimitKey("checkout:coupon", "1.1.1.1", "WELCOME10")).not.toBe(
      rateLimitKey("checkout:coupon", "1.1.1.1", "WELCOME20"),
    );
  });

  it("stores the scope in the clear and every identifier hashed", () => {
    const key = rateLimitKey(
      "checkout:place:email",
      "ada@example.com",
      "WELCOME10",
    );
    expect(key.startsWith("checkout:place:email:")).toBe(true);
    expect(key).not.toContain("ada@example.com");
    expect(key).not.toContain("WELCOME10");
    expect(key.split(":").slice(3)).toEqual([
      expect.stringMatching(/^[0-9a-f]{32}$/),
      expect.stringMatching(/^[0-9a-f]{32}$/),
    ]);
  });
});
