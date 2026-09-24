// @vitest-environment node
/**
 * The checkout actions against a real database: proof that the rate limiter
 * in front of them stops a script before `createOrder` claims stock, burns a
 * coupon use or notifies the owner, and that a blocked call writes nothing.
 *
 * The real `orderService` and `rateLimitService` are used; only the database
 * handle, the request headers, the session and the owner notification are
 * replaced.
 */
import { sql } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { siteConfig } from "@/lib/site-config";
import { createTestDb, seedCatalogWithReviews, type TestDb } from "@/test/db";

// `getServerEnv()` parses `process.env` on its first call (the first order
// token), and importing this module does not call it.
process.env.BETTER_AUTH_SECRET = "checkout-rate-limit-secret".padEnd(40, "x");

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  headers: vi.fn(),
  notifyNewOrder: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/auth/guards", () => ({ getSession: async () => null }));
vi.mock("@/lib/email/notifications", () => ({
  notifyNewOrder: mocks.notifyNewOrder,
}));

const { placeOrderAction, quoteOrderAction } = await import("./actions");

type PlaceOrderResult = Awaited<ReturnType<typeof placeOrderAction>>;
type QuoteResult = Awaited<ReturnType<typeof quoteOrderAction>>;

/** A seeded product with stock and no variants (see the seed catalog). */
const PRODUCT_ID = "prod_bubble-beaker-8in";

const BUDGETS = siteConfig.checkout.rateLimits;
const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

let testDb: TestDb;

beforeAll(async () => {
  testDb = await createTestDb({ seed: seedCatalogWithReviews });
  mocks.getDb.mockImplementation(async () => testDb.db);
  mocks.notifyNewOrder.mockResolvedValue({
    sent: false,
    reason: "not-configured",
  });
  const product = await testDb.db.query.products.findFirst({
    where: (row, { eq }) => eq(row.id, PRODUCT_ID),
  });
  if (!product) throw new Error(`No seed product "${PRODUCT_ID}"`);
}, 30_000);

afterAll(async () => {
  await testDb?.close();
});

beforeEach(async () => {
  await testDb.db.execute(sql`delete from order_items`);
  await testDb.db.execute(sql`delete from orders`);
  await testDb.db.execute(sql`delete from rate_limits`);
  mocks.notifyNewOrder.mockClear();
  fromIp("203.0.113.7");
});

/** Every action call that follows arrives from this address. */
function fromIp(ip: string) {
  mocks.headers.mockImplementation(
    async () => new Headers({ "x-forwarded-for": ip }),
  );
}

function address() {
  return {
    firstName: "Ada",
    lastName: "Lovelace",
    line1: "12 Meadow Lane",
    city: "Portland",
    state: "OR",
    postalCode: "97201",
    phone: "(555) 010-4242",
  };
}

function checkoutInput(email: string) {
  return {
    billing: address(),
    shipping: null,
    email,
    orderType: "delivery" as const,
    paymentMethod: "zelle" as const,
    marketingOptIn: false,
    lines: [{ productId: PRODUCT_ID, quantity: 1 }],
  };
}

async function rowCounts(): Promise<{ orders: number; items: number }> {
  const orders = await testDb.db.query.orders.findMany({
    with: { items: true },
  });
  return {
    orders: orders.length,
    items: orders.reduce((total, order) => total + order.items.length, 0),
  };
}

async function stock(): Promise<number> {
  const product = await testDb.db.query.products.findFirst({
    where: (row, { eq }) => eq(row.id, PRODUCT_ID),
  });
  return product?.inventory ?? -1;
}

describe("placeOrderAction rate limiting", () => {
  it("stops repeated orders from one email and writes nothing for them", async () => {
    const limit = BUDGETS.placeOrderPerEmail.limit;
    const before = await stock();

    const results: PlaceOrderResult[] = [];
    for (let attempt = 0; attempt < limit + 3; attempt += 1) {
      results.push(await placeOrderAction(checkoutInput("ada@example.com")));
    }

    expect(results.filter((result) => result.ok)).toHaveLength(limit);
    for (const result of results.slice(limit)) {
      expect(result).toEqual({
        ok: false,
        error: { code: "CONFLICT", message: TOO_MANY },
      });
    }
    // Only the orders that were allowed exist: a blocked attempt writes no
    // order row, no item row, claims no stock and notifies nobody.
    expect(await rowCounts()).toEqual({ orders: limit, items: limit });
    expect(await stock()).toBe(before - limit);
    expect(mocks.notifyNewOrder).toHaveBeenCalledTimes(limit);
  });

  it("stops one IP ordering under fresh email addresses", async () => {
    const limit = BUDGETS.placeOrderPerIp.limit;

    const results: PlaceOrderResult[] = [];
    for (let attempt = 0; attempt < limit + 2; attempt += 1) {
      results.push(
        await placeOrderAction(checkoutInput(`ada+${attempt}@example.com`)),
      );
    }

    expect(results.filter((result) => result.ok)).toHaveLength(limit);
    expect(results.at(-1)).toEqual({
      ok: false,
      error: { code: "CONFLICT", message: TOO_MANY },
    });
    expect(await rowCounts()).toEqual({ orders: limit, items: limit });
  });

  it("leaves another address its own budget", async () => {
    for (
      let attempt = 0;
      attempt < BUDGETS.placeOrderPerIp.limit + 1;
      attempt += 1
    ) {
      await placeOrderAction(checkoutInput(`ada+${attempt}@example.com`));
    }

    fromIp("203.0.113.9");
    const other = await placeOrderAction(checkoutInput("grace@example.com"));

    expect(other.ok).toBe(true);
  });

  it("spends no budget on a request the schema rejects", async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const rejected = await placeOrderAction({
        ...checkoutInput("ada@example.com"),
        email: "not-an-email",
      });
      expect(rejected.ok).toBe(false);
    }

    const allowed = await placeOrderAction(checkoutInput("ada@example.com"));

    expect(allowed.ok).toBe(true);
    expect(await rowCounts()).toEqual({ orders: 1, items: 1 });
  });
});

describe("quoteOrderAction coupon rate limiting", () => {
  const lines = [{ productId: PRODUCT_ID, quantity: 1 }];

  function quoteWithCode(discountCode: string): Promise<QuoteResult> {
    return quoteOrderAction({ lines, orderType: "delivery", discountCode });
  }

  function tooMany(result: QuoteResult) {
    expect(result).toEqual({
      ok: false,
      error: { code: "CONFLICT", message: TOO_MANY },
    });
  }

  it("stops coupon guessing after a handful of distinct codes", async () => {
    const limit = BUDGETS.quoteCouponCodesPerIp.limit;

    const results: QuoteResult[] = [];
    for (let guess = 0; guess < limit + 2; guess += 1) {
      results.push(
        await quoteOrderAction({
          lines,
          orderType: "delivery",
          discountCode: `GUESS${guess}`,
        }),
      );
    }

    expect(results.filter((result) => result.ok)).toHaveLength(limit);
    expect(results.at(-1)).toEqual({
      ok: false,
      error: { code: "CONFLICT", message: TOO_MANY },
    });
  });

  it("never limits a customer retrying the same code, or quoting without one", async () => {
    for (let retry = 0; retry < 12; retry += 1) {
      const result = await quoteOrderAction({
        lines,
        orderType: retry % 2 === 0 ? "delivery" : "pickup",
        discountCode: "WELCOME10",
      });
      expect(result.ok).toBe(true);
    }

    const withoutCode = await quoteOrderAction({
      lines,
      orderType: "delivery",
    });

    expect(withoutCode.ok).toBe(true);
  });

  /**
   * The bypass the free-retry rule invites: a code is only free to retry
   * because it was already paid for. Marking a code before the budget has
   * allowed it would make a *blocked* code look like a retry on its next try
   * and get it priced, leaving a guesser held by nothing but the per-IP quote
   * budget (60 a minute) while the quote still tells valid codes from invalid
   * ones.
   */
  it("keeps blocking a code the budget turned away, however often it is re-sent", async () => {
    const limit = BUDGETS.quoteCouponCodesPerIp.limit;
    for (let guess = 0; guess < limit; guess += 1) {
      expect((await quoteWithCode(`GUESS${guess}`)).ok).toBe(true);
    }

    tooMany(await quoteWithCode("GUESSOVER"));
    tooMany(await quoteWithCode("GUESSOVER"));
    tooMany(await quoteWithCode("GUESSOVER"));
    // And no other unseen code slips through on the back of those tries.
    tooMany(await quoteWithCode("GUESSNEXT"));
  });

  it("still prices a code accepted under budget once the budget is spent", async () => {
    const limit = BUDGETS.quoteCouponCodesPerIp.limit;
    expect((await quoteWithCode("WELCOME10")).ok).toBe(true);
    for (let guess = 0; guess < limit; guess += 1) {
      await quoteWithCode(`GUESS${guess}`);
    }
    tooMany(await quoteWithCode("GUESSOVER"));

    const retried = await quoteWithCode("WELCOME10");

    expect(retried.ok).toBe(true);
  });

  it("prices a code quoted in parallel for the first time, and keeps it free after", async () => {
    const parallel = await Promise.all([
      quoteWithCode("WELCOME10"),
      quoteWithCode("WELCOME10"),
      quoteWithCode("WELCOME10"),
    ]);

    // Each first try may spend a count of the budget; none may be refused,
    // and the code stays free once any of them has marked it.
    expect(parallel.filter((result) => result.ok)).toHaveLength(3);
    expect((await quoteWithCode("WELCOME10")).ok).toBe(true);
  });
});
