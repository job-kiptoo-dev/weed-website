import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Providers } from "@/components/layout/providers";
import { __resetCartStore } from "@/hooks/use-cart";
import { makeProduct } from "@/test/catalog-fixtures";
import { ProductGrid } from "./product-grid";

describe("ProductGrid", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetCartStore();
  });

  it("renders the mandated empty copy with an optional action", () => {
    render(
      <ProductGrid
        products={[]}
        emptyAction={{ label: "Clear filters", href: "/shop" }}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: "Nothing here yet. Try another category or search.",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Clear filters" })).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("renders one card per product inside a list", () => {
    const products = [
      makeProduct({ id: "prod_a", name: "Product A", slug: "a" }),
      makeProduct({ id: "prod_b", name: "Product B", slug: "b" }),
    ];
    render(
      <Providers>
        <ProductGrid products={products} />
      </Providers>,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Product A" })).toBeTruthy();
  });
});
