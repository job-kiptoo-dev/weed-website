// @vitest-environment node
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  HEMP_FLOWER_CATEGORY,
  HEMP_PRE_ROLLS_CATEGORY,
  isCategoryEnabled,
  SMOKABLE_HEMP_CATEGORIES,
} from "@/lib/catalog-visibility";
import { buildSeedCatalog } from "@/lib/db/seed-data/catalog";
import type { FeatureFlags } from "@/lib/site-config";
import { createTestDb, seedCatalogWithReviews, type TestDb } from "@/test/db";
import { createCategoryService } from "./category.service";
import { createProductService } from "./product.service";

let testDb: TestDb;

beforeAll(async () => {
  testDb = await createTestDb({ seed: seedCatalogWithReviews });
}, 30_000);

afterAll(async () => {
  await testDb?.close();
});

const catalog = buildSeedCatalog();

/** What the services should expose under `features`, from the seed data. */
function expectedCatalog(features: FeatureFlags) {
  const categories = catalog.categories.filter((c) =>
    isCategoryEnabled(c.slug, features),
  );
  const categoryIds = new Set(categories.map((c) => c.id));
  const active = catalog.products.filter(
    (p) => p.status === "active" && categoryIds.has(p.categoryId),
  );
  const categorySlug = (categoryId: string) =>
    catalog.categories.find((c) => c.id === categoryId)?.slug;
  return {
    categories,
    active,
    activeIn: (slug: string) =>
      active.filter((p) => categorySlug(p.categoryId) === slug),
  };
}

function services(features: FeatureFlags) {
  const deps = { getDb: async () => testDb.db, features };
  return {
    productService: createProductService(deps),
    categoryService: createCategoryService(deps),
  };
}

describe.each([true, false])("smokableHemp = %s", (smokableHemp) => {
  const features: FeatureFlags = { smokableHemp };
  const { productService, categoryService } = services(features);
  const expected = expectedCatalog(features);
  const activeCount = expected.active.length;
  const outOfStockSlugs = expected.active
    .filter((p) => p.inventory <= 0)
    .map((p) => p.slug);

  describe("listProducts", () => {
    it("lists active products with defaults (page 1, size 12, featured sort)", async () => {
      const result = await productService.listProducts();
      expect(result.total).toBe(activeCount);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(12);
      expect(result.totalPages).toBe(Math.ceil(activeCount / 12));
      expect(result.items).toHaveLength(12);
      expect(result.items.every((p) => p.status === "active")).toBe(true);
    });

    it("puts featured products first by default", async () => {
      const { items } = await productService.listProducts();
      const firstNonFeatured = items.findIndex((p) => !p.featured);
      const lastFeatured = items.map((p) => p.featured).lastIndexOf(true);
      expect(lastFeatured).toBeLessThan(firstNonFeatured);
    });

    it("excludes archived products", async () => {
      const all = await productService.listProducts({ pageSize: 100 });
      expect(all.items.some((p) => p.slug === "gift-box")).toBe(false);
      expect(all.items).toHaveLength(activeCount);
    });

    it("only lists products from enabled categories", async () => {
      const { items } = await productService.listProducts({ pageSize: 100 });
      for (const slug of SMOKABLE_HEMP_CATEGORIES) {
        expect(
          items.some((p) => p.category.slug === slug),
          slug,
        ).toBe(smokableHemp);
        const hidden = await productService.listProducts({ category: slug });
        expect(hidden.total, slug).toBe(expected.activeIn(slug).length);
      }
    });

    it("keeps specs.strengthMg in sync with the default '<n> mg' variant", async () => {
      const { items } = await productService.listProducts({ pageSize: 100 });
      for (const product of items) {
        const defaultVariant = product.variants.find((v) => v.isDefault);
        const match = defaultVariant?.name.match(/^(\d+) mg$/);
        if (!match) continue;
        expect(product.specs?.strengthMg, product.slug).toBe(Number(match[1]));
      }
    });

    it("filters by category slug", async () => {
      const result = await productService.listProducts({
        category: "topicals",
      });
      expect(result.total).toBe(expected.activeIn("topicals").length);
      expect(result.total).toBe(6);
      expect(result.items.every((p) => p.category.slug === "topicals")).toBe(
        true,
      );
    });

    it("matches query against name case-insensitively", async () => {
      const result = await productService.listProducts({ query: "MINT" });
      const slugs = result.items.map((p) => p.slug);
      expect(slugs).toContain("mint-isolate-tincture");
      expect(slugs).toContain("peppermint-day-tea");
      expect(result.items.every((p) => p.status === "active")).toBe(true);
    });

    it("matches query against sku", async () => {
      const result = await productService.listProducts({
        query: "hb-tin-calm",
      });
      expect(result.items.map((p) => p.slug)).toEqual([
        "calm-full-spectrum-oil",
      ]);
    });

    it("ranks an exact variant SKU first", async () => {
      const result = await productService.listProducts({
        query: "HB-TIN-CALM-500",
      });
      expect(result.items[0]?.slug).toBe("calm-full-spectrum-oil");
    });

    it("matches query against category name", async () => {
      const result = await productService.listProducts({
        query: "accessories",
      });
      expect(result.total).toBe(6);
    });

    it("stems words (gummy finds gummies)", async () => {
      const result = await productService.listProducts({
        query: "gummy",
        pageSize: 100,
      });
      expect(result.items.map((p) => p.slug)).toContain("evening-gummies");
    });

    it("matches partial words through the name substring match", async () => {
      const result = await productService.listProducts({
        query: "gum",
        pageSize: 100,
      });
      // "gum" is not a stem of "gummies"; the ILIKE name match finds it.
      expect(result.items.map((p) => p.slug)).toContain("evening-gummies");
    });

    it("truncates very long queries without error", async () => {
      const result = await productService.listProducts({
        query: "mint ".repeat(100),
      });
      expect(result.items.map((p) => p.slug)).toContain(
        "mint-isolate-tincture",
      );
      const noMatch = await productService.listProducts({
        query: "x".repeat(500),
      });
      expect(noMatch.total).toBe(0);
    });

    it("treats % and _ literally", async () => {
      for (const query of ["%", "_", "%_%"]) {
        const result = await productService.listProducts({ query });
        expect(result.total, query).toBe(0);
      }
    });

    it("finds only visible products by search", async () => {
      for (const query of ["pre-roll", "lifter"]) {
        const result = await productService.listProducts({
          query,
          pageSize: 100,
        });
        expect(result.total > 0, query).toBe(smokableHemp);
      }
    });

    it("sorts by price ascending monotonically", async () => {
      const { items } = await productService.listProducts({
        sort: "price-asc",
        pageSize: 100,
      });
      for (let i = 1; i < items.length; i += 1) {
        expect(items[i]?.priceCents).toBeGreaterThanOrEqual(
          items[i - 1]?.priceCents ?? 0,
        );
      }
    });

    it("sorts by price descending", async () => {
      const { items } = await productService.listProducts({
        sort: "price-desc",
        pageSize: 100,
      });
      for (let i = 1; i < items.length; i += 1) {
        expect(items[i]?.priceCents).toBeLessThanOrEqual(
          items[i - 1]?.priceCents ?? 0,
        );
      }
    });

    it("sorts by newest using createdAt", async () => {
      const { items } = await productService.listProducts({
        sort: "newest",
        pageSize: 100,
      });
      for (let i = 1; i < items.length; i += 1) {
        expect(
          items[i - 1]?.createdAt.localeCompare(items[i]?.createdAt ?? ""),
        ).toBeGreaterThanOrEqual(0);
      }
      const newest = [...expected.active].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      )[0];
      expect(items[0]?.slug).toBe(newest?.slug);
    });

    it("sorts by rating then review count", async () => {
      const { items } = await productService.listProducts({
        sort: "rating",
        pageSize: 100,
      });
      expect(items).toHaveLength(activeCount);
      expect(items[0]?.reviewCount).toBeGreaterThan(0);
      for (let i = 1; i < items.length; i += 1) {
        const prev = items[i - 1];
        const curr = items[i];
        if (!prev || !curr) throw new Error("unexpected empty item");
        if (Math.abs(prev.ratingAverage - curr.ratingAverage) < 1e-9) {
          expect(prev.reviewCount).toBeGreaterThanOrEqual(curr.reviewCount);
        } else {
          expect(prev.ratingAverage).toBeGreaterThan(curr.ratingAverage);
        }
      }
    });

    it("applies min and max price inclusively", async () => {
      const { items } = await productService.listProducts({
        minPriceCents: 2400,
        maxPriceCents: 3900,
        pageSize: 100,
      });
      expect(items.length).toBeGreaterThan(0);
      expect(items.some((p) => p.priceCents === 2400)).toBe(true);
      expect(items.some((p) => p.priceCents === 3900)).toBe(true);
      expect(
        items.every((p) => p.priceCents >= 2400 && p.priceCents <= 3900),
      ).toBe(true);
    });

    it("excludes zero-inventory products when inStock is set", async () => {
      expect(outOfStockSlugs.sort()).toEqual(
        ["hot-cocoa-mix", "unflavored-isolate-oil"].sort(),
      );
      const all = await productService.listProducts({ pageSize: 100 });
      const inStock = await productService.listProducts({
        inStock: true,
        pageSize: 100,
      });
      expect(inStock.total).toBe(activeCount - outOfStockSlugs.length);
      for (const slug of outOfStockSlugs) {
        expect(all.items.some((p) => p.slug === slug)).toBe(true);
        expect(inStock.items.some((p) => p.slug === slug)).toBe(false);
      }
    });

    it("clamps the page and page size into range", async () => {
      const lastPage = Math.ceil(activeCount / 12);
      const tooHigh = await productService.listProducts({ page: 99 });
      expect(tooHigh.page).toBe(lastPage);
      expect(tooHigh.items).toHaveLength(activeCount - (lastPage - 1) * 12);

      const tooLow = await productService.listProducts({ page: 0 });
      expect(tooLow.page).toBe(1);

      const huge = await productService.listProducts({ pageSize: 1000 });
      expect(huge.pageSize).toBe(100);

      const noResults = await productService.listProducts({
        query: "zzz-no-match",
        page: 4,
      });
      expect(noResults.total).toBe(0);
      expect(noResults.totalPages).toBe(0);
      expect(noResults.page).toBe(1);
      expect(noResults.items).toEqual([]);
    });

    it("returns deterministic, non-overlapping pages", async () => {
      const seen = new Set<string>();
      for (let page = 1; page <= Math.ceil(activeCount / 5); page += 1) {
        const { items } = await productService.listProducts({
          page,
          pageSize: 5,
          sort: "rating",
        });
        for (const item of items) seen.add(item.id);
      }
      expect(seen.size).toBe(activeCount);
    });
  });

  describe("getProductBySlug", () => {
    it("returns detail with category, images, variants and published reviews", async () => {
      const product = await productService.getProductBySlug(
        "calm-full-spectrum-oil",
      );
      expect(product).not.toBeNull();
      if (!product) return;
      expect(product.id).toBe("prod_calm-full-spectrum-oil");
      expect(product.category.slug).toBe("tinctures");
      expect(product.images).toHaveLength(3);
      expect(product.variants.map((v) => v.name)).toEqual([
        "500 mg",
        "1000 mg",
        "2000 mg",
      ]);
      expect(product.variants[0]?.isDefault).toBe(true);
      expect(product.variants[0]?.priceCents).toBeNull();
      expect(product.variants[1]?.priceCents).toBe(6400);
      expect(product.variants[2]?.priceCents).toBe(10900);
      expect(product.priceCents).toBe(3900);
      expect(product.reviews.length).toBeGreaterThan(0);
      expect(product.reviews.every((r) => r.status === "published")).toBe(true);
      expect(product.reviews.every((r) => r.userId === null)).toBe(true);
      expect(product.reviewCount).toBe(product.reviews.length);
      expect(product.ratingAverage).toBeGreaterThan(0);
      const dates = product.reviews.map((r) => r.createdAt);
      expect(dates).toEqual([...dates].sort().reverse());
    });

    it("matches the listing's rating aggregate", async () => {
      const detail = await productService.getProductBySlug(
        "calm-full-spectrum-oil",
      );
      const [summary] = await productService.getProductsByIds([
        "prod_calm-full-spectrum-oil",
      ]);
      expect(summary?.reviewCount).toBe(detail?.reviewCount);
      expect(summary?.ratingAverage).toBeCloseTo(detail?.ratingAverage ?? 0);
    });

    it("returns null for an archived product", async () => {
      expect(await productService.getProductBySlug("gift-box")).toBeNull();
    });

    it("returns null for an unknown slug", async () => {
      expect(await productService.getProductBySlug("nope")).toBeNull();
    });

    it("excludes hidden reviews from aggregates", async () => {
      const matcha = await productService.getProductBySlug("matcha-blend");
      expect(matcha?.reviewCount).toBe(0);
      expect(matcha?.ratingAverage).toBe(0);
      expect(matcha?.reviews).toEqual([]);
    });

    it("returns smokable hemp products only while the flag is on", async () => {
      const preRoll = await productService.getProductBySlug(
        "classic-hemp-pre-roll",
      );
      const jar = await productService.getProductBySlug("hemp-flower-jar");
      if (smokableHemp) {
        expect(preRoll?.category.slug).toBe(HEMP_PRE_ROLLS_CATEGORY);
        expect(jar?.category.slug).toBe(HEMP_FLOWER_CATEGORY);
      } else {
        expect(preRoll).toBeNull();
        expect(jar).toBeNull();
      }
    });

    it("serves the hemp flower strains only while the flag is on", async () => {
      const slugs = expected.activeIn(HEMP_FLOWER_CATEGORY).map((p) => p.slug);
      expect(slugs.length).toBe(smokableHemp ? 9 : 0);
      const strains = slugs.filter((slug) => slug !== "hemp-flower-jar");
      const firstImages = new Set<string>();
      for (const slug of strains) {
        const product = await productService.getProductBySlug(slug);
        expect(product?.category.slug, slug).toBe(HEMP_FLOWER_CATEGORY);
        expect(
          product?.images.map((i) => i.url),
          slug,
        ).toEqual([`/images/products/hemp-flower/${slug}.jpg`]);
        expect(
          product?.variants.map((v) => v.name),
          slug,
        ).toEqual(["3.5 g", "7 g", "14 g", "28 g"]);
        expect(product?.specs?.spectrum, slug).toBe("full");
        expect(product?.specs?.servingSize, slug).toBe("as needed");
        firstImages.add(product?.images[0]?.url ?? "");
      }
      expect(firstImages.size).toBe(strains.length);
    });
  });

  describe("getProductsByIds", () => {
    it("returns active products preserving the requested order", async () => {
      const result = await productService.getProductsByIds([
        "prod_bamboo-rolling-tray",
        "prod_gift-box",
        "prod_calm-full-spectrum-oil",
        "prod_missing",
        "prod_bamboo-rolling-tray",
      ]);
      expect(result.map((p) => p.id)).toEqual([
        "prod_bamboo-rolling-tray",
        "prod_calm-full-spectrum-oil",
      ]);
    });

    it("drops ids from hidden categories", async () => {
      const result = await productService.getProductsByIds([
        "prod_classic-hemp-pre-roll",
        "prod_calm-full-spectrum-oil",
      ]);
      expect(result.map((p) => p.id)).toEqual(
        smokableHemp
          ? ["prod_classic-hemp-pre-roll", "prod_calm-full-spectrum-oil"]
          : ["prod_calm-full-spectrum-oil"],
      );
    });

    it("returns nothing for an empty list", async () => {
      expect(await productService.getProductsByIds([])).toEqual([]);
    });
  });

  describe("getFeaturedProducts", () => {
    it("returns only featured visible products, default limit 8", async () => {
      const result = await productService.getFeaturedProducts();
      const featuredCount = expected.active.filter((p) => p.featured).length;
      expect(result).toHaveLength(Math.min(8, featuredCount));
      expect(result.every((p) => p.featured && p.status === "active")).toBe(
        true,
      );
      expect(
        result.every((p) => isCategoryEnabled(p.category.slug, features)),
      ).toBe(true);
    });

    it("respects the limit", async () => {
      expect(await productService.getFeaturedProducts(3)).toHaveLength(3);
    });
  });

  describe("getRelatedProducts", () => {
    it("returns same-category products excluding self", async () => {
      const related = await productService.getRelatedProducts(
        "prod_calm-full-spectrum-oil",
      );
      expect(related).toHaveLength(4);
      expect(related.some((p) => p.id === "prod_calm-full-spectrum-oil")).toBe(
        false,
      );
      expect(related.every((p) => p.category.slug === "tinctures")).toBe(true);
    });

    it("returns an empty list for an unknown product", async () => {
      expect(await productService.getRelatedProducts("prod_missing")).toEqual(
        [],
      );
    });

    it("returns nothing for a product in a hidden category", async () => {
      const related = await productService.getRelatedProducts(
        "prod_classic-hemp-pre-roll",
      );
      expect(related.length > 0).toBe(smokableHemp);
    });
  });

  describe("searchSuggestions", () => {
    it("returns nothing for queries shorter than two characters", async () => {
      expect(await productService.searchSuggestions("x")).toEqual([]);
      expect(await productService.searchSuggestions(" ")).toEqual([]);
    });

    it("returns at most six suggestions including a category match", async () => {
      const suggestions = await productService.searchSuggestions("gum");
      expect(suggestions.length).toBeGreaterThan(1);
      expect(suggestions.length).toBeLessThanOrEqual(6);
      expect(suggestions[0]).toEqual({
        type: "category",
        label: "Gummies & Edibles",
        href: "/shop/gummies-edibles",
        imageUrl: "/images/categories/gummies-edibles.jpg",
        priceCents: null,
      });
      const product = suggestions.find((s) => s.type === "product");
      expect(product?.href).toMatch(/^\/product\//);
      expect(product?.priceCents).toBeGreaterThan(0);
      expect(product?.imageUrl).toMatch(/^\/images\/products\//);
    });

    it("matches product sku", async () => {
      const suggestions =
        await productService.searchSuggestions("HB-ACC-GRINDER");
      expect(suggestions.map((s) => s.label)).toEqual([
        "Four-piece metal grinder",
      ]);
    });

    it("respects the limit", async () => {
      expect(await productService.searchSuggestions("oil", 2)).toHaveLength(2);
    });

    it("handles long and wildcard-only input", async () => {
      expect(await productService.searchSuggestions("z".repeat(500))).toEqual(
        [],
      );
      expect(await productService.searchSuggestions("%_%")).toEqual([]);
    });

    it("suggests smokable hemp only while the flag is on", async () => {
      for (const query of ["pre-roll", "lifter"]) {
        const suggestions = await productService.searchSuggestions(query);
        expect(suggestions.length > 0, query).toBe(smokableHemp);
      }
      // "hemp flower" also matches unrelated copy ("chamomile flowers" plus
      // "hemp extract"), so look at the links rather than the count.
      const suggestions = await productService.searchSuggestions("hemp flower");
      expect(suggestions.some((s) => s.href.includes("hemp-flower"))).toBe(
        smokableHemp,
      );
    });
  });

  describe("getPriceRangeCents", () => {
    it("returns the min and max visible product price", async () => {
      const prices = expected.active.map((p) => p.priceCents);
      expect(await productService.getPriceRangeCents()).toEqual({
        minCents: Math.min(...prices),
        maxCents: Math.max(...prices),
      });
    });
  });

  describe("catalog images", () => {
    it("all category and product images are self-hosted", async () => {
      const { items } = await productService.listProducts({ pageSize: 100 });
      expect(items.length).toBeGreaterThan(0);
      for (const product of items) {
        expect(product.images.length, product.slug).toBeGreaterThanOrEqual(1);
        for (const image of product.images) {
          expect(image.url).toMatch(/^\/images\/products\//);
          expect(existsSync(join(process.cwd(), "public", image.url))).toBe(
            true,
          );
        }
      }
      const categories = await categoryService.listCategories();
      for (const category of categories) {
        expect(category.imageUrl).toMatch(/^\/images\/categories\//);
        expect(
          existsSync(join(process.cwd(), "public", category.imageUrl ?? "")),
        ).toBe(true);
      }
    });
  });

  describe("catalog names", () => {
    it("lists the six smoking accessories", async () => {
      const { items } = await productService.listProducts({
        category: "accessories",
        sort: "newest",
        pageSize: 100,
      });
      expect(items.map((p) => p.name)).toEqual([
        "Ceramic ashtray",
        "Smell-proof glass jar",
        "Bamboo rolling tray",
        "Unbleached papers and cones",
        "Four-piece metal grinder",
        "Refillable lighter 2 pack",
      ]);
      expect(new Set(items.map((p) => p.images[0]?.url)).size).toBe(6);
    });

    it("lists the glassware, each with its own photo and no specs", async () => {
      const seeded = expected.activeIn("glassware");
      expect(seeded.length).toBeGreaterThan(0);
      const { items } = await productService.listProducts({
        category: "glassware",
        pageSize: 100,
      });
      expect(items.map((p) => p.slug).sort()).toEqual(
        seeded.map((p) => p.slug).sort(),
      );
      for (const product of items) {
        expect(product.specs, product.slug).toBeNull();
        expect(product.images, product.slug).toHaveLength(1);
        expect(product.images[0]?.url).toBe(
          `/images/products/glassware/${product.slug}.jpg`,
        );
        expect(product.variants.map((v) => v.name)).toEqual(["One size"]);
      }
      expect(new Set(items.map((p) => p.images[0]?.url)).size).toBe(
        items.length,
      );
    });

    it("uses the brand-voice names while keeping slugs, ids and skus", async () => {
      const brandNames: [slug: string, name: string, sku: string][] = [
        [
          "calm-full-spectrum-oil",
          "House blend full-spectrum oil",
          "HB-TIN-CALM",
        ],
        ["mint-isolate-tincture", "Cool mint isolate", "HB-TIN-MINT"],
        ["evening-gummies", "Night shift gummies", "HB-GUM-EVE"],
        ["honey-sticks", "Honey straws", "HB-EDI-HONEY"],
        ["cooling-muscle-balm", "Ice box balm", "HB-TOP-COOL"],
        ["matcha-blend", "Green machine matcha", "HB-TEA-MATCHA"],
        ["hot-cocoa-mix", "After-dark cocoa", "HB-WEL-COCOA"],
      ];
      const { items } = await productService.listProducts({ pageSize: 100 });
      for (const [slug, name, sku] of brandNames) {
        const product = items.find((p) => p.slug === slug);
        expect(product?.id, slug).toBe(`prod_${slug}`);
        expect(product?.name, slug).toBe(name);
        expect(product?.sku, slug).toBe(sku);
      }
    });
  });
});
