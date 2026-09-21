import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildShopHref } from "@/lib/shop-query";
import { ProductSort } from "./product-sort";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("ProductSort", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("shows the current sort and pushes a page-1 href on change", () => {
    render(
      <ProductSort
        current="price-asc"
        basePath="/shop/tinctures"
        query={{ q: "oil", sort: "price-asc", inStock: true, page: 3 }}
      />,
    );
    const select = screen.getByLabelText("Sort by") as HTMLSelectElement;
    expect(select.value).toBe("price-asc");
    expect(screen.getAllByRole("option")).toHaveLength(5);
    expect(
      screen.getByRole("option", { name: "Default sorting" }),
    ).toBeTruthy();

    fireEvent.change(select, { target: { value: "rating" } });
    expect(push).toHaveBeenCalledWith(
      buildShopHref("/shop/tinctures", {
        q: "oil",
        sort: "rating",
        inStock: true,
        page: 1,
      }),
    );
    expect(push.mock.calls[0][0]).toBe(
      "/shop/tinctures?q=oil&sort=rating&stock=1",
    );
  });
});
