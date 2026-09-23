// @vitest-environment node
import { verifyPassword } from "better-auth/crypto";
import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "@/test/db";
import {
  accounts,
  categories,
  discountCodes,
  orderItems,
  orders,
  products,
  productVariants,
  reviews,
  users,
} from "../schema";
import { buildSeedCatalog } from "../seed-data/catalog";
import { orderSpecs } from "../seed-data/orders";
import { buildNeonAccounts } from "./accounts";
import { countSeededRows, seedDatabase } from "./insert";

const ADMIN_PASSWORD = "test-admin-password";
const CUSTOMER_PASSWORD = "test-customer-password";
const seedAccounts = buildNeonAccounts({
  adminEmail: "Owner@Example.com",
  adminPassword: ADMIN_PASSWORD,
  customerPassword: CUSTOMER_PASSWORD,
});

const catalog = buildSeedCatalog();
const activeProducts = catalog.products.filter((p) => p.status === "active");

const EXPECTED_COUNTS = {
  users: 5,
  accounts: 5,
  addresses: 4,
  categories: 8,
  products: catalog.products.length,
  product_images: catalog.productImages.length,
  product_variants: catalog.productVariants.length,
  reviews: 42,
  orders: 10,
  order_items: orderSpecs.flatMap((order) => order.items).length,
  discount_codes: 2,
  wishlist_items: 5,
  newsletter_subscribers: 3,
  contact_messages: 2,
};

let testDb: TestDb;

beforeAll(async () => {
  testDb = await createTestDb({
    seed: (db) => seedDatabase(db, { accounts: seedAccounts }),
  });
}, 30_000);

afterAll(async () => {
  await testDb?.close();
});

describe("seedDatabase", () => {
  it("inserts the expected row counts", async () => {
    expect(catalog.products.length).toBeGreaterThan(35);
    expect(catalog.productVariants.length).toBeGreaterThan(
      catalog.products.length,
    );
    expect(await countSeededRows(testDb.db)).toEqual(EXPECTED_COUNTS);
  });

  it("keeps the catalog ids so stored carts and wishlists still resolve", async () => {
    const { db } = testDb;
    const ids = async (rows: Promise<{ id: string }[]>) =>
      (await rows).map((row) => row.id).sort();

    expect(
      await ids(db.select({ id: categories.id }).from(categories)),
    ).toEqual(catalog.categories.map((c) => c.id).sort());
    expect(await ids(db.select({ id: products.id }).from(products))).toEqual(
      catalog.products.map((p) => p.id).sort(),
    );
    expect(
      await ids(db.select({ id: productVariants.id }).from(productVariants)),
    ).toEqual(catalog.productVariants.map((v) => v.id).sort());

    expect(catalog.categories.map((c) => c.id)).toContain("cat_hemp-pre-rolls");
    expect(catalog.categories.map((c) => c.id)).toContain("cat_hemp-flower");
    expect(catalog.categories.map((c) => c.id)).toContain("cat_glassware");
    expect(catalog.products.every((p) => p.id === `prod_${p.slug}`)).toBe(true);
    expect(catalog.productVariants.map((v) => v.id)).toContain(
      "var_calm-full-spectrum-oil-500",
    );
    expect(catalog.productVariants.map((v) => v.id)).toEqual(
      expect.arrayContaining([
        "var_oil-slick-beaker-single",
        "var_cbdfx-cbd-cbg-oil-500",
      ]),
    );
    expect(catalog.productImages.map((i) => i.id)).toEqual(
      expect.arrayContaining([
        "img_oil-slick-beaker-1",
        "img_cbdfx-cbd-cbg-oil-1",
      ]),
    );
  });

  it("seeds every product as active except the archived gift box", async () => {
    const rows = await testDb.db
      .select({ slug: products.slug, status: products.status })
      .from(products);
    expect(activeProducts).toHaveLength(catalog.products.length - 1);
    expect(rows.filter((row) => row.status === "active")).toHaveLength(
      activeProducts.length,
    );
    expect(rows.filter((row) => row.status === "archived")).toEqual([
      { slug: "gift-box", status: "archived" },
    ]);
  });

  it("seeds 40 published and 2 hidden reviews without accounts", async () => {
    const rows = await testDb.db.select().from(reviews);
    expect(rows.filter((r) => r.status === "published")).toHaveLength(40);
    expect(rows.filter((r) => r.status === "hidden")).toHaveLength(2);
    expect(
      rows.every((r) => r.userId === null && r.authorName.length > 0),
    ).toBe(true);
  });

  it("creates one admin and four customers with hashed credential accounts", async () => {
    const { db } = testDb;
    const rows = await db
      .select({ email: users.email, role: users.role, hash: accounts.password })
      .from(users)
      .innerJoin(accounts, eq(accounts.userId, users.id))
      .where(eq(accounts.providerId, "credential"))
      .orderBy(asc(users.id));

    expect(rows.map((row) => [row.email, row.role])).toEqual([
      ["owner@example.com", "admin"],
      ["ada@botanicssupply.example", "customer"],
      ["ben@botanicssupply.example", "customer"],
      ["cara@botanicssupply.example", "customer"],
      ["dev@botanicssupply.example", "customer"],
    ]);

    const [admin, customer] = rows;
    expect(admin?.hash).toBeTruthy();
    expect(admin?.hash).not.toContain(ADMIN_PASSWORD);
    expect(
      await verifyPassword({
        hash: admin?.hash ?? "",
        password: ADMIN_PASSWORD,
      }),
    ).toBe(true);
    expect(
      await verifyPassword({
        hash: customer?.hash ?? "",
        password: CUSTOMER_PASSWORD,
      }),
    ).toBe(true);
  });

  it("seeds orders whose totals satisfy the money invariants", async () => {
    const { db } = testDb;
    const orderRows = await db
      .select()
      .from(orders)
      .orderBy(asc(orders.orderNumber));
    const itemRows = await db.select().from(orderItems);

    expect(orderRows.map((o) => o.orderNumber)).toEqual(
      Array.from({ length: 10 }, (_, i) => `BSC-${100001 + i}`),
    );
    for (const order of orderRows) {
      const items = itemRows.filter((item) => item.orderId === order.id);
      expect(items.length, order.orderNumber).toBeGreaterThanOrEqual(1);
      expect(items.length, order.orderNumber).toBeLessThanOrEqual(3);
      expect(
        items.reduce((sum, item) => sum + item.totalCents, 0),
        order.orderNumber,
      ).toBe(order.subtotalCents);
      expect(order.totalCents, order.orderNumber).toBe(
        order.subtotalCents +
          order.shippingCents +
          order.taxCents -
          order.discountCents,
      );
      expect(order.shippingCents, order.orderNumber).toBe(
        order.subtotalCents >= 7500 ? 0 : 695,
      );
      expect(order.taxCents).toBe(0);
    }
    for (const item of itemRows) {
      expect(item.totalCents).toBe(item.unitPriceCents * item.quantity);
    }
  });

  it("spreads orders across statuses, customers and guests", async () => {
    const rows = await testDb.db.select().from(orders);
    const statusCounts: Record<string, number> = {};
    for (const row of rows) {
      statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
    }
    expect(statusCounts).toEqual({
      pending: 1,
      paid: 2,
      processing: 1,
      shipped: 2,
      delivered: 2,
      cancelled: 1,
      refunded: 1,
    });
    for (const row of rows) {
      const expected =
        row.status === "pending"
          ? "pending"
          : row.status === "cancelled"
            ? "failed"
            : row.status === "refunded"
              ? "refunded"
              : "paid";
      expect(row.paymentStatus, row.orderNumber).toBe(expected);
    }
    expect(rows.filter((row) => row.userId === null)).toHaveLength(2);
    expect(new Set(rows.flatMap((row) => row.userId ?? [])).size).toBe(4);

    const discounted = rows.filter((row) => row.discountCode !== null);
    expect(discounted.map((row) => row.discountCode)).toEqual(["WELCOME10"]);
    expect(discounted[0]?.discountCents).toBe(
      Math.round((discounted[0]?.subtotalCents ?? 0) / 10),
    );
    const [welcome] = await testDb.db
      .select({ uses: discountCodes.uses })
      .from(discountCodes)
      .where(eq(discountCodes.code, "WELCOME10"));
    expect(welcome?.uses).toBe(1);
  });

  it("continues the order number sequence after the seeded orders", async () => {
    const [created] = await testDb.db
      .insert(orders)
      .values({
        id: "ord_sequence_check",
        email: "guest3@botanicssupply.example",
        subtotalCents: 1000,
        shippingCents: 695,
        totalCents: 1695,
        shippingAddress: {
          fullName: "Sequence Check",
          line1: "1 Test Street",
          line2: null,
          city: "Portland",
          state: "OR",
          postalCode: "97201",
          country: "US",
          phone: null,
        },
      })
      .returning({ orderNumber: orders.orderNumber });
    expect(created?.orderNumber).toBe("BSC-100011");
  });

  it("is idempotent: reseeding replaces everything with identical counts", async () => {
    await seedDatabase(testDb.db, { accounts: seedAccounts });
    expect(await countSeededRows(testDb.db)).toEqual(EXPECTED_COUNTS);
    const leftover = await testDb.db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.id, "ord_sequence_check"));
    expect(leftover).toEqual([]);
  }, 30_000);

  it("seeds only the catalog with catalogOnly", async () => {
    await seedDatabase(testDb.db, { catalogOnly: true });
    expect(await countSeededRows(testDb.db)).toEqual({
      ...EXPECTED_COUNTS,
      users: 0,
      accounts: 0,
      addresses: 0,
      reviews: 0,
      orders: 0,
      order_items: 0,
      discount_codes: 0,
      wishlist_items: 0,
      newsletter_subscribers: 0,
      contact_messages: 0,
    });
  }, 30_000);
});
