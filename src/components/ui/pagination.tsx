import Link from "next/link";
import { cn } from "@/lib/cn";
import { paginationItems } from "@/lib/pagination";
import { ChevronLeft, ChevronRight } from "./icons";
import { VisuallyHidden } from "./visually-hidden";

interface PaginationProps {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  className?: string;
}

const itemClass =
  "inline-flex size-10 items-center justify-center rounded-btn text-sm font-medium";
const numberClass = cn(itemClass, "border border-line");
const idleClass = "bg-surface text-ink hover:bg-brand-soft";
const disabledClass = "text-ink-muted/60";

export function Pagination({
  page,
  totalPages,
  hrefFor,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav aria-label="Pagination" className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          {hasPrevious ? (
            <Link
              href={hrefFor(page - 1)}
              aria-label="Previous page"
              className={cn(itemClass, "text-ink hover:bg-brand-soft")}
            >
              <ChevronLeft />
            </Link>
          ) : (
            <span aria-disabled="true" className={cn(itemClass, disabledClass)}>
              <ChevronLeft />
              <VisuallyHidden>Previous page</VisuallyHidden>
            </span>
          )}
        </li>
        {paginationItems(page, totalPages).map((item, index) =>
          item === "ellipsis" ? (
            <li
              key={`ellipsis-${index}`}
              aria-hidden="true"
              className={cn(itemClass, "text-ink-muted")}
            >
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefFor(item)}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  numberClass,
                  item === page
                    ? "border-brand bg-brand text-on-brand"
                    : idleClass,
                )}
              >
                {item}
              </Link>
            </li>
          ),
        )}
        <li>
          {hasNext ? (
            <Link
              href={hrefFor(page + 1)}
              aria-label="Next page"
              className={cn(itemClass, "text-ink hover:bg-brand-soft")}
            >
              <ChevronRight />
            </Link>
          ) : (
            <span aria-disabled="true" className={cn(itemClass, disabledClass)}>
              <ChevronRight />
              <VisuallyHidden>Next page</VisuallyHidden>
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
