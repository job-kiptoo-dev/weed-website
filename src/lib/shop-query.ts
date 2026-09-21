import type { ProductSort } from "@/services/product.service";

export interface ShopQuery {
  q?: string;
  sort?: ProductSort;
  minPriceCents?: number;
  maxPriceCents?: number;
  inStock?: boolean;
  page?: number;
}

/** Products per page on `/shop` and `/shop/<category>`. */
export const SHOP_PAGE_SIZE = 20;

type SearchParamsRecord = Record<string, string | string[] | undefined>;

const SORT_VALUES: readonly ProductSort[] = [
  "featured",
  "newest",
  "price-asc",
  "price-desc",
  "rating",
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isProductSort(value: string): value is ProductSort {
  return (SORT_VALUES as readonly string[]).includes(value);
}

function parseDollars(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const dollars = Number(value);
  if (!Number.isFinite(dollars) || dollars < 0) return undefined;
  return Math.round(dollars * 100);
}

function parsePage(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const page = Number(value);
  if (!Number.isInteger(page) || page < 1) return undefined;
  return page;
}

/** Reads shop URL params. Invalid values are dropped rather than thrown. */
export function parseShopQuery(sp: SearchParamsRecord): ShopQuery {
  const query: ShopQuery = {};

  const q = first(sp.q)?.trim();
  if (q) query.q = q;

  const sort = first(sp.sort);
  if (sort !== undefined && isProductSort(sort)) query.sort = sort;

  const min = parseDollars(first(sp.min));
  if (min !== undefined) query.minPriceCents = min;

  const max = parseDollars(first(sp.max));
  if (max !== undefined) query.maxPriceCents = max;

  if (first(sp.stock) === "1") query.inStock = true;

  const page = parsePage(first(sp.page));
  if (page !== undefined) query.page = page;

  return query;
}

/** Builds a shop URL from a base path and query; omits defaults. */
export function buildShopHref(base: string, q: Partial<ShopQuery>): string {
  const params = new URLSearchParams();
  if (q.q) params.set("q", q.q);
  if (q.sort && q.sort !== "featured") params.set("sort", q.sort);
  if (q.minPriceCents !== undefined) {
    params.set("min", String(q.minPriceCents / 100));
  }
  if (q.maxPriceCents !== undefined) {
    params.set("max", String(q.maxPriceCents / 100));
  }
  if (q.inStock) params.set("stock", "1");
  if (q.page !== undefined && q.page > 1) params.set("page", String(q.page));
  const search = params.toString();
  return search ? `${base}?${search}` : base;
}
