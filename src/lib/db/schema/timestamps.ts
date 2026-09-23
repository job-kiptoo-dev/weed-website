import { timestamp } from "drizzle-orm/pg-core";

export function createdAt() {
  return timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
}

export function updatedAt() {
  return timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
}

/** `created_at` and `updated_at`, both `timestamptz not null default now()`. */
export function timestamps() {
  return { createdAt: createdAt(), updatedAt: updatedAt() };
}
