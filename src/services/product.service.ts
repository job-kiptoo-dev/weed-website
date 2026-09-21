/**
 * Phase 1 product service backed by `src/mocks/catalog`. Phase 2 swaps the
 * mock reads for Drizzle queries; the signatures and view types stay the same.
 */
import {
  categories,
  productImages,
  products,
  productVariants,
  reviews,
} from "@/mocks/catalog";
import type {
  CategoryRef,
  Product,
  ProductDetail,
  ProductSummary,
  Review,
  SearchSuggestion,
} from "@/types/catalog";

export type ProductSort =
  "featured" | "newest" | "price-asc" | "price-desc" | "rating";

export interface ListProductsParams {
  category?: string;
  query?: string;
  sort?: ProductSort;
  minPriceCents?: number;
  maxPriceCents?: number;
  inStock?: boolean;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 12;
const DEFAULT_FEATURED_LIMIT = 8;
const DEFAULT_RELATED_LIMIT = 4;
const DEFAULT_SUGGESTION_LIMIT = 6;
const MIN_QUERY_LENGTH = 2;

function toCategoryRef(categoryId: string): CategoryRef {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) {
    throw new Error(`productService: unknown category id "${categoryId}"`);
  }
  return { id: category.id, name: category.name, slug: category.slug };
}

function publishedReviewsFor(productId: string): Review[] {
  return reviews.filter(
    (r) => r.productId === productId && r.status === "published",
  );
}

function toSummary(product: Product): ProductSummary {
  const published = publishedReviewsFor(product.id);
  const reviewCount = published.length;
  const ratingAverage =
    reviewCount === 0
      ? 0
      : published.reduce((sum, r) => sum + r.rating, 0) / reviewCount;
  return {
    ...product,
    category: toCategoryRef(product.categoryId),
    images: productImages
      .filter((image) => image.productId === product.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    variants: productVariants
      .filter((variant) => variant.productId === product.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    ratingAverage,
    reviewCount,
  };
}

function activeSummaries(): ProductSummary[] {
  return products.filter((p) => p.status === "active").map(toSummary);
}

function byCreatedAtDesc(a: ProductSummary, b: ProductSummary): number {
  return b.createdAt.localeCompare(a.createdAt);
}

function sortSummaries(
  items: ProductSummary[],
  sort: ProductSort,
): ProductSummary[] {
  const sorted = [...items];
  switch (sort) {
    case "featured":
      return sorted.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) || byCreatedAtDesc(a, b),
      );
    case "newest":
      return sorted.sort(byCreatedAtDesc);
    case "price-asc":
      return sorted.sort((a, b) => a.priceCents - b.priceCents);
    case "price-desc":
      return sorted.sort((a, b) => b.priceCents - a.priceCents);
    case "rating":
      return sorted.sort(
        (a, b) =>
          b.ratingAverage - a.ratingAverage || b.reviewCount - a.reviewCount,
      );
  }
}

function matchesQuery(product: ProductSummary, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;
  return [
    product.name,
    product.shortDescription,
    product.sku,
    product.category.name,
  ].some((field) => field.toLowerCase().includes(needle));
}

function clampPage(page: number | undefined, totalPages: number): number {
  const requested =
    typeof page === "number" && Number.isInteger(page) ? page : 1;
  return Math.min(Math.max(requested, 1), Math.max(totalPages, 1));
}

async function listProducts(
  params: ListProductsParams = {},
): Promise<Paginated<ProductSummary>> {
  await Promise.resolve();
  const {
    category,
    query,
    sort = "featured",
    minPriceCents,
    maxPriceCents,
    inStock,
    page,
    pageSize = DEFAULT_PAGE_SIZE,
  } = params;

  const filtered = activeSummaries().filter((product) => {
    if (category !== undefined && product.category.slug !== category) {
      return false;
    }
    if (query !== undefined && !matchesQuery(product, query)) return false;
    if (minPriceCents !== undefined && product.priceCents < minPriceCents) {
      return false;
    }
    if (maxPriceCents !== undefined && product.priceCents > maxPriceCents) {
      return false;
    }
    if (inStock === true && product.inventory <= 0) return false;
    return true;
  });

  const sorted = sortSummaries(filtered, sort);
  const total = sorted.length;
  const size = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.ceil(total / size);
  const currentPage = clampPage(page, totalPages);
  const start = (currentPage - 1) * size;

  return {
    items: sorted.slice(start, start + size),
    page: currentPage,
    pageSize: size,
    total,
    totalPages,
  };
}

async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  await Promise.resolve();
  const product = products.find(
    (p) => p.slug === slug && p.status === "active",
  );
  if (!product) return null;
  return {
    ...toSummary(product),
    reviews: publishedReviewsFor(product.id).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    ),
  };
}

async function getProductsByIds(ids: string[]): Promise<ProductSummary[]> {
  await Promise.resolve();
  const result: ProductSummary[] = [];
  for (const id of ids) {
    const product = products.find((p) => p.id === id && p.status === "active");
    if (product) result.push(toSummary(product));
  }
  return result;
}

async function getFeaturedProducts(
  limit = DEFAULT_FEATURED_LIMIT,
): Promise<ProductSummary[]> {
  await Promise.resolve();
  return sortSummaries(
    activeSummaries().filter((p) => p.featured),
    "newest",
  ).slice(0, limit);
}

async function getRelatedProducts(
  productId: string,
  limit = DEFAULT_RELATED_LIMIT,
): Promise<ProductSummary[]> {
  await Promise.resolve();
  const source = products.find((p) => p.id === productId);
  if (!source) return [];
  return sortSummaries(
    activeSummaries().filter(
      (p) => p.categoryId === source.categoryId && p.id !== productId,
    ),
    "featured",
  ).slice(0, limit);
}

async function searchSuggestions(
  query: string,
  limit = DEFAULT_SUGGESTION_LIMIT,
): Promise<SearchSuggestion[]> {
  await Promise.resolve();
  const needle = query.trim().toLowerCase();
  if (needle.length < MIN_QUERY_LENGTH) return [];

  const categorySuggestions: SearchSuggestion[] = categories
    .filter((c) => c.name.toLowerCase().includes(needle))
    .map((c) => ({
      type: "category",
      label: c.name,
      href: `/shop/${c.slug}`,
      imageUrl: c.imageUrl,
      priceCents: null,
    }));

  const productSuggestions: SearchSuggestion[] = sortSummaries(
    activeSummaries().filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.sku.toLowerCase().includes(needle),
    ),
    "featured",
  ).map((p) => ({
    type: "product",
    label: p.name,
    href: `/product/${p.slug}`,
    imageUrl: p.images[0]?.url ?? null,
    priceCents: p.priceCents,
  }));

  return [...categorySuggestions, ...productSuggestions].slice(0, limit);
}

async function getPriceRangeCents(): Promise<{
  minCents: number;
  maxCents: number;
}> {
  await Promise.resolve();
  const prices = activeSummaries().map((p) => p.priceCents);
  if (prices.length === 0) return { minCents: 0, maxCents: 0 };
  return { minCents: Math.min(...prices), maxCents: Math.max(...prices) };
}

export const productService = {
  listProducts,
  getProductBySlug,
  getProductsByIds,
  getFeaturedProducts,
  getRelatedProducts,
  searchSuggestions,
  getPriceRangeCents,
};
