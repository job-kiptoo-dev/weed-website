/**
 * Product reads from Postgres (Neon in production, PGlite in development
 * and tests). `createProductService` takes the database and feature flags so
 * tests can inject both; `productService` is bound to the app database and
 * `siteConfig.features`. Hidden categories (see `@/lib/catalog-visibility`)
 * are filtered in every query, so their products never leak into listings,
 * search, id lookups or related products.
 */
import { and, asc, count, eq, inArray, max, min, ne, sql } from "drizzle-orm";
import { isCategoryEnabled } from "@/lib/catalog-visibility";
import { getDb } from "@/lib/db/client";
import { categories, productImages, products, reviews } from "@/lib/db/schema";
import type { Database } from "@/lib/db/types";
import { siteConfig } from "@/lib/site-config";
import type {
  ListProductsParams,
  Paginated,
  ProductDetail,
  ProductSort,
  ProductSummary,
  SearchSuggestion,
} from "@/types/catalog";
import {
  NO_RATINGS,
  toProductDetail,
  toProductSummary,
  type RatingStats,
} from "./catalog.mappers";
import {
  FEATURED_ORDER,
  type CatalogServiceDeps,
  ilikeEscaped,
  likePattern,
  listFilters,
  listOrder,
  NEWEST_ORDER,
  normalizeQuery,
  prefixTokens,
  prefixTsquery,
  productSearch,
  visibleCategory,
  visibleProduct,
} from "./product.queries";

export type { CatalogServiceDeps, ListProductsParams, Paginated, ProductSort };

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;
const MAX_IDS = 50;
const DEFAULT_FEATURED_LIMIT = 8;
const DEFAULT_RELATED_LIMIT = 4;
const DEFAULT_SUGGESTION_LIMIT = 6;
const MIN_QUERY_LENGTH = 2;

function clampPage(page: number | undefined, totalPages: number): number {
  const requested =
    typeof page === "number" && Number.isInteger(page) ? page : 1;
  return Math.min(Math.max(requested, 1), Math.max(totalPages, 1));
}

function clampPageSize(pageSize: number): number {
  return Math.min(Math.max(1, Math.floor(pageSize)), MAX_PAGE_SIZE);
}

/** Non-negative whole number for LIMIT; bad input yields no rows. */
function clampLimit(limit: number): number {
  return Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
}

/** Published-review aggregate, grouped per product. */
function reviewStats(db: Database) {
  return db
    .select({
      productId: reviews.productId,
      ratingAverage: sql<number>`avg(${reviews.rating})::float8`.as(
        "rating_average",
      ),
      reviewCount: sql<number>`count(*)::int`.as("review_count"),
    })
    .from(reviews)
    .where(eq(reviews.status, "published"))
    .groupBy(reviews.productId)
    .as("review_stats");
}

async function ratingStatsFor(
  db: Database,
  ids: string[],
): Promise<Map<string, RatingStats>> {
  const rows = await db
    .select({
      productId: reviews.productId,
      ratingAverage: sql<number>`avg(${reviews.rating})::float8`,
      reviewCount: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(
      and(eq(reviews.status, "published"), inArray(reviews.productId, ids)),
    )
    .groupBy(reviews.productId);
  return new Map(
    rows.map((row) => [
      row.productId,
      {
        ratingAverage: Number(row.ratingAverage),
        reviewCount: Number(row.reviewCount),
      },
    ]),
  );
}

/**
 * Loads summaries for `ids` in two batched queries (products with category,
 * images and variants; rating aggregates) and returns them in `ids` order.
 * Callers pass ids that already passed the visibility filter.
 */
async function hydrateSummaries(
  db: Database,
  ids: string[],
): Promise<ProductSummary[]> {
  if (ids.length === 0) return [];
  const [rows, stats] = await Promise.all([
    db.query.products.findMany({
      where: inArray(products.id, ids),
      columns: { searchVector: false },
      with: {
        category: { columns: { id: true, name: true, slug: true } },
        images: {
          orderBy: (image, { asc: ascending }) => [
            ascending(image.sortOrder),
            ascending(image.id),
          ],
        },
        variants: {
          orderBy: (variant, { asc: ascending }) => [
            ascending(variant.sortOrder),
            ascending(variant.id),
          ],
        },
      },
    }),
    ratingStatsFor(db, ids),
  ]);
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [toProductSummary(row, stats.get(id) ?? NO_RATINGS)] : [];
  });
}

export function createProductService({ getDb, features }: CatalogServiceDeps) {
  async function listProducts(
    params: ListProductsParams = {},
  ): Promise<Paginated<ProductSummary>> {
    const { sort = "featured", page, pageSize = DEFAULT_PAGE_SIZE } = params;
    const db = await getDb();
    const size = clampPageSize(pageSize);
    const query = normalizeQuery(params.query);
    const search = query === "" ? null : productSearch(query);
    const where = listFilters(features, params, search);

    const [counted] = await db
      .select({ total: count() })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(where);
    const total = counted?.total ?? 0;
    const totalPages = Math.ceil(total / size);
    const currentPage = clampPage(page, totalPages);
    if (total === 0) {
      return {
        items: [],
        page: currentPage,
        pageSize: size,
        total,
        totalPages,
      };
    }

    const stats = reviewStats(db);
    const order = listOrder(sort, search, {
      ratingAverage: sql`coalesce(${stats.ratingAverage}, 0)`,
      reviewCount: sql`coalesce(${stats.reviewCount}, 0)`,
    });
    const idQuery = db
      .select({ id: products.id })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .$dynamic();
    // Only the rating sort reads the review aggregate.
    if (sort === "rating") {
      idQuery.leftJoin(stats, eq(stats.productId, products.id));
    }
    const idRows = await idQuery
      .where(where)
      .orderBy(...order)
      .limit(size)
      .offset((currentPage - 1) * size);

    return {
      items: await hydrateSummaries(
        db,
        idRows.map((row) => row.id),
      ),
      page: currentPage,
      pageSize: size,
      total,
      totalPages,
    };
  }

  async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
    const db = await getDb();
    const row = await db.query.products.findFirst({
      where: and(eq(products.slug, slug), eq(products.status, "active")),
      columns: { searchVector: false },
      with: {
        category: { columns: { id: true, name: true, slug: true } },
        images: {
          orderBy: (image, { asc: ascending }) => [
            ascending(image.sortOrder),
            ascending(image.id),
          ],
        },
        variants: {
          orderBy: (variant, { asc: ascending }) => [
            ascending(variant.sortOrder),
            ascending(variant.id),
          ],
        },
        reviews: {
          where: (review, { eq: equals }) => equals(review.status, "published"),
          orderBy: (review, { asc: ascending, desc: descending }) => [
            descending(review.createdAt),
            ascending(review.id),
          ],
        },
      },
    });
    if (!row || !isCategoryEnabled(row.category.slug, features)) return null;
    return toProductDetail(row);
  }

  async function getProductsByIds(ids: string[]): Promise<ProductSummary[]> {
    const requested = Array.from(new Set(ids)).slice(0, MAX_IDS);
    if (requested.length === 0) return [];
    const db = await getDb();
    const found = await db
      .select({ id: products.id })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(inArray(products.id, requested), visibleProduct(features)));
    const visible = new Set(found.map((row) => row.id));
    return hydrateSummaries(
      db,
      requested.filter((id) => visible.has(id)),
    );
  }

  async function getFeaturedProducts(
    limit = DEFAULT_FEATURED_LIMIT,
  ): Promise<ProductSummary[]> {
    const db = await getDb();
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(visibleProduct(features), eq(products.featured, true)))
      .orderBy(...NEWEST_ORDER)
      .limit(clampLimit(limit));
    return hydrateSummaries(
      db,
      rows.map((row) => row.id),
    );
  }

  async function getRelatedProducts(
    productId: string,
    limit = DEFAULT_RELATED_LIMIT,
  ): Promise<ProductSummary[]> {
    const db = await getDb();
    // The source may be any status (as before); only its category matters.
    const [source] = await db
      .select({
        categoryId: products.categoryId,
        categorySlug: categories.slug,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, productId))
      .limit(1);
    if (!source || !isCategoryEnabled(source.categorySlug, features)) return [];

    const rows = await db
      .select({ id: products.id })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          visibleProduct(features),
          eq(products.categoryId, source.categoryId),
          ne(products.id, productId),
        ),
      )
      .orderBy(...FEATURED_ORDER)
      .limit(clampLimit(limit));
    return hydrateSummaries(
      db,
      rows.map((row) => row.id),
    );
  }

  async function searchSuggestions(
    rawQuery: string,
    limit = DEFAULT_SUGGESTION_LIMIT,
  ): Promise<SearchSuggestion[]> {
    const query = normalizeQuery(rawQuery);
    if (query.length < MIN_QUERY_LENGTH) return [];
    const cap = clampLimit(limit);
    if (cap === 0) return [];
    const db = await getDb();
    const pattern = likePattern(query);

    const categoryRows = await db
      .select({
        name: categories.name,
        slug: categories.slug,
        imageUrl: categories.imageUrl,
      })
      .from(categories)
      .where(
        and(visibleCategory(features), ilikeEscaped(categories.name, pattern)),
      )
      .orderBy(asc(categories.sortOrder), asc(categories.id))
      .limit(cap);

    const categorySuggestions: SearchSuggestion[] = categoryRows.map((c) => ({
      type: "category",
      label: c.name,
      href: `/shop/${c.slug}`,
      imageUrl: c.imageUrl,
      priceCents: null,
    }));
    const remaining = cap - categorySuggestions.length;
    if (remaining <= 0) return categorySuggestions;

    const tokens = prefixTokens(query);
    const productMatch = and(
      visibleProduct(features),
      sql`(${sql.join(
        [
          ...(tokens.length > 0
            ? [sql`${products.searchVector} @@ ${prefixTsquery(tokens)}`]
            : []),
          ilikeEscaped(products.name, pattern),
          ilikeEscaped(products.sku, pattern),
        ],
        sql` or `,
      )})`,
    );
    const firstImageUrl = sql<
      string | null
    >`(select ${productImages.url} from ${productImages} where ${productImages.productId} = ${products.id} order by ${productImages.sortOrder}, ${productImages.id} limit 1)`;

    const productRows = await db
      .select({
        name: products.name,
        slug: products.slug,
        priceCents: products.priceCents,
        imageUrl: firstImageUrl,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(productMatch)
      .orderBy(
        sql`case when upper(${products.sku}) = upper(${query}::text) then 0 else 1 end`,
        ...FEATURED_ORDER,
      )
      .limit(remaining);

    const productSuggestions: SearchSuggestion[] = productRows.map((p) => ({
      type: "product",
      label: p.name,
      href: `/product/${p.slug}`,
      imageUrl: p.imageUrl,
      priceCents: p.priceCents,
    }));
    return [...categorySuggestions, ...productSuggestions];
  }

  async function getPriceRangeCents(): Promise<{
    minCents: number;
    maxCents: number;
  }> {
    const db = await getDb();
    const [range] = await db
      .select({
        minCents: min(products.priceCents),
        maxCents: max(products.priceCents),
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(visibleProduct(features));
    if (!range || range.minCents === null || range.maxCents === null) {
      return { minCents: 0, maxCents: 0 };
    }
    return { minCents: range.minCents, maxCents: range.maxCents };
  }

  return {
    listProducts,
    getProductBySlug,
    getProductsByIds,
    getFeaturedProducts,
    getRelatedProducts,
    searchSuggestions,
    getPriceRangeCents,
  };
}

export type ProductService = ReturnType<typeof createProductService>;

export const productService: ProductService = createProductService({
  getDb,
  features: siteConfig.features,
});
