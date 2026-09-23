import { describe, expect, it } from "vitest";
import {
  HEMP_FLOWER_CATEGORY,
  HEMP_PRE_ROLLS_CATEGORY,
  hiddenCategorySlugs,
  isCategoryEnabled,
  SMOKABLE_HEMP_CATEGORIES,
} from "./catalog-visibility";

describe("isCategoryEnabled", () => {
  it("shows smokable hemp only while its flag is on", () => {
    for (const slug of [HEMP_PRE_ROLLS_CATEGORY, HEMP_FLOWER_CATEGORY]) {
      expect(isCategoryEnabled(slug, { smokableHemp: true }), slug).toBe(true);
      expect(isCategoryEnabled(slug, { smokableHemp: false }), slug).toBe(
        false,
      );
    }
  });

  it("always shows every other category", () => {
    for (const smokableHemp of [true, false]) {
      expect(isCategoryEnabled("tinctures", { smokableHemp })).toBe(true);
      expect(isCategoryEnabled("accessories", { smokableHemp })).toBe(true);
      expect(isCategoryEnabled("glassware", { smokableHemp })).toBe(true);
    }
  });
});

describe("hiddenCategorySlugs", () => {
  it("hides nothing while the flag is on", () => {
    expect(hiddenCategorySlugs({ smokableHemp: true })).toEqual([]);
  });

  it("hides both smokable hemp categories while the flag is off", () => {
    expect(hiddenCategorySlugs({ smokableHemp: false })).toEqual([
      HEMP_PRE_ROLLS_CATEGORY,
      HEMP_FLOWER_CATEGORY,
    ]);
    expect(SMOKABLE_HEMP_CATEGORIES.size).toBe(2);
  });
});
