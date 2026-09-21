import { describe, expect, it } from "vitest";
import { cartReducer, computeTotals, lineKey } from "./cart";
import { siteConfig } from "./site-config";
import type { CartState, PricedCartLine } from "@/types/cart";
import type { ProductSummary } from "@/types/catalog";

const empty: CartState = { lines: [] };
const rules = {
  freeThresholdCents: 7500,
  flatRateCents: 695,
};

const product: ProductSummary = {
  id: "prod_a",
  name: "A",
  slug: "a",
  description: "",
  shortDescription: "",
  priceCents: 3900,
  compareAtPriceCents: null,
  sku: "A",
  categoryId: "cat_a",
  inventory: 10,
  status: "active",
  featured: false,
  specs: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  category: { id: "cat_a", name: "A", slug: "a" },
  images: [],
  variants: [],
  ratingAverage: 0,
  reviewCount: 0,
};

function pricedLine(
  overrides: Partial<PricedCartLine> & {
    unitPriceCents: number;
    quantity: number;
  },
): PricedCartLine {
  return {
    productId: "prod_a",
    variantId: null,
    product,
    variant: null,
    name: "A",
    variantName: null,
    imageUrl: null,
    lineTotalCents: overrides.unitPriceCents * overrides.quantity,
    ...overrides,
  };
}

describe("lineKey", () => {
  it("combines product and variant ids", () => {
    expect(lineKey({ productId: "p", variantId: "v" })).toBe("p::v");
  });

  it("handles a null variant", () => {
    expect(lineKey({ productId: "p", variantId: null })).toBe("p::");
  });
});

describe("cartReducer", () => {
  it("adds a new line", () => {
    const next = cartReducer(empty, {
      type: "add",
      productId: "p1",
      variantId: "v1",
      quantity: 2,
    });
    expect(next.lines).toEqual([
      { productId: "p1", variantId: "v1", quantity: 2 },
    ]);
  });

  it("merges the same product and variant into one line", () => {
    const once = cartReducer(empty, {
      type: "add",
      productId: "p1",
      variantId: "v1",
      quantity: 1,
    });
    const twice = cartReducer(once, {
      type: "add",
      productId: "p1",
      variantId: "v1",
      quantity: 3,
    });
    expect(twice.lines).toHaveLength(1);
    expect(twice.lines[0]?.quantity).toBe(4);
  });

  it("keeps different variants of the same product on separate lines", () => {
    const state = cartReducer(
      cartReducer(empty, {
        type: "add",
        productId: "p1",
        variantId: "v1",
        quantity: 1,
      }),
      { type: "add", productId: "p1", variantId: "v2", quantity: 1 },
    );
    expect(state.lines).toHaveLength(2);
  });

  it("clamps quantity to the configured maximum", () => {
    const state = cartReducer(empty, {
      type: "add",
      productId: "p1",
      variantId: null,
      quantity: 99,
    });
    expect(state.lines[0]?.quantity).toBe(siteConfig.cart.maxQuantityPerLine);
  });

  it("clamps quantity to at least 1 on add", () => {
    const state = cartReducer(empty, {
      type: "add",
      productId: "p1",
      variantId: null,
      quantity: 0,
    });
    expect(state.lines[0]?.quantity).toBe(1);
  });

  it("sets a quantity on an existing line", () => {
    const state = cartReducer(
      cartReducer(empty, {
        type: "add",
        productId: "p1",
        variantId: null,
        quantity: 1,
      }),
      { type: "setQuantity", productId: "p1", variantId: null, quantity: 5 },
    );
    expect(state.lines[0]?.quantity).toBe(5);
  });

  it("removes the line when quantity is set to zero or less", () => {
    const start = cartReducer(empty, {
      type: "add",
      productId: "p1",
      variantId: null,
      quantity: 2,
    });
    expect(
      cartReducer(start, {
        type: "setQuantity",
        productId: "p1",
        variantId: null,
        quantity: 0,
      }).lines,
    ).toEqual([]);
    expect(
      cartReducer(start, {
        type: "setQuantity",
        productId: "p1",
        variantId: null,
        quantity: -3,
      }).lines,
    ).toEqual([]);
  });

  it("removes only the matching line", () => {
    const state = cartReducer(
      cartReducer(empty, {
        type: "add",
        productId: "p1",
        variantId: "v1",
        quantity: 1,
      }),
      { type: "add", productId: "p2", variantId: null, quantity: 1 },
    );
    const next = cartReducer(state, {
      type: "remove",
      productId: "p1",
      variantId: "v1",
    });
    expect(next.lines).toEqual([
      { productId: "p2", variantId: null, quantity: 1 },
    ]);
  });

  it("clears all lines", () => {
    const state = cartReducer(empty, {
      type: "add",
      productId: "p1",
      variantId: null,
      quantity: 1,
    });
    expect(cartReducer(state, { type: "clear" })).toEqual({ lines: [] });
  });

  it("does not mutate the previous state", () => {
    const state: CartState = {
      lines: [{ productId: "p1", variantId: null, quantity: 1 }],
    };
    cartReducer(state, {
      type: "add",
      productId: "p1",
      variantId: null,
      quantity: 1,
    });
    expect(state.lines[0]?.quantity).toBe(1);
  });
});

describe("computeTotals", () => {
  it("returns zeros for an empty cart, including shipping", () => {
    expect(computeTotals([], rules)).toEqual({
      subtotalCents: 0,
      shippingCents: 0,
      discountCents: 0,
      totalCents: 0,
      itemCount: 0,
      freeShippingRemainingCents: 0,
    });
  });

  it("charges flat-rate shipping below the free threshold", () => {
    const totals = computeTotals(
      [pricedLine({ unitPriceCents: 3900, quantity: 1 })],
      rules,
    );
    expect(totals.subtotalCents).toBe(3900);
    expect(totals.shippingCents).toBe(695);
    expect(totals.totalCents).toBe(4595);
    expect(totals.itemCount).toBe(1);
    expect(totals.freeShippingRemainingCents).toBe(3600);
  });

  it("ships free at the threshold", () => {
    const totals = computeTotals(
      [pricedLine({ unitPriceCents: 7500, quantity: 1 })],
      rules,
    );
    expect(totals.shippingCents).toBe(0);
    expect(totals.totalCents).toBe(7500);
    expect(totals.freeShippingRemainingCents).toBe(0);
  });

  it("ships free above the threshold and sums item counts", () => {
    const totals = computeTotals(
      [
        pricedLine({ unitPriceCents: 3900, quantity: 2 }),
        pricedLine({ productId: "prod_b", unitPriceCents: 1200, quantity: 3 }),
      ],
      rules,
    );
    expect(totals.subtotalCents).toBe(11400);
    expect(totals.shippingCents).toBe(0);
    expect(totals.itemCount).toBe(5);
    expect(totals.discountCents).toBe(0);
  });
});
