"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import type { ProductVariant } from "@/types/catalog";

interface VariantSelectorProps {
  variants: ProductVariant[];
  value: string;
  onChange: (id: string) => void;
  legend?: string;
  className?: string;
}

const chipClass =
  "inline-flex h-10 cursor-pointer items-center rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-brand-soft peer-checked:border-brand peer-checked:bg-brand-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-strong peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-disabled:hover:bg-surface";

export function VariantSelector({
  variants,
  value,
  onChange,
  legend = "Strength",
  className,
}: VariantSelectorProps) {
  const groupName = useId();

  return (
    <fieldset className={cn("flex flex-col gap-3", className)}>
      <legend className="mb-3 text-sm font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const id = `${groupName}-${variant.id}`;
          const outOfStock = variant.inventory <= 0;
          return (
            <div key={variant.id}>
              <input
                type="radio"
                id={id}
                name={groupName}
                value={variant.id}
                checked={variant.id === value}
                disabled={outOfStock}
                onChange={() => onChange(variant.id)}
                className="peer sr-only"
              />
              <label htmlFor={id} className={chipClass}>
                {outOfStock ? `${variant.name} (out of stock)` : variant.name}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
