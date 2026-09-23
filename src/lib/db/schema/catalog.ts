import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { ProductSpecs } from "@/types/catalog";
import { productStatus } from "./enums";
import { timestamps } from "./timestamps";
import { tsvector } from "./tsvector";

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull(),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce("name", '')), 'A')`,
    ),
    ...timestamps(),
  },
  (table) => [
    index("categories_sort_order_idx").on(table.sortOrder),
    index("categories_search_vector_idx").using("gin", table.searchVector),
  ],
);

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    shortDescription: text("short_description").notNull(),
    priceCents: integer("price_cents").notNull(),
    compareAtPriceCents: integer("compare_at_price_cents"),
    sku: text("sku").notNull().unique(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    inventory: integer("inventory").notNull().default(0),
    status: productStatus("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    specs: jsonb("specs").$type<ProductSpecs>(),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce("name", '')), 'A') || setweight(to_tsvector('english', coalesce("sku", '')), 'A') || setweight(to_tsvector('english', coalesce("short_description", '')), 'B') || setweight(to_tsvector('english', coalesce("description", '')), 'C')`,
    ),
    ...timestamps(),
  },
  (table) => [
    index("products_category_id_idx").on(table.categoryId),
    index("products_status_featured_idx").on(table.status, table.featured),
    index("products_created_at_idx").on(table.createdAt),
    index("products_price_cents_idx").on(table.priceCents),
    index("products_search_vector_idx").using("gin", table.searchVector),
    check("products_price_cents_check", sql`${table.priceCents} >= 0`),
    check(
      "products_compare_at_price_cents_check",
      sql`${table.compareAtPriceCents} is null or ${table.compareAtPriceCents} > ${table.priceCents}`,
    ),
    check("products_inventory_check", sql`${table.inventory} >= 0`),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (table) => [
    index("product_images_product_sort_idx").on(
      table.productId,
      table.sortOrder,
    ),
  ],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku").notNull().unique(),
    priceCents: integer("price_cents"),
    inventory: integer("inventory").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps(),
  },
  (table) => [
    index("product_variants_product_sort_idx").on(
      table.productId,
      table.sortOrder,
    ),
    uniqueIndex("product_variants_one_default_idx")
      .on(table.productId)
      .where(sql`${table.isDefault}`),
    check(
      "product_variants_price_cents_check",
      sql`${table.priceCents} is null or ${table.priceCents} >= 0`,
    ),
    check("product_variants_inventory_check", sql`${table.inventory} >= 0`),
  ],
);
