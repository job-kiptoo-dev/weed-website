// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "@/lib/errors";
import { rateLimitKey } from "@/lib/rate-limit";
import { siteConfig } from "@/lib/site-config";
import type { OrderQuote } from "@/types/order";

const getSessionMock = vi.fn();
const priceOrderMock = vi.fn();
const createOrderMock = vi.fn();
const consumeMock = vi.fn();
const stripeConfiguredMock = vi.fn();
const firstUseInWindowMock = vi.fn();
const seenInWindowMock = vi.fn();

const CLIENT_IP = "203.0.113.7";

vi.mock("@/lib/auth/guards", () => ({ getSession: getSessionMock }));
// Only the derived flag, so a test can stand in either environment; the rules
// that decide it live in `src/lib/env.test.ts`.
vi.mock("@/lib/env", () => ({ stripeConfigured: stripeConfiguredMock }));
vi.mock("@/services/order.service", () => ({
  orderService: { priceOrder: priceOrderMock, createOrder: createOrderMock },
}));
vi.mock("@/services/rate-limit.service", () => ({
  rateLimitService: {
    consume: consumeMock,
    firstUseInWindow: firstUseInWindowMock,
    seenInWindow: seenInWindowMock,
  },
}));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ "x-forwarded-for": `${CLIENT_IP}, 70.41.3.18` }),
}));

const BUDGETS = siteConfig.checkout.rateLimits;
const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

/** What the limiter returns while the caller is within budget. */
function allowed() {
  return { ok: true, count: 1, limit: 5, retryAfterMs: 1000 };
}

function denied() {
  return { ok: false, count: 99, limit: 5, retryAfterMs: 1000 };
}

/** The keys the limiter was asked about, paired with their budgets. */
function consumedKeys(): [string, unknown][] {
  return consumeMock.mock.calls.map((call) => [
    call[0] as string,
    call[1] as unknown,
  ]);
}

const { placeOrderAction, quoteOrderAction } = await import("./actions");

const quote: OrderQuote = {
  lines: [
    {
      productId: "prod_1",
      variantId: null,
      productName: "Calm tincture",
      variantName: null,
      sku: "SKU-1",
      imageUrl: null,
      quantity: 2,
      unitPriceCents: 4900,
      lineTotalCents: 9800,
    },
  ],
  totals: {
    subtotalCents: 9800,
    discountCents: 0,
    shippingCents: 0,
    exciseTaxCents: 0,
    salesTaxCents: 0,
    taxCents: 0,
    totalCents: 9800,
  },
  orderType: "delivery",
  discountCode: null,
  issues: [],
};

function address(overrides: Record<string, unknown> = {}) {
  return {
    firstName: "Ada",
    lastName: "Lovelace",
    line1: "12 Meadow Lane",
    city: "Portland",
    state: "or",
    postalCode: "97201",
    phone: "(555) 010-4242",
    ...overrides,
  };
}

function checkoutInput(overrides: Record<string, unknown> = {}) {
  return {
    billing: address(),
    shipping: null,
    email: "Ada@Example.com",
    orderType: "delivery" as const,
    paymentMethod: "zelle" as const,
    marketingOptIn: true,
    lines: [{ productId: "prod_1", quantity: 2 }],
    ...overrides,
  };
}

beforeEach(() => {
  getSessionMock.mockReset();
  getSessionMock.mockResolvedValue(null);
  priceOrderMock.mockReset();
  createOrderMock.mockReset();
  consumeMock.mockReset();
  consumeMock.mockResolvedValue(allowed());
  firstUseInWindowMock.mockReset();
  firstUseInWindowMock.mockResolvedValue(true);
  seenInWindowMock.mockReset();
  seenInWindowMock.mockResolvedValue(false);
  // Stripe is not provisioned yet, so "off" is the real default.
  stripeConfiguredMock.mockReset();
  stripeConfiguredMock.mockReturnValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("quoteOrderAction", () => {
  it("prices the cart with the requested order type and coupon", async () => {
    priceOrderMock.mockResolvedValue(quote);

    const result = await quoteOrderAction({
      lines: [{ productId: "prod_1", quantity: 2 }],
      orderType: "pickup",
      discountCode: " welcome10 ",
    });

    expect(result).toEqual({ ok: true, data: quote });
    expect(priceOrderMock).toHaveBeenCalledWith(
      [{ productId: "prod_1", variantId: null, quantity: 2 }],
      { orderType: "pickup", discountCode: "WELCOME10" },
    );
  });

  it("rejects invalid input with field errors and never calls the service", async () => {
    const result = await quoteOrderAction({
      lines: [{ productId: "prod_1", quantity: 99 }],
      orderType: "delivery",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION");
    expect(result.error.fieldErrors).toHaveProperty("lines.0.quantity");
    expect(priceOrderMock).not.toHaveBeenCalled();
  });

  it("rejects an empty cart", async () => {
    const result = await quoteOrderAction({ lines: [], orderType: "delivery" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.fieldErrors?.lines).toEqual(["Your cart is empty."]);
  });
});

describe("placeOrderAction", () => {
  it("creates the order and returns the tokenised confirmation path", async () => {
    createOrderMock.mockResolvedValue({
      orderId: "ord_1",
      orderNumber: "BSC-100042",
      token: "tok en/1",
      totals: quote.totals,
    });

    const result = await placeOrderAction(checkoutInput());

    expect(result).toEqual({
      ok: true,
      data: {
        orderNumber: "BSC-100042",
        confirmationPath: "/checkout/confirmation/BSC-100042?t=tok%20en%2F1",
      },
    });
  });

  it("takes the user id from the session, not the payload", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user_1" } });
    createOrderMock.mockResolvedValue({
      orderId: "ord_1",
      orderNumber: "BSC-100043",
      token: "tok",
      totals: quote.totals,
    });

    await placeOrderAction(checkoutInput({ userId: "user_impostor" }));

    expect(createOrderMock).toHaveBeenCalledTimes(1);
    const input: unknown = createOrderMock.mock.calls[0]?.[0];
    expect(input).toMatchObject({
      userId: "user_1",
      email: "Ada@Example.com",
      billing: { country: "US", state: "OR" },
      shipping: null,
      marketingOptIn: true,
    });
  });

  it("returns field errors for an incomplete address without creating anything", async () => {
    const result = await placeOrderAction(
      checkoutInput({ billing: address({ phone: "555" }), email: "nope" }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION");
    expect(result.error.fieldErrors).toHaveProperty("billing.phone");
    expect(result.error.fieldErrors).toHaveProperty("email");
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("refuses a card order when Stripe is unconfigured, before any write", async () => {
    const result = await placeOrderAction(
      checkoutInput({ paymentMethod: "card" }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION");
    expect(result.error.fieldErrors?.paymentMethod).toEqual([
      "Card payments are unavailable right now. Please choose another method.",
    ]);
    expect(createOrderMock).not.toHaveBeenCalled();
    expect(consumeMock).not.toHaveBeenCalled();
  });

  it("accepts a card order when Stripe is configured", async () => {
    stripeConfiguredMock.mockReturnValue(true);
    createOrderMock.mockResolvedValue({
      orderId: "ord_1",
      orderNumber: "BSC-100044",
      token: "tok",
      totals: quote.totals,
    });

    const result = await placeOrderAction(
      checkoutInput({ paymentMethod: "card" }),
    );

    expect(result.ok).toBe(true);
    expect(createOrderMock).toHaveBeenCalledTimes(1);
  });

  it("leaves the manual methods alone whatever Stripe is doing", async () => {
    createOrderMock.mockResolvedValue({
      orderId: "ord_1",
      orderNumber: "BSC-100045",
      token: "tok",
      totals: quote.totals,
    });

    const result = await placeOrderAction(
      checkoutInput({ paymentMethod: "zelle" }),
    );

    expect(result.ok).toBe(true);
    expect(stripeConfiguredMock).not.toHaveBeenCalled();
  });

  it("passes a conflict (a sold-out item) through with its message", async () => {
    createOrderMock.mockRejectedValue(
      new ConflictError("Calm tincture just sold out."),
    );

    const result = await placeOrderAction(checkoutInput());

    expect(result).toEqual({
      ok: false,
      error: { code: "CONFLICT", message: "Calm tincture just sold out." },
    });
  });

  it("hides an unexpected failure behind a generic message and logs it", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    createOrderMock.mockRejectedValue(
      new Error("connect ECONNREFUSED 10.0.0.1:5432"),
    );

    const result = await placeOrderAction(checkoutInput());

    expect(result).toEqual({
      ok: false,
      error: { code: "INTERNAL", message: "Something went wrong" },
    });
    expect(consoleError).toHaveBeenCalledTimes(1);
  });
});

describe("rate limiting", () => {
  const quoteInput = {
    lines: [{ productId: "prod_1", quantity: 2 }],
    orderType: "delivery" as const,
  };

  it("counts a quote against the IP budget, keyed on the first forwarded address", async () => {
    priceOrderMock.mockResolvedValue(quote);

    await quoteOrderAction(quoteInput);

    expect(consumedKeys()).toEqual([
      [rateLimitKey("checkout:quote:ip", CLIENT_IP), BUDGETS.quotePerIp],
    ]);
  });

  it("shows a spent quote budget as an error and never prices the cart", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    consumeMock.mockResolvedValue(denied());

    const result = await quoteOrderAction(quoteInput);

    expect(result).toEqual({
      ok: false,
      error: { code: "CONFLICT", message: TOO_MANY },
    });
    expect(priceOrderMock).not.toHaveBeenCalled();
    // How much of the budget is left is only ever said in the server log.
    expect(consoleWarn).toHaveBeenCalledTimes(1);
  });

  it("counts a coupon the first time that code is quoted, and marks it after", async () => {
    priceOrderMock.mockResolvedValue(quote);
    const codeKey = rateLimitKey(
      "checkout:quote:coupon-code",
      CLIENT_IP,
      "WELCOME10",
    );

    await quoteOrderAction({ ...quoteInput, discountCode: "WELCOME10" });

    expect(seenInWindowMock).toHaveBeenCalledWith(
      codeKey,
      BUDGETS.quoteCouponCodesPerIp.windowMs,
    );
    expect(firstUseInWindowMock).toHaveBeenCalledWith(
      codeKey,
      BUDGETS.quoteCouponCodesPerIp.windowMs,
    );
    expect(consumedKeys()).toEqual([
      [rateLimitKey("checkout:quote:ip", CLIENT_IP), BUDGETS.quotePerIp],
      [
        rateLimitKey("checkout:quote:coupon", CLIENT_IP),
        BUDGETS.quoteCouponCodesPerIp,
      ],
    ]);
  });

  it("leaves the coupon budget alone when an already-marked code is retried", async () => {
    priceOrderMock.mockResolvedValue(quote);
    seenInWindowMock.mockResolvedValue(true);

    const result = await quoteOrderAction({
      ...quoteInput,
      discountCode: "WELCOME10",
    });

    expect(result.ok).toBe(true);
    expect(consumedKeys()).toEqual([
      [rateLimitKey("checkout:quote:ip", CLIENT_IP), BUDGETS.quotePerIp],
    ]);
    expect(firstUseInWindowMock).not.toHaveBeenCalled();
  });

  // The marker is what buys a code its free retries, so a code the budget
  // turned away must not get one: marking it anyway would let the next try
  // skip the coupon counter and be priced.
  it("marks no code the coupon budget refused", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    priceOrderMock.mockResolvedValue(quote);
    consumeMock.mockImplementation(async (key: string) =>
      key === rateLimitKey("checkout:quote:coupon", CLIENT_IP)
        ? denied()
        : allowed(),
    );

    const result = await quoteOrderAction({
      ...quoteInput,
      discountCode: "GUESS99",
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "CONFLICT", message: TOO_MANY },
    });
    expect(firstUseInWindowMock).not.toHaveBeenCalled();
    expect(priceOrderMock).not.toHaveBeenCalled();
  });

  it("counts a place-order attempt per IP and per lowercased email", async () => {
    createOrderMock.mockResolvedValue({
      orderId: "ord_1",
      orderNumber: "BSC-100044",
      token: "tok",
      totals: quote.totals,
    });

    await placeOrderAction(checkoutInput());

    expect(consumedKeys()).toEqual([
      [rateLimitKey("checkout:place:ip", CLIENT_IP), BUDGETS.placeOrderPerIp],
      [
        rateLimitKey("checkout:place:email", "ada@example.com"),
        BUDGETS.placeOrderPerEmail,
      ],
    ]);
  });

  it("shows a spent place-order budget as a form error and creates nothing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    consumeMock.mockResolvedValue(denied());

    const result = await placeOrderAction(checkoutInput());

    expect(result).toEqual({
      ok: false,
      error: { code: "CONFLICT", message: TOO_MANY },
    });
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("counts nothing for a request the schema rejects", async () => {
    await quoteOrderAction({ lines: [], orderType: "delivery" });
    await placeOrderAction(checkoutInput({ email: "nope" }));

    expect(consumeMock).not.toHaveBeenCalled();
    expect(firstUseInWindowMock).not.toHaveBeenCalled();
    expect(seenInWindowMock).not.toHaveBeenCalled();
  });
});
