/**
 * Row -> view-type mapping for the catalog services. Database rows carry
 * `Date` timestamps and wide integer types; the view types in
 * `@/types/catalog` use ISO strings and narrowed ratings. `search_vector`
 * is never selected, so no row type here includes it.
 */
import type {
  categories,
  productImages,
  products,
  productVariants,
  reviews,
} from "@/lib/db/schema";
import type {
  Category,
  CategoryRef,
  CategoryWithCount,
  Product,
  ProductDetail,
  ProductImage,
  ProductSummary,
  ProductVariant,
  Review,
} from "@/types/catalog";

export type CategoryRow = Omit<typeof categories.$inferSelect, "searchVector">;
export type ProductRow = Omit<typeof products.$inferSelect, "searchVector">;
export type ProductImageRow = typeof productImages.$inferSelect;
export type ProductVariantRow = typeof productVariants.$inferSelect;
export type ReviewRow = typeof reviews.$inferSelect;

export interface RatingStats {
  ratingAverage: number;
  reviewCount: number;
}

export const NO_RATINGS: RatingStats = { ratingAverage: 0, reviewCount: 0 };

export function toIso(date: Date): string {
  return date.toISOString();
}

/** Narrows a stored rating; the database check keeps it in 1..5. */
export function toRating(value: number): Review["rating"] {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) {
    return value;
  }
  throw new Error(`catalog.mappers: rating out of range (${value})`);
}

export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.imageUrl,
    sortOrder: row.sortOrder,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function toCategoryWithCount(
  row: CategoryRow,
  productCount: number,
): CategoryWithCount {
  return { ...toCategory(row), productCount };
}

export function toCategoryRef(
  row: Pick<CategoryRow, "id" | "name" | "slug">,
): CategoryRef {
  return { id: row.id, name: row.name, slug: row.slug };
}

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    shortDescription: row.shortDescription,
    priceCents: row.priceCents,
    compareAtPriceCents: row.compareAtPriceCents,
    sku: row.sku,
    categoryId: row.categoryId,
    inventory: row.inventory,
    status: row.status,
    featured: row.featured,
    specs: row.specs,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function toProductImage(row: ProductImageRow): ProductImage {
  return {
    id: row.id,
    productId: row.productId,
    url: row.url,
    alt: row.alt,
    sortOrder: row.sortOrder,
  };
}

/** `priceCents` null means "use the product price" and passes through. */
export function toProductVariant(row: ProductVariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.productId,
    name: row.name,
    sku: row.sku,
    priceCents: row.priceCents,
    inventory: row.inventory,
    sortOrder: row.sortOrder,
    isDefault: row.isDefault,
  };
}

export function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    productId: row.productId,
    userId: row.userId,
    authorName: row.authorName,
    rating: toRating(row.rating),
    title: row.title,
    body: row.body,
    status: row.status,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** Rating aggregate over already-filtered (published) reviews. */
export function toRatingStats(
  reviews: readonly Pick<Review, "rating">[],
): RatingStats {
  if (reviews.length === 0) return NO_RATINGS;
  const sum = reviews.reduce((total, review) => total + review.rating, 0);
  return { ratingAverage: sum / reviews.length, reviewCount: reviews.length };
}

/** A product row with its relations, as the relational queries return it. */
export interface ProductWithRelationsRow extends ProductRow {
  category: Pick<CategoryRow, "id" | "name" | "slug">;
  images: ProductImageRow[];
  variants: ProductVariantRow[];
}

/** Images and variants must already be ordered by `sort_order`. */
export function toProductSummary(
  row: ProductWithRelationsRow,
  stats: RatingStats,
): ProductSummary {
  return {
    ...toProduct(row),
    category: toCategoryRef(row.category),
    images: row.images.map(toProductImage),
    variants: row.variants.map(toProductVariant),
    ratingAverage: stats.ratingAverage,
    reviewCount: stats.reviewCount,
  };
}

/** Reviews must already be published-only and ordered newest first. */
export function toProductDetail(
  row: ProductWithRelationsRow & { reviews: ReviewRow[] },
): ProductDetail {
  const reviews = row.reviews.map(toReview);
  return { ...toProductSummary(row, toRatingStats(reviews)), reviews };
}
