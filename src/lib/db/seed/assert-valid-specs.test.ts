import { describe, expect, it } from "vitest";
import { buildSeedCatalog } from "../seed-data/catalog";
import { assertValidSpecs } from "./insert";

describe("assertValidSpecs", () => {
  it("accepts every product in the seed catalog", () => {
    expect(() => assertValidSpecs(buildSeedCatalog())).not.toThrow();
  });

  it("names the product and field when specs are malformed", () => {
    const catalog = buildSeedCatalog();
    const target = catalog.products.find((p) => p.specs !== null);
    const specs = target?.specs;
    if (!target || !specs) throw new Error("seed catalog has no specs");
    const broken = {
      ...catalog,
      products: catalog.products.map((product) =>
        product === target
          ? { ...product, specs: { ...specs, spectrum: "wide" as never } }
          : product,
      ),
    };
    expect(() => assertValidSpecs(broken)).toThrow(
      new RegExp(`invalid specs for "${target.slug}": spectrum`),
    );
  });
});
