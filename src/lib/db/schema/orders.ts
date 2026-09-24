import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  text,
} from "drizzle-orm/pg-core";
import type { CheckoutMeta, OrderAddress } from "@/types/order";
import { users } from "./auth";
import { products, productVariants } from "./catalog";
import { orderStatus, paymentStatus } from "./enums";
import { timestamps } from "./timestamps";

export const orderNumberSeq = pgSequence("order_number_seq", {
  startWith: 100001,
});

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    orderNumber: text("order_number")
      .notNull()
      .unique()
      .default(sql`('BSC-' || nextval('order_number_seq'))`),
    // Null for guest checkouts and after the account is deleted.
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull(),
    status: orderStatus("status").notNull().default("pending"),
    paymentStatus: paymentStatus("payment_status").notNull().default("pending"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    // Snapshot of the code used; no FK so codes can be deleted later.
    discountCode: text("discount_code"),
    shippingAddress: jsonb("shipping_address").$type<OrderAddress>().notNull(),
    billingAddress: jsonb("billing_address").$type<OrderAddress>(),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    // Checkout choices (payment method, order type, the excise/sales split,
    // marketing opt-in). Null on orders placed before the column existed.
    checkoutMeta: jsonb("checkout_meta").$type<CheckoutMeta>(),
    notes: text("notes"),
    ...timestamps(),
  },
  (table) => [
    index("orders_user_id_idx").on(table.userId),
    index("orders_status_idx").on(table.status),
    index("orders_created_at_idx").on(table.createdAt),
    index("orders_email_idx").on(table.email),
    check(
      "orders_money_check",
      sql`${table.subtotalCents} >= 0 and ${table.shippingCents} >= 0 and ${table.discountCents} >= 0 and ${table.taxCents} >= 0 and ${table.totalCents} >= 0`,
    ),
    check(
      "orders_total_check",
      sql`${table.totalCents} = ${table.subtotalCents} + ${table.shippingCents} + ${table.taxCents} - ${table.discountCents}`,
    ),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    variantId: text("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    productName: text("product_name").notNull(),
    variantName: text("variant_name"),
    sku: text("sku").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    imageUrl: text("image_url"),
    ...timestamps(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_product_id_idx").on(table.productId),
    check("order_items_quantity_check", sql`${table.quantity} > 0`),
    check("order_items_unit_price_check", sql`${table.unitPriceCents} >= 0`),
    check(
      "order_items_total_check",
      sql`${table.totalCents} = ${table.unitPriceCents} * ${table.quantity}`,
    ),
  ],
);
