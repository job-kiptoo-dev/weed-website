import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeVariant } from "@/test/catalog-fixtures";
import { VariantSelector } from "./variant-selector";

const variants = [
  makeVariant({ id: "var_500", name: "500 mg", isDefault: true }),
  makeVariant({
    id: "var_1000",
    name: "1000 mg",
    isDefault: false,
    priceCents: 6400,
  }),
  makeVariant({
    id: "var_2000",
    name: "2000 mg",
    isDefault: false,
    priceCents: 10900,
    inventory: 0,
  }),
];

describe("VariantSelector", () => {
  it("renders a radio group with the selected value and calls onChange", () => {
    const onChange = vi.fn();
    render(
      <VariantSelector
        variants={variants}
        value="var_500"
        onChange={onChange}
        legend="Strength"
      />,
    );
    expect(screen.getByRole("group", { name: "Strength" })).toBeTruthy();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect((radios[0] as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByLabelText("1000 mg"));
    expect(onChange).toHaveBeenCalledWith("var_1000");
  });

  it("disables out-of-stock variants and labels them", () => {
    render(
      <VariantSelector
        variants={variants}
        value="var_500"
        onChange={vi.fn()}
      />,
    );
    const radio = screen.getByLabelText("2000 mg (out of stock)");
    expect((radio as HTMLInputElement).disabled).toBe(true);
  });
});
