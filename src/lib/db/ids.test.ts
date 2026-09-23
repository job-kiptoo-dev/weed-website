import { describe, expect, it } from "vitest";
import { newId } from "./ids";

describe("newId", () => {
  it("prefixes 32 lowercase hex characters", () => {
    expect(newId("ord")).toMatch(/^ord_[0-9a-f]{32}$/);
  });

  it("is unique", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId("x")));
    expect(ids.size).toBe(1000);
  });
});
