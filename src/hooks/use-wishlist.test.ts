import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetWishlistStore,
  useWishlist,
  WISHLIST_STORAGE_KEY,
} from "./use-wishlist";

describe("useWishlist", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetWishlistStore();
  });

  it("toggles ids on and off and persists them", () => {
    const { result } = renderHook(() => useWishlist());
    expect(result.current.ids).toEqual([]);
    expect(result.current.has("prod_a")).toBe(false);

    act(() => result.current.toggle("prod_a"));
    expect(result.current.has("prod_a")).toBe(true);
    expect(
      JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY) ?? ""),
    ).toEqual(["prod_a"]);

    act(() => result.current.toggle("prod_a"));
    expect(result.current.ids).toEqual([]);
  });

  it("rehydrates from storage", () => {
    window.localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify(["prod_b"]),
    );
    const { result } = renderHook(() => useWishlist());
    expect(result.current.has("prod_b")).toBe(true);
  });
});
