import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

const FALLBACK = "/account";

describe("safeRedirectPath", () => {
  it.each([
    "/account",
    "/shop?q=mint&page=2",
    "/product/calm-oil#reviews",
    "/",
  ])("accepts the relative path %s", (path) => {
    expect(safeRedirectPath(path, FALLBACK)).toBe(path);
  });

  it.each([
    ["an empty string", ""],
    ["a protocol-relative URL", "//evil.com"],
    ["an absolute URL", "https://evil.com"],
    ["a backslash trick", "/\\evil.com"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a relative path without a leading slash", "account"],
    ["a tab that browsers strip", "/\t/evil.com"],
    ["a newline", "/\n/evil.com"],
  ])("rejects %s", (_label, value) => {
    expect(safeRedirectPath(value, FALLBACK)).toBe(FALLBACK);
  });

  it.each([undefined, null, 42, ["/account"]])(
    "falls back for non-string input %o",
    (value) => {
      expect(safeRedirectPath(value, FALLBACK)).toBe(FALLBACK);
    },
  );
});
