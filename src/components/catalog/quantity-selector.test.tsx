import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuantitySelector } from "./quantity-selector";

describe("QuantitySelector", () => {
  it("steps within bounds and disables the buttons at the limits", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <QuantitySelector id="qty" value={1} max={3} onChange={onChange} />,
    );
    const decrease = screen.getByRole("button", { name: "Decrease quantity" });
    const increase = screen.getByRole("button", { name: "Increase quantity" });

    expect(decrease.hasAttribute("disabled")).toBe(true);
    fireEvent.click(increase);
    expect(onChange).toHaveBeenLastCalledWith(2);

    rerender(
      <QuantitySelector id="qty" value={3} max={3} onChange={onChange} />,
    );
    expect(increase.hasAttribute("disabled")).toBe(true);
    fireEvent.click(decrease);
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it("clamps typed values and restores the value on blur", () => {
    const onChange = vi.fn();
    render(
      <QuantitySelector id="qty" value={2} max={10} onChange={onChange} />,
    );
    const input = screen.getByLabelText("Quantity");

    fireEvent.change(input, { target: { value: "42" } });
    expect(onChange).toHaveBeenLastCalledWith(10);

    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledTimes(1);

    fireEvent.blur(input);
    expect((input as HTMLInputElement).value).toBe("2");
  });
});
