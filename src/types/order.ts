import type { OrderTotals } from "@/lib/order-pricing";
import type { PaymentMethodId, PaymentProvider } from "@/lib/payment-methods";

/** Address snapshot stored on an order (jsonb), independent of `addresses`. */
export interface OrderAddress {
  fullName: string;
  /** Optional on purpose: older snapshots predate the checkout form. */
  company?: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
}

/** Delivery to the billing (or separate shipping) address, or curbside pickup. */
export type OrderType = "delivery" | "pickup";

/**
 * Checkout choices stored on the order in the nullable `checkout_meta` jsonb
 * column. Null on orders placed before the column existed (the seed orders).
 * The tax split is kept here because `orders.tax_cents` stores only the sum.
 */
export interface CheckoutMeta {
  paymentMethod: PaymentMethodId;
  /**
   * Who took (or will take) the money. Optional on purpose: orders placed
   * before card payments existed read as `manual`, exactly like
   * `OrderAddress.company`. Stored inside the jsonb — no column, no migration.
   */
  paymentProvider?: PaymentProvider;
  orderType: OrderType;
  exciseTaxCents: number;
  salesTaxCents: number;
  marketingOptIn: boolean;
}

/** Status values mirroring the `order_status` / `payment_status` enums. */
export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type OrderPaymentStatus = "pending" | "paid" | "failed" | "refunded";

/** Why a cart line (or coupon) could not be priced as asked for. */
export type OrderIssueKind = "unavailable" | "out_of_stock" | "invalid_coupon";

export interface OrderIssue {
  kind: OrderIssueKind;
  /** The item name shown to the customer, or the rejected coupon code. */
  label: string;
  /** Null for `invalid_coupon`. */
  productId: string | null;
  variantId: string | null;
}

/**
 * One priced line. These are exactly the snapshot fields an `order_items` row
 * stores, so the summary and the insert share one shape.
 */
export interface OrderQuoteLine {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

/**
 * A server-priced cart. Every money value is computed on the server; the
 * browser only ever displays these numbers. Lines with a blocking issue are
 * dropped, so `lines` may be shorter than the cart.
 */
export interface OrderQuote {
  lines: OrderQuoteLine[];
  totals: OrderTotals;
  orderType: OrderType;
  /** The code actually applied; null when none was, or it was rejected. */
  discountCode: string | null;
  issues: OrderIssue[];
}

export interface OrderItemRecord {
  id: string;
  /** Null once the product is deleted (`on delete set null`). */
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  imageUrl: string | null;
}

/** A stored order with its items, as the confirmation page reads it. */
export interface OrderRecord {
  id: string;
  orderNumber: string;
  userId: string | null;
  email: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  discountCode: string | null;
  shippingAddress: OrderAddress;
  billingAddress: OrderAddress | null;
  checkoutMeta: CheckoutMeta | null;
  notes: string | null;
  createdAt: string;
  items: OrderItemRecord[];
}
