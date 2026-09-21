"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { buildShopHref, type ShopQuery } from "@/lib/shop-query";
import type { CategoryRef } from "@/types/catalog";

interface PriceRange {
  minCents: number;
  maxCents: number;
}

interface ProductFiltersProps {
  categories: CategoryRef[];
  current: ShopQuery;
  /** Listing path the filters apply to (`/shop` or `/shop/<category>`). */
  basePath: string;
  /** Category slug on category pages; the category select is shown disabled. */
  lockedCategory?: string;
  priceRange: PriceRange;
  className?: string;
}

/** Form values as typed; converted to cents only on apply. */
interface FilterDraft {
  min: string;
  max: string;
  inStock: boolean;
}

interface FiltersFormProps {
  idPrefix: string;
  categories: CategoryRef[];
  lockedCategory?: string;
  priceRange: PriceRange;
  draft: FilterDraft;
  onDraftChange: (draft: FilterDraft) => void;
  onCategoryChange: (slug: string) => void;
  onApply: () => void;
  onClear: () => void;
}

const CENTS_PER_DOLLAR = 100;

function toDollarsInput(cents: number | undefined): string {
  return cents === undefined ? "" : String(cents / CENTS_PER_DOLLAR);
}

/** Whole-dollar input to cents; blank or invalid values drop the filter. */
function parseDollarsInput(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const dollars = Number(value);
  if (!Number.isFinite(dollars) || dollars < 0) return undefined;
  return Math.round(dollars * CENTS_PER_DOLLAR);
}

function countActiveFilters(query: ShopQuery): number {
  return [
    query.minPriceCents !== undefined,
    query.maxPriceCents !== undefined,
    query.inStock === true,
  ].filter(Boolean).length;
}

function FiltersForm({
  idPrefix,
  categories,
  lockedCategory,
  priceRange,
  draft,
  onDraftChange,
  onCategoryChange,
  onApply,
  onClear,
}: FiltersFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply();
  }

  return (
    <form
      aria-label="Filters"
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
    >
      <Select
        id={`${idPrefix}-category`}
        label="Category"
        value={lockedCategory ?? ""}
        disabled={lockedCategory !== undefined}
        onChange={(event) => onCategoryChange(event.target.value)}
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.slug}>
            {category.name}
          </option>
        ))}
      </Select>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-medium text-ink">
          Price in dollars
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <Input
            id={`${idPrefix}-min`}
            label="Min price"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            placeholder={String(
              Math.floor(priceRange.minCents / CENTS_PER_DOLLAR),
            )}
            value={draft.min}
            onChange={(event) =>
              onDraftChange({ ...draft, min: event.target.value })
            }
          />
          <Input
            id={`${idPrefix}-max`}
            label="Max price"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            placeholder={String(
              Math.ceil(priceRange.maxCents / CENTS_PER_DOLLAR),
            )}
            value={draft.max}
            onChange={(event) =>
              onDraftChange({ ...draft, max: event.target.value })
            }
          />
        </div>
      </fieldset>
      <Checkbox
        id={`${idPrefix}-stock`}
        label="In stock only"
        checked={draft.inStock}
        onChange={(event) =>
          onDraftChange({ ...draft, inStock: event.target.checked })
        }
      />
      <div className="flex gap-3">
        <Button type="submit" className="flex-1">
          Apply
        </Button>
        <Button type="button" variant="secondary" onClick={onClear}>
          Clear
        </Button>
      </div>
    </form>
  );
}

/**
 * Filter controls for the shop listing: a "Filters" button that opens the
 * form in a drawer at every width. Reads the current query from props (never
 * `useSearchParams`) and navigates with `router.push`.
 */
export function ProductFilters({
  categories,
  current,
  basePath,
  lockedCategory,
  priceRange,
  className,
}: ProductFiltersProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>({
    min: toDollarsInput(current.minPriceCents),
    max: toDollarsInput(current.maxPriceCents),
    inStock: current.inStock === true,
  });
  const activeCount = countActiveFilters(current);

  function apply() {
    setDrawerOpen(false);
    router.push(
      buildShopHref(basePath, {
        ...current,
        minPriceCents: parseDollarsInput(draft.min),
        maxPriceCents: parseDollarsInput(draft.max),
        inStock: draft.inStock,
        page: 1,
      }),
    );
  }

  function clear() {
    setDrawerOpen(false);
    router.push(basePath);
  }

  function changeCategory(slug: string) {
    setDrawerOpen(false);
    const target = slug ? `/shop/${slug}` : "/shop";
    router.push(buildShopHref(target, { ...current, page: 1 }));
  }

  const formProps = {
    categories,
    lockedCategory,
    priceRange,
    draft,
    onDraftChange: setDraft,
    onCategoryChange: changeCategory,
    onApply: apply,
    onClear: clear,
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
        className={className}
      >
        {activeCount > 0 ? `Filters (${activeCount})` : "Filters"}
      </Button>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filters"
        side="right"
      >
        <FiltersForm idPrefix="filters" {...formProps} />
      </Drawer>
    </>
  );
}
