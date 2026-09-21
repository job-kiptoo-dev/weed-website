import {
  Breadcrumbs,
  type BreadcrumbItem,
} from "@/components/layout/breadcrumbs";
import { Container } from "@/components/layout/container";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/cn";
import { resultRangeLabel } from "@/lib/result-range";
import {
  buildShopHref,
  SHOP_PAGE_SIZE,
  type ShopQuery,
} from "@/lib/shop-query";
import { categoryService } from "@/services/category.service";
import { productService } from "@/services/product.service";
import type { CategoryWithCount } from "@/types/catalog";
import { ActiveFilterChips } from "./active-filter-chips";
import { ProductFilters } from "./product-filters";
import { ProductGrid } from "./product-grid";
import { ProductSort } from "./product-sort";

interface ShopListingProps {
  query: ShopQuery;
  /** When set, the listing is locked to this category. */
  category?: CategoryWithCount;
  /** Path the filters, sort and pagination links are built on. */
  basePath: string;
  title: string;
  description?: string;
  className?: string;
}

/** The first row of the widest (5-column) grid loads its images eagerly. */
const PRIORITY_IMAGE_COUNT = 5;
const GRID_IMAGE_SIZES =
  "(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw";

/**
 * Home / Shop, then the category when locked to one, then "Page n" past the
 * first page. The last crumb is the current page and is never linked.
 */
function listingCrumbs(
  basePath: string,
  query: ShopQuery,
  page: number,
  category: CategoryWithCount | undefined,
): BreadcrumbItem[] {
  const firstPageHref = buildShopHref(basePath, { ...query, page: 1 });
  const crumbs: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    { label: "Shop", href: category ? "/shop" : firstPageHref },
  ];
  if (category) crumbs.push({ label: category.name, href: firstPageHref });
  if (page > 1) crumbs.push({ label: `Page ${page}` });
  return crumbs;
}

export async function ShopListing({
  query,
  category,
  basePath,
  title,
  description,
  className,
}: ShopListingProps) {
  const [result, categories, priceRange] = await Promise.all([
    productService.listProducts({
      category: category?.slug,
      query: query.q,
      sort: query.sort,
      minPriceCents: query.minPriceCents,
      maxPriceCents: query.maxPriceCents,
      inStock: query.inStock,
      page: query.page,
      pageSize: SHOP_PAGE_SIZE,
    }),
    categoryService.listCategories(),
    productService.getPriceRangeCents(),
  ]);
  const categoryRefs = categories.map(({ id, name, slug }) => ({
    id,
    name,
    slug,
  }));
  /** Remounts the filter form whenever the URL state changes. */
  const queryKey = buildShopHref(basePath, query);

  return (
    <Container className={cn("flex flex-col gap-6 py-8 md:py-10", className)}>
      <Breadcrumbs
        items={listingCrumbs(basePath, query, result.page, category)}
      />

      <header className="flex flex-col gap-3">
        <h1 className="text-4xl tracking-display md:text-5xl">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-lg text-ink-muted">{description}</p>
        ) : null}
      </header>

      <ActiveFilterChips query={query} basePath={basePath} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <p className="text-ink-muted">
          {resultRangeLabel({
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            query: query.q,
          })}
        </p>
        <div className="flex items-center gap-3">
          <ProductFilters
            key={queryKey}
            categories={categoryRefs}
            current={query}
            basePath={basePath}
            lockedCategory={category?.slug}
            priceRange={priceRange}
          />
          <ProductSort
            current={query.sort ?? "featured"}
            basePath={basePath}
            query={query}
          />
        </div>
      </div>

      <ProductGrid
        products={result.items}
        priorityCount={PRIORITY_IMAGE_COUNT}
        imageSizes={GRID_IMAGE_SIZES}
        emptyAction={{ label: "Clear filters", href: basePath }}
        className="md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      />

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        hrefFor={(page) => buildShopHref(basePath, { ...query, page })}
        className="pt-4"
      />
    </Container>
  );
}
