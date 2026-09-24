// @vitest-environment node
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { siteConfig } from "./site-config";

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
      "payments",
      "products",
      "promo",
    ]);
  });

  it("ships every payment logo the checkout config points at", () => {
    const logos = siteConfig.checkout.paymentMethods
      .map((method) => method.logo)
      .filter((logo): logo is string => logo !== undefined);

    expect(logos.length).toBeGreaterThan(0);
    for (const logo of logos) {
      // A missing file would leave a broken image on the payment radios.
      expect(existsSync(join(process.cwd(), "public", logo))).toBe(true);
    }
  });
});
