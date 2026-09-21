import Link from "next/link";
import { ChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export interface BreadcrumbItem {
  label: string;
  /** Omitted for the current page; the last item is never linked. */
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("text-sm text-ink-muted", className)}
    >
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${index}-${item.label}`}
              className="flex items-center gap-1"
            >
              {isLast ? (
                <span aria-current="page" className="text-ink">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="rounded-btn hover:text-ink hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
              {isLast ? null : <ChevronRight className="size-4" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
