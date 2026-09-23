import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Fixed-window counters for app-level rate limiting (helper: Phase 10). */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.key, table.windowStart] }),
    index("rate_limits_window_start_idx").on(table.windowStart),
  ],
);
