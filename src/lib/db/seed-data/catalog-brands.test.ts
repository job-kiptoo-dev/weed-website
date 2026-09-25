// @vitest-environment node
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSeedCatalog } from "./catalog";
import { brandTinctureSeeds, glasswareSeeds } from "./catalog-brands";

const catalog = buildSeedCatalog();
const brandSeeds = [...brandTinctureSeeds, ...glasswareSeeds];

describe("brand seeds", () => {
  it("adds the glassware category last", () => {
    expect(catalog.categories.map((c) => c.slug)).toEqual([
      "tinctures",
      "gummies-edibles",
      "topicals",
      "teas-wellness",
      "accessories",
      "hemp-pre-rolls",
      "hemp-flower",
      "glassware",
    ]);
    expect(catalog.categories.at(-1)).toMatchObject({
      id: "cat_glassware",
      sortOrder: 8,
      imageUrl: "/images/categories/glassware.jpg",
    });
  });

  it("gives each product one own photo that exists on disk", () => {
    for (const seed of brandSeeds) {
      const images = catalog.productImages.filter(
        (image) => image.productId === `prod_${seed.slug}`,
      );
      expect(images, seed.slug).toEqual([
        {
          id: `img_${seed.slug}-1`,
          productId: `prod_${seed.slug}`,
          url: `/images/products/${seed.category}/${seed.slug}.jpg`,
          alt: seed.images?.[0]?.alt,
          sortOrder: 1,
        },
      ]);
      expect(
        existsSync(join(process.cwd(), "public", images[0]?.url ?? "")),
      ).toBe(true);
    }
  });

  it("uses one 'One size' variant and HB-GLS skus for glassware", () => {
    for (const seed of glasswareSeeds) {
      expect(seed.category).toBe("glassware");
      expect(seed.specs).toBeNull();
      expect(seed.sku).toMatch(/^HB-GLS-[A-Z0-9]+$/);
      expect(seed.variants).toHaveLength(1);
      expect(seed.variants[0]).toMatchObject({
        key: "single",
        name: "One size",
      });
    }
  });

  it("stocks glassware by price tier and tinctures at 20", () => {
    const tier = (cents: number) =>
      cents >= 30000 ? 2 : cents >= 10000 ? 6 : cents >= 3000 ? 12 : 24;
    for (const seed of glasswareSeeds) {
      expect(seed.inventory, seed.slug).toBe(
        tier(seed.variants[0]?.priceCents ?? 0),
      );
    }
    for (const seed of brandTinctureSeeds) {
      expect(seed.inventory, seed.slug).toBe(20);
    }
  });

  it("names each tincture variant after specs.strengthMg", () => {
    for (const seed of brandTinctureSeeds) {
      expect(seed.category).toBe("tinctures");
      expect(seed.sku).toMatch(/^HB-TIN-[A-Z]+$/);
      const strength = seed.specs?.strengthMg;
      expect(
        seed.variants.map((v) => [v.key, v.name]),
        seed.slug,
      ).toEqual([[String(strength), `${strength} mg`]]);
      expect(seed.specs).toMatchObject({
        labTested: true,
        servingSize: "1 mL",
      });
    }
  });

  it("dates tinctures every 2 days from 2025-12-20 and glassware every 3 days from 2026-01-06", () => {
    const day = 24 * 60 * 60 * 1000;
    const check = (
      seeds: typeof brandSeeds,
      start: string,
      stepDays: number,
    ) => {
      seeds.forEach((seed, index) => {
        expect(Date.parse(seed.createdAt) - Date.parse(start), seed.slug).toBe(
          index * stepDays * day,
        );
      });
    };
    check(brandTinctureSeeds, "2025-12-20T10:00:00.000Z", 2);
    check(glasswareSeeds, "2026-01-06T10:00:00.000Z", 3);
  });

  it("follows the copy rules", () => {
    for (const seed of brandSeeds) {
      expect(seed.name.toLowerCase(), seed.slug).not.toMatch(
        /pre-roll|accessories/,
      );
      // One sentence: the only full stop is the final one, decimals aside.
      expect(seed.shortDescription, seed.slug).toMatch(/^[^.]+(\.\d[^.]*)*\.$/);
      // The product schema allows 300; the longest line here is well under 120.
      expect(seed.shortDescription.length, seed.slug).toBeLessThanOrEqual(120);
      expect(seed.description, seed.slug).toHaveLength(2);
      for (const paragraph of seed.description) {
        expect(paragraph.trim(), seed.slug).not.toBe("");
        expect(paragraph.trim(), seed.slug).toBe(paragraph);
      }
    }
  });

  it("keeps product slugs unique across the catalog", () => {
    const slugs = catalog.products.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const skus = catalog.products.map((p) => p.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });
});
