import { describe, expect, it } from "vitest";
import { parseSeedArgs } from "./args";

describe("parseSeedArgs", () => {
  it("reads the target, force and catalog-only flags", () => {
    expect(parseSeedArgs([])).toEqual({
      neon: false,
      force: false,
      catalogOnly: false,
    });
    expect(
      parseSeedArgs(["--target=neon", "--force", "--catalog-only"]),
    ).toEqual({ neon: true, force: true, catalogOnly: true });
  });

  it("rejects unknown flags so typos never trigger a full reseed", () => {
    expect(() => parseSeedArgs(["--target=neon", "--catalogonly"])).toThrow(
      /Unknown option\(s\): --catalogonly/,
    );
  });
});
