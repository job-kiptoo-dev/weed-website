/**
 * Review reads for the storefront. `createReviewService` takes the database
 * and feature flags so tests can inject both; `reviewService` is bound to the
 * app database and `siteConfig.features`. Only published reviews of active
 * products in visible categories (see `@/lib/catalog-visibility`) are ever
 * returned.
 */
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { categories, products, reviews } from "@/lib/db/schema";
import { siteConfig } from "@/lib/site-config";
import type { FeaturedReview } from "@/types/catalog";
import { toIso, toRating } from "./catalog.mappers";
import { visibleProduct, type CatalogServiceDeps } from "./product.queries";

export function createReviewService({ getDb, features }: CatalogServiceDeps) {
  /**
   * The review the checkout sidebar quotes: the highest rating first, then
   * the most recent of those, then by id so the choice is deterministic.
   * Null when no published review qualifies.
   */
  async function getFeaturedReview(): Promise<FeaturedReview | null> {
    const db = await getDb();
    const [row] = await db
      .select({
        id: reviews.id,
        authorName: reviews.authorName,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        createdAt: reviews.createdAt,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(reviews)
      .innerJoin(products, eq(reviews.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(reviews.status, "published"), visibleProduct(features)))
      .orderBy(desc(reviews.rating), desc(reviews.createdAt), asc(reviews.id))
      .limit(1);
    if (!row) return null;

    return {
      id: row.id,
      authorName: row.authorName,
      rating: toRating(row.rating),
      title: row.title,
      body: row.body,
      createdAt: toIso(row.createdAt),
      productName: row.productName,
      productSlug: row.productSlug,
    };
  }

  return { getFeaturedReview };
}

export type ReviewService = ReturnType<typeof createReviewService>;

export const reviewService: ReviewService = createReviewService({
  getDb,
  features: siteConfig.features,
});
