import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { discountType } from "./enums";
import { timestamps } from "./timestamps";

export const discountCodes = pgTable(
  "discount_codes",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    type: discountType("type").notNull(),
    // Percent (1-100) or cents, depending on `type`.
    value: integer("value").notNull(),
    minSubtotalCents: integer("min_subtotal_cents").notNull().default(0),
    active: boolean("active").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    maxUses: integer("max_uses"),
    uses: integer("uses").notNull().default(0),
    ...timestamps(),
  },
  (table) => [
    check(
      "discount_codes_code_upper_check",
      sql`${table.code} = upper(${table.code})`,
    ),
    check("discount_codes_value_positive_check", sql`${table.value} > 0`),
    check(
      "discount_codes_percent_range_check",
      sql`${table.type} <> 'percent' or ${table.value} between 1 and 100`,
    ),
    check(
      "discount_codes_min_subtotal_check",
      sql`${table.minSubtotalCents} >= 0`,
    ),
    check("discount_codes_uses_check", sql`${table.uses} >= 0`),
    check(
      "discount_codes_max_uses_check",
      sql`${table.maxUses} is null or ${table.maxUses} > 0`,
    ),
  ],
);
