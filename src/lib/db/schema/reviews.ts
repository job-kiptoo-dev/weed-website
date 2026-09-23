import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  smallint,
  text,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { products } from "./catalog";
import { reviewStatus } from "./enums";
import { timestamps } from "./timestamps";

export const reviews = pgTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // Nullable: historical seed reviews have no account behind them.
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name").notNull(),
    rating: smallint("rating").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: reviewStatus("status").notNull().default("published"),
    ...timestamps(),
  },
  (table) => [
    // NULL user_ids stay distinct, so account-less reviews may repeat.
    unique("reviews_product_user_unique").on(table.productId, table.userId),
    index("reviews_product_status_idx").on(table.productId, table.status),
    check("reviews_rating_check", sql`${table.rating} between 1 and 5`),
  ],
);
