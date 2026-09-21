import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import type { CartTotals } from "@/types/cart";

interface CartSummaryProps {
  totals: CartTotals;
  compact?: boolean;
  className?: string;
}

export function CartSummary({
  totals,
  compact = false,
  className,
}: CartSummaryProps) {
  const rowClass = "flex items-center justify-between gap-4";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <dl
        className={cn("flex flex-col gap-2", compact ? "text-sm" : "text-base")}
      >
        <div className={rowClass}>
          <dt className="text-ink-muted">Subtotal</dt>
          <dd className="tabular-nums">{formatMoney(totals.subtotalCents)}</dd>
        </div>
        <div className={rowClass}>
          <dt className="text-ink-muted">Shipping</dt>
          <dd className="tabular-nums">
            {totals.shippingCents === 0
              ? "Free"
              : formatMoney(totals.shippingCents)}
          </dd>
        </div>
        <div
          className={cn(
            rowClass,
            "border-t border-line pt-2 font-medium",
            compact ? "text-base" : "text-lg",
          )}
        >
          <dt>Total</dt>
          <dd className="tabular-nums">{formatMoney(totals.totalCents)}</dd>
        </div>
      </dl>
      {totals.freeShippingRemainingCents > 0 ? (
        <p className="text-sm text-success">
          Add {formatMoney(totals.freeShippingRemainingCents)} more for free
          shipping.
        </p>
      ) : null}
      <p className="text-sm text-ink-muted">Taxes calculated at checkout.</p>
    </div>
  );
}
