import { describe, expect, it } from "vitest";
import {
  productInputSchema,
  productSpecsSchema,
  skuSchema,
  slugSchema,
} from "./product.schema";

const SPECS = {
  strengthMg: 500,
  spectrum: "full",
  labTested: true,
  servingSize: "1 mL",
  ingredients: ["MCT oil", "full-spectrum hemp extract"],
} as const;

const PRODUCT = {
  name: "Calm Full-Spectrum Oil",
  slug: "calm-full-spectrum-oil",
  description: "A daily tincture.",
  shortDescription: "Daily tincture.",
  priceCents: 4500,
  compareAtPriceCents: null,
  sku: "HB-TIN-CALM",
  categoryId: "cat_tinctures",
  inventory: 10,
  status: "active",
  featured: false,
  specs: SPECS,
} as const;

describe("slugSchema", () => {
  it.each(["tinctures", "calm-full-spectrum-oil", "cbd-500"])(
    "accepts %j",
    (slug) => {
      expect(slugSchema.safeParse(slug).success).toBe(true);
    },
  );

  it.each(["Calm", "calm oil", "-calm", "calm-", "calm--oil", "calm_oil", "a"])(
    "rejects %j",
    (slug) => {
      expect(slugSchema.safeParse(slug).success).toBe(false);
    },
  );
});

describe("skuSchema", () => {
  it("accepts and uppercases SKUs", () => {
    expect(skuSchema.parse("HB-TIN-CALM-500")).toBe("HB-TIN-CALM-500");
    expect(skuSchema.parse("hb-tin-calm")).toBe("HB-TIN-CALM");
  });

  it.each(["HB TIN", "HB--TIN", "-HB", "HB_TIN", ""])("rejects %j", (sku) => {
    expect(skuSchema.safeParse(sku).success).toBe(false);
  });
});

describe("productSpecsSchema", () => {
  it("accepts a complete specs object", () => {
    expect(productSpecsSchema.parse(SPECS)).toEqual(SPECS);
  });

  it.each([
    ["negative strength", { ...SPECS, strengthMg: -1 }],
    ["fractional strength", { ...SPECS, strengthMg: 2.5 }],
    ["unknown spectrum", { ...SPECS, spectrum: "wide" }],
    ["empty ingredients", { ...SPECS, ingredients: [] }],
    ["blank serving size", { ...SPECS, servingSize: " " }],
    ["unknown key", { ...SPECS, thc: 0 }],
    ["missing key", { strengthMg: 500, spectrum: "full" }],
  ])("rejects %s", (_name, specs) => {
    expect(productSpecsSchema.safeParse(specs).success).toBe(false);
  });
});

describe("productInputSchema", () => {
  it("accepts a valid product, with or without specs", () => {
    expect(productInputSchema.safeParse(PRODUCT).success).toBe(true);
    expect(
      productInputSchema.safeParse({ ...PRODUCT, specs: null }).success,
    ).toBe(true);
  });

  it("requires the compare-at price to exceed the price", () => {
    expect(
      productInputSchema.safeParse({ ...PRODUCT, compareAtPriceCents: 5000 })
        .success,
    ).toBe(true);
    for (const compareAtPriceCents of [4500, 4000]) {
      const result = productInputSchema.safeParse({
        ...PRODUCT,
        compareAtPriceCents,
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toEqual(["compareAtPriceCents"]);
    }
  });

  it("rejects negative or fractional cents and inventory", () => {
    for (const patch of [
      { priceCents: -1 },
      { priceCents: 10.5 },
      { inventory: -1 },
    ]) {
      expect(
        productInputSchema.safeParse({ ...PRODUCT, ...patch }).success,
      ).toBe(false);
    }
  });
});
