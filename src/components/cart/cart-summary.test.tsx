import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CartTotals } from "@/types/cart";
import { CartSummary } from "./cart-summary";

function totals(overrides: Partial<CartTotals> = {}): CartTotals {
  return {
    subtotalCents: 3900,
    shippingCents: 695,
    discountCents: 0,
    totalCents: 4595,
    itemCount: 1,
    freeShippingRemainingCents: 3600,
    ...overrides,
  };
}

describe("CartSummary", () => {
  it("shows the flat rate and the free shipping hint under the threshold", () => {
    render(<CartSummary totals={totals()} />);
    expect(screen.getByText("$6.95")).toBeTruthy();
    expect(screen.getByText("$45.95")).toBeTruthy();
    expect(screen.getByText("Add $36.00 more for free shipping.")).toBeTruthy();
    expect(screen.getByText("Taxes calculated at checkout.")).toBeTruthy();
  });

  it("shows free shipping without a hint at or above the threshold", () => {
    render(
      <CartSummary
        totals={totals({
          subtotalCents: 8000,
          shippingCents: 0,
          totalCents: 8000,
          freeShippingRemainingCents: 0,
        })}
      />,
    );
    expect(screen.getByText("Free")).toBeTruthy();
    expect(screen.queryByText(/more for free shipping/)).toBeNull();
  });
});
