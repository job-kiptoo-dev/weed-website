import { describe, expect, it } from "vitest";
import {
  ORDER_TOKEN_LENGTH,
  createOrderToken,
  verifyOrderToken,
} from "./order-access";

// `getServerEnv()` parses `process.env` on its first call, and importing this
// module does not call it, so setting the secret here is early enough.
process.env.BETTER_AUTH_SECRET = "order-access-test-secret".padEnd(40, "x");

const ORDER_ID = "ord_01HZYQ8N9K7";

describe("createOrderToken", () => {
  it("is stable for the same order id", () => {
    expect(createOrderToken(ORDER_ID)).toBe(createOrderToken(ORDER_ID));
  });

  it("differs per order id", () => {
    expect(createOrderToken(ORDER_ID)).not.toBe(createOrderToken("ord_other"));
  });

  it("is 32 base64url characters and leaks nothing about the id", () => {
    const token = createOrderToken(ORDER_ID);
    expect(token).toHaveLength(ORDER_TOKEN_LENGTH);
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(token).not.toContain(ORDER_ID);
  });
});

describe("verifyOrderToken", () => {
  it("accepts the token it issued", () => {
    expect(verifyOrderToken(ORDER_ID, createOrderToken(ORDER_ID))).toBe(true);
  });

  it("rejects a token issued for another order", () => {
    expect(verifyOrderToken(ORDER_ID, createOrderToken("ord_other"))).toBe(
      false,
    );
  });

  it("rejects a tampered token of the right length", () => {
    const token = createOrderToken(ORDER_ID);
    const flipped = (token[0] === "a" ? "b" : "a") + token.slice(1);
    expect(flipped).toHaveLength(ORDER_TOKEN_LENGTH);
    expect(verifyOrderToken(ORDER_ID, flipped)).toBe(false);
  });

  it.each([
    ["a truncated token", createOrderToken(ORDER_ID).slice(0, 16)],
    ["a padded token", `${createOrderToken(ORDER_ID)}xx`],
    ["an empty string", ""],
    ["null", null],
    ["undefined", undefined],
  ])("rejects %s", (_label, token) => {
    expect(verifyOrderToken(ORDER_ID, token)).toBe(false);
  });
});
