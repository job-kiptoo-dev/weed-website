"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { siteConfig, type CheckoutTaxRates } from "@/lib/site-config";
import type { OrderIssue, OrderQuote, OrderQuoteLine } from "@/types/order";

/** Where the quote request stands; the browser never prices anything itself. */
export type QuoteStatus = "loading" | "ready" | "error";

interface OrderSummaryProps {
  /** The last server quote, or null before the first one arrives. */
  quote: OrderQuote | null;
  status: QuoteStatus;
  errorMessage?: string | null;
  onRetry?: () => void;
  /** Defaults to the configured rates; a row shows only when its rate is set. */
  taxes?: CheckoutTaxRates;
  /** The order-type radios, rendered between Subtotal and the tax rows. */
  children?: ReactNode;
  className?: string;
}

const SKELETON_ROWS = 3;

/** A coupon rejection prices the order anyway; anything else blocks it. */
export function isBlockingIssue(issue: OrderIssue): boolean {
  return issue.kind !== "invalid_coupon";
}

export function describeOrderIssue(issue: OrderIssue): string {
  switch (issue.kind) {
    case "out_of_stock":
      return `${issue.label} is out of stock and has been removed.`;
    case "unavailable":
      return `${issue.label} is no longer available and has been removed.`;
    case "invalid_coupon":
      return `Coupon ${issue.label} couldn't be applied.`;
  }
}

function lineKey(line: OrderQuoteLine): string {
  return `${line.productId}:${line.variantId ?? "base"}`;
}

function SummaryRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3",
        emphasis && "text-lg font-medium",
      )}
    >
      <dt className={emphasis ? "text-ink" : "text-ink-muted"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * The server-priced order. Every number here comes from `OrderQuote`; this
 * component adds nothing up. Totals sit in a polite live region so switching
 * delivery to pickup, or a coupon landing, is announced.
 */
export function OrderSummary({
  quote,
  status,
  errorMessage,
  onRetry,
  taxes = siteConfig.checkout.taxes,
  children,
  className,
}: OrderSummaryProps) {
  const blocking = quote?.issues.filter(isBlockingIssue) ?? [];

  return (
    <section
      aria-labelledby="checkout-summary-heading"
      className={cn(
        "flex flex-col gap-4 rounded-card border border-line bg-surface p-5 sm:p-6",
        className,
      )}
    >
      <h2 id="checkout-summary-heading" className="text-2xl">
        Your order
      </h2>

      {status === "error" ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-danger">
            {errorMessage ?? "We couldn't price your order."}
            {quote ? " The totals below may be out of date." : null}
          </p>
          {onRetry ? (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}

      {quote === null ? (
        status === "error" ? null : (
          <div className="flex flex-col gap-3" aria-busy="true">
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="size-14 shrink-0" />
                <Skeleton className="h-5 flex-1" />
              </div>
            ))}
            <Skeleton className="h-40" />
          </div>
        )
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-line">
            {quote.lines.map((line) => (
              <li key={lineKey(line)} className="flex items-center gap-3 py-3">
                <span className="shrink-0 overflow-hidden rounded-card border border-line bg-brand-soft">
                  {line.imageUrl ? (
                    <Image
                      src={line.imageUrl}
                      alt=""
                      width={56}
                      height={56}
                      sizes="56px"
                      className="size-14 object-cover"
                    />
                  ) : (
                    <span className="block size-14" />
                  )}
                </span>
                <span className="flex-1 text-sm">
                  {line.productName}
                  {line.variantName ? ` - ${line.variantName}` : ""}
                  <span className="text-ink-muted"> × {line.quantity}</span>
                </span>
                <span className="text-sm tabular-nums">
                  {formatMoney(line.lineTotalCents)}
                </span>
              </li>
            ))}
          </ul>

          {quote.issues.length > 0 ? (
            <div
              role="alert"
              className="flex flex-col gap-1 rounded-card border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger"
            >
              {quote.issues.map((issue) => (
                <p key={`${issue.kind}:${issue.label}`}>
                  {describeOrderIssue(issue)}
                </p>
              ))}
              {blocking.length > 0 ? (
                <p>Update your cart to continue.</p>
              ) : null}
            </div>
          ) : null}

          <div
            aria-live="polite"
            aria-busy={status === "loading" ? true : undefined}
            className="rounded-card border border-line"
          >
            <dl>
              <SummaryRow
                label="Subtotal"
                value={formatMoney(quote.totals.subtotalCents)}
              />
            </dl>
            {children}
            <dl className="border-t border-line">
              {/* Server values, shown only when there is something to show:
                  no invented rows, and the rows always add up to Total. */}
              {quote.totals.discountCents > 0 ? (
                <SummaryRow
                  label={
                    quote.discountCode
                      ? `Discount (${quote.discountCode})`
                      : "Discount"
                  }
                  value={`-${formatMoney(quote.totals.discountCents)}`}
                />
              ) : null}
              {quote.totals.shippingCents > 0 ? (
                <SummaryRow
                  label="Delivery"
                  value={formatMoney(quote.totals.shippingCents)}
                />
              ) : null}
              {taxes.excisePercent > 0 ? (
                <SummaryRow
                  label="Excise Tax"
                  value={formatMoney(quote.totals.exciseTaxCents)}
                />
              ) : null}
              {taxes.salesPercent > 0 ? (
                <SummaryRow
                  label="Sales Tax"
                  value={formatMoney(quote.totals.salesTaxCents)}
                />
              ) : null}
              <SummaryRow
                label="Total"
                value={formatMoney(quote.totals.totalCents)}
                emphasis
              />
            </dl>
          </div>
        </>
      )}
    </section>
  );
}
