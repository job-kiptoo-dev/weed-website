import Image from "next/image";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import {
  PAYMENT_METHOD_PRESETS,
  resolvePaymentInstructions,
} from "@/lib/payment-methods";
import { siteConfig } from "@/lib/site-config";
import type { OrderRecord } from "@/types/order";

interface ConfirmationSummaryProps {
  order: OrderRecord;
  className?: string;
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
 * The placed order as stored: items and every money value come straight from
 * the `orders` row, never re-priced here, so the page always shows what was
 * actually recorded. A row renders only when its stored value is above zero,
 * matching the checkout summary, so the rows on screen always add up to Total.
 *
 * Server Component on purpose: the checkout summary is a client component
 * built from a live quote, which is a different shape and has no place here.
 */
export function ConfirmationSummary({
  order,
  className,
}: ConfirmationSummaryProps) {
  const meta = order.checkoutMeta;
  // Orders placed before `checkout_meta` existed have no tax split and no
  // stored method; fall back to the summed `tax_cents` so Total still adds up.
  const exciseTaxCents = meta?.exciseTaxCents ?? 0;
  const salesTaxCents = meta?.salesTaxCents ?? 0;
  const splitTaxCents = exciseTaxCents + salesTaxCents;
  const unsplitTaxCents = order.taxCents - splitTaxCents;
  const method = meta
    ? (siteConfig.checkout.paymentMethods.find(
        (candidate) => candidate.id === meta.paymentMethod,
      ) ?? PAYMENT_METHOD_PRESETS[meta.paymentMethod])
    : null;

  return (
    <section
      aria-labelledby="confirmation-summary-heading"
      className={cn(
        "flex flex-col gap-4 rounded-card border border-line bg-surface p-5 sm:p-6",
        className,
      )}
    >
      <h2 id="confirmation-summary-heading" className="text-2xl">
        Your order
      </h2>

      <ul className="flex flex-col divide-y divide-line">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-3">
            <span className="shrink-0 overflow-hidden rounded-card border border-line bg-brand-soft">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
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
              {item.productName}
              {item.variantName ? ` - ${item.variantName}` : ""}
              <span className="text-ink-muted"> × {item.quantity}</span>
            </span>
            <span className="text-sm tabular-nums">
              {formatMoney(item.totalCents)}
            </span>
          </li>
        ))}
      </ul>

      <div className="rounded-card border border-line">
        <dl>
          <SummaryRow
            label="Subtotal"
            value={formatMoney(order.subtotalCents)}
          />
          {order.discountCents > 0 ? (
            <SummaryRow
              label={
                order.discountCode
                  ? `Discount (${order.discountCode})`
                  : "Discount"
              }
              value={`-${formatMoney(order.discountCents)}`}
            />
          ) : null}
          {order.shippingCents > 0 ? (
            <SummaryRow
              label="Delivery"
              value={formatMoney(order.shippingCents)}
            />
          ) : null}
          {exciseTaxCents > 0 ? (
            <SummaryRow
              label="Excise Tax"
              value={formatMoney(exciseTaxCents)}
            />
          ) : null}
          {salesTaxCents > 0 ? (
            <SummaryRow label="Sales Tax" value={formatMoney(salesTaxCents)} />
          ) : null}
          {unsplitTaxCents > 0 ? (
            <SummaryRow label="Tax" value={formatMoney(unsplitTaxCents)} />
          ) : null}
          <SummaryRow
            label="Total"
            value={formatMoney(order.totalCents)}
            emphasis
          />
        </dl>
      </div>

      {method ? (
        <div className="flex flex-col gap-1 rounded-card border border-line px-4 py-3 text-sm">
          <h3 className="font-medium text-ink">Payment: {method.label}</h3>
          {/* "Send us $X via Zelle" is only true while payment is still
              outstanding, so a paid, refunded or failed order keeps the
              heading — the method it was placed with — and drops the
              instructions. PaymentStatusNotice carries the status copy. */}
          {order.paymentStatus === "pending" ? (
            <p className="text-ink-muted">
              {resolvePaymentInstructions(method, siteConfig.contact)}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
