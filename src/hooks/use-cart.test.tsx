import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import {
  __resetCartStore,
  CART_STORAGE_KEY,
  CartProvider,
  useCart,
} from "./use-cart";

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

function renderCart() {
  return renderHook(() => useCart(), { wrapper });
}

describe("useCart", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetCartStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws outside CartProvider", () => {
    expect(() => renderHook(() => useCart())).toThrow(/CartProvider/);
  });

  it("starts empty", () => {
    const { result } = renderCart();
    expect(result.current.lines).toEqual([]);
    expect(result.current.itemCount).toBe(0);
  });

  it("adds a line and counts items", () => {
    const { result } = renderCart();
    act(() => result.current.addLine("prod_a", "var_a", 1));
    expect(result.current.lines).toEqual([
      { productId: "prod_a", variantId: "var_a", quantity: 1 },
    ]);
    expect(result.current.itemCount).toBe(1);
  });

  it("merges the same product and variant into one line", () => {
    const { result } = renderCart();
    act(() => result.current.addLine("prod_a", "var_a", 1));
    act(() => result.current.addLine("prod_a", "var_a", 1));
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].quantity).toBe(2);
    expect(result.current.itemCount).toBe(2);
  });

  it("removes a line when quantity is set to 0", () => {
    const { result } = renderCart();
    act(() => result.current.addLine("prod_a", "var_a", 2));
    act(() => result.current.setQuantity("prod_a", "var_a", 0));
    expect(result.current.lines).toEqual([]);
  });

  it("removes a line explicitly", () => {
    const { result } = renderCart();
    act(() => result.current.addLine("prod_a", null, 1));
    act(() => result.current.addLine("prod_b", null, 1));
    act(() => result.current.removeLine("prod_a", null));
    expect(result.current.lines.map((l) => l.productId)).toEqual(["prod_b"]);
  });

  it("clears all lines", () => {
    const { result } = renderCart();
    act(() => result.current.addLine("prod_a", "var_a", 1));
    act(() => result.current.addLine("prod_b", null, 3));
    act(() => result.current.clear());
    expect(result.current.lines).toEqual([]);
    expect(result.current.itemCount).toBe(0);
  });

  it("persists lines to localStorage as JSON", () => {
    const { result } = renderCart();
    act(() => result.current.addLine("prod_a", "var_a", 2));
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored ?? "")).toEqual({
      lines: [{ productId: "prod_a", variantId: "var_a", quantity: 2 }],
    });
  });

  it("rehydrates from a valid stored cart", () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        lines: [{ productId: "prod_a", variantId: null, quantity: 4 }],
      }),
    );
    const { result } = renderCart();
    expect(result.current.itemCount).toBe(4);
  });

  it("falls back to an empty cart and warns on invalid stored data", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    window.localStorage.setItem(CART_STORAGE_KEY, '{"lines":"nope"}');
    const { result } = renderCart();
    expect(result.current.lines).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("toggles the drawer state through the provider", () => {
    const { result } = renderCart();
    expect(result.current.isDrawerOpen).toBe(false);
    act(() => result.current.openDrawer());
    expect(result.current.isDrawerOpen).toBe(true);
    act(() => result.current.closeDrawer());
    expect(result.current.isDrawerOpen).toBe(false);
  });
});
