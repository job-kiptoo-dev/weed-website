// @vitest-environment node
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("public/images", () => {
  it("holds only folders at its root, no loose files", () => {
    const entries = readdirSync(join(process.cwd(), "public", "images"), {
      withFileTypes: true,
    });
    expect(
      entries.filter((entry) => !entry.isDirectory()).map((e) => e.name),
    ).toEqual([]);
    expect(entries.map((entry) => entry.name).sort()).toEqual([
      "bands",
      "categories",
      "products",
      "promo",
    ]);
  });
});
