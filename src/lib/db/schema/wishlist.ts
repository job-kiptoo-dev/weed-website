import { index, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { products } from "./catalog";
import { createdAt } from "./timestamps";

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.productId] }),
    index("wishlist_items_product_id_idx").on(table.productId),
  ],
);
