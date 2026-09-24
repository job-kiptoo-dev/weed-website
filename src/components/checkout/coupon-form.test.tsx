import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CouponForm } from "./coupon-form";

const TOGGLE_LABEL = "Click here to enter your code";

describe("CouponForm", () => {
  it("starts collapsed and expands on the toggle", () => {
    render(
      <CouponForm appliedCode={null} onApply={vi.fn()} onRemove={vi.fn()} />,
    );

    const toggle = screen.getByRole("button", { name: TOGGLE_LABEL });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBe("checkout-coupon-panel");
    expect(screen.queryByLabelText("Coupon code")).toBeNull();

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByLabelText("Coupon code")).toBeTruthy();
  });

  it("refuses an empty code without asking the server", () => {
    const onApply = vi.fn();
    render(
      <CouponForm appliedCode={null} onApply={onApply} onRemove={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: TOGGLE_LABEL }));
    fireEvent.click(screen.getByRole("button", { name: "Apply coupon" }));

    expect(screen.getByText("Enter a coupon code.")).toBeTruthy();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("applies a trimmed code and clears the empty-code error", () => {
    const onApply = vi.fn();
    render(
      <CouponForm appliedCode={null} onApply={onApply} onRemove={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: TOGGLE_LABEL }));
    fireEvent.click(screen.getByRole("button", { name: "Apply coupon" }));

    fireEvent.change(screen.getByLabelText("Coupon code"), {
      target: { value: "  welcome10 " },
    });
    expect(screen.queryByText("Enter a coupon code.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Apply coupon" }));
    expect(onApply).toHaveBeenCalledWith("welcome10");
  });

  it("applies on Enter rather than submitting the checkout form", () => {
    const onApply = vi.fn();
    render(
      <CouponForm appliedCode={null} onApply={onApply} onRemove={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: TOGGLE_LABEL }));
    const input = screen.getByLabelText("Coupon code");
    fireEvent.change(input, { target: { value: "SAVE5" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onApply).toHaveBeenCalledWith("SAVE5");
  });

  it("shows the server's rejection and opens with an applied code", () => {
    const onRemove = vi.fn();
    render(
      <CouponForm
        appliedCode="WELCOME10"
        onApply={vi.fn()}
        onRemove={onRemove}
        error="Coupon WELCOME10 couldn't be applied."
      />,
    );

    expect(
      screen
        .getByRole("button", { name: TOGGLE_LABEL })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(
      screen.getByText("Coupon WELCOME10 couldn't be applied."),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
