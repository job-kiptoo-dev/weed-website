import Link from "next/link";
import { Close } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { buildShopHref, type ShopQuery } from "@/lib/shop-query";

interface ActiveFilterChipsProps {
  query: ShopQuery;
  /** Listing path the chips link back to (`/shop` or `/shop/<category>`). */
  basePath: string;
  className?: string;
}

interface Chip {
  label: string;
  href: string;
}

const CENTS_PER_DOLLAR = 100;

/** Whole dollars read as "$20"; anything else falls back to "$19.50". */
function dollars(cents: number): string {
  return cents % CENTS_PER_DOLLAR === 0
    ? `$${cents / CENTS_PER_DOLLAR}`
    : formatMoney(cents);
}

/** One chip per active filter param; each link drops only that param. */
function activeChips(query: ShopQuery, basePath: string): Chip[] {
  const without = (patch: Partial<ShopQuery>) =>
    buildShopHref(basePath, { ...query, ...patch, page: 1 });
  const chips: Chip[] = [];
  if (query.q) {
    chips.push({
      label: `Search: ${query.q}`,
      href: without({ q: undefined }),
    });
  }
  if (query.minPriceCents !== undefined) {
    chips.push({
      label: `From ${dollars(query.minPriceCents)}`,
      href: without({ minPriceCents: undefined }),
    });
  }
  if (query.maxPriceCents !== undefined) {
    chips.push({
      label: `Up to ${dollars(query.maxPriceCents)}`,
      href: without({ maxPriceCents: undefined }),
    });
  }
  if (query.inStock) {
    chips.push({
      label: "In stock only",
      href: without({ inStock: undefined }),
    });
  }
  return chips;
}

const chipClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm text-ink hover:bg-brand-soft";

export function ActiveFilterChips({
  query,
  basePath,
  className,
}: ActiveFilterChipsProps) {
  const chips = activeChips(query, basePath);
  if (chips.length === 0) return null;

  return (
    <ul
      aria-label="Active filters"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {chips.map((chip) => (
        <li key={chip.label}>
          <Link
            href={chip.href}
            aria-label={`Remove filter: ${chip.label}`}
            className={chipClass}
          >
            {chip.label}
            <Close className="size-4 text-ink-muted" />
          </Link>
        </li>
      ))}
      <li>
        <Link
          href={basePath}
          className="inline-flex h-9 items-center rounded-btn px-2 text-sm font-medium text-ink underline underline-offset-4 hover:text-accent-strong"
        >
          Clear all
        </Link>
      </li>
    </ul>
  );
}
