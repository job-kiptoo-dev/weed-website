import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "@/components/layout/providers";
import { __resetCartStore } from "@/hooks/use-cart";
import { SHOP_PAGE_SIZE, type ShopQuery } from "@/lib/shop-query";
import { categoryService } from "@/services/category.service";
import { productService } from "@/services/product.service";
import { makeProduct } from "@/test/catalog-fixtures";
import type {
  CategoryWithCount,
  ListProductsParams,
  Paginated,
  ProductSummary,
} from "@/types/catalog";
import { ShopListing } from "./shop-listing";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

/** 25 fixture products: two pages at the shop page size of 20. */
const PRODUCTS: ProductSummary[] = Array.from({ length: 25 }, (_, i) =>
  makeProduct({
    id: `prod_test-${i + 1}`,
    slug: `test-product-${i + 1}`,
    name: `Test product ${i + 1}`,
    sku: `TEST-${i + 1}`,
    priceCents: 1000 + i * 100,
  }),
);

const CATEGORIES: CategoryWithCount[] = [
  {
    id: "cat_tinctures",
    name: "Tinctures",
    slug: "tinctures",
    description: "Oils and tinctures.",
    imageUrl: "/images/categories/tinctures.jpg",
    sortOrder: 1,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    productCount: PRODUCTS.length,
  },
];

function paginate({
  page = 1,
  pageSize = 12,
}: ListProductsParams = {}): Paginated<ProductSummary> {
  const total = PRODUCTS.length;
  const totalPages = Math.ceil(total / pageSize);
  const current = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
  const start = (current - 1) * pageSize;
  return {
    items: PRODUCTS.slice(start, start + pageSize),
    page: current,
    pageSize,
    total,
    totalPages,
  };
}

vi.mock("@/services/product.service", () => ({
  productService: {
    listProducts: vi.fn(async (params?: ListProductsParams) =>
      paginate(params),
    ),
    getPriceRangeCents: vi.fn(async () => ({ minCents: 1000, maxCents: 3400 })),
  },
}));

vi.mock("@/services/category.service", () => ({
  categoryService: { listCategories: vi.fn(async () => CATEGORIES) },
}));

/** `ShopListing` is an async Server Component: resolve it, then render. */
async function renderListing(
  props: Omit<Parameters<typeof ShopListing>[0], "title"> & { title?: string },
) {
  const element = await ShopListing({ title: "Shop", ...props });
  return render(<Providers>{element}</Providers>);
}

function crumbTexts(): string[] {
  const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
  return within(nav)
    .getAllByRole("listitem")
    .map((item) => item.textContent ?? "");
}

describe("ShopListing", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetCartStore();
  });

  it("shows the first page of 20 with the range, toolbar and pagination", async () => {
    const { total } = await productService.listProducts({ pageSize: 1 });
    const firstEnd = Math.min(SHOP_PAGE_SIZE, total);
    await renderListing({ query: {}, basePath: "/shop" });

    expect(crumbTexts()).toEqual(["Home", "Shop"]);
    expect(
      screen.getByRole("heading", { level: 1, name: "Shop" }),
    ).toBeTruthy();
    expect(
      screen.getByText(`Showing 1–${firstEnd} of ${total} results`),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy();
    expect(
      (screen.getByLabelText("Sort by") as HTMLSelectElement).selectedOptions[0]
        ?.textContent,
    ).toBe("Default sorting");
    expect(screen.getAllByRole("article")).toHaveLength(firstEnd);
    expect(screen.queryByRole("list", { name: "Active filters" })).toBeNull();
  });

  it("adds a Page n crumb past the first page", async () => {
    const { total, totalPages } = await productService.listProducts({
      pageSize: SHOP_PAGE_SIZE,
    });
    expect(totalPages, "the catalog must span two pages").toBeGreaterThan(1);
    const secondEnd = Math.min(2 * SHOP_PAGE_SIZE, total);
    await renderListing({ query: { page: 2 }, basePath: "/shop" });

    expect(crumbTexts()).toEqual(["Home", "Shop", "Page 2"]);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(
      within(nav).getByRole("link", { name: "Shop" }).getAttribute("href"),
    ).toBe("/shop");
    expect(
      screen.getByText(
        `Showing ${SHOP_PAGE_SIZE + 1}–${secondEnd} of ${total} results`,
      ),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("navigation", { name: "Pagination" })
        .querySelector('[aria-current="page"]')?.textContent,
    ).toBe("2");
  });

  it("locks to a category and shows active filter chips", async () => {
    const [category] = await categoryService.listCategories();
    if (!category) throw new Error("The catalog has no categories.");
    const query: ShopQuery = { minPriceCents: 2000, inStock: true };
    const basePath = `/shop/${category.slug}`;
    await renderListing({
      query,
      category,
      basePath,
      title: category.name,
    });

    expect(crumbTexts()).toEqual(["Home", "Shop", category.name]);
    expect(
      screen.getByRole("heading", { level: 1, name: category.name }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Remove filter: From $20" })
        .getAttribute("href"),
    ).toBe(`${basePath}?stock=1`);
    expect(
      screen
        .getByRole("link", { name: "Remove filter: In stock only" })
        .getAttribute("href"),
    ).toBe(`${basePath}?min=20`);
    expect(screen.getByRole("button", { name: "Filters (2)" })).toBeTruthy();
  });
});
