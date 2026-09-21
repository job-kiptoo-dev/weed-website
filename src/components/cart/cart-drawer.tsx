"use client";

import type { MouseEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import { useCartLines } from "@/hooks/use-cart-lines";
import { lineKey } from "@/lib/cart";
import { CartItem } from "./cart-item";
import { CartSummary } from "./cart-summary";

const SKELETON_ROWS = 2;

function CartSkeletonRow() {
  return (
    <div className="flex gap-4">
      <Skeleton className="size-20 shrink-0" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <CartSkeletonRow key={index} />
      ))}
    </div>
  );
}

export function CartDrawer() {
  const { isDrawerOpen, closeDrawer, lines: cartLines } = useCart();
  const { status, lines, totals, refetch } = useCartLines();
  /**
   * While a refetch runs (for example after adding a new product), the lines
   * priced by the previous response stay on screen; only the lines still
   * waiting for a price show as skeleton rows.
   */
  const refreshing = status === "loading" && lines.length > 0;
  const pending = refreshing ? Math.max(0, cartLines.length - lines.length) : 0;

  let content: ReactNode;
  if (status === "idle" || (status === "loading" && !refreshing)) {
    content = <CartSkeleton />;
  } else if (status === "error") {
    content = (
      <ErrorState
        title="We couldn't load your cart"
        description="Your items are still saved. Try again in a moment."
        onRetry={refetch}
      />
    );
  } else if (lines.length === 0) {
    content = (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-lg">Your cart is empty.</p>
        <Button href="/shop" variant="secondary">
          Continue shopping
        </Button>
      </div>
    );
  } else {
    content = (
      <div className="flex h-full flex-col gap-6">
        <ul className="flex flex-col divide-y divide-line">
          {lines.map((line) => (
            <li key={lineKey(line)} className="py-4 first:pt-0">
              <CartItem line={line} compact />
            </li>
          ))}
          {Array.from({ length: pending }, (_, index) => (
            <li key={`pending-${index}`} className="py-4" aria-busy="true">
              <CartSkeletonRow />
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-col gap-4 border-t border-line pt-4">
          <div className="flex flex-col gap-2">
            {/* Always mounted so screen readers announce the change. */}
            <p aria-live="polite" className="text-sm text-ink-muted">
              {refreshing ? "Updating total" : ""}
            </p>
            <CartSummary totals={totals} compact />
          </div>
          <div className="flex flex-col gap-2">
            <Button href="/checkout" fullWidth>
              Go to checkout
            </Button>
            <Button href="/cart" variant="secondary" fullWidth>
              View cart
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /** Any link inside the drawer navigates away, so close it as it is followed. */
  function handleContentClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("a")) {
      closeDrawer();
    }
  }

  return (
    <Drawer open={isDrawerOpen} onClose={closeDrawer} title="Your cart">
      <div className="h-full" onClick={handleContentClick}>
        {content}
      </div>
    </Drawer>
  );
}
