import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Toaster, ToastProvider } from "@/components/ui/toast";
import { __resetWishlistStore } from "@/hooks/use-wishlist";
import { WishlistButton } from "./wishlist-button";

describe("WishlistButton", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetWishlistStore();
  });

  it("toggles aria-pressed and announces the change", () => {
    render(
      <ToastProvider>
        <WishlistButton productId="prod_a" name="Product A" />
        <Toaster />
      </ToastProvider>,
    );
    const button = screen.getByRole("button", { name: "Save Product A" });
    expect(button.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Saved to wishlist")).toBeTruthy();

    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Removed from wishlist")).toBeTruthy();
  });
});
