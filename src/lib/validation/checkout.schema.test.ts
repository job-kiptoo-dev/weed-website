import { describe, expect, it } from "vitest";
import { siteConfig } from "@/lib/site-config";
import {
  MAX_CHECKOUT_LINES,
  checkoutAddressSchema,
  checkoutInputSchema,
} from "./checkout.schema";

const ADDRESS = {
  firstName: "Ada",
  lastName: "Park",
  line1: "123 Alder St",
  city: "Portland",
  state: "OR",
  postalCode: "97205",
  phone: "(555) 010-4242",
};

const INPUT = {
  billing: ADDRESS,
  email: "ada@example.com",
  orderType: "delivery",
  paymentMethod: "zelle",
  lines: [{ productId: "prod_1", quantity: 2 }],
};

describe("checkoutAddressSchema", () => {
  it("accepts a minimal address and fills the optional fields with null", () => {
    expect(checkoutAddressSchema.parse(ADDRESS)).toEqual({
      ...ADDRESS,
      company: null,
      line2: null,
      country: "US",
    });
  });

  it("keeps a company and a second address line", () => {
    const parsed = checkoutAddressSchema.parse({
      ...ADDRESS,
      company: " Park Botanicals ",
      line2: "Apt 4",
    });
    expect(parsed.company).toBe("Park Botanicals");
    expect(parsed.line2).toBe("Apt 4");
  });

  it("uppercases the state and rejects anything outside the US list", () => {
    expect(checkoutAddressSchema.parse({ ...ADDRESS, state: "wa" }).state).toBe(
      "WA",
    );
    expect(
      checkoutAddressSchema.safeParse({ ...ADDRESS, state: "PR" }).success,
    ).toBe(false);
  });

  it.each(["97205", "97205-1234"])("accepts ZIP %j", (postalCode) => {
    expect(
      checkoutAddressSchema.safeParse({ ...ADDRESS, postalCode }).success,
    ).toBe(true);
  });

  it.each(["9720", "97205-12", "ABCDE"])("rejects ZIP %j", (postalCode) => {
    expect(
      checkoutAddressSchema.safeParse({ ...ADDRESS, postalCode }).success,
    ).toBe(false);
  });

  it("only ships to the US", () => {
    expect(
      checkoutAddressSchema.safeParse({ ...ADDRESS, country: "CA" }).success,
    ).toBe(false);
  });

  it.each(["", "  ", "123", "call me"])(
    "requires a usable phone number, rejecting %j",
    (phone) => {
      const result = checkoutAddressSchema.safeParse({ ...ADDRESS, phone });
      expect(result.success).toBe(false);
    },
  );

  it.each(["555 010 4242", "+1 (555) 010-4242", "555.010.4242"])(
    "accepts phone %j",
    (phone) => {
      expect(
        checkoutAddressSchema.safeParse({ ...ADDRESS, phone }).success,
      ).toBe(true);
    },
  );

  it.each(["A", ""])("rejects a first name of %j", (firstName) => {
    expect(
      checkoutAddressSchema.safeParse({ ...ADDRESS, firstName }).success,
    ).toBe(false);
  });

  it("rejects names longer than 50 characters", () => {
    expect(
      checkoutAddressSchema.safeParse({ ...ADDRESS, lastName: "x".repeat(51) })
        .success,
    ).toBe(false);
  });
});

describe("checkoutInputSchema", () => {
  it("applies the defaults for everything optional", () => {
    const parsed = checkoutInputSchema.parse(INPUT);
    expect(parsed).toMatchObject({
      shipping: null,
      notes: null,
      discountCode: null,
      marketingOptIn: false,
    });
    expect(parsed.lines[0]).toEqual({
      productId: "prod_1",
      variantId: null,
      quantity: 2,
    });
  });

  it("validates a separate shipping address when one is given", () => {
    const parsed = checkoutInputSchema.parse({
      ...INPUT,
      shipping: { ...ADDRESS, city: "Salem", postalCode: "97301" },
    });
    expect(parsed.shipping?.city).toBe("Salem");
    expect(
      checkoutInputSchema.safeParse({
        ...INPUT,
        shipping: { ...ADDRESS, state: "XX" },
      }).success,
    ).toBe(false);
  });

  it("uppercases a discount code and nulls a blank one", () => {
    expect(
      checkoutInputSchema.parse({ ...INPUT, discountCode: " welcome10 " })
        .discountCode,
    ).toBe("WELCOME10");
    expect(
      checkoutInputSchema.parse({ ...INPUT, discountCode: "  " }).discountCode,
    ).toBeNull();
  });

  it.each(["not-an-email", "", "ada@"])("rejects email %j", (email) => {
    expect(checkoutInputSchema.safeParse({ ...INPUT, email }).success).toBe(
      false,
    );
  });

  it.each(["delivery", "pickup"])("accepts order type %j", (orderType) => {
    expect(checkoutInputSchema.safeParse({ ...INPUT, orderType }).success).toBe(
      true,
    );
  });

  it.each(["shipping", "", "PICKUP"])("rejects order type %j", (orderType) => {
    expect(checkoutInputSchema.safeParse({ ...INPUT, orderType }).success).toBe(
      false,
    );
  });

  it("accepts every configured payment method id", () => {
    for (const method of siteConfig.checkout.paymentMethods) {
      expect(
        checkoutInputSchema.safeParse({ ...INPUT, paymentMethod: method.id })
          .success,
      ).toBe(true);
    }
  });

  it("rejects an unknown payment method", () => {
    expect(
      checkoutInputSchema.safeParse({ ...INPUT, paymentMethod: "cheque" })
        .success,
    ).toBe(false);
  });

  it("caps notes at 1000 characters", () => {
    expect(
      checkoutInputSchema.safeParse({ ...INPUT, notes: "x".repeat(1000) })
        .success,
    ).toBe(true);
    expect(
      checkoutInputSchema.safeParse({ ...INPUT, notes: "x".repeat(1001) })
        .success,
    ).toBe(false);
  });

  it("needs at least one line and no more than the cap", () => {
    expect(checkoutInputSchema.safeParse({ ...INPUT, lines: [] }).success).toBe(
      false,
    );
    const line = { productId: "prod_1", quantity: 1 };
    expect(
      checkoutInputSchema.safeParse({
        ...INPUT,
        lines: Array.from({ length: MAX_CHECKOUT_LINES }, () => line),
      }).success,
    ).toBe(true);
    expect(
      checkoutInputSchema.safeParse({
        ...INPUT,
        lines: Array.from({ length: MAX_CHECKOUT_LINES + 1 }, () => line),
      }).success,
    ).toBe(false);
  });

  it("clamps line quantities to the cart maximum", () => {
    const { maxQuantityPerLine } = siteConfig.cart;
    for (const quantity of [0, -1, 1.5, maxQuantityPerLine + 1]) {
      expect(
        checkoutInputSchema.safeParse({
          ...INPUT,
          lines: [{ productId: "prod_1", quantity }],
        }).success,
      ).toBe(false);
    }
    expect(
      checkoutInputSchema.safeParse({
        ...INPUT,
        lines: [{ productId: "prod_1", quantity: maxQuantityPerLine }],
      }).success,
    ).toBe(true);
  });
});
