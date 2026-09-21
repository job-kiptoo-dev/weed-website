import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActiveFilterChips } from "./active-filter-chips";

describe("ActiveFilterChips", () => {
  it("renders nothing when no filter is active", () => {
    const { container } = render(
      <ActiveFilterChips
        query={{ sort: "newest", page: 2 }}
        basePath="/shop"
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("links each chip to the listing without only its own param", () => {
    render(
      <ActiveFilterChips
        query={{
          q: "tea",
          sort: "price-asc",
          minPriceCents: 2000,
          maxPriceCents: 4000,
          inStock: true,
          page: 3,
        }}
        basePath="/shop/teas-wellness"
      />,
    );
    const href = (name: string) =>
      screen.getByRole("link", { name }).getAttribute("href");

    expect(href("Remove filter: Search: tea")).toBe(
      "/shop/teas-wellness?sort=price-asc&min=20&max=40&stock=1",
    );
    expect(href("Remove filter: From $20")).toBe(
      "/shop/teas-wellness?q=tea&sort=price-asc&max=40&stock=1",
    );
    expect(href("Remove filter: Up to $40")).toBe(
      "/shop/teas-wellness?q=tea&sort=price-asc&min=20&stock=1",
    );
    expect(href("Remove filter: In stock only")).toBe(
      "/shop/teas-wellness?q=tea&sort=price-asc&min=20&max=40",
    );
  });

  it("clears every filter back to the base path", () => {
    render(
      <ActiveFilterChips
        query={{ minPriceCents: 2000, inStock: true }}
        basePath="/shop"
      />,
    );
    expect(
      screen.getAllByRole("link", { name: /^Remove filter/ }),
    ).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: "Clear all" }).getAttribute("href"),
    ).toBe("/shop");
  });
});
