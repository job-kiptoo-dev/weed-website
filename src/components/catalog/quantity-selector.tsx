"use client";

import { useState, type ChangeEvent } from "react";
import { Minus, Plus } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/lib/site-config";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  id: string;
  min?: number;
  max?: number;
  label?: string;
  /** Visually hide the label (it stays available to assistive tech). */
  labelHidden?: boolean;
  disabled?: boolean;
  className?: string;
}

const iconButtonClass =
  "inline-flex size-9 shrink-0 items-center justify-center text-ink hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40";

export function QuantitySelector({
  value,
  onChange,
  id,
  min = 1,
  max = siteConfig.cart.maxQuantityPerLine,
  label = "Quantity",
  labelHidden = false,
  disabled = false,
  className,
}: QuantitySelectorProps) {
  /** Raw text while the user is typing; `null` means "show `value`". */
  const [draft, setDraft] = useState<string | null>(null);

  function clamp(next: number): number {
    return Math.min(Math.max(next, min), max);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    setDraft(raw);
    if (/^\d+$/.test(raw)) onChange(clamp(Number(raw)));
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className={cn("text-sm font-medium text-ink", labelHidden && "sr-only")}
      >
        {label}
      </label>
      <div className="inline-flex h-10 w-fit items-center overflow-hidden rounded-input border border-line-strong bg-surface">
        <button
          type="button"
          aria-label="Decrease quantity"
          disabled={disabled || value <= min}
          onClick={() => onChange(clamp(value - 1))}
          className={iconButtonClass}
        >
          <Minus className="size-4" />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft ?? String(value)}
          min={min}
          max={max}
          disabled={disabled}
          onChange={handleChange}
          onBlur={() => setDraft(null)}
          className="h-full w-12 border-x border-line bg-surface text-center text-base text-ink tabular-nums disabled:opacity-60"
        />
        <button
          type="button"
          aria-label="Increase quantity"
          disabled={disabled || value >= max}
          onClick={() => onChange(clamp(value + 1))}
          className={iconButtonClass}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
