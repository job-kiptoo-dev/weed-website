import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Providers } from "@/components/layout/providers";
import { __resetCartStore, CART_STORAGE_KEY } from "@/hooks/use-cart";
import { makeProduct, makeVariant } from "@/test/catalog-fixtures";
import type { ProductDetail } from "@/types/catalog";
import { ProductPurchasePanel } from "./product-purchase-panel";

function makeDetail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    ...makeProduct({
      variants: [
        makeVariant({ id: "var_500", name: "500 mg", isDefault: true }),
        makeVariant({
          id: "var_1000",
          name: "1000 mg",
          isDefault: false,
          priceCents: 6400,
        }),
      ],
    }),
    reviews: [],
    ...overrides,
  };
}

function renderPanel(product = makeDetail()) {
  return render(
    <Providers>
      <ProductPurchasePanel product={product} />
    </Providers>,
  );
}

describe("ProductPurchasePanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetCartStore();
  });

  it("switches the displayed price with the selected variant", () => {
    renderPanel();
    expect(screen.getByText("$39.00")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Strength" })).toBeTruthy();

    fireEvent.click(screen.getByLabelText("1000 mg"));
    expect(screen.getByText("$64.00")).toBeTruthy();
    expect(screen.queryByText("$39.00")).toBeNull();
  });

  it("clamps the quantity and adds the selected variant with it", () => {
    renderPanel();
    const quantity = screen.getByLabelText("Quantity") as HTMLInputElement;
    fireEvent.change(quantity, { target: { value: "42" } });
    fireEvent.blur(quantity);
    expect(quantity.value).toBe("10");

    fireEvent.click(screen.getByLabelText("1000 mg"));
    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    const stored = JSON.parse(
      window.localStorage.getItem(CART_STORAGE_KEY) ?? "",
    );
    expect(stored).toEqual({
      lines: [{ productId: "prod_test", variantId: "var_1000", quantity: 10 }],
    });
  });

  it("disables the button for an out-of-stock variant", () => {
    renderPanel(
      makeDetail({
        inventory: 0,
        variants: [
          makeVariant({ id: "var_500", name: "500 mg", inventory: 0 }),
          makeVariant({
            id: "var_1000",
            name: "1000 mg",
            isDefault: false,
            inventory: 3,
          }),
        ],
      }),
    );
    const button = screen.getByRole("button", { name: "Out of stock" });
    expect(button.hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByLabelText("1000 mg"));
    expect(screen.getByText("Only 3 left")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Add to cart" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });

  it("uses the size legend for count variants", () => {
    renderPanel(
      makeDetail({
        variants: [
          makeVariant({ id: "var_10", name: "10 mg, 30 count" }),
          makeVariant({
            id: "var_25",
            name: "25 mg, 30 count",
            isDefault: false,
          }),
        ],
      }),
    );
    expect(screen.getByRole("group", { name: "Size" })).toBeTruthy();
  });

  it("uses the option legend for products without specs", () => {
    renderPanel(makeDetail({ specs: null }));
    expect(screen.getByRole("group", { name: "Option" })).toBeTruthy();
  });
});
