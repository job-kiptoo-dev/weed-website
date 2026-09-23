import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["customer", "admin"]);

export const productStatus = pgEnum("product_status", [
  "draft",
  "active",
  "archived",
]);

export const reviewStatus = pgEnum("review_status", ["published", "hidden"]);

export const orderStatus = pgEnum("order_status", [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const discountType = pgEnum("discount_type", ["percent", "fixed"]);
