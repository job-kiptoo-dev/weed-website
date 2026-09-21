"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { buildShopHref, type ShopQuery } from "@/lib/shop-query";
import type { ProductSort as ProductSortValue } from "@/services/product.service";

interface ProductSortProps {
  current: ProductSortValue;
  /** Listing path the sort applies to (`/shop` or `/shop/<category>`). */
  basePath: string;
  /** Current URL state; every option keeps it and resets the page to 1. */
  query: ShopQuery;
  className?: string;
}

const SORT_OPTIONS: { value: ProductSortValue; label: string }[] = [
  { value: "featured", label: "Default sorting" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
];

function isSortValue(value: string): value is ProductSortValue {
  return SORT_OPTIONS.some((option) => option.value === value);
}

export function ProductSort({
  current,
  basePath,
  query,
  className,
}: ProductSortProps) {
  const router = useRouter();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const { value } = event.target;
    if (!isSortValue(value)) return;
    router.push(buildShopHref(basePath, { ...query, sort: value, page: 1 }));
  }

  return (
    <Select
      id="product-sort"
      label="Sort by"
      value={current}
      onChange={handleChange}
      // The label stays in the DOM for assistive tech; the options say enough.
      className={cn("w-52 [&>label]:sr-only", className)}
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
