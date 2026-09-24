/**
 * Pure order pricing. No React, no database, integer cents everywhere.
 *
 * The rules, in order:
 * 1. Subtotal is the sum of unit price x quantity over the lines.
 * 2. A percent discount is `Math.round(subtotal * value / 100)`, a fixed one
 *    is `min(value, subtotal)`; the total discount is clamped to the subtotal
 *    so it can never exceed it (same as the seed).
 * 3. The delivery fee is decided on the PRE-discount subtotal, so a coupon
 *    can't drop an order below the free-delivery threshold; pickup is always 0.
 * 4. The tax base is `subtotal - discount` with a floor of 0; shipping is
 *    never taxed.
 * 5. Each tax line is rounded independently, half up, so the excise and sales
 *    rows sum exactly to the `tax_cents` stored on the order.
 * 6. `total = subtotal + shipping + tax - discount`, identical to the
 *    `orders_total_check` constraint.
 * 7. `assertTotalsConsistent` re-checks all of the above and throws before any
 *    insert, so Postgres never has to be the one to catch it.
 */
import type {
  CheckoutDeliveryRules,
  CheckoutTaxRates,
} from "@/lib/site-config";
import { siteConfig } from "@/lib/site-config";
import type { OrderType } from "@/types/order";

/** The order types the checkout offers, for `z.enum`. */
export const ORDER_TYPES = [
  "delivery",
  "pickup",
] as const satisfies readonly OrderType[];

export interface OrderPriceLine {
  unitPriceCents: number;
  quantity: number;
}

export type OrderDiscountType = "percent" | "fixed";

export interface OrderDiscount {
  type: OrderDiscountType;
  /** Percent (1-100) or cents, depending on `type`. */
  value: number;
}

export interface OrderPricingOptions {
  orderType: OrderType;
  /** A validated discount code, or null when none applies. */
  discount?: OrderDiscount | null;
  /** Defaults to `siteConfig.checkout.taxes`. */
  taxes?: CheckoutTaxRates;
  /** Defaults to `siteConfig.checkout.delivery`. */
  delivery?: CheckoutDeliveryRules;
}

export interface OrderTotals {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  exciseTaxCents: number;
  salesTaxCents: number;
  /** `exciseTaxCents + salesTaxCents`; the only tax value the order stores. */
  taxCents: number;
  totalCents: number;
}

/** Rule 5: half up, so the rendered rows add up to the stored tax. */
function taxOf(baseCents: number, percent: number): number {
  if (percent <= 0) return 0;
  return Math.round((baseCents * percent) / 100);
}

/** Rule 2, without the final clamp. */
function codeDiscountOf(
  discount: OrderDiscount | null,
  subtotalCents: number,
): number {
  if (!discount || discount.value <= 0) return 0;
  return discount.type === "percent"
    ? Math.round((subtotalCents * discount.value) / 100)
    : Math.min(discount.value, subtotalCents);
}

export function computeOrderTotals(
  lines: readonly OrderPriceLine[],
  options: OrderPricingOptions,
): OrderTotals {
  const {
    orderType,
    discount = null,
    taxes = siteConfig.checkout.taxes,
    delivery = siteConfig.checkout.delivery,
  } = options;

  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );

  // A pickup saving is a discount, never a negative shipping row.
  const pickupDiscountCents =
    orderType === "pickup" ? delivery.pickupDiscountCents : 0;
  const discountCents = Math.min(
    codeDiscountOf(discount, subtotalCents) + pickupDiscountCents,
    subtotalCents,
  );

  const qualifiesForFreeDelivery =
    lines.length === 0 || subtotalCents >= delivery.freeDeliveryThresholdCents;
  const shippingCents =
    orderType === "pickup" || qualifiesForFreeDelivery
      ? 0
      : delivery.deliveryFeeCents;

  const taxableCents = Math.max(subtotalCents - discountCents, 0);
  const exciseTaxCents = taxOf(taxableCents, taxes.excisePercent);
  const salesTaxCents = taxOf(taxableCents, taxes.salesPercent);
  const taxCents = exciseTaxCents + salesTaxCents;

  return {
    subtotalCents,
    discountCents,
    shippingCents,
    exciseTaxCents,
    salesTaxCents,
    taxCents,
    totalCents: subtotalCents + shippingCents + taxCents - discountCents,
  };
}

/**
 * Throws when totals break any rule above, so a bad quote fails in our code
 * with a readable message instead of hitting `orders_money_check` or
 * `orders_total_check` in Postgres.
 */
export function assertTotalsConsistent(totals: OrderTotals): void {
  const problems: string[] = [];

  for (const [name, value] of Object.entries(totals)) {
    if (!Number.isInteger(value)) problems.push(`${name} is not integer cents`);
    else if (value < 0) problems.push(`${name} is negative`);
  }

  if (totals.discountCents > totals.subtotalCents) {
    problems.push("discountCents is greater than subtotalCents");
  }
  if (totals.taxCents !== totals.exciseTaxCents + totals.salesTaxCents) {
    problems.push("taxCents is not exciseTaxCents + salesTaxCents");
  }
  const expectedTotal =
    totals.subtotalCents +
    totals.shippingCents +
    totals.taxCents -
    totals.discountCents;
  if (totals.totalCents !== expectedTotal) {
    problems.push(
      `totalCents is ${totals.totalCents}, expected ${expectedTotal}`,
    );
  }

  if (problems.length > 0) {
    throw new Error(`Inconsistent order totals: ${problems.join("; ")}`);
  }
}
