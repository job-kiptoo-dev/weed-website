/**
 * Order pricing and creation. `createOrderService` takes the database, the
 * feature flags, the accepted payment methods and the owner notifier so tests
 * can inject all four; `orderService` is bound to the app database and
 * `siteConfig`.
 *
 * Two rules shape this file:
 * - Every money value is computed here from the product rows. Nothing about
 *   price, tax, delivery or discount is ever accepted from the browser.
 * - No payment is taken anywhere on this site, so `status` and
 *   `paymentStatus` both keep their `pending` column defaults and inventory
 *   is decremented at creation (see the spec, R5 and R6).
 */
import { and, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { logUnexpectedError } from "@/lib/action-result";
import { getDb } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import {
  categories,
  discountCodes,
  newsletterSubscribers,
  orderItems,
  orders,
  productImages,
  products,
  productVariants,
} from "@/lib/db/schema";
import type { Database } from "@/lib/db/types";
import {
  notifyNewOrder,
  type NewOrderNotification,
} from "@/lib/email/notifications";
import type { SendResult } from "@/lib/email/send";
import { ConflictError, ValidationError } from "@/lib/errors";
import { createOrderToken, verifyOrderToken } from "@/lib/order-access";
import {
  assertTotalsConsistent,
  computeOrderTotals,
  type OrderDiscount,
  type OrderTotals,
} from "@/lib/order-pricing";
import {
  enabledPaymentMethods,
  type PaymentMethodConfig,
  type PaymentMethodId,
  type PaymentProvider,
} from "@/lib/payment-methods";
import { siteConfig } from "@/lib/site-config";
import {
  MAX_CHECKOUT_LINES,
  type CheckoutAddressInput,
  type CheckoutInput,
  type CheckoutLineInput,
} from "@/lib/validation/checkout.schema";
import type {
  CheckoutMeta,
  OrderAddress,
  OrderIssue,
  OrderQuote,
  OrderQuoteLine,
  OrderRecord,
  OrderType,
} from "@/types/order";
import { toIso } from "./catalog.mappers";
import { visibleProduct, type CatalogServiceDeps } from "./product.queries";

/** The handle inside `db.transaction`; a superset of `Database`. */
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export interface OrderServiceDeps extends CatalogServiceDeps {
  /** Defaults to `siteConfig.checkout.paymentMethods`. */
  paymentMethods?: readonly PaymentMethodConfig[];
  /** Defaults to the Resend-backed owner notification. */
  notifyOrder?: (order: NewOrderNotification) => Promise<SendResult>;
}

export interface PriceOrderOptions {
  orderType: OrderType;
  /** An uppercased coupon code, or null/undefined for none. */
  discountCode?: string | null;
}

export interface CreateOrderInput extends CheckoutInput {
  /** From the caller's session only; never from the browser. */
  userId: string | null;
  /**
   * How the payment is actually handled for this order, resolved by the
   * caller with `effectivePaymentProvider` — it, not this service, knows
   * whether Stripe is configured. Stored on the order as-is.
   */
  paymentProvider: PaymentProvider;
}

export interface CreateOrderResult {
  orderId: string;
  orderNumber: string;
  /** Guest access token for the confirmation URL (see `order-access`). */
  token: string;
  totals: OrderTotals;
}

export interface OrderViewer {
  /** The signed-in user, when there is one. */
  userId?: string | null;
  /** The token from the confirmation link. */
  token?: string | null;
}

/** A coupon row that passed every rule, ready for the guarded increment. */
interface AppliedDiscount extends OrderDiscount {
  id: string;
  code: string;
}

interface PricedOrder {
  quote: OrderQuote;
  discount: AppliedDiscount | null;
}

/** `unavailable` and `out_of_stock` drop a line, so they block the order. */
function isBlocking(issue: OrderIssue): boolean {
  return issue.kind !== "invalid_coupon";
}

function itemLabel(productName: string, variantName: string | null): string {
  return variantName === null ? productName : `${productName} (${variantName})`;
}

function joinLabels(labels: readonly string[]): string {
  return labels.join(", ");
}

/** Names every blocking item, so the customer knows what to change. */
function blockingMessage(issues: readonly OrderIssue[]): string {
  const soldOut = issues
    .filter((issue) => issue.kind === "out_of_stock")
    .map((issue) => issue.label);
  const gone = issues
    .filter((issue) => issue.kind === "unavailable")
    .map((issue) => issue.label);
  const parts: string[] = [];
  if (soldOut.length > 0) {
    parts.push(
      `${joinLabels(soldOut)} ${soldOut.length === 1 ? "is" : "are"} out of stock`,
    );
  }
  if (gone.length > 0) {
    parts.push(
      `${joinLabels(gone)} ${gone.length === 1 ? "is" : "are"} no longer available`,
    );
  }
  return `${parts.join("; ")}. Please update your cart and try again.`;
}

function assertNoBlockingIssues(issues: readonly OrderIssue[]): void {
  const blocking = issues.filter(isBlocking);
  if (blocking.length > 0) throw new ConflictError(blockingMessage(blocking));
}

function toOrderAddress(address: CheckoutAddressInput): OrderAddress {
  return {
    fullName: `${address.firstName} ${address.lastName}`,
    company: address.company,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    phone: address.phone,
  };
}

type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;

function toOrderRecord(row: OrderRow & { items: OrderItemRow[] }): OrderRecord {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    userId: row.userId,
    email: row.email,
    status: row.status,
    paymentStatus: row.paymentStatus,
    subtotalCents: row.subtotalCents,
    shippingCents: row.shippingCents,
    discountCents: row.discountCents,
    taxCents: row.taxCents,
    totalCents: row.totalCents,
    discountCode: row.discountCode,
    shippingAddress: row.shippingAddress,
    billingAddress: row.billingAddress,
    checkoutMeta: row.checkoutMeta,
    notes: row.notes,
    createdAt: toIso(row.createdAt),
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      sku: item.sku,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      totalCents: item.totalCents,
      imageUrl: item.imageUrl,
    })),
  };
}

/**
 * Sums duplicate (product, variant) lines, clamps each to
 * `cart.maxQuantityPerLine` and caps the order at `MAX_CHECKOUT_LINES`.
 * Quantities are already integers >= 1 (`checkoutLineSchema`).
 */
function mergeLines(lines: readonly CheckoutLineInput[]): CheckoutLineInput[] {
  const merged = new Map<string, CheckoutLineInput>();
  for (const line of lines) {
    const variantId = line.variantId ?? null;
    const key = `${line.productId}::${variantId ?? ""}`;
    const quantity = Math.min(
      (merged.get(key)?.quantity ?? 0) + line.quantity,
      siteConfig.cart.maxQuantityPerLine,
    );
    merged.set(key, { productId: line.productId, variantId, quantity });
  }
  return [...merged.values()].slice(0, MAX_CHECKOUT_LINES);
}

/** First gallery image, for the line snapshot. */
const firstImageUrl = sql<
  string | null
>`(select ${productImages.url} from ${productImages} where ${productImages.productId} = ${products.id} order by ${productImages.sortOrder}, ${productImages.id} limit 1)`;

export function createOrderService({
  getDb,
  features,
  paymentMethods = siteConfig.checkout.paymentMethods,
  notifyOrder = notifyNewOrder,
}: OrderServiceDeps) {
  /**
   * A method must exist in `PAYMENT_METHOD_IDS` and be `enabled` in the
   * config. The config is built from the presets, so an id outside
   * `PAYMENT_METHOD_IDS` can never appear in it either: one check covers both.
   */
  function assertPaymentMethodAccepted(paymentMethod: PaymentMethodId): void {
    const accepted = enabledPaymentMethods(paymentMethods);
    if (!accepted.some((method) => method.id === paymentMethod)) {
      const message = "Choose a payment method we currently accept.";
      throw new ValidationError(message, { paymentMethod: [message] });
    }
  }

  /**
   * Loads the requested lines through `visibleProduct`, so a draft, archived
   * or flag-hidden product can never be ordered. A line whose product or
   * variant has gone, or whose stock no longer covers the quantity, is
   * dropped and reported as an issue.
   */
  async function quoteLines(
    db: Database,
    merged: readonly CheckoutLineInput[],
  ): Promise<{ lines: OrderQuoteLine[]; issues: OrderIssue[] }> {
    const productIds = [...new Set(merged.map((line) => line.productId))];
    const variantIds = merged.flatMap((line) =>
      line.variantId === null ? [] : [line.variantId],
    );

    // Sequential: inside a transaction these share one connection.
    const productRows = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        priceCents: products.priceCents,
        inventory: products.inventory,
        imageUrl: firstImageUrl,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(inArray(products.id, productIds), visibleProduct(features)));
    const variantRows =
      variantIds.length === 0
        ? []
        : await db
            .select({
              id: productVariants.id,
              productId: productVariants.productId,
              name: productVariants.name,
              sku: productVariants.sku,
              priceCents: productVariants.priceCents,
              inventory: productVariants.inventory,
            })
            .from(productVariants)
            .where(inArray(productVariants.id, variantIds));

    const productById = new Map(productRows.map((row) => [row.id, row]));
    const variantById = new Map(variantRows.map((row) => [row.id, row]));

    // A product the visibility filter dropped (archived, draft, hidden
    // category) still needs naming in the message, so the customer knows
    // which cart line to remove. Only on the failure path, and only the name.
    const missingIds = productIds.filter((id) => !productById.has(id));
    const nameById = new Map(
      missingIds.length === 0
        ? []
        : (
            await db
              .select({ id: products.id, name: products.name })
              .from(products)
              .where(inArray(products.id, missingIds))
          ).map((row) => [row.id, row.name] as const),
    );

    const lines: OrderQuoteLine[] = [];
    const issues: OrderIssue[] = [];
    for (const line of merged) {
      const product = productById.get(line.productId);
      if (!product) {
        issues.push({
          kind: "unavailable",
          label: nameById.get(line.productId) ?? "An item in your cart",
          productId: line.productId,
          variantId: line.variantId,
        });
        continue;
      }
      const variant =
        line.variantId === null ? null : variantById.get(line.variantId);
      if (line.variantId !== null && variant?.productId !== product.id) {
        issues.push({
          kind: "unavailable",
          label: product.name,
          productId: line.productId,
          variantId: line.variantId,
        });
        continue;
      }
      const label = itemLabel(product.name, variant?.name ?? null);
      // Stock lives on the variant when there is one, otherwise on the
      // product. A partly available line is dropped whole: the customer
      // lowers the quantity and re-quotes.
      const stock = variant ? variant.inventory : product.inventory;
      if (stock < line.quantity) {
        issues.push({
          kind: "out_of_stock",
          label,
          productId: line.productId,
          variantId: line.variantId,
        });
        continue;
      }
      const unitPriceCents = variant?.priceCents ?? product.priceCents;
      lines.push({
        productId: product.id,
        variantId: variant?.id ?? null,
        productName: product.name,
        variantName: variant?.name ?? null,
        sku: variant?.sku ?? product.sku,
        imageUrl: product.imageUrl,
        quantity: line.quantity,
        unitPriceCents,
        lineTotalCents: unitPriceCents * line.quantity,
      });
    }
    return { lines, issues };
  }

  /**
   * A coupon applies when it is active, unexpired, the subtotal reaches its
   * minimum and it has uses left. Anything else is an `invalid_coupon` issue
   * and the order is priced without it.
   */
  async function loadDiscount(
    db: Database,
    code: string,
    subtotalCents: number,
  ): Promise<{ discount: AppliedDiscount | null; issue: OrderIssue | null }> {
    const [row] = await db
      .select({
        id: discountCodes.id,
        code: discountCodes.code,
        type: discountCodes.type,
        value: discountCodes.value,
        minSubtotalCents: discountCodes.minSubtotalCents,
        active: discountCodes.active,
        expiresAt: discountCodes.expiresAt,
        maxUses: discountCodes.maxUses,
        uses: discountCodes.uses,
      })
      .from(discountCodes)
      .where(eq(discountCodes.code, code))
      .limit(1);

    const usable =
      row !== undefined &&
      row.active &&
      (row.expiresAt === null || row.expiresAt.getTime() > Date.now()) &&
      subtotalCents >= row.minSubtotalCents &&
      (row.maxUses === null || row.uses < row.maxUses);
    if (!usable) {
      return {
        discount: null,
        issue: {
          kind: "invalid_coupon",
          label: code,
          productId: null,
          variantId: null,
        },
      };
    }
    return {
      discount: {
        id: row.id,
        code: row.code,
        type: row.type,
        value: row.value,
      },
      issue: null,
    };
  }

  async function priceOrderInternal(
    lines: readonly CheckoutLineInput[],
    options: PriceOrderOptions,
    db: Database,
  ): Promise<PricedOrder> {
    const quoted = await quoteLines(db, mergeLines(lines));
    const subtotalCents = quoted.lines.reduce(
      (sum, line) => sum + line.lineTotalCents,
      0,
    );

    let discount: AppliedDiscount | null = null;
    const code = options.discountCode ?? null;
    if (code !== null) {
      const result = await loadDiscount(db, code, subtotalCents);
      discount = result.discount;
      if (result.issue) quoted.issues.push(result.issue);
    }

    const totals = computeOrderTotals(quoted.lines, {
      orderType: options.orderType,
      discount,
    });
    assertTotalsConsistent(totals);

    return {
      quote: {
        lines: quoted.lines,
        totals,
        orderType: options.orderType,
        discountCode: discount?.code ?? null,
        issues: quoted.issues,
      },
      discount,
    };
  }

  /** Prices a cart without writing anything. `db` defaults to the app handle. */
  async function priceOrder(
    lines: readonly CheckoutLineInput[],
    options: PriceOrderOptions,
    db?: Database,
  ): Promise<OrderQuote> {
    const handle = db ?? (await getDb());
    const priced = await priceOrderInternal(lines, options, handle);
    return priced.quote;
  }

  /**
   * Decrements the row the price came from: the variant for a variant line,
   * the product otherwise, so a sale is never counted twice. The
   * `inventory >= quantity` predicate makes it atomic; zero rows back means
   * someone else took the last one, which rolls the transaction back.
   */
  async function claimInventory(
    tx: Transaction,
    line: OrderQuoteLine,
  ): Promise<void> {
    const claimed =
      line.variantId === null
        ? await tx
            .update(products)
            .set({ inventory: sql`${products.inventory} - ${line.quantity}` })
            .where(
              and(
                eq(products.id, line.productId),
                gte(products.inventory, line.quantity),
              ),
            )
            .returning({ id: products.id })
        : await tx
            .update(productVariants)
            .set({
              inventory: sql`${productVariants.inventory} - ${line.quantity}`,
            })
            .where(
              and(
                eq(productVariants.id, line.variantId),
                gte(productVariants.inventory, line.quantity),
              ),
            )
            .returning({ id: productVariants.id });
    if (claimed.length === 0) {
      throw new ConflictError(
        blockingMessage([
          {
            kind: "out_of_stock",
            label: itemLabel(line.productName, line.variantName),
            productId: line.productId,
            variantId: line.variantId,
          },
        ]),
      );
    }
  }

  /**
   * Claims one use of the coupon. Zero rows back means another order took the
   * last use first; an order is never failed over a coupon, so the caller
   * re-prices without it.
   */
  async function claimDiscount(
    tx: Transaction,
    discount: AppliedDiscount,
  ): Promise<boolean> {
    const claimed = await tx
      .update(discountCodes)
      .set({ uses: sql`${discountCodes.uses} + 1` })
      .where(
        and(
          eq(discountCodes.id, discount.id),
          or(
            isNull(discountCodes.maxUses),
            lt(discountCodes.uses, discountCodes.maxUses),
          ),
        ),
      )
      .returning({ id: discountCodes.id });
    return claimed.length > 0;
  }

  /**
   * Tells the shop owner an order came in. Runs after the transaction has
   * committed and swallows every failure: an order must never be rolled back
   * because an email didn't go out.
   *
   * With `RESEND_API_KEY` unset `sendEmail` only logs and sends nothing, and
   * without `ORDER_NOTIFICATION_EMAIL` there is no recipient at all. Both
   * cases are logged here, so a shop that never receives order emails is
   * visible in the server logs instead of silently failing.
   */
  async function announceOrder(order: NewOrderNotification): Promise<void> {
    try {
      const result = await notifyOrder(order);
      if (!result.sent) {
        console.warn({
          event: "order_notification_not_sent",
          orderNumber: order.orderNumber,
          reason: result.reason,
        });
      }
    } catch (error) {
      logUnexpectedError(error, "orderService.createOrder:notifyNewOrder");
    }
  }

  /**
   * Prices, reserves stock and stores one order in a single transaction, so a
   * failure anywhere leaves no partial rows behind.
   */
  async function createOrder(
    input: CreateOrderInput,
  ): Promise<CreateOrderResult> {
    assertPaymentMethodAccepted(input.paymentMethod);
    const db = await getDb();
    const email = input.email.trim().toLowerCase();

    const created = await db.transaction(async (tx) => {
      // Re-priced inside the transaction: the quote the browser showed may be
      // seconds old, and only these numbers are ever stored.
      let priced = await priceOrderInternal(
        input.lines,
        { orderType: input.orderType, discountCode: input.discountCode },
        tx,
      );
      assertNoBlockingIssues(priced.quote.issues);

      // Before any inventory write, so re-pricing here can't see stock this
      // very order has already claimed.
      if (priced.discount && !(await claimDiscount(tx, priced.discount))) {
        priced = await priceOrderInternal(
          input.lines,
          { orderType: input.orderType, discountCode: null },
          tx,
        );
        assertNoBlockingIssues(priced.quote.issues);
      }

      const { lines, totals, discountCode } = priced.quote;
      if (lines.length === 0) {
        throw new ConflictError("Your cart is empty.");
      }
      for (const line of lines) {
        await claimInventory(tx, line);
      }

      // The last gate before Postgres sees the money.
      assertTotalsConsistent(totals);

      const orderId = newId("ord");
      const checkoutMeta: CheckoutMeta = {
        paymentMethod: input.paymentMethod,
        paymentProvider: input.paymentProvider,
        orderType: input.orderType,
        exciseTaxCents: totals.exciseTaxCents,
        salesTaxCents: totals.salesTaxCents,
        marketingOptIn: input.marketingOptIn,
      };
      // `orderNumber` is omitted so the `BSC-<sequence>` column default
      // applies; `status` and `paymentStatus` default to `pending` because no
      // payment is taken here. Pickup orders still snapshot the billing
      // address as the shipping address (the column is not null).
      const [order] = await tx
        .insert(orders)
        .values({
          id: orderId,
          userId: input.userId,
          email,
          subtotalCents: totals.subtotalCents,
          shippingCents: totals.shippingCents,
          discountCents: totals.discountCents,
          taxCents: totals.taxCents,
          totalCents: totals.totalCents,
          discountCode,
          shippingAddress: toOrderAddress(input.shipping ?? input.billing),
          billingAddress: toOrderAddress(input.billing),
          checkoutMeta,
          notes: input.notes,
        })
        .returning({
          orderNumber: orders.orderNumber,
          createdAt: orders.createdAt,
        });
      if (!order) throw new Error("Inserting the order returned no row.");

      await tx.insert(orderItems).values(
        lines.map((line) => ({
          id: newId("oi"),
          orderId,
          productId: line.productId,
          variantId: line.variantId,
          productName: line.productName,
          variantName: line.variantName,
          sku: line.sku,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          totalCents: line.lineTotalCents,
          imageUrl: line.imageUrl,
        })),
      );

      if (input.marketingOptIn) {
        await tx
          .insert(newsletterSubscribers)
          .values({ id: newId("news"), email })
          .onConflictDoNothing();
      }

      return {
        orderId,
        orderNumber: order.orderNumber,
        placedAt: order.createdAt,
        totals,
        itemCount: lines.reduce((count, line) => count + line.quantity, 0),
      };
    });

    await announceOrder({
      orderNumber: created.orderNumber,
      customerEmail: email,
      totalCents: created.totals.totalCents,
      itemCount: created.itemCount,
      placedAt: created.placedAt,
    });

    return {
      orderId: created.orderId,
      orderNumber: created.orderNumber,
      token: createOrderToken(created.orderId),
      totals: created.totals,
    };
  }

  /**
   * The order behind a confirmation page: readable by the signed-in owner or
   * by whoever holds the signed token from the link. Anyone else gets null,
   * which the page turns into a 404.
   */
  async function getOrderByNumber(
    orderNumber: string,
    viewer: OrderViewer,
  ): Promise<OrderRecord | null> {
    const db = await getDb();
    const row = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, orderNumber),
      with: {
        items: {
          orderBy: (item, { asc: ascending }) => [
            ascending(item.createdAt),
            ascending(item.id),
          ],
        },
      },
    });
    if (!row) return null;

    const isOwner =
      viewer.userId != null &&
      row.userId !== null &&
      row.userId === viewer.userId;
    if (!isOwner && !verifyOrderToken(row.id, viewer.token)) return null;
    return toOrderRecord(row);
  }

  return { priceOrder, createOrder, getOrderByNumber };
}

export type OrderService = ReturnType<typeof createOrderService>;

export const orderService: OrderService = createOrderService({
  getDb,
  features: siteConfig.features,
});
