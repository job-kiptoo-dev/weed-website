import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "@/components/layout/providers";
import { __resetCartStore, CART_STORAGE_KEY, useCart } from "@/hooks/use-cart";
import { makeProduct } from "@/test/catalog-fixtures";
import { CartDrawer } from "./cart-drawer";

/**
 * jsdom has no `showModal()`, so the drawer stays closed here; its content is
 * still rendered inside the (closed, hence `hidden`) `<dialog>`, which is
 * what these tests assert.
 */
const hidden = { hidden: true } as const;

function AddProductB() {
  const { addLine } = useCart();
  return (
    <button type="button" onClick={() => addLine("prod_b", null, 1)}>
      Add product B
    </button>
  );
}

describe("CartDrawer", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetCartStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the empty state when there are no lines", () => {
    render(
      <Providers>
        <CartDrawer />
      </Providers>,
    );
    expect(screen.getByText("Your cart is empty.")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Continue shopping", ...hidden })
        .getAttribute("href"),
    ).toBe("/shop");
  });

  it("renders priced lines, the summary and the checkout buttons", async () => {
    const product = makeProduct();
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        lines: [
          { productId: product.id, variantId: "var_test-500", quantity: 2 },
        ],
      }),
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ products: [product] }),
    );

    render(
      <Providers>
        <CartDrawer />
      </Providers>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Test tincture", ...hidden }),
      ).toBeTruthy();
    });
    expect(screen.getByText("500 mg")).toBeTruthy();
    expect(screen.getByText("$39.00 each")).toBeTruthy();
    expect(screen.getByText("$78.00", { selector: "p" })).toBeTruthy();
    expect(screen.getByText("Free")).toBeTruthy();
    expect(screen.getAllByText("$78.00", { selector: "dd" })).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: "Go to checkout", ...hidden }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "View cart", ...hidden }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Remove Test tincture", ...hidden }),
    ).toBeTruthy();
  });

  it("shows an error state with retry when pricing fails", async () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        lines: [{ productId: "prod_test", variantId: null, quantity: 1 }],
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    render(
      <Providers>
        <CartDrawer />
      </Providers>,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert", hidden)).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: "Try again", ...hidden }),
    ).toBeTruthy();
  });

  it("keeps priced lines visible while a newly added product loads", async () => {
    const productA = makeProduct();
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        lines: [
          { productId: productA.id, variantId: "var_test-500", quantity: 1 },
        ],
      }),
    );
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ products: [productA] }))
      .mockReturnValueOnce(new Promise<Response>(() => {}));

    const { container } = render(
      <Providers>
        <CartDrawer />
        <AddProductB />
      </Providers>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Test tincture", ...hidden }),
      ).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add product B" }));

    await waitFor(() => {
      expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1);
    });
    expect(
      screen.getByRole("link", { name: "Test tincture", ...hidden }),
    ).toBeTruthy();
    expect(screen.getByText("Updating total")).toBeTruthy();
  });
});
