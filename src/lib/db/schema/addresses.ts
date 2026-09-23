import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { timestamps } from "./timestamps";

export const addresses = pgTable(
  "addresses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label"),
    fullName: text("full_name").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postal_code").notNull(),
    country: text("country").notNull().default("US"),
    phone: text("phone"),
    isDefaultShipping: boolean("is_default_shipping").notNull().default(false),
    isDefaultBilling: boolean("is_default_billing").notNull().default(false),
    ...timestamps(),
  },
  (table) => [
    index("addresses_user_id_idx").on(table.userId),
    uniqueIndex("addresses_default_shipping_idx")
      .on(table.userId)
      .where(sql`${table.isDefaultShipping}`),
    uniqueIndex("addresses_default_billing_idx")
      .on(table.userId)
      .where(sql`${table.isDefaultBilling}`),
  ],
);
