"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartLines } from "@/hooks/use-cart-lines";
import { lineKey } from "@/lib/cart";
import { cn } from "@/lib/cn";
import { CartItem } from "./cart-item";
import { CartSummary } from "./cart-summary";
import { DiscountCodeForm } from "./discount-code-form";

interface CartPageContentProps {
  className?: string;
}

const SKELETON_ROWS = 3;

function CartPageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="flex gap-4">
          <Skeleton className="size-24 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CartPageContent({ className }: CartPageContentProps) {
  const { status, lines, totals, refetch } = useCartLines();

  if (status === "idle" || status === "loading") {
    return (
      <div className={className}>
        <CartPageSkeleton />
      </div>
    );
  }

  if (status === "error") {
    return (
      <ErrorState
        title="We couldn't load your cart"
        description="Your items are still saved. Try again in a moment."
        onRetry={refetch}
        className={className}
      />
    );
  }

  if (lines.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-4 rounded-card border border-line bg-surface px-6 py-16 text-center",
          className,
        )}
      >
        <p className="text-lg">Your cart is empty.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button href="/shop" variant="secondary">
            Continue shopping
          </Button>
          {/* `Button` with `href` renders a link, which can't be disabled. */}
          <Button disabled>Go to checkout</Button>
        </div>
      </div>
    );
  }

  const items: ReactNode = (
    <ul className="flex flex-col divide-y divide-line">
      {lines.map((line) => (
        <li key={lineKey(line)} className="py-5 first:pt-0">
          <CartItem line={line} />
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className={cn(
        "grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start",
        className,
      )}
    >
      <section aria-label="Cart items">{items}</section>
      <aside
        aria-label="Order summary"
        className="flex flex-col gap-6 rounded-card border border-line bg-surface p-6"
      >
        <DiscountCodeForm />
        <CartSummary totals={totals} className="border-t border-line pt-6" />
        <div className="flex flex-col gap-2">
          <Button href="/checkout" fullWidth>
            Go to checkout
          </Button>
          <Button href="/shop" variant="secondary" fullWidth>
            Continue shopping
          </Button>
        </div>
      </aside>
    </div>
  );
}
