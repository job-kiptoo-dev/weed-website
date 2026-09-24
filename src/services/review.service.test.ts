// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isCategoryEnabled } from "@/lib/catalog-visibility";
import { reviews } from "@/lib/db/schema";
import { buildSeedCatalog } from "@/lib/db/seed-data/catalog";
import type { FeatureFlags } from "@/lib/site-config";
import { createTestDb, seedCatalogWithReviews, type TestDb } from "@/test/db";
import { createReviewService } from "./review.service";

let testDb: TestDb;

beforeAll(async () => {
  testDb = await createTestDb({ seed: seedCatalogWithReviews });
}, 30_000);

afterAll(async () => {
  await testDb?.close();
});

const catalog = buildSeedCatalog();
const productById = new Map(catalog.products.map((p) => [p.id, p]));
const categorySlugById = new Map(catalog.categories.map((c) => [c.id, c.slug]));

function reviewServiceFor(features: FeatureFlags) {
  return createReviewService({ getDb: async () => testDb.db, features });
}

/** The same rule as the service, applied to the seed data. */
function expectedFeatured(features: FeatureFlags) {
  return catalog.reviews
    .filter((review) => {
      const product = productById.get(review.productId);
      const categorySlug = product && categorySlugById.get(product.categoryId);
      return (
        review.status === "published" &&
        product?.status === "active" &&
        categorySlug !== undefined &&
        isCategoryEnabled(categorySlug, features)
      );
    })
    .toSorted(
      (a, b) =>
        b.rating - a.rating ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
        a.id.localeCompare(b.id),
    )[0];
}

const HEMP_PRODUCT_ID = "prod_lifter-hemp-flower";

describe("getFeaturedReview", () => {
  it("returns the highest-rated, most recent published review", async () => {
    const featured = await reviewServiceFor({
      smokableHemp: true,
    }).getFeaturedReview();
    const expected = expectedFeatured({ smokableHemp: true });
    const product = productById.get(expected?.productId ?? "");

    expect(featured).toEqual({
      id: expected?.id,
      authorName: expected?.authorName,
      rating: expected?.rating,
      title: expected?.title,
      body: expected?.body,
      createdAt: expected?.createdAt,
      productName: product?.name,
      productSlug: product?.slug,
    });
    expect(featured?.rating).toBe(5);
  });

  it("excludes reviews of products in a hidden category", async () => {
    // The newest 5-star review in the catalog, on a hemp flower product: it
    // wins while the flag is on and must vanish when the flag is off.
    await testDb.db.insert(reviews).values({
      id: "rev_hidden_category_test",
      productId: HEMP_PRODUCT_ID,
      userId: null,
      authorName: "Flag Test",
      rating: 5,
      title: "Best flower",
      body: "Reviews of hidden categories must never surface.",
      status: "published",
      createdAt: new Date("2026-09-20T10:00:00.000Z"),
      updatedAt: new Date("2026-09-20T10:00:00.000Z"),
    });

    try {
      const shown = await reviewServiceFor({
        smokableHemp: true,
      }).getFeaturedReview();
      expect(shown?.id).toBe("rev_hidden_category_test");

      const hidden = await reviewServiceFor({
        smokableHemp: false,
      }).getFeaturedReview();
      expect(hidden?.id).toBe(expectedFeatured({ smokableHemp: false })?.id);
      expect(hidden?.id).not.toBe("rev_hidden_category_test");
    } finally {
      await testDb.db
        .delete(reviews)
        .where(eq(reviews.id, "rev_hidden_category_test"));
    }
  });

  it("returns null when no review qualifies", async () => {
    const empty = await createTestDb();
    try {
      const service = createReviewService({
        getDb: async () => empty.db,
        features: { smokableHemp: true },
      });
      await expect(service.getFeaturedReview()).resolves.toBeNull();
    } finally {
      await empty.close();
    }
  }, 30_000);
});
