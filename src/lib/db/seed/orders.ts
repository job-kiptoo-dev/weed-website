import { siteConfig } from "@/lib/site-config";
import type { SeedCatalog } from "../seed-data/catalog";
import type { DiscountCodeSpec } from "../seed-data/marketing";
import {
  ORDER_NUMBER_PREFIX,
  type SeedOrderSpec,
  type SeedOrderStatus,
} from "../seed-data/orders";
import type { CustomerProfile } from "../seed-data/people";
import type { orderItems, orders } from "../schema";

type OrderRow = typeof orders.$inferInsert;
type OrderItemRow = typeof orderItems.$inferInsert;
type PaymentStatus = NonNullable<OrderRow["paymentStatus"]>;

export interface SeedOrderRows {
  orders: OrderRow[];
  orderItems: OrderItemRow[];
}

export interface BuildOrderRowsInput {
  catalog: SeedCatalog;
  specs: readonly SeedOrderSpec[];
  customers: readonly CustomerProfile[];
  /** Email per customer id, from the accounts being seeded. */
  customerEmails: ReadonlyMap<string, string>;
  discountCodes: readonly DiscountCodeSpec[];
}

export function paymentStatusFor(status: SeedOrderStatus): PaymentStatus {
  switch (status) {
    case "pending":
      return "pending";
    case "cancelled":
      return "failed";
    case "refunded":
      return "refunded";
    default:
      return "paid";
  }
}

function discountCents(
  code: DiscountCodeSpec | undefined,
  subtotalCents: number,
): number {
  if (!code || subtotalCents < code.minSubtotalCents) return 0;
  return code.type === "percent"
    ? Math.round((subtotalCents * code.value) / 100)
    : Math.min(code.value, subtotalCents);
}

/**
 * Turns the order specs into rows, snapshotting product names, SKUs, prices
 * and images from the seed catalog. Shipping follows `siteConfig.shipping`
 * on the pre-discount subtotal (as the cart does); tax is 0. Pure and
 * deterministic, so totals always satisfy the `orders_total_check` and
 * `order_items_total_check` constraints.
 */
export function buildOrderRows({
  catalog,
  specs,
  customers,
  customerEmails,
  discountCodes,
}: BuildOrderRowsInput): SeedOrderRows {
  const orderRows: OrderRow[] = [];
  const itemRows: OrderItemRow[] = [];

  for (const spec of specs) {
    const orderId = `ord_${spec.number}`;
    const createdAt = new Date(spec.createdAt);

    let userId: string | null = null;
    let email: string;
    let shippingAddress;
    if (typeof spec.customer === "string") {
      const handle = spec.customer;
      const profile = customers.find((c) => c.handle === handle);
      const profileEmail = profile && customerEmails.get(profile.id);
      if (!profile || !profileEmail) {
        throw new Error(
          `Seed order ${spec.number}: unknown customer "${handle}"`,
        );
      }
      userId = profile.id;
      email = profileEmail;
      shippingAddress = profile.address;
    } else {
      email = spec.customer.email;
      shippingAddress = spec.customer.address;
    }

    let subtotalCents = 0;
    spec.items.forEach((item, index) => {
      const product = catalog.products.find((p) => p.slug === item.product);
      if (!product || product.status !== "active") {
        throw new Error(
          `Seed order ${spec.number}: "${item.product}" is not an active product`,
        );
      }
      const variants = catalog.productVariants.filter(
        (v) => v.productId === product.id,
      );
      const variant = item.variant
        ? variants.find((v) => v.id === `var_${product.slug}-${item.variant}`)
        : variants.find((v) => v.isDefault);
      if (!variant) {
        throw new Error(
          `Seed order ${spec.number}: "${item.product}" has no variant "${item.variant ?? "(default)"}"`,
        );
      }
      const image = catalog.productImages
        .filter((i) => i.productId === product.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)[0];
      const unitPriceCents = variant.priceCents ?? product.priceCents;
      const totalCents = unitPriceCents * item.quantity;
      subtotalCents += totalCents;
      itemRows.push({
        id: `oi_${spec.number}_${index + 1}`,
        orderId,
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantName: variant.name,
        sku: variant.sku,
        quantity: item.quantity,
        unitPriceCents,
        totalCents,
        imageUrl: image?.url ?? null,
        createdAt,
        updatedAt: createdAt,
      });
    });

    const code = spec.discountCode
      ? discountCodes.find((c) => c.code === spec.discountCode)
      : undefined;
    if (spec.discountCode && !code) {
      throw new Error(
        `Seed order ${spec.number}: unknown discount code "${spec.discountCode}"`,
      );
    }
    const discount = discountCents(code, subtotalCents);
    const { freeThresholdCents, flatRateCents } = siteConfig.shipping;
    const shippingCents =
      subtotalCents >= freeThresholdCents ? 0 : flatRateCents;
    const taxCents = 0;

    orderRows.push({
      id: orderId,
      orderNumber: `${ORDER_NUMBER_PREFIX}${spec.number}`,
      userId,
      email,
      status: spec.status,
      paymentStatus: paymentStatusFor(spec.status),
      subtotalCents,
      shippingCents,
      discountCents: discount,
      taxCents,
      totalCents: subtotalCents + shippingCents + taxCents - discount,
      discountCode: code?.code ?? null,
      shippingAddress,
      billingAddress: null,
      notes: spec.notes ?? null,
      createdAt,
      updatedAt: createdAt,
    });
  }

  return { orders: orderRows, orderItems: itemRows };
}
