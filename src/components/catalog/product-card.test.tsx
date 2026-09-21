import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Providers } from "@/components/layout/providers";
import { __resetCartStore, CART_STORAGE_KEY } from "@/hooks/use-cart";
import { makeProduct, makeVariant } from "@/test/catalog-fixtures";
import { ProductCard } from "./product-card";

function renderCard(product = makeProduct()) {
  return render(
    <Providers>
      <ProductCard product={product} />
    </Providers>,
  );
}

describe("ProductCard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetCartStore();
  });

  it("renders category, name and price without specs", () => {
    renderCard();
    expect(screen.getByRole("article")).toBeTruthy();
    expect(screen.getByText("Tinctures")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Test tincture" })).toBeTruthy();
    expect(screen.getByText("$39.00")).toBeTruthy();
    expect(screen.queryByText("Broad spectrum")).toBeNull();
    expect(screen.queryByRole("img", { name: /out of 5 stars/ })).toBeNull();
  });

  it("keeps Add to cart always visible", () => {
    renderCard();
    const button = screen.getByRole("button", { name: "Add to cart" });
    expect(button.closest('[class*="opacity-0"]')).toBeNull();
  });

  it("keeps the wishlist button reachable", () => {
    renderCard();
    const wishlist = screen.getByRole("button", { name: "Save Test tincture" });
    expect(wishlist.closest('[aria-hidden="true"]')).toBeNull();
  });

  it("shows a sale badge and rating when applicable", () => {
    renderCard(
      makeProduct({
        compareAtPriceCents: 5900,
        priceCents: 4900,
        ratingAverage: 4.5,
        reviewCount: 3,
      }),
    );
    expect(screen.getByText("Sale")).toBeTruthy();
    expect(
      screen.getByRole("img", { name: "4.5 out of 5 stars" }),
    ).toBeTruthy();
    expect(screen.getByText("(3)")).toBeTruthy();
  });

  it("disables the button and shows a badge when out of stock", () => {
    renderCard(makeProduct({ inventory: 0 }));
    const button = screen.getByRole("button", { name: "Out of stock" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Out of stock", { selector: "span" })).toBeTruthy();
  });

  it("adds the default variant to the cart", () => {
    renderCard(
      makeProduct({
        variants: [
          makeVariant({ id: "var_small", isDefault: false }),
          makeVariant({ id: "var_default", isDefault: true }),
        ],
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    const stored = JSON.parse(
      window.localStorage.getItem(CART_STORAGE_KEY) ?? "",
    );
    expect(stored).toEqual({
      lines: [
        { productId: "prod_test", variantId: "var_default", quantity: 1 },
      ],
    });
  });
});
