import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { products, productVariants } from "./catalog";
import { timestamps } from "./timestamps";

export const carts = pgTable(
  "carts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    guestToken: text("guest_token").unique(),
    ...timestamps(),
  },
  (table) => [
    index("carts_updated_at_idx").on(table.updatedAt),
    check(
      "carts_owner_check",
      sql`${table.userId} is not null or ${table.guestToken} is not null`,
    ),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: text("id").primaryKey(),
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariants.id, {
      onDelete: "cascade",
    }),
    quantity: integer("quantity").notNull(),
    ...timestamps(),
  },
  (table) => [
    // A product without a variant may appear only once per cart.
    unique("cart_items_line_unique")
      .on(table.cartId, table.productId, table.variantId)
      .nullsNotDistinct(),
    check("cart_items_quantity_check", sql`${table.quantity} > 0`),
  ],
);
