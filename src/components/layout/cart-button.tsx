"use client";

import { Cart } from "@/components/ui/icons";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/cn";

interface CartButtonProps {
  className?: string;
}

export function CartButton({ className }: CartButtonProps) {
  const { itemCount, openDrawer } = useCart();
  const label = `Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`;

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={label}
      className={cn(
        "relative inline-flex size-11 items-center justify-center rounded-btn text-on-brand hover:bg-white/10",
        className,
      )}
    >
      <Cart />
      {itemCount > 0 ? (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-sm leading-none font-medium text-on-accent tabular-nums"
        >
          {itemCount}
        </span>
      ) : null}
    </button>
  );
}
