import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Price } from "./price";

describe("Price", () => {
  it("renders the current price only when not on sale", () => {
    const { container } = render(<Price priceCents={3900} />);
    expect(screen.getByText("$39.00")).toBeTruthy();
    expect(container.querySelector("s")).toBeNull();
  });

  it("renders the compare-at price with a hidden label when on sale", () => {
    const { container } = render(
      <Price priceCents={4900} compareAtPriceCents={5900} />,
    );
    const struck = container.querySelector("s");
    expect(struck?.textContent).toBe("Original price $59.00");
    expect(screen.getByText("$49.00").className).toContain(
      "text-accent-strong",
    );
  });

  it("ignores a compare-at price that is not higher", () => {
    const { container } = render(
      <Price priceCents={4900} compareAtPriceCents={4900} />,
    );
    expect(container.querySelector("s")).toBeNull();
  });
});
