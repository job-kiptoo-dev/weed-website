import Link from "next/link";
import { ChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { CategoryRef, ProductSummary } from "@/types/catalog";
import { ProductGrid } from "./product-grid";

interface CategoryProductRowProps {
  category: CategoryRef;
  products: ProductSummary[];
  className?: string;
}

export function CategoryProductRow({
  category,
  products,
  className,
}: CategoryProductRowProps) {
  if (products.length === 0) return null;

  const headingId = `row-${category.slug}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex flex-col gap-6 py-8 md:py-10", className)}
    >
      <h2 id={headingId} className="text-3xl">
        <Link
          href={`/shop/${category.slug}`}
          className="inline-flex items-center gap-2 rounded-btn text-ink hover:underline"
        >
          {category.name}
          <ChevronRight className="size-6" />
        </Link>
      </h2>
      <ProductGrid
        products={products}
        className="md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4"
        imageSizes="(min-width: 1024px) 25vw, 50vw"
      />
    </section>
  );
}
