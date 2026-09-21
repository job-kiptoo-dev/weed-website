import { describe, expect, it } from "vitest";
import { buildShopHref, parseShopQuery } from "./shop-query";

describe("parseShopQuery", () => {
  it("returns an empty query for no params", () => {
    expect(parseShopQuery({})).toEqual({});
  });

  it("parses every supported param", () => {
    expect(
      parseShopQuery({
        q: " tea ",
        sort: "price-asc",
        min: "20",
        max: "40.5",
        stock: "1",
        page: "2",
      }),
    ).toEqual({
      q: "tea",
      sort: "price-asc",
      minPriceCents: 2000,
      maxPriceCents: 4050,
      inStock: true,
      page: 2,
    });
  });

  it("drops invalid values silently", () => {
    expect(
      parseShopQuery({
        q: "",
        sort: "bogus",
        min: "abc",
        max: "-5",
        stock: "yes",
        page: "0",
      }),
    ).toEqual({});
    expect(parseShopQuery({ page: "1.5" })).toEqual({});
  });

  it("uses the first value when a param repeats", () => {
    expect(parseShopQuery({ q: ["mint", "tea"] })).toEqual({ q: "mint" });
  });
});

describe("buildShopHref", () => {
  it("returns the base path when nothing is set", () => {
    expect(buildShopHref("/shop", {})).toBe("/shop");
  });

  it("omits default sort and page 1", () => {
    expect(buildShopHref("/shop", { sort: "featured", page: 1 })).toBe("/shop");
  });

  it("serialises cents back to whole dollars", () => {
    expect(
      buildShopHref("/shop/topicals", {
        q: "balm",
        sort: "newest",
        minPriceCents: 2000,
        maxPriceCents: 4000,
        inStock: true,
        page: 3,
      }),
    ).toBe("/shop/topicals?q=balm&sort=newest&min=20&max=40&stock=1&page=3");
  });

  it("round-trips through parseShopQuery", () => {
    const query = parseShopQuery({
      q: "tea",
      sort: "rating",
      min: "10",
      page: "2",
    });
    const href = buildShopHref("/shop", query);
    const search = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(parseShopQuery(search)).toEqual(query);
  });
});
