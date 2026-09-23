import { describe, expect, it } from "vitest";
import { categoryInputSchema } from "./category.schema";

const CATEGORY = {
  name: "Tinctures",
  slug: "tinctures",
  description: "Oils you measure by the dropper.",
  imageUrl: "/images/categories/tinctures.jpg",
  sortOrder: 0,
};

describe("categoryInputSchema", () => {
  it("accepts a valid category", () => {
    expect(categoryInputSchema.parse(CATEGORY)).toEqual(CATEGORY);
  });

  it.each([null, "https://images.example/tinctures.jpg"])(
    "accepts image %j",
    (imageUrl) => {
      expect(
        categoryInputSchema.safeParse({ ...CATEGORY, imageUrl }).success,
      ).toBe(true);
    },
  );

  it.each([
    "//evil.example/x.jpg",
    "http://images.example/x.jpg",
    "javascript:alert(1)",
    "images/x.jpg",
  ])("rejects image %j", (imageUrl) => {
    expect(
      categoryInputSchema.safeParse({ ...CATEGORY, imageUrl }).success,
    ).toBe(false);
  });

  it("rejects bad slugs and negative sort orders", () => {
    expect(
      categoryInputSchema.safeParse({ ...CATEGORY, slug: "Tinctures" }).success,
    ).toBe(false);
    expect(
      categoryInputSchema.safeParse({ ...CATEGORY, sortOrder: -1 }).success,
    ).toBe(false);
  });
});
