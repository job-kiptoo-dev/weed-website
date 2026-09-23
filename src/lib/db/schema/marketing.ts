import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createdAt } from "./timestamps";

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    createdAt: createdAt(),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "newsletter_subscribers_email_lower_check",
      sql`${table.email} = lower(${table.email})`,
    ),
  ],
);

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    createdAt: createdAt(),
    handledAt: timestamp("handled_at", { withTimezone: true }),
  },
  (table) => [index("contact_messages_created_at_idx").on(table.createdAt)],
);
