export type ProductStatus = "draft" | "active" | "archived";
export type Spectrum = "full" | "broad" | "isolate";
export type ReviewStatus = "published" | "hidden";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  alt: string;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  priceCents: number | null;
  inventory: number;
  sortOrder: number;
  isDefault: boolean;
}

export interface ProductSpecs {
  strengthMg: number;
  spectrum: Spectrum;
  labTested: boolean;
  servingSize: string;
  ingredients: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  sku: string;
  categoryId: string;
  inventory: number;
  status: ProductStatus;
  featured: boolean;
  specs: ProductSpecs | null;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  /** Null for reviews with no account behind them (historical seed reviews). */
  userId: string | null;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

/* View types returned by services (what components consume) */
export type CategoryRef = Pick<Category, "id" | "name" | "slug">;

export interface CategoryWithCount extends Category {
  productCount: number;
}

export interface ProductSummary extends Product {
  category: CategoryRef;
  images: ProductImage[];
  variants: ProductVariant[];
  ratingAverage: number;
  reviewCount: number;
}

export interface ProductDetail extends ProductSummary {
  reviews: Review[];
}

export interface SearchSuggestion {
  type: "product" | "category";
  label: string;
  href: string;
  imageUrl: string | null;
  priceCents: number | null;
}

/* Service query and result shapes (shared with URL parsing and UI). */
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
