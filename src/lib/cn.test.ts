import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values and handles conditional objects", () => {
    expect(cn("a", false, undefined, null, { b: true, c: false })).toBe("a b");
  });

  it("merges conflicting tailwind utilities, last wins", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    expect(cn("bg-brand", "bg-surface")).toBe("bg-surface");
  });
});
