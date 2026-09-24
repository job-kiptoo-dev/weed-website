import { describe, expect, it } from "vitest";
import {
  ORDER_TYPES,
  type OrderPricingOptions,
  type OrderTotals,
  assertTotalsConsistent,
  computeOrderTotals,
} from "./order-pricing";
import { siteConfig } from "./site-config";

const { freeDeliveryThresholdCents, deliveryFeeCents } =
  siteConfig.checkout.delivery;

const NO_TAX = { excisePercent: 0, salesPercent: 0 };
const DELIVERY = {
  freeDeliveryThresholdCents: 7500,
  deliveryFeeCents: 695,
  pickupDiscountCents: 0,
};

function options(overrides: Partial<OrderPricingOptions> = {}) {
  return {
    orderType: "delivery" as const,
    taxes: NO_TAX,
    delivery: DELIVERY,
    ...overrides,
  };
}

function lines(...specs: [unitPriceCents: number, quantity: number][]) {
  return specs.map(([unitPriceCents, quantity]) => ({
    unitPriceCents,
    quantity,
  }));
}

describe("ORDER_TYPES", () => {
  it("lists both order types for z.enum", () => {
    expect(ORDER_TYPES).toEqual(["delivery", "pickup"]);
  });
});

describe("computeOrderTotals subtotal", () => {
  it("sums unit price times quantity", () => {
    const totals = computeOrderTotals(lines([2500, 2], [1999, 3]), options());
    expect(totals.subtotalCents).toBe(2500 * 2 + 1999 * 3);
  });

  it("prices an empty order at zero with no delivery fee", () => {
    expect(computeOrderTotals([], options())).toEqual({
      subtotalCents: 0,
      discountCents: 0,
      shippingCents: 0,
      exciseTaxCents: 0,
      salesTaxCents: 0,
      taxCents: 0,
      totalCents: 0,
    });
  });
});

describe("computeOrderTotals delivery fee", () => {
  it("charges the fee just below the free-delivery threshold", () => {
    const totals = computeOrderTotals(lines([7499, 1]), options());
    expect(totals.shippingCents).toBe(695);
  });

  it("is free exactly at the threshold", () => {
    expect(computeOrderTotals(lines([7500, 1]), options()).shippingCents).toBe(
      0,
    );
  });

  it("uses the same rules as the cart by default", () => {
    const totals = computeOrderTotals(
      lines([freeDeliveryThresholdCents - 1, 1]),
      { orderType: "delivery" },
    );
    expect(totals.shippingCents).toBe(deliveryFeeCents);
  });

  it("decides on the pre-discount subtotal, so a coupon can't add a fee", () => {
    const totals = computeOrderTotals(
      lines([7500, 1]),
      options({ discount: { type: "percent", value: 20 } }),
    );
    expect(totals.discountCents).toBe(1500);
    expect(totals.shippingCents).toBe(0);
  });

  it("never charges delivery on a pickup order", () => {
    const totals = computeOrderTotals(
      lines([1000, 1]),
      options({ orderType: "pickup" }),
    );
    expect(totals.shippingCents).toBe(0);
    expect(totals.totalCents).toBe(1000);
  });

  it("puts a pickup saving in the discount, never in shipping", () => {
    const totals = computeOrderTotals(
      lines([1000, 1]),
      options({
        orderType: "pickup",
        delivery: { ...DELIVERY, pickupDiscountCents: 300 },
      }),
    );
    expect(totals.shippingCents).toBe(0);
    expect(totals.discountCents).toBe(300);
    expect(totals.totalCents).toBe(700);
  });
});

describe("computeOrderTotals discounts", () => {
  it("rounds a percent discount half up", () => {
    const totals = computeOrderTotals(
      lines([1055, 1]),
      options({ discount: { type: "percent", value: 15 } }),
    );
    expect(totals.discountCents).toBe(158); // 158.25 -> 158
  });

  it("caps a fixed discount at the subtotal", () => {
    const totals = computeOrderTotals(
      lines([500, 1]),
      options({ discount: { type: "fixed", value: 2000 } }),
    );
    expect(totals.discountCents).toBe(500);
    expect(totals.totalCents).toBe(695); // delivery fee still due
  });

  it("clamps a percent discount plus a pickup saving to the subtotal", () => {
    const totals = computeOrderTotals(
      lines([1000, 1]),
      options({
        orderType: "pickup",
        discount: { type: "percent", value: 100 },
        delivery: { ...DELIVERY, pickupDiscountCents: 300 },
      }),
    );
    expect(totals.discountCents).toBe(1000);
    expect(totals.totalCents).toBe(0);
  });

  it("ignores a zero or negative discount value", () => {
    expect(
      computeOrderTotals(
        lines([1000, 1]),
        options({ discount: { type: "fixed", value: 0 } }),
      ).discountCents,
    ).toBe(0);
    expect(
      computeOrderTotals(
        lines([1000, 1]),
        options({ discount: { type: "percent", value: -10 } }),
      ).discountCents,
    ).toBe(0);
  });
});

describe("computeOrderTotals taxes", () => {
  it("renders no tax while both rates are 0", () => {
    const totals = computeOrderTotals(lines([2500, 1]), options());
    expect(totals).toMatchObject({
      exciseTaxCents: 0,
      salesTaxCents: 0,
      taxCents: 0,
    });
  });

  it("keeps the two rows summing exactly to taxCents on odd cents", () => {
    const totals = computeOrderTotals(
      lines([1033, 1]),
      options({ taxes: { excisePercent: 3.5, salesPercent: 8.25 } }),
    );
    expect(totals.exciseTaxCents).toBe(36); // 36.155 -> 36
    expect(totals.salesTaxCents).toBe(85); // 85.2225 -> 85
    expect(totals.taxCents).toBe(121);
  });

  it("rounds each row independently, half up", () => {
    const totals = computeOrderTotals(
      lines([1000, 1]),
      options({ taxes: { excisePercent: 0.25, salesPercent: 0.25 } }),
    );
    expect([totals.exciseTaxCents, totals.salesTaxCents]).toEqual([3, 3]);
    expect(totals.taxCents).toBe(6);
  });

  it("taxes the discounted subtotal, never the shipping", () => {
    const totals = computeOrderTotals(
      lines([2000, 1]),
      options({
        discount: { type: "fixed", value: 500 },
        taxes: { excisePercent: 0, salesPercent: 10 },
      }),
    );
    // 10% of (2000 - 500), not of 2000 and not of 2000 + 695 shipping.
    expect(totals.salesTaxCents).toBe(150);
    expect(totals.shippingCents).toBe(695);
    expect(totals.totalCents).toBe(2000 + 695 + 150 - 500);
  });

  it("charges excise only once it is switched on", () => {
    const off = computeOrderTotals(lines([5000, 1]), options());
    const on = computeOrderTotals(
      lines([5000, 1]),
      options({ taxes: { excisePercent: 7, salesPercent: 0 } }),
    );
    expect(off.exciseTaxCents).toBe(0);
    expect(on.exciseTaxCents).toBe(350);
    expect(on.taxCents).toBe(350);
  });
});

describe("computeOrderTotals total identity", () => {
  it.each(ORDER_TYPES)("holds for %s orders", (orderType) => {
    const totals = computeOrderTotals(
      lines([1999, 2], [749, 1]),
      options({
        orderType,
        discount: { type: "percent", value: 12 },
        taxes: { excisePercent: 2.5, salesPercent: 6.75 },
      }),
    );
    expect(totals.totalCents).toBe(
      totals.subtotalCents +
        totals.shippingCents +
        totals.taxCents -
        totals.discountCents,
    );
    expect(() => assertTotalsConsistent(totals)).not.toThrow();
  });
});

describe("assertTotalsConsistent", () => {
  const consistent: OrderTotals = {
    subtotalCents: 2000,
    discountCents: 500,
    shippingCents: 695,
    exciseTaxCents: 50,
    salesTaxCents: 100,
    taxCents: 150,
    totalCents: 2345,
  };

  it("accepts consistent totals", () => {
    expect(() => assertTotalsConsistent(consistent)).not.toThrow();
  });

  it("rejects a wrong total", () => {
    expect(() =>
      assertTotalsConsistent({ ...consistent, totalCents: 2344 }),
    ).toThrow(/totalCents is 2344, expected 2345/);
  });

  it("rejects a tax split that does not add up", () => {
    expect(() =>
      assertTotalsConsistent({ ...consistent, exciseTaxCents: 49 }),
    ).toThrow(/taxCents is not exciseTaxCents \+ salesTaxCents/);
  });

  it("rejects a discount larger than the subtotal", () => {
    expect(() =>
      assertTotalsConsistent({
        ...consistent,
        discountCents: 2500,
        totalCents: 345,
      }),
    ).toThrow(/discountCents is greater than subtotalCents/);
  });

  it("rejects fractional cents", () => {
    expect(() =>
      assertTotalsConsistent({
        ...consistent,
        shippingCents: 695.5,
        totalCents: 2345.5,
      }),
    ).toThrow(/shippingCents is not integer cents/);
  });

  it("rejects negative money", () => {
    expect(() =>
      assertTotalsConsistent({
        ...consistent,
        shippingCents: -695,
        totalCents: 955,
      }),
    ).toThrow(/shippingCents is negative/);
  });
});
