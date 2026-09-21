import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCatalog, SMOKABLE_HEMP_CATEGORY } from "@/mocks/catalog";
import { categoryService } from "./category.service";
import { productService } from "./product.service";

// Counts assume `siteConfig.features.smokableHemp` is on (R8b).
const ACTIVE_COUNT = 34;
const ACTIVE_COUNT_WITHOUT_SMOKABLE_HEMP = 30;
const CATEGORY_COUNT = 6;
const OUT_OF_STOCK_SLUGS = ["unflavored-isolate-oil", "hot-cocoa-mix"];

describe("productService.listProducts", () => {
  it("lists active products with defaults (page 1, size 12, featured sort)", async () => {
    const result = await productService.listProducts();
    expect(result.total).toBe(ACTIVE_COUNT);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(12);
    expect(result.totalPages).toBe(3);
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
    expect(all.items).toHaveLength(ACTIVE_COUNT);
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
    const result = await productService.listProducts({ category: "topicals" });
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
    const result = await productService.listProducts({ query: "hb-tin-calm" });
    expect(result.items.map((p) => p.slug)).toEqual(["calm-full-spectrum-oil"]);
  });

  it("matches query against category name", async () => {
    const result = await productService.listProducts({ query: "accessories" });
    expect(result.total).toBe(6);
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
    expect(items[0]?.slug).toBe("hemp-flower-jar");
  });

  it("sorts by rating then review count", async () => {
    const { items } = await productService.listProducts({
      sort: "rating",
      pageSize: 100,
    });
    for (let i = 1; i < items.length; i += 1) {
      const prev = items[i - 1];
      const curr = items[i];
      if (!prev || !curr) throw new Error("unexpected empty item");
      if (prev.ratingAverage === curr.ratingAverage) {
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
    const all = await productService.listProducts({ pageSize: 100 });
    const inStock = await productService.listProducts({
      inStock: true,
      pageSize: 100,
    });
    expect(inStock.total).toBe(ACTIVE_COUNT - OUT_OF_STOCK_SLUGS.length);
    for (const slug of OUT_OF_STOCK_SLUGS) {
      expect(all.items.some((p) => p.slug === slug)).toBe(true);
      expect(inStock.items.some((p) => p.slug === slug)).toBe(false);
    }
  });

  it("clamps the page into range", async () => {
    const tooHigh = await productService.listProducts({ page: 99 });
    expect(tooHigh.page).toBe(3);
    expect(tooHigh.items).toHaveLength(ACTIVE_COUNT - 24);

    const tooLow = await productService.listProducts({ page: 0 });
    expect(tooLow.page).toBe(1);

    const noResults = await productService.listProducts({
      query: "zzz-no-match",
      page: 4,
    });
    expect(noResults.total).toBe(0);
    expect(noResults.totalPages).toBe(0);
    expect(noResults.page).toBe(1);
    expect(noResults.items).toEqual([]);
  });
});

describe("productService.getProductBySlug", () => {
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
    expect(product.reviews.every((r) => r.status === "published")).toBe(true);
    expect(product.reviewCount).toBe(product.reviews.length);
    expect(product.ratingAverage).toBeGreaterThan(0);
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
});

describe("productService.getProductsByIds", () => {
  it("returns active products preserving the requested order", async () => {
    const result = await productService.getProductsByIds([
      "prod_bamboo-rolling-tray",
      "prod_gift-box",
      "prod_calm-full-spectrum-oil",
      "prod_missing",
    ]);
    expect(result.map((p) => p.id)).toEqual([
      "prod_bamboo-rolling-tray",
      "prod_calm-full-spectrum-oil",
    ]);
  });
});

describe("productService.getFeaturedProducts", () => {
  it("returns only featured active products, default limit 8", async () => {
    const result = await productService.getFeaturedProducts();
    expect(result.length).toBeLessThanOrEqual(8);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.featured && p.status === "active")).toBe(true);
  });

  it("respects the limit", async () => {
    expect(await productService.getFeaturedProducts(3)).toHaveLength(3);
  });
});

describe("productService.getRelatedProducts", () => {
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
    expect(await productService.getRelatedProducts("prod_missing")).toEqual([]);
  });
});

describe("productService.searchSuggestions", () => {
  it("returns nothing for queries shorter than two characters", async () => {
    expect(await productService.searchSuggestions("x")).toEqual([]);
    expect(await productService.searchSuggestions(" ")).toEqual([]);
  });

  it("returns at most six suggestions including a category match", async () => {
    const suggestions = await productService.searchSuggestions("gum");
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(6);
    const category = suggestions.find((s) => s.type === "category");
    expect(category).toEqual({
      type: "category",
      label: "Gummies & Edibles",
      href: "/shop/gummies-edibles",
      imageUrl: "/images/categories/gummies-edibles.jpg",
      priceCents: null,
    });
    const product = suggestions.find((s) => s.type === "product");
    expect(product?.href).toMatch(/^\/product\//);
    expect(product?.priceCents).toBeGreaterThan(0);
  });

  it("matches product sku", async () => {
    const suggestions =
      await productService.searchSuggestions("HB-ACC-GRINDER");
    expect(suggestions.map((s) => s.label)).toEqual([
      "Four-piece metal grinder",
    ]);
  });
});

describe("productService.getPriceRangeCents", () => {
  it("returns the min and max active product price", async () => {
    expect(await productService.getPriceRangeCents()).toEqual({
      minCents: 600,
      maxCents: 6400,
    });
  });
});

describe("catalog images", () => {
  it("all category and product images are self-hosted", async () => {
    const { items } = await productService.listProducts({ pageSize: 100 });
    expect(items.length).toBeGreaterThan(0);
    for (const product of items) {
      expect(product.images).toHaveLength(3);
      for (const image of product.images) {
        expect(image.url).toMatch(/^\/images\/products\//);
        expect(existsSync(join(process.cwd(), "public", image.url))).toBe(true);
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

describe("catalog names and categories", () => {
  it("lists six categories with smokable hemp on", async () => {
    const categories = await categoryService.listCategories();
    expect(categories).toHaveLength(CATEGORY_COUNT);
    expect(categories.map((c) => c.slug)).toEqual([
      "tinctures",
      "gummies-edibles",
      "topicals",
      "teas-wellness",
      "accessories",
      SMOKABLE_HEMP_CATEGORY,
    ]);
    const preRolls = categories.find((c) => c.slug === SMOKABLE_HEMP_CATEGORY);
    expect(preRolls?.productCount).toBe(4);
    expect(preRolls?.sortOrder).toBe(6);
  });

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

  it("uses the brand-voice names while keeping slugs, ids and skus", async () => {
    const expected: [slug: string, name: string, sku: string][] = [
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
    for (const [slug, name, sku] of expected) {
      const product = items.find((p) => p.slug === slug);
      expect(product?.id, slug).toBe(`prod_${slug}`);
      expect(product?.name, slug).toBe(name);
      expect(product?.sku, slug).toBe(sku);
    }
  });
});

describe("smokable hemp feature flag", () => {
  it("shows hemp pre-rolls while the feature is on", async () => {
    const product = await productService.getProductBySlug(
      "classic-hemp-pre-roll",
    );
    expect(product?.category.slug).toBe(SMOKABLE_HEMP_CATEGORY);
    const catalog = buildCatalog({ smokableHemp: true });
    expect(catalog.categories).toHaveLength(CATEGORY_COUNT);
    expect(catalog.products.filter((p) => p.status === "active")).toHaveLength(
      ACTIVE_COUNT,
    );
  });

  it("hides smokable hemp while the feature is off", () => {
    const catalog = buildCatalog({ smokableHemp: false });
    const categoryId = `cat_${SMOKABLE_HEMP_CATEGORY}`;

    expect(catalog.categories).toHaveLength(CATEGORY_COUNT - 1);
    expect(catalog.categories.some((c) => c.id === categoryId)).toBe(false);
    expect(catalog.products.some((p) => p.categoryId === categoryId)).toBe(
      false,
    );
    expect(catalog.products.filter((p) => p.status === "active")).toHaveLength(
      ACTIVE_COUNT_WITHOUT_SMOKABLE_HEMP,
    );

    const productIds = new Set(catalog.products.map((p) => p.id));
    expect(
      catalog.productImages.every((i) => productIds.has(i.productId)),
    ).toBe(true);
    expect(
      catalog.productVariants.every((v) => productIds.has(v.productId)),
    ).toBe(true);
    expect(catalog.reviews.every((r) => productIds.has(r.productId))).toBe(
      true,
    );

    const text = JSON.stringify(catalog).toLowerCase();
    expect(text).not.toContain(SMOKABLE_HEMP_CATEGORY);
    expect(text).not.toContain("pre-roll");
    expect(text).not.toContain("hemp flower");
  });

  it("keeps category ids and sort orders stable across flag values", () => {
    const on = buildCatalog({ smokableHemp: true }).categories;
    const off = buildCatalog({ smokableHemp: false }).categories;
    for (const category of off) {
      const match = on.find((c) => c.id === category.id);
      expect(match?.sortOrder, category.slug).toBe(category.sortOrder);
    }
  });
});
