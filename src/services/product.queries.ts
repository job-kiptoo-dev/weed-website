/**
 * SQL fragments shared by the catalog services: visibility, filters, search
 * and ordering. Pure builders (no database handle); the services compose
 * them into query-builder `where` / `orderBy` clauses. Every product query
 * inner-joins `categories` so the category visibility rule can apply.
 */
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  lte,
  notInArray,
  or,
  sql,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";
import { hiddenCategorySlugs } from "@/lib/catalog-visibility";
import { categories, products, productVariants } from "@/lib/db/schema";
import type { Database } from "@/lib/db/types";
import { MAX_QUERY_LENGTH } from "@/lib/shop-query";
import type { FeatureFlags } from "@/lib/site-config";
import type { ListProductsParams, ProductSort } from "@/types/catalog";

/** What the catalog service factories need; tests inject both. */
export interface CatalogServiceDeps {
  getDb: () => Promise<Database>;
  features: FeatureFlags;
}

/** Hides the smokable hemp categories when their flag is off. */
export function visibleCategory(features: FeatureFlags): SQL | undefined {
  const hidden = hiddenCategorySlugs(features);
  return hidden.length === 0
    ? undefined
    : notInArray(categories.slug, [...hidden]);
}

/** Active products in a visible category (requires the categories join). */
export function visibleProduct(features: FeatureFlags): SQL {
  const active = eq(products.status, "active");
  return and(active, visibleCategory(features)) ?? active;
}

/** Trims and caps a search query. An empty result means "no search". */
export function normalizeQuery(query: string | undefined): string {
  return (query ?? "").trim().slice(0, MAX_QUERY_LENGTH).trim();
}

/** `%q%` with LIKE metacharacters escaped, for `ILIKE ... ESCAPE '\'`. */
export function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Case-insensitive substring match; `%` and `_` in the input are literal. */
export function ilikeEscaped(column: AnyColumn, pattern: string): SQL {
  return sql`${column} ilike ${pattern} escape '\\'`;
}

/** Lowercase `[a-z0-9]` tokens, at most five, for the prefix tsquery. */
export function prefixTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0)
    .slice(0, 5);
}

/**
 * `tok1:* & tok2:*`. Tokens are restricted to `[a-z0-9]`, so the value (sent
 * as a bound parameter) cannot inject tsquery syntax.
 */
export function prefixTsquery(tokens: readonly string[]): SQL {
  const value = tokens.map((token) => `${token}:*`).join(" & ");
  return sql`to_tsquery('english', ${value}::text)`;
}

/** Exact product or variant SKU, case-insensitive. */
export function skuExact(query: string): SQL {
  return sql`(upper(${products.sku}) = upper(${query}::text) or exists (select 1 from ${productVariants} where ${productVariants.productId} = ${products.id} and upper(${productVariants.sku}) = upper(${query}::text)))`;
}

export interface ProductSearch {
  /** The normalized query. */
  query: string;
  match: SQL;
  relevance: SQL<number>;
}

/**
 * Full-text search (`websearch_to_tsquery`, stemmed) over products and
 * category names, OR an exact SKU, OR a name substring. SKU hits rank first.
 */
export function productSearch(query: string): ProductSearch {
  const tsquery = sql`websearch_to_tsquery('english', ${query}::text)`;
  const pattern = likePattern(query);
  const sku = skuExact(query);
  const nameMatch = ilikeEscaped(products.name, pattern);
  const match =
    or(
      sku,
      sql`${products.searchVector} @@ ${tsquery}`,
      sql`${categories.searchVector} @@ ${tsquery}`,
      nameMatch,
    ) ?? sku;
  const relevance = sql<number>`((case when ${sku} then 100 else 0 end) + ts_rank_cd(${products.searchVector}, ${tsquery}) + 0.5 * ts_rank_cd(${categories.searchVector}, ${tsquery}) + (case when ${nameMatch} then 0.1 else 0 end))`;
  return { query, match, relevance };
}

/** Filters for `listProducts` (visibility included). */
export function listFilters(
  features: FeatureFlags,
  params: Pick<
    ListProductsParams,
    "category" | "minPriceCents" | "maxPriceCents" | "inStock"
  >,
  search: ProductSearch | null,
): SQL {
  const visible = visibleProduct(features);
  return (
    and(
      visible,
      params.category === undefined
        ? undefined
        : eq(categories.slug, params.category),
      params.minPriceCents === undefined
        ? undefined
        : gte(products.priceCents, params.minPriceCents),
      params.maxPriceCents === undefined
        ? undefined
        : lte(products.priceCents, params.maxPriceCents),
      params.inStock === true ? gt(products.inventory, 0) : undefined,
      search?.match,
    ) ?? visible
  );
}

/** Featured first, newest first, then id for deterministic pages. */
export const FEATURED_ORDER: SQL[] = [
  desc(products.featured),
  desc(products.createdAt),
  asc(products.id),
];

export const NEWEST_ORDER: SQL[] = [desc(products.createdAt), asc(products.id)];

/**
 * ORDER BY for a listing sort. `rating` needs the review-stats columns
 * (left-joined, coalesced); `featured` with a search ranks by relevance.
 */
export function listOrder(
  sort: ProductSort,
  search: ProductSearch | null,
  rating: { ratingAverage: SQL; reviewCount: SQL },
): SQL[] {
  switch (sort) {
    case "featured":
      return search
        ? [desc(search.relevance), ...FEATURED_ORDER]
        : FEATURED_ORDER;
    case "newest":
      return NEWEST_ORDER;
    case "price-asc":
      return [asc(products.priceCents), asc(products.id)];
    case "price-desc":
      return [desc(products.priceCents), asc(products.id)];
    case "rating":
      return [
        desc(rating.ratingAverage),
        desc(rating.reviewCount),
        asc(products.id),
      ];
  }
}
