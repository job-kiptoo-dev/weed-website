import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildShopHref } from "@/lib/shop-query";
import { ProductFilters } from "./product-filters";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const categories = [
  { id: "cat_tinctures", name: "Tinctures", slug: "tinctures" },
  { id: "cat_topicals", name: "Topicals", slug: "topicals" },
];
const priceRange = { minCents: 900, maxCents: 10900 };

/**
 * jsdom has no `showModal()`, so the drawer stays closed; the form is still
 * rendered inside the (hidden) `<dialog>`, so role queries opt into hidden.
 */
const hidden = { hidden: true } as const;

describe("ProductFilters", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("applies price and stock filters with the page reset to 1", () => {
    render(
      <ProductFilters
        categories={categories}
        current={{ q: "tea", sort: "price-asc", page: 3 }}
        basePath="/shop"
        priceRange={priceRange}
      />,
    );
    const form = screen.getByRole("form", { name: "Filters", ...hidden });
    expect(form).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Min price"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText("Max price"), {
      target: { value: "40" },
    });
    fireEvent.click(screen.getByLabelText("In stock only"));
    fireEvent.click(screen.getByRole("button", { name: "Apply", ...hidden }));

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(
      buildShopHref("/shop", {
        q: "tea",
        sort: "price-asc",
        minPriceCents: 2000,
        maxPriceCents: 4000,
        inStock: true,
        page: 1,
      }),
    );
    expect(push.mock.calls[0][0]).toBe(
      "/shop?q=tea&sort=price-asc&min=20&max=40&stock=1",
    );
  });

  it("reflects the current query, counts active filters and clears to the base path", () => {
    render(
      <ProductFilters
        categories={categories}
        current={{ minPriceCents: 2000, inStock: true }}
        basePath="/shop"
        priceRange={priceRange}
      />,
    );
    expect((screen.getByLabelText("Min price") as HTMLInputElement).value).toBe(
      "20",
    );
    expect(
      (screen.getByLabelText("In stock only") as HTMLInputElement).checked,
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Filters (2)" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear", ...hidden }));
    expect(push).toHaveBeenCalledWith("/shop");
  });

  it("navigates to the category path when a category is chosen", () => {
    render(
      <ProductFilters
        categories={categories}
        current={{ q: "oil", page: 2 }}
        basePath="/shop"
        priceRange={priceRange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "topicals" },
    });
    expect(push).toHaveBeenCalledWith("/shop/topicals?q=oil");
  });

  it("locks the category select on category pages", () => {
    render(
      <ProductFilters
        categories={categories}
        current={{}}
        basePath="/shop/tinctures"
        lockedCategory="tinctures"
        priceRange={priceRange}
      />,
    );
    const select = screen.getByLabelText("Category") as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(select.value).toBe("tinctures");
  });
});
