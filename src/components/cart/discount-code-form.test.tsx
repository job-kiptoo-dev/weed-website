import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiscountCodeForm } from "./discount-code-form";

describe("DiscountCodeForm", () => {
  it("shows a field error when submitted empty", () => {
    render(<DiscountCodeForm />);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByText("Enter a code.")).toBeTruthy();
    expect(
      screen.getByLabelText("Discount code").getAttribute("aria-invalid"),
    ).toBe("true");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("points at the checkout coupon box and never claims a code is applied", () => {
    render(<DiscountCodeForm />);
    fireEvent.change(screen.getByLabelText("Discount code"), {
      target: { value: "WELCOME10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    const status = screen.getByRole("status").textContent ?? "";
    expect(status).toContain("Discount codes are applied at checkout.");
    expect(status).toContain("coupon box");
    expect(status).not.toMatch(/later phase/i);
    expect(screen.queryByText("Enter a code.")).toBeNull();
    expect(status).not.toMatch(/\bvalid\b/i);
    expect(screen.queryByText(/code applied/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Apply" })).toBeTruthy();
  });

  it("clears the field error once the user types", () => {
    render(<DiscountCodeForm />);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByText("Enter a code.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Discount code"), {
      target: { value: "W" },
    });
    expect(screen.queryByText("Enter a code.")).toBeNull();
  });
});
