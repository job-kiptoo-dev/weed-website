import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UseCartLinesResult } from "@/hooks/use-cart-lines";
import { computeTotals } from "@/lib/cart";
import { siteConfig } from "@/lib/site-config";
import { makeProduct, makeVariant } from "@/test/catalog-fixtures";
import type { PricedCartLine } from "@/types/cart";
import { CartPageContent } from "./cart-page-content";

const useCartLines = vi.fn<() => UseCartLinesResult>();

vi.mock("@/hooks/use-cart-lines", () => ({
  useCartLines: () => useCartLines(),
}));

vi.mock("@/hooks/use-cart", () => ({
  useCart: () => ({ setQuantity: vi.fn(), removeLine: vi.fn() }),
}));

const EMPTY_TOTALS = computeTotals([], siteConfig.shipping);

function makeLine(overrides: Partial<PricedCartLine> = {}): PricedCartLine {
  const product = makeProduct();
  const variant = makeVariant();
  return {
    productId: product.id,
    variantId: variant.id,
    quantity: 1,
    product,
    variant,
    name: product.name,
    variantName: variant.name,
    imageUrl: product.images[0]?.url ?? null,
    unitPriceCents: product.priceCents,
    lineTotalCents: product.priceCents,
    ...overrides,
  };
}

function mockResult(overrides: Partial<UseCartLinesResult>): void {
  useCartLines.mockReturnValue({
    status: "ready",
    lines: [],
    totals: EMPTY_TOTALS,
    refetch: vi.fn(),
    ...overrides,
  });
}

describe("CartPageContent", () => {
  beforeEach(() => {
    useCartLines.mockReset();
  });

  it("renders skeleton rows while loading", () => {
    mockResult({ status: "loading" });
    const { container } = render(<CartPageContent />);
    expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
    expect(screen.queryByText("Your cart is empty.")).toBeNull();
  });

  it("handles the idle status as loading", () => {
    mockResult({ status: "idle" });
    const { container } = render(<CartPageContent />);
    expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
  });

  it("shows an error state whose retry calls refetch", () => {
    const refetch = vi.fn();
    mockResult({ status: "error", refetch });
    render(<CartPageContent />);
    expect(screen.getByRole("alert")).toBeTruthy();
    screen.getByRole("button", { name: "Try again" }).click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state with a disabled checkout button", () => {
    mockResult({ status: "ready", lines: [] });
    render(<CartPageContent />);
    expect(screen.getByText("Your cart is empty.")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Continue shopping" })
        .getAttribute("href"),
    ).toBe("/shop");
    const checkout = screen.getByRole("button", {
      name: "Go to checkout",
    }) as HTMLButtonElement;
    expect(checkout.disabled).toBe(true);
    expect(screen.queryByRole("link", { name: "Go to checkout" })).toBeNull();
  });

  it("renders lines, the discount form, the summary and both buttons", () => {
    const line = makeLine({ quantity: 2, lineTotalCents: 7800 });
    const lines = [line];
    mockResult({
      status: "ready",
      lines,
      totals: computeTotals(lines, siteConfig.shipping),
    });
    render(<CartPageContent />);

    expect(screen.getByRole("link", { name: "Test tincture" })).toBeTruthy();
    expect(screen.getByText("500 mg")).toBeTruthy();
    expect(screen.getByText("$39.00 each")).toBeTruthy();
    expect(screen.getByText("$78.00", { selector: "p" })).toBeTruthy();
    expect(screen.getByLabelText("Discount code")).toBeTruthy();
    expect(screen.getByText("Free")).toBeTruthy();
    expect(screen.getAllByText("$78.00", { selector: "dd" })).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: "Go to checkout" }).getAttribute("href"),
    ).toBe("/checkout");
    expect(
      screen
        .getByRole("link", { name: "Continue shopping" })
        .getAttribute("href"),
    ).toBe("/shop");
    expect(screen.queryByText("Your cart is empty.")).toBeNull();
  });

  it("shows the flat shipping rate under the free shipping threshold", () => {
    const line = makeLine();
    const lines = [line];
    mockResult({
      status: "ready",
      lines,
      totals: computeTotals(lines, siteConfig.shipping),
    });
    render(<CartPageContent />);
    expect(screen.getByText("$6.95")).toBeTruthy();
    expect(screen.getByText("Add $36.00 more for free shipping.")).toBeTruthy();
  });
});
