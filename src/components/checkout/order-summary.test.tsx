import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { OrderIssue, OrderQuote } from "@/types/order";
import { isBlockingIssue, OrderSummary } from "./order-summary";

function makeQuote(overrides: Partial<OrderQuote> = {}): OrderQuote {
  return {
    lines: [
      {
        productId: "prod_1",
        variantId: "var_1",
        productName: "Calm tincture",
        variantName: "30ml",
        sku: "SKU-1",
        imageUrl: null,
        quantity: 2,
        unitPriceCents: 4900,
        lineTotalCents: 9800,
      },
    ],
    totals: {
      subtotalCents: 9800,
      discountCents: 0,
      shippingCents: 0,
      exciseTaxCents: 500,
      salesTaxCents: 250,
      taxCents: 750,
      totalCents: 10550,
    },
    orderType: "delivery",
    discountCode: null,
    issues: [],
    ...overrides,
  };
}

const issue = (overrides: Partial<OrderIssue>): OrderIssue => ({
  kind: "out_of_stock",
  label: "Calm tincture",
  productId: "prod_1",
  variantId: null,
  ...overrides,
});

/** The money rendered next to a totals label (`<dt>` then its `<dd>`). */
function rowValue(label: string): string {
  return screen.getByText(label).nextElementSibling?.textContent ?? "";
}

describe("OrderSummary", () => {
  it("renders a skeleton until the first quote arrives", () => {
    const { container } = render(
      <OrderSummary quote={null} status="loading" />,
    );

    expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
    expect(screen.queryByText("Total")).toBeNull();
  });

  it("renders the lines and totals from the quote", () => {
    render(<OrderSummary quote={makeQuote()} status="ready" />);

    const [item] = screen.getAllByRole("listitem");
    expect(item.textContent).toContain("Calm tincture - 30ml");
    expect(item.textContent).toContain("× 2");
    expect(item.textContent).toContain("$98.00");
    expect(rowValue("Subtotal")).toBe("$98.00");
    expect(rowValue("Total")).toBe("$105.50");
  });

  it("announces totals politely", () => {
    const { container } = render(
      <OrderSummary quote={makeQuote()} status="ready" />,
    );

    const live = container.querySelector("[aria-live='polite']");
    expect(live).not.toBeNull();
    expect(live?.textContent).toContain("Total");
  });

  it("renders the order-type radios between subtotal and the tax rows", () => {
    const { container } = render(
      <OrderSummary
        quote={makeQuote()}
        status="ready"
        taxes={{ excisePercent: 5, salesPercent: 2.5 }}
      >
        <p>order type radios</p>
      </OrderSummary>,
    );

    const text =
      container.querySelector("[aria-live='polite']")?.textContent ?? "";
    expect(text.indexOf("Subtotal")).toBeLessThan(
      text.indexOf("order type radios"),
    );
    expect(text.indexOf("order type radios")).toBeLessThan(
      text.indexOf("Excise Tax"),
    );
    expect(rowValue("Excise Tax")).toBe("$5.00");
    expect(rowValue("Sales Tax")).toBe("$2.50");
  });

  it("hides both tax rows while the configured rates are zero", () => {
    render(
      <OrderSummary
        quote={makeQuote()}
        status="ready"
        taxes={{ excisePercent: 0, salesPercent: 0 }}
      />,
    );

    expect(screen.queryByText("Excise Tax")).toBeNull();
    expect(screen.queryByText("Sales Tax")).toBeNull();
  });

  it("shows delivery and discount rows only when the server charged them", () => {
    const quote = makeQuote({
      discountCode: "WELCOME10",
      totals: {
        subtotalCents: 4000,
        discountCents: 400,
        shippingCents: 599,
        exciseTaxCents: 0,
        salesTaxCents: 0,
        taxCents: 0,
        totalCents: 4199,
      },
    });
    render(<OrderSummary quote={quote} status="ready" />);

    expect(rowValue("Discount (WELCOME10)")).toBe("-$4.00");
    expect(rowValue("Delivery")).toBe("$5.99");
  });

  it("warns about each blocking issue by name", () => {
    const quote = makeQuote({
      issues: [
        issue({ kind: "out_of_stock", label: "Calm tincture" }),
        issue({ kind: "unavailable", label: "Sleep gummies" }),
      ],
    });
    render(<OrderSummary quote={quote} status="ready" />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Calm tincture is out of stock");
    expect(alert.textContent).toContain("Sleep gummies is no longer available");
    expect(alert.textContent).toContain("Update your cart to continue.");
  });

  it("shows a rejected coupon without calling it blocking", () => {
    const quote = makeQuote({
      issues: [
        issue({ kind: "invalid_coupon", label: "NOPE", productId: null }),
      ],
    });
    render(<OrderSummary quote={quote} status="ready" />);

    expect(screen.getByRole("alert").textContent).toContain(
      "Coupon NOPE couldn't be applied.",
    );
    expect(screen.queryByText("Update your cart to continue.")).toBeNull();
    expect(quote.issues.some(isBlockingIssue)).toBe(false);
  });

  it("treats stock and availability issues as blocking", () => {
    expect(isBlockingIssue(issue({ kind: "out_of_stock" }))).toBe(true);
    expect(isBlockingIssue(issue({ kind: "unavailable" }))).toBe(true);
    expect(isBlockingIssue(issue({ kind: "invalid_coupon" }))).toBe(false);
  });

  it("offers a retry when pricing failed", () => {
    const onRetry = vi.fn();
    render(
      <OrderSummary
        quote={null}
        status="error"
        errorMessage="We couldn't price your order."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "We couldn't price your order.",
    );
    screen.getByRole("button", { name: "Try again" }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
