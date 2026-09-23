import { relations } from "drizzle-orm";
import { addresses } from "./schema/addresses";
import { accounts, sessions, users } from "./schema/auth";
import { cartItems, carts } from "./schema/carts";
import {
  categories,
  productImages,
  products,
  productVariants,
} from "./schema/catalog";
import { orderItems, orders } from "./schema/orders";
import { reviews } from "./schema/reviews";
import { wishlistItems } from "./schema/wishlist";

// drizzle-orm 0.45 relational query API (`relations()`, not 1.x
// `defineRelations`). Relations are query metadata only; foreign keys live
// on the tables.

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  addresses: many(addresses),
  orders: many(orders),
  reviews: many(reviews),
  wishlistItems: many(wishlistItems),
  cart: one(carts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ many, one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
  variants: many(productVariants),
  reviews: many(reviews),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
  }),
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, { fields: [wishlistItems.userId], references: [users.id] }),
  product: one(products, {
    fields: [wishlistItems.productId],
    references: [products.id],
  }),
}));

export const cartsRelations = relations(carts, ({ many, one }) => ({
  user: one(users, { fields: [carts.userId], references: [users.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));
