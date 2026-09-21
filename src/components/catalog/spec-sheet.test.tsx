import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeProduct } from "@/test/catalog-fixtures";
import { SpecSheet } from "./spec-sheet";

const specs = makeProduct().specs;

describe("SpecSheet", () => {
  it("renders nothing when specs are null", () => {
    const { container } = render(<SpecSheet specs={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the three compact rows", () => {
    render(<SpecSheet specs={specs} />);
    expect(screen.getAllByRole("term").map((el) => el.textContent)).toEqual([
      "Strength",
      "Spectrum",
      "Lab tested",
    ]);
    expect(screen.getByText("500 mg")).toBeTruthy();
    expect(screen.getByText("Broad spectrum")).toBeTruthy();
    expect(screen.getByText("Yes, third party")).toBeTruthy();
  });

  it("adds serving and ingredients in the full variant", () => {
    render(<SpecSheet specs={specs} variant="full" />);
    expect(screen.getAllByRole("term")).toHaveLength(5);
    expect(screen.getByText("1 mL")).toBeTruthy();
    expect(screen.getByText("MCT oil, hemp extract")).toBeTruthy();
  });
});
