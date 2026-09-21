import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { cn } from "@/lib/cn";

interface ShopListingSkeletonProps {
  className?: string;
}

/** Two rows of the widest (5-column) grid. */
const CARD_COUNT = 10;

export function ShopListingSkeleton({ className }: ShopListingSkeletonProps) {
  return (
    <Container
      className={cn("flex flex-col gap-6 py-8 md:py-10", className)}
      aria-busy="true"
    >
      <VisuallyHidden>Loading products</VisuallyHidden>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-12 w-64 max-w-full" />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <Skeleton className="h-6 w-56 max-w-full" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-24" />
          <Skeleton className="h-11 w-52" />
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: CARD_COUNT }, (_, index) => (
          <li
            key={index}
            className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface p-3"
          >
            <Skeleton className="aspect-square w-full rounded-btn" />
            <Skeleton className="mt-1 h-4 w-1/3" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="mt-2 h-9 w-full rounded-btn" />
          </li>
        ))}
      </ul>
    </Container>
  );
}
