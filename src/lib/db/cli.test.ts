import { describe, expect, it } from "vitest";
import { hasNeonTargetFlag } from "./cli";

describe("hasNeonTargetFlag", () => {
  it("requires the exact --target=neon flag", () => {
    expect(hasNeonTargetFlag(["--target=neon"])).toBe(true);
    expect(hasNeonTargetFlag(["--force", "--target=neon"])).toBe(true);
    expect(hasNeonTargetFlag([])).toBe(false);
    expect(hasNeonTargetFlag(["--target", "neon"])).toBe(false);
    expect(hasNeonTargetFlag(["--target=local"])).toBe(false);
  });
});
