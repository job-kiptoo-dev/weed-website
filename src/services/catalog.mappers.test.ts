import { describe, expect, it } from "vitest";
import {
  toCategory,
  toProductVariant,
  toRating,
  toRatingStats,
  toReview,
} from "./catalog.mappers";

const at = new Date("2025-03-04T05:06:07.000Z");

describe("catalog.mappers", () => {
  it("converts Date timestamps to ISO strings", () => {
    const category = toCategory({
      id: "cat_x",
      name: "X",
      slug: "x",
      description: "d",
      imageUrl: null,
      sortOrder: 1,
      createdAt: at,
      updatedAt: at,
    });
    expect(category.createdAt).toBe("2025-03-04T05:06:07.000Z");
    expect(category.updatedAt).toBe("2025-03-04T05:06:07.000Z");
  });

  it("narrows ratings and throws outside 1..5", () => {
    expect(toRating(1)).toBe(1);
    expect(toRating(5)).toBe(5);
    expect(() => toRating(0)).toThrow(/out of range/);
    expect(() => toRating(6)).toThrow(/out of range/);
    expect(() => toRating(2.5)).toThrow(/out of range/);
  });

  it("passes a null variant price through", () => {
    const variant = toProductVariant({
      id: "var_x",
      productId: "prod_x",
      name: "500 mg",
      sku: "X-500",
      priceCents: null,
      inventory: 3,
      sortOrder: 1,
      isDefault: true,
      createdAt: at,
      updatedAt: at,
    });
    expect(variant).toEqual({
      id: "var_x",
      productId: "prod_x",
      name: "500 mg",
      sku: "X-500",
      priceCents: null,
      inventory: 3,
      sortOrder: 1,
      isDefault: true,
    });
  });

  it("keeps a null review userId", () => {
    const review = toReview({
      id: "rev_x",
      productId: "prod_x",
      userId: null,
      authorName: "Sam",
      rating: 4,
      title: "t",
      body: "b",
      status: "published",
      createdAt: at,
      updatedAt: at,
    });
    expect(review.userId).toBeNull();
    expect(review.rating).toBe(4);
    expect(review.createdAt).toBe("2025-03-04T05:06:07.000Z");
  });

  it("aggregates ratings, with zeros when there are none", () => {
    expect(toRatingStats([])).toEqual({ ratingAverage: 0, reviewCount: 0 });
    expect(toRatingStats([{ rating: 4 }, { rating: 5 }])).toEqual({
      ratingAverage: 4.5,
      reviewCount: 2,
    });
  });
});
