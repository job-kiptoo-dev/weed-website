// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  HEMP_FLOWER_CATEGORY,
  HEMP_PRE_ROLLS_CATEGORY,
  isCategoryEnabled,
} from "@/lib/catalog-visibility";
import { buildSeedCatalog } from "@/lib/db/seed-data/catalog";
import type { FeatureFlags } from "@/lib/site-config";
import { createTestDb, seedCatalogWithReviews, type TestDb } from "@/test/db";
import { createCategoryService } from "./category.service";

let testDb: TestDb;

beforeAll(async () => {
  testDb = await createTestDb({ seed: seedCatalogWithReviews });
}, 30_000);

afterAll(async () => {
  await testDb?.close();
});

const catalog = buildSeedCatalog();

function categoryServiceFor(features: FeatureFlags) {
  return createCategoryService({ getDb: async () => testDb.db, features });
}

function activeCount(categoryId: string): number {
  return catalog.products.filter(
    (p) => p.categoryId === categoryId && p.status === "active",
  ).length;
}

describe.each([true, false])("smokableHemp = %s", (smokableHemp) => {
  const features: FeatureFlags = { smokableHemp };
  const categoryService = categoryServiceFor(features);
  const expected = catalog.categories
    .filter((c) => isCategoryEnabled(c.slug, features))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  it("lists visible categories in sort order with active product counts", async () => {
    const categories = await categoryService.listCategories();
    expect(categories.map((c) => c.slug)).toEqual(expected.map((c) => c.slug));
    expect(categories).toHaveLength(smokableHemp ? 8 : 6);
    for (const category of categories) {
      expect(category.productCount, category.slug).toBe(
        activeCount(category.id),
      );
    }
  });

  it("maps category rows to the view type", async () => {
    const [first] = await categoryService.listCategories();
    const seed = expected[0];
    expect(first).toEqual({
      ...seed,
      productCount: activeCount(seed?.id ?? ""),
    });
  });

  it("counts zero-inventory products but not archived ones", async () => {
    const bySlug = (slug: string) => {
      const product = catalog.products.find((p) => p.slug === slug);
      if (!product) throw new Error(`No seed product "${slug}"`);
      return product;
    };
    const archived = bySlug("gift-box");
    const outOfStock = bySlug("hot-cocoa-mix");
    expect(archived.status).toBe("archived");
    expect(outOfStock.inventory).toBe(0);

    const categories = await categoryService.listCategories();
    const countOf = (id: string) =>
      categories.find((c) => c.id === id)?.productCount;
    const allIn = (id: string) =>
      catalog.products.filter((p) => p.categoryId === id).length;
    expect(countOf(archived.categoryId)).toBe(allIn(archived.categoryId) - 1);
    expect(countOf(outOfStock.categoryId)).toBe(
      activeCount(outOfStock.categoryId),
    );
  });

  it("finds a category by slug", async () => {
    const tinctures = await categoryService.getCategoryBySlug("tinctures");
    expect(tinctures?.id).toBe("cat_tinctures");
    expect(tinctures?.productCount).toBe(activeCount("cat_tinctures"));
    expect(await categoryService.getCategoryBySlug("nope")).toBeNull();
  });

  it("shows glassware last under both flag values", async () => {
    const glassware = await categoryService.getCategoryBySlug("glassware");
    expect(glassware?.id).toBe("cat_glassware");
    expect(glassware?.sortOrder).toBe(8);
    expect(glassware?.productCount).toBe(activeCount("cat_glassware"));
    const categories = await categoryService.listCategories();
    expect(categories.at(-1)?.slug).toBe("glassware");
  });

  it("returns the smokable hemp categories only while the flag is on", async () => {
    const preRolls = await categoryService.getCategoryBySlug(
      HEMP_PRE_ROLLS_CATEGORY,
    );
    const flower =
      await categoryService.getCategoryBySlug(HEMP_FLOWER_CATEGORY);
    if (smokableHemp) {
      expect(preRolls?.productCount).toBe(3);
      expect(preRolls?.sortOrder).toBe(6);
      expect(flower?.productCount).toBe(24);
      expect(flower?.sortOrder).toBe(7);
    } else {
      expect(preRolls).toBeNull();
      expect(flower).toBeNull();
    }
  });
});

describe("category ids and sort orders", () => {
  it("stay stable across flag values", async () => {
    const on = await categoryServiceFor({
      smokableHemp: true,
    }).listCategories();
    const off = await categoryServiceFor({
      smokableHemp: false,
    }).listCategories();
    for (const category of off) {
      const match = on.find((c) => c.id === category.id);
      expect(match?.sortOrder, category.slug).toBe(category.sortOrder);
    }
  });
});
