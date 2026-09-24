// @vitest-environment node
import { count, eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  discountCodes,
  newsletterSubscribers,
  orderItems,
  orders,
  products,
  productVariants,
  users,
} from "@/lib/db/schema";
import { buildSeedCatalog } from "@/lib/db/seed-data/catalog";
import type { NewOrderNotification } from "@/lib/email/notifications";
import type { SendResult } from "@/lib/email/send";
import { AppError } from "@/lib/errors";
import { createOrderToken } from "@/lib/order-access";
import { assertTotalsConsistent, type OrderTotals } from "@/lib/order-pricing";
import type { PaymentMethodConfig } from "@/lib/payment-methods";
import { siteConfig } from "@/lib/site-config";
import type { FeatureFlags } from "@/lib/site-config";
import type { CheckoutAddressInput } from "@/lib/validation/checkout.schema";
import { createTestDb, seedCatalogWithReviews, type TestDb } from "@/test/db";
import type { OrderAddress } from "@/types/order";
import { createOrderService, type CreateOrderInput } from "./order.service";

// `getServerEnv()` parses `process.env` on its first call (the first order
// token), and importing this module does not call it.
process.env.BETTER_AUTH_SECRET = "order-service-test-secret".padEnd(40, "x");

let testDb: TestDb;

beforeAll(async () => {
  testDb = await createTestDb({ seed: seedCatalogWithReviews });
}, 30_000);

afterAll(async () => {
  await testDb?.close();
});

const catalog = buildSeedCatalog();

/* Seed fixtures, by id, so the numbers below stay honest if the seed moves. */
const BEAKER_ID = "prod_bubble-beaker-8in";
const OIL_ID = "prod_calm-full-spectrum-oil";
const OIL_1000_VARIANT_ID = "var_calm-full-spectrum-oil-1000";
const SOLD_OUT_ID = "prod_unflavored-isolate-oil";
const ARCHIVED_ID = "prod_gift-box";
const HEMP_FLOWER_ID = "prod_lifter-hemp-flower";

function seedProduct(id: string) {
  const product = catalog.products.find((p) => p.id === id);
  if (!product) throw new Error(`No seed product "${id}"`);
  return product;
}

function seedVariant(id: string) {
  const variant = catalog.productVariants.find((v) => v.id === id);
  if (!variant) throw new Error(`No seed variant "${id}"`);
  return variant;
}

function seedImageUrl(productId: string): string | null {
  return (
    catalog.productImages
      .filter((image) => image.productId === productId)
      .toSorted((a, b) => a.sortOrder - b.sortOrder)[0]?.url ?? null
  );
}

const BEAKER = seedProduct(BEAKER_ID);
const OIL = seedProduct(OIL_ID);
const OIL_1000 = seedVariant(OIL_1000_VARIANT_ID);

/* The prices the assertions below are built on. */
const BEAKER_PRICE = 2800;
const OIL_1000_PRICE = 6400;
const DELIVERY_FEE = siteConfig.checkout.delivery.deliveryFeeCents;

const BILLING: CheckoutAddressInput = {
  firstName: "Jordan",
  lastName: "Ellis",
  company: null,
  country: "US",
  line1: "560 Birch Court",
  line2: null,
  city: "Boise",
  state: "ID",
  postalCode: "83702",
  phone: "(208) 555-0114",
};

const SHIPPING: CheckoutAddressInput = {
  ...BILLING,
  firstName: "Casey",
  lastName: "Ellis",
  company: "Birch Studio",
  line1: "12 Alder Way",
  line2: "Unit 4",
  city: "Bend",
  state: "OR",
  postalCode: "97701",
};

function expectedAddress(address: CheckoutAddressInput): OrderAddress {
  return {
    fullName: `${address.firstName} ${address.lastName}`,
    company: address.company,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    phone: address.phone,
  };
}

/** Both lines together clear the free-delivery threshold. */
const TWO_LINES = [
  { productId: BEAKER_ID, variantId: null, quantity: 1 },
  { productId: OIL_ID, variantId: OIL_1000_VARIANT_ID, quantity: 1 },
];

function checkoutInput(
  overrides: Partial<CreateOrderInput> = {},
): CreateOrderInput {
  return {
    userId: null,
    billing: BILLING,
    shipping: null,
    email: "Guest@Example.com",
    notes: null,
    orderType: "delivery",
    paymentMethod: "zelle",
    marketingOptIn: false,
    discountCode: null,
    lines: TWO_LINES,
    ...overrides,
  };
}

const notifyOrder = vi.fn<(order: NewOrderNotification) => Promise<SendResult>>(
  async () => ({ sent: true, id: "msg_test" }),
);

interface ServiceOptions {
  features?: FeatureFlags;
  paymentMethods?: readonly PaymentMethodConfig[];
  notifyOrder?: (order: NewOrderNotification) => Promise<SendResult>;
}

function orderServiceFor(options: ServiceOptions = {}) {
  return createOrderService({
    getDb: async () => testDb.db,
    features: options.features ?? { smokableHemp: true },
    paymentMethods: options.paymentMethods,
    notifyOrder: options.notifyOrder ?? notifyOrder,
  });
}

/* Read helpers, for the "nothing was written" assertions. */
async function rowCounts(): Promise<{ orders: number; items: number }> {
  const [orderRow] = await testDb.db.select({ total: count() }).from(orders);
  const [itemRow] = await testDb.db.select({ total: count() }).from(orderItems);
  return { orders: orderRow?.total ?? 0, items: itemRow?.total ?? 0 };
}

async function productStock(id: string): Promise<number> {
  const [row] = await testDb.db
    .select({ inventory: products.inventory })
    .from(products)
    .where(eq(products.id, id));
  if (!row) throw new Error(`No product "${id}"`);
  return row.inventory;
}

async function variantStock(id: string): Promise<number> {
  const [row] = await testDb.db
    .select({ inventory: productVariants.inventory })
    .from(productVariants)
    .where(eq(productVariants.id, id));
  if (!row) throw new Error(`No variant "${id}"`);
  return row.inventory;
}

async function codeUses(code: string): Promise<number> {
  const [row] = await testDb.db
    .select({ uses: discountCodes.uses })
    .from(discountCodes)
    .where(eq(discountCodes.code, code));
  if (!row) throw new Error(`No discount code "${code}"`);
  return row.uses;
}

async function storedOrder(orderNumber: string) {
  const row = await testDb.db.query.orders.findFirst({
    where: eq(orders.orderNumber, orderNumber),
    with: { items: true },
  });
  if (!row) throw new Error(`No order "${orderNumber}"`);
  return row;
}

let codeSeq = 0;

type DiscountCodeInsert = typeof discountCodes.$inferInsert;

/** A fresh code per test, so `uses` assertions can't interfere. */
async function insertCode(
  overrides: Partial<DiscountCodeInsert> = {},
): Promise<string> {
  codeSeq += 1;
  const code = `TESTCODE${codeSeq}`;
  await testDb.db.insert(discountCodes).values({
    id: `disc_test_${codeSeq}`,
    code,
    type: "percent",
    value: 10,
    minSubtotalCents: 0,
    active: true,
    maxUses: null,
    uses: 0,
    ...overrides,
  });
  return code;
}

/** Every row these tests order from or change the stock of. */
const FIXTURE_PRODUCT_IDS = [
  BEAKER_ID,
  OIL_ID,
  SOLD_OUT_ID,
  ARCHIVED_ID,
  HEMP_FLOWER_ID,
];
const FIXTURE_VARIANT_IDS = [
  OIL_1000_VARIANT_ID,
  "var_calm-full-spectrum-oil-500",
];

/** Restores the fixture stock, so each test starts from the seeded inventory. */
async function resetStock(): Promise<void> {
  for (const id of FIXTURE_PRODUCT_IDS) {
    await testDb.db
      .update(products)
      .set({ inventory: seedProduct(id).inventory })
      .where(eq(products.id, id));
  }
  for (const id of FIXTURE_VARIANT_IDS) {
    await testDb.db
      .update(productVariants)
      .set({ inventory: seedVariant(id).inventory })
      .where(eq(productVariants.id, id));
  }
}

beforeEach(() => {
  notifyOrder.mockClear();
});

afterEach(async () => {
  await testDb.db.delete(orderItems);
  await testDb.db.delete(orders);
  await testDb.db.delete(newsletterSubscribers);
  await testDb.db.delete(discountCodes);
  await resetStock();
});

describe("priceOrder", () => {
  it("prices product-level and variant-level lines with snapshot fields", async () => {
    const quote = await orderServiceFor().priceOrder(TWO_LINES, {
      orderType: "delivery",
    });

    expect(quote.issues).toEqual([]);
    expect(quote.lines).toEqual([
      {
        productId: BEAKER_ID,
        variantId: null,
        productName: BEAKER.name,
        variantName: null,
        sku: BEAKER.sku,
        imageUrl: seedImageUrl(BEAKER_ID),
        quantity: 1,
        unitPriceCents: BEAKER_PRICE,
        lineTotalCents: BEAKER_PRICE,
      },
      {
        productId: OIL_ID,
        variantId: OIL_1000_VARIANT_ID,
        productName: OIL.name,
        variantName: OIL_1000.name,
        sku: OIL_1000.sku,
        imageUrl: seedImageUrl(OIL_ID),
        quantity: 1,
        unitPriceCents: OIL_1000_PRICE,
        lineTotalCents: OIL_1000_PRICE,
      },
    ]);
    // 9200 clears the free-delivery threshold; both tax rates are 0.
    expect(quote.totals).toEqual({
      subtotalCents: 9200,
      discountCents: 0,
      shippingCents: 0,
      exciseTaxCents: 0,
      salesTaxCents: 0,
      taxCents: 0,
      totalCents: 9200,
    });
  });

  it("falls back to the product price when the variant has none", async () => {
    const defaultVariant = seedVariant("var_calm-full-spectrum-oil-500");
    expect(defaultVariant.priceCents).toBeNull();

    const quote = await orderServiceFor().priceOrder(
      [{ productId: OIL_ID, variantId: defaultVariant.id, quantity: 2 }],
      { orderType: "delivery" },
    );
    expect(quote.lines[0]?.unitPriceCents).toBe(OIL.priceCents);
    expect(quote.lines[0]?.lineTotalCents).toBe(OIL.priceCents * 2);
  });

  it("charges delivery below the threshold and nothing for pickup", async () => {
    const line = [{ productId: BEAKER_ID, variantId: null, quantity: 1 }];
    const service = orderServiceFor();

    const delivery = await service.priceOrder(line, { orderType: "delivery" });
    expect(delivery.totals.shippingCents).toBe(DELIVERY_FEE);
    expect(delivery.totals.totalCents).toBe(BEAKER_PRICE + DELIVERY_FEE);

    const pickup = await service.priceOrder(line, { orderType: "pickup" });
    expect(pickup.totals.shippingCents).toBe(0);
    expect(pickup.totals.totalCents).toBe(BEAKER_PRICE);
  });

  it("merges duplicate lines and clamps to the per-line maximum", async () => {
    const { maxQuantityPerLine } = siteConfig.cart;
    const quote = await orderServiceFor().priceOrder(
      [
        { productId: BEAKER_ID, variantId: null, quantity: 8 },
        { productId: BEAKER_ID, variantId: null, quantity: 5 },
      ],
      { orderType: "delivery" },
    );

    expect(quote.lines).toHaveLength(1);
    expect(quote.lines[0]?.quantity).toBe(maxQuantityPerLine);
    expect(quote.totals.subtotalCents).toBe(BEAKER_PRICE * maxQuantityPerLine);
  });

  it("caps an order at 50 lines", async () => {
    const lines = catalog.products
      .filter((product) => product.status === "active" && product.inventory > 0)
      .slice(0, 60)
      .map((product) => ({
        productId: product.id,
        variantId: null,
        quantity: 1,
      }));
    expect(lines.length).toBeGreaterThan(50);

    const quote = await orderServiceFor().priceOrder(lines, {
      orderType: "delivery",
    });
    expect(quote.lines).toHaveLength(50);
    expect(quote.issues).toEqual([]);
  });

  it("reports out-of-stock lines and drops them", async () => {
    const soldOut = seedProduct(SOLD_OUT_ID);
    const quote = await orderServiceFor().priceOrder(
      [
        { productId: BEAKER_ID, variantId: null, quantity: 1 },
        { productId: SOLD_OUT_ID, variantId: null, quantity: 1 },
      ],
      { orderType: "delivery" },
    );

    expect(quote.lines.map((line) => line.productId)).toEqual([BEAKER_ID]);
    expect(quote.issues).toEqual([
      {
        kind: "out_of_stock",
        label: soldOut.name,
        productId: SOLD_OUT_ID,
        variantId: null,
      },
    ]);
    expect(quote.totals.subtotalCents).toBe(BEAKER_PRICE);
  });

  it("reports a line asking for more than the remaining stock", async () => {
    await testDb.db
      .update(products)
      .set({ inventory: 1 })
      .where(eq(products.id, BEAKER_ID));

    const quote = await orderServiceFor().priceOrder(
      [{ productId: BEAKER_ID, variantId: null, quantity: 2 }],
      { orderType: "delivery" },
    );
    expect(quote.lines).toEqual([]);
    expect(quote.issues[0]?.kind).toBe("out_of_stock");
  });

  it("reports archived, unknown and hidden-category products as unavailable", async () => {
    const quote = await orderServiceFor({
      features: { smokableHemp: false },
    }).priceOrder(
      [
        { productId: ARCHIVED_ID, variantId: null, quantity: 1 },
        { productId: HEMP_FLOWER_ID, variantId: null, quantity: 1 },
        { productId: "prod_does-not-exist", variantId: null, quantity: 1 },
      ],
      { orderType: "delivery" },
    );

    expect(quote.lines).toEqual([]);
    expect(quote.issues.map((issue) => issue.kind)).toEqual([
      "unavailable",
      "unavailable",
      "unavailable",
    ]);
    expect(quote.issues.map((issue) => issue.productId)).toEqual([
      ARCHIVED_ID,
      HEMP_FLOWER_ID,
      "prod_does-not-exist",
    ]);
    // Named so the customer knows which line to remove; an id we know
    // nothing about can only be described generically.
    expect(quote.issues.map((issue) => issue.label)).toEqual([
      seedProduct(ARCHIVED_ID).name,
      seedProduct(HEMP_FLOWER_ID).name,
      "An item in your cart",
    ]);
  });

  it("rejects a variant that belongs to another product", async () => {
    const quote = await orderServiceFor().priceOrder(
      [
        {
          productId: BEAKER_ID,
          variantId: OIL_1000_VARIANT_ID,
          quantity: 1,
        },
      ],
      { orderType: "delivery" },
    );
    expect(quote.lines).toEqual([]);
    expect(quote.issues[0]).toEqual({
      kind: "unavailable",
      label: BEAKER.name,
      productId: BEAKER_ID,
      variantId: OIL_1000_VARIANT_ID,
    });
  });

  describe("coupons", () => {
    it("applies an active code", async () => {
      const code = await insertCode({ type: "percent", value: 10 });
      const quote = await orderServiceFor().priceOrder(TWO_LINES, {
        orderType: "delivery",
        discountCode: code,
      });

      expect(quote.issues).toEqual([]);
      expect(quote.discountCode).toBe(code);
      expect(quote.totals.discountCents).toBe(920);
      expect(quote.totals.totalCents).toBe(9200 - 920);
    });

    it.each([
      ["expired", { expiresAt: new Date("2020-01-01T00:00:00.000Z") }],
      ["inactive", { active: false }],
      ["under its minimum subtotal", { minSubtotalCents: 1_000_000 }],
      ["exhausted", { maxUses: 1, uses: 1 }],
    ])("rejects a code that is %s", async (_label, overrides) => {
      const code = await insertCode(overrides);
      const quote = await orderServiceFor().priceOrder(TWO_LINES, {
        orderType: "delivery",
        discountCode: code,
      });

      expect(quote.discountCode).toBeNull();
      expect(quote.totals.discountCents).toBe(0);
      expect(quote.totals.totalCents).toBe(9200);
      expect(quote.issues).toEqual([
        {
          kind: "invalid_coupon",
          label: code,
          productId: null,
          variantId: null,
        },
      ]);
    });

    it("rejects an unknown code", async () => {
      const quote = await orderServiceFor().priceOrder(TWO_LINES, {
        orderType: "delivery",
        discountCode: "NOPE",
      });
      expect(quote.issues[0]?.kind).toBe("invalid_coupon");
      expect(quote.totals.discountCents).toBe(0);
    });
  });
});

describe("createOrder", () => {
  it("stores a guest order end to end", async () => {
    const result = await orderServiceFor().createOrder(
      checkoutInput({
        shipping: SHIPPING,
        notes: "Leave with the neighbour.",
        marketingOptIn: true,
      }),
    );

    expect(result.orderNumber).toMatch(/^BSC-1\d{5}$/);
    expect(result.token).toHaveLength(32);
    expect(result.totals.totalCents).toBe(9200);

    const order = await storedOrder(result.orderNumber);
    expect(order.id).toBe(result.orderId);
    expect(order.userId).toBeNull();
    expect(order.email).toBe("guest@example.com");
    expect(order.status).toBe("pending");
    expect(order.paymentStatus).toBe("pending");
    expect(order.subtotalCents).toBe(9200);
    expect(order.shippingCents).toBe(0);
    expect(order.discountCents).toBe(0);
    expect(order.taxCents).toBe(0);
    expect(order.totalCents).toBe(9200);
    expect(order.discountCode).toBeNull();
    expect(order.notes).toBe("Leave with the neighbour.");
    expect(order.billingAddress).toEqual(expectedAddress(BILLING));
    expect(order.shippingAddress).toEqual(expectedAddress(SHIPPING));
    expect(order.checkoutMeta).toEqual({
      paymentMethod: "zelle",
      orderType: "delivery",
      exciseTaxCents: 0,
      salesTaxCents: 0,
      marketingOptIn: true,
    });

    expect(order.items).toHaveLength(2);
    const beakerItem = order.items.find((item) => item.productId === BEAKER_ID);
    expect(beakerItem).toMatchObject({
      variantId: null,
      productName: BEAKER.name,
      variantName: null,
      sku: BEAKER.sku,
      quantity: 1,
      unitPriceCents: BEAKER_PRICE,
      totalCents: BEAKER_PRICE,
      imageUrl: seedImageUrl(BEAKER_ID),
    });
    expect(order.items.find((item) => item.productId === OIL_ID)).toMatchObject(
      {
        variantId: OIL_1000_VARIANT_ID,
        variantName: OIL_1000.name,
        sku: OIL_1000.sku,
        unitPriceCents: OIL_1000_PRICE,
      },
    );

    const subscribers = await testDb.db.select().from(newsletterSubscribers);
    expect(subscribers.map((row) => row.email)).toEqual(["guest@example.com"]);

    expect(notifyOrder).toHaveBeenCalledTimes(1);
    expect(notifyOrder).toHaveBeenCalledWith({
      orderNumber: result.orderNumber,
      customerEmail: "guest@example.com",
      totalCents: 9200,
      itemCount: 2,
      placedAt: expect.any(Date),
    });
  });

  it("uses the billing address as the shipping snapshot for pickup", async () => {
    const result = await orderServiceFor().createOrder(
      checkoutInput({ orderType: "pickup", shipping: null }),
    );
    const order = await storedOrder(result.orderNumber);

    expect(order.shippingAddress).toEqual(expectedAddress(BILLING));
    expect(order.shippingCents).toBe(0);
    expect(order.checkoutMeta?.orderType).toBe("pickup");
  });

  it("links the order to the signed-in user", async () => {
    await testDb.db
      .insert(users)
      .values({ id: "usr_test_owner", name: "Ada Park", email: "ada@test.dev" })
      .onConflictDoNothing();

    const result = await orderServiceFor().createOrder(
      checkoutInput({ userId: "usr_test_owner" }),
    );
    const order = await storedOrder(result.orderNumber);
    expect(order.userId).toBe("usr_test_owner");
  });

  it("decrements product and variant inventory", async () => {
    const productBefore = await productStock(BEAKER_ID);
    const variantBefore = await variantStock(OIL_1000_VARIANT_ID);
    const oilProductBefore = await productStock(OIL_ID);

    await orderServiceFor().createOrder(
      checkoutInput({
        lines: [
          { productId: BEAKER_ID, variantId: null, quantity: 2 },
          { productId: OIL_ID, variantId: OIL_1000_VARIANT_ID, quantity: 3 },
        ],
      }),
    );

    expect(await productStock(BEAKER_ID)).toBe(productBefore - 2);
    expect(await variantStock(OIL_1000_VARIANT_ID)).toBe(variantBefore - 3);
    // A variant sale is never counted twice against the product row.
    expect(await productStock(OIL_ID)).toBe(oilProductBefore);
  });

  it("never lets stock go negative, even for back-to-back orders", async () => {
    await testDb.db
      .update(products)
      .set({ inventory: 1 })
      .where(eq(products.id, BEAKER_ID));
    const service = orderServiceFor();
    const line = [{ productId: BEAKER_ID, variantId: null, quantity: 1 }];

    await service.createOrder(checkoutInput({ lines: line }));
    await expect(
      service.createOrder(checkoutInput({ lines: line })),
    ).rejects.toThrow(/out of stock/);

    expect(await productStock(BEAKER_ID)).toBe(0);
    expect(await rowCounts()).toEqual({ orders: 1, items: 1 });
  });

  it.each([
    ["out of stock", SOLD_OUT_ID, /out of stock/],
    ["archived", ARCHIVED_ID, /no longer available/],
  ])(
    "refuses an order containing a %s product and writes nothing",
    async (_label, productId, message) => {
      const before = await rowCounts();
      const stockBefore = await productStock(BEAKER_ID);

      const error = await orderServiceFor()
        .createOrder(
          checkoutInput({
            lines: [
              { productId: BEAKER_ID, variantId: null, quantity: 1 },
              { productId, variantId: null, quantity: 1 },
            ],
          }),
        )
        .catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject({ code: "CONFLICT" });
      expect((error as Error).message).toMatch(message);
      expect((error as Error).message).toContain(seedProduct(productId).name);

      expect(await rowCounts()).toEqual(before);
      expect(await productStock(BEAKER_ID)).toBe(stockBefore);
      expect(notifyOrder).not.toHaveBeenCalled();
    },
  );

  it("refuses an order containing a hidden-category product", async () => {
    const before = await rowCounts();
    await expect(
      orderServiceFor({ features: { smokableHemp: false } }).createOrder(
        checkoutInput({
          lines: [{ productId: HEMP_FLOWER_ID, variantId: null, quantity: 1 }],
        }),
      ),
    ).rejects.toThrow(/no longer available/);

    expect(await rowCounts()).toEqual(before);
    expect(await productStock(HEMP_FLOWER_ID)).toBe(
      seedProduct(HEMP_FLOWER_ID).inventory,
    );
  });

  it("rejects a payment method the shop does not accept", async () => {
    const disabled: PaymentMethodConfig[] =
      siteConfig.checkout.paymentMethods.map((method) => ({
        ...method,
        enabled: method.id !== "zelle",
      }));
    const before = await rowCounts();

    const error = await orderServiceFor({ paymentMethods: disabled })
      .createOrder(checkoutInput({ paymentMethod: "zelle" }))
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: "VALIDATION",
      fieldErrors: { paymentMethod: [expect.any(String)] },
    });
    expect(await rowCounts()).toEqual(before);
  });

  it("applies a coupon and increments its uses", async () => {
    const code = await insertCode({ type: "fixed", value: 500 });
    const result = await orderServiceFor().createOrder(
      checkoutInput({ discountCode: code }),
    );

    const order = await storedOrder(result.orderNumber);
    expect(order.discountCode).toBe(code);
    expect(order.discountCents).toBe(500);
    expect(order.totalCents).toBe(9200 - 500);
    expect(await codeUses(code)).toBe(1);
  });

  it("stores an order at full price when the coupon is rejected", async () => {
    const code = await insertCode({ active: false });
    const result = await orderServiceFor().createOrder(
      checkoutInput({ discountCode: code }),
    );

    const order = await storedOrder(result.orderNumber);
    expect(order.discountCode).toBeNull();
    expect(order.discountCents).toBe(0);
    expect(order.totalCents).toBe(9200);
    expect(await codeUses(code)).toBe(0);
  });

  it("stops applying a code once its last use is taken", async () => {
    const code = await insertCode({ maxUses: 1 });
    const service = orderServiceFor();

    const first = await service.createOrder(
      checkoutInput({ discountCode: code }),
    );
    expect((await storedOrder(first.orderNumber)).discountCents).toBe(920);

    const second = await service.createOrder(
      checkoutInput({ discountCode: code }),
    );
    const secondOrder = await storedOrder(second.orderNumber);
    expect(secondOrder.discountCents).toBe(0);
    expect(secondOrder.totalCents).toBe(9200);
    expect(await codeUses(code)).toBe(1);
  });

  it("keeps the order when the notification fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const failing = vi.fn(async () => {
      await Promise.resolve();
      throw new Error("resend is down");
    });

    try {
      const result = await orderServiceFor({
        notifyOrder: failing,
      }).createOrder(checkoutInput());
      expect(failing).toHaveBeenCalledTimes(1);
      await expect(storedOrder(result.orderNumber)).resolves.toMatchObject({
        totalCents: 9200,
      });
      expect(consoleError).toHaveBeenCalledWith(
        expect.objectContaining({ event: "unexpected_error" }),
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("logs when no notification could be sent", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const result = await orderServiceFor({
        notifyOrder: async () => ({ sent: false, reason: "not-configured" }),
      }).createOrder(checkoutInput());
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "order_notification_not_sent",
          orderNumber: result.orderNumber,
          reason: "not-configured",
        }),
      );
    } finally {
      consoleWarn.mockRestore();
    }
  });

  it("numbers orders from the sequence", async () => {
    const service = orderServiceFor();
    const first = await service.createOrder(checkoutInput());
    const second = await service.createOrder(checkoutInput());

    expect(first.orderNumber).toMatch(/^BSC-1\d{5}$/);
    expect(second.orderNumber).toMatch(/^BSC-1\d{5}$/);
    expect(Number(second.orderNumber.slice(4))).toBe(
      Number(first.orderNumber.slice(4)) + 1,
    );
  });

  it("catches inconsistent totals before Postgres has to", async () => {
    // What `computeOrderTotals` must never produce: the total ignores the
    // delivery fee. `assertTotalsConsistent` is the gate in front of the
    // insert, and the DB check constraint is the backstop behind it.
    const broken: OrderTotals = {
      subtotalCents: BEAKER_PRICE,
      discountCents: 0,
      shippingCents: DELIVERY_FEE,
      exciseTaxCents: 0,
      salesTaxCents: 0,
      taxCents: 0,
      totalCents: BEAKER_PRICE,
    };
    expect(() => assertTotalsConsistent(broken)).toThrow(
      /Inconsistent order totals/,
    );

    const insert = testDb.db.insert(orders).values({
      id: "ord_broken_totals",
      email: "broken@example.com",
      subtotalCents: broken.subtotalCents,
      shippingCents: broken.shippingCents,
      totalCents: broken.totalCents,
      shippingAddress: expectedAddress(BILLING),
    });
    await expect(insert).rejects.toThrow();
    expect((await rowCounts()).orders).toBe(0);
  });
});

describe("getOrderByNumber", () => {
  it("returns the order and items for the token from the link", async () => {
    const service = orderServiceFor();
    const created = await service.createOrder(checkoutInput());

    const order = await service.getOrderByNumber(created.orderNumber, {
      token: created.token,
    });
    expect(order?.id).toBe(created.orderId);
    expect(order?.items).toHaveLength(2);
    expect(order?.totalCents).toBe(9200);
    expect(order?.checkoutMeta?.paymentMethod).toBe("zelle");
  });

  it("returns null for a wrong, missing or foreign token", async () => {
    const service = orderServiceFor();
    const created = await service.createOrder(checkoutInput());

    await expect(
      service.getOrderByNumber(created.orderNumber, { token: "x".repeat(32) }),
    ).resolves.toBeNull();
    await expect(
      service.getOrderByNumber(created.orderNumber, { token: null }),
    ).resolves.toBeNull();
    await expect(
      service.getOrderByNumber(created.orderNumber, {
        token: createOrderToken("ord_someone_else"),
      }),
    ).resolves.toBeNull();
  });

  it("returns the order for its signed-in owner and nobody else", async () => {
    await testDb.db
      .insert(users)
      .values([
        { id: "usr_owner", name: "Ada Park", email: "owner@test.dev" },
        { id: "usr_stranger", name: "Sam Reed", email: "stranger@test.dev" },
      ])
      .onConflictDoNothing();
    const service = orderServiceFor();
    const created = await service.createOrder(
      checkoutInput({ userId: "usr_owner" }),
    );

    await expect(
      service.getOrderByNumber(created.orderNumber, { userId: "usr_owner" }),
    ).resolves.toMatchObject({ orderNumber: created.orderNumber });
    await expect(
      service.getOrderByNumber(created.orderNumber, { userId: "usr_stranger" }),
    ).resolves.toBeNull();
  });

  it("does not treat a guest order as owned by a signed-in visitor", async () => {
    const service = orderServiceFor();
    const created = await service.createOrder(checkoutInput({ userId: null }));

    await expect(
      service.getOrderByNumber(created.orderNumber, { userId: null }),
    ).resolves.toBeNull();
  });

  it("returns null for an unknown order number", async () => {
    await expect(
      orderServiceFor().getOrderByNumber("BSC-999999", {
        token: "x".repeat(32),
      }),
    ).resolves.toBeNull();
  });
});
