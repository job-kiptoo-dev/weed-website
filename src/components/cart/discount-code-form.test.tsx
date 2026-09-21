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

  it("shows the info message and never a success state for any code", () => {
    render(<DiscountCodeForm />);
    fireEvent.change(screen.getByLabelText("Discount code"), {
      target: { value: "WELCOME10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByRole("status").textContent).toBe(
      "Discount codes arrive with checkout in a later phase.",
    );
    expect(screen.queryByText("Enter a code.")).toBeNull();
    expect(screen.queryByText(/applied/i)).toBeNull();
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
