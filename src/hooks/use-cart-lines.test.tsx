import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeProduct, makeVariant } from "@/test/catalog-fixtures";
import type { CartLine } from "@/types/cart";
import {
  __resetCartStore,
  CART_STORAGE_KEY,
  CartProvider,
  useCart,
} from "./use-cart";
import { useCartLines } from "./use-cart-lines";

const known = makeProduct({
  id: "prod_known",
  variants: [makeVariant({ id: "var_known", productId: "prod_known" })],
});

const STORED_LINES: CartLine[] = [
  { productId: "prod_known", variantId: "var_known", quantity: 2 },
  { productId: "prod_ghost", variantId: null, quantity: 1 },
  { productId: "prod_known", variantId: "var_ghost", quantity: 3 },
];

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

function renderCartLines() {
  return renderHook(() => ({ cart: useCart(), cartLines: useCartLines() }), {
    wrapper,
  });
}

function mockFetch(response: Response) {
  const fetchMock = vi.fn(async () => response.clone());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("useCartLines ghost-line pruning", () => {
  beforeEach(() => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ lines: STORED_LINES }),
    );
    __resetCartStore();
  });

  afterEach(() => {
    window.localStorage.clear();
    __resetCartStore();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("removes lines whose product or variant no longer exists after a successful fetch", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    mockFetch(Response.json({ products: [known] }));

    const { result } = renderCartLines();

    await waitFor(() => {
      expect(result.current.cart.lines).toEqual([STORED_LINES[0]]);
    });
    expect(result.current.cart.itemCount).toBe(2);
    await waitFor(() => {
      expect(result.current.cartLines.status).toBe("ready");
    });
    expect(result.current.cartLines.lines).toHaveLength(1);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0]?.[0]).toContain("removed 2");
    expect(
      JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "{}"),
    ).toEqual({ lines: [STORED_LINES[0]] });
  });

  it("prunes nothing when the request fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    mockFetch(
      Response.json({ error: "Something went wrong" }, { status: 500 }),
    );

    const { result } = renderCartLines();

    await waitFor(() => {
      expect(result.current.cartLines.status).toBe("error");
    });
    expect(result.current.cart.lines).toEqual(STORED_LINES);
    expect(result.current.cart.itemCount).toBe(6);
    expect(info).not.toHaveBeenCalled();
  });
});
