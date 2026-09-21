import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import type { ProductSummary } from "@/types/catalog";
import { ProductCard } from "./product-card";

interface ProductGridProps {
  products: ProductSummary[];
  emptyAction?: { label: string; href: string };
  /** Number of leading cards whose image loads with priority (above the fold). */
  priorityCount?: number;
  /** `sizes` passed to every card image. */
  imageSizes?: string;
  className?: string;
}

const EMPTY_CATALOG_COPY = "Nothing here yet. Try another category or search.";

export function ProductGrid({
  products,
  emptyAction,
  priorityCount = 0,
  imageSizes,
  className,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        title={EMPTY_CATALOG_COPY}
        action={emptyAction}
        className={className}
      />
    );
  }

  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4",
        className,
      )}
    >
      {products.map((product, index) => (
        <li key={product.id} className="min-w-0">
          <ProductCard
            product={product}
            priority={index < priorityCount}
            imageSizes={imageSizes}
          />
        </li>
      ))}
    </ul>
  );
}
