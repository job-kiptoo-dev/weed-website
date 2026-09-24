import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CHECKOUT_STEPS, CheckoutSteps } from "./checkout-steps";

describe("CheckoutSteps", () => {
  it("lists every step and marks only the current one", () => {
    render(<CheckoutSteps current={2} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(CHECKOUT_STEPS.length);
    expect(screen.getByText("Cart").getAttribute("aria-current")).toBeNull();
    expect(screen.getByText("Checkout").getAttribute("aria-current")).toBe(
      "step",
    );
    expect(
      screen.getByText("Order complete").getAttribute("aria-current"),
    ).toBeNull();
  });

  it("announces the earlier steps as completed", () => {
    render(<CheckoutSteps current={2} />);

    expect(screen.getAllByText("completed")).toHaveLength(1);
    expect(screen.getByText("Cart").textContent).toBe("Cart completed");
  });

  it("marks both earlier steps completed on the last step", () => {
    render(<CheckoutSteps current={3} />);

    expect(screen.getAllByText("completed")).toHaveLength(2);
    expect(
      screen.getByText("Order complete").getAttribute("aria-current"),
    ).toBe("step");
  });

  it("links the cart step back to /cart and leaves the rest unlinked", () => {
    render(<CheckoutSteps current={2} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute("href")).toBe("/cart");
    expect(links[0]?.textContent).toBe("Cart completed");
  });

  it("keeps the step semantics when the cart step is the current one", () => {
    render(<CheckoutSteps current={1} />);

    const cart = screen.getByRole("link", { name: "Cart" });
    expect(cart.getAttribute("href")).toBe("/cart");
    expect(cart.getAttribute("aria-current")).toBe("step");
  });

  it("completes nothing on the first step", () => {
    render(<CheckoutSteps current={1} />);

    expect(screen.queryByText("completed")).toBeNull();
    expect(screen.getByText("Cart").getAttribute("aria-current")).toBe("step");
  });
});
