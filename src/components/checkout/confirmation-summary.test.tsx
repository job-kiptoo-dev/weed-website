import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/lib/site-config";
import type { OrderAddress, OrderRecord } from "@/types/order";
import { ConfirmationSummary } from "./confirmation-summary";

const address: OrderAddress = {
  fullName: "Jordan Pike",
  company: null,
  line1: "14 Alder Street",
  line2: null,
  city: "Portland",
  state: "OR",
  postalCode: "97201",
  country: "US",
  phone: "(555) 010-9988",
};

function makeOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "ord_1",
    orderNumber: "BSC-100001",
    userId: null,
    email: "jordan@example.com",
    status: "pending",
    paymentStatus: "pending",
    subtotalCents: 7000,
    shippingCents: 0,
    discountCents: 0,
    taxCents: 0,
    totalCents: 7000,
    discountCode: null,
    shippingAddress: address,
    billingAddress: address,
    checkoutMeta: {
      paymentMethod: "zelle",
      orderType: "delivery",
      exciseTaxCents: 0,
      salesTaxCents: 0,
      marketingOptIn: false,
    },
    notes: null,
    createdAt: "2026-09-24T10:00:00.000Z",
    items: [
      {
        id: "itm_1",
        productId: "prd_1",
        variantId: "var_1",
        productName: "Calm tincture",
        variantName: "1000 mg",
        sku: "CALM-1000",
        quantity: 2,
        unitPriceCents: 2500,
        totalCents: 5000,
        imageUrl: "/images/products/calm-tincture.jpg",
      },
      {
        id: "itm_2",
        productId: "prd_2",
        variantId: null,
        productName: "Citrus gummies",
        variantName: null,
        sku: "GUM-CIT",
        quantity: 1,
        unitPriceCents: 2000,
        totalCents: 2000,
        imageUrl: null,
      },
    ],
    ...overrides,
  };
}

function rowValue(label: string | RegExp): string | undefined {
  const term = screen.getByText(label);
  return term.nextElementSibling?.textContent ?? undefined;
}

describe("ConfirmationSummary", () => {
  it("lists the stored items with their quantities and line totals", () => {
    render(<ConfirmationSummary order={makeOrder()} />);

    expect(screen.getByText(/Calm tincture/)).toBeTruthy();
    expect(screen.getByText(/1000 mg/)).toBeTruthy();
    expect(screen.getByText("× 2")).toBeTruthy();
    expect(screen.getByText("$50.00")).toBeTruthy();
    expect(screen.getByText(/Citrus gummies/)).toBeTruthy();
    expect(screen.getByText("$20.00")).toBeTruthy();
  });

  it("shows only the totals rows with a stored value above zero", () => {
    render(<ConfirmationSummary order={makeOrder()} />);

    expect(rowValue("Subtotal")).toBe("$70.00");
    expect(rowValue("Total")).toBe("$70.00");
    expect(screen.queryByText("Delivery")).toBeNull();
    expect(screen.queryByText(/^Discount/)).toBeNull();
    expect(screen.queryByText("Excise Tax")).toBeNull();
    expect(screen.queryByText("Sales Tax")).toBeNull();
    expect(screen.queryByText("Tax")).toBeNull();
  });

  it("renders discount, delivery and both tax rows from the stored values", () => {
    render(
      <ConfirmationSummary
        order={makeOrder({
          discountCents: 700,
          discountCode: "WELCOME10",
          shippingCents: 695,
          taxCents: 441,
          totalCents: 7436,
          checkoutMeta: {
            paymentMethod: "card",
            orderType: "delivery",
            exciseTaxCents: 189,
            salesTaxCents: 252,
            marketingOptIn: true,
          },
        })}
      />,
    );

    expect(rowValue("Discount (WELCOME10)")).toBe("-$7.00");
    expect(rowValue("Delivery")).toBe("$6.95");
    expect(rowValue("Excise Tax")).toBe("$1.89");
    expect(rowValue("Sales Tax")).toBe("$2.52");
    expect(rowValue("Total")).toBe("$74.36");
    expect(screen.queryByText("Tax")).toBeNull();
  });

  it("falls back to one tax row when the order has no stored tax split", () => {
    render(
      <ConfirmationSummary
        order={makeOrder({
          taxCents: 350,
          totalCents: 7350,
          checkoutMeta: null,
        })}
      />,
    );

    expect(rowValue("Tax")).toBe("$3.50");
    expect(rowValue("Total")).toBe("$73.50");
  });

  it("shows the chosen payment method's instructions with the shop phone", () => {
    render(<ConfirmationSummary order={makeOrder()} />);

    expect(screen.getByText("Payment: Zelle")).toBeTruthy();
    expect(
      screen.getByText(
        (text) =>
          text.includes(siteConfig.contact.phone) &&
          text.includes("No payment is taken on this site."),
      ),
    ).toBeTruthy();
  });

  it("drops the instructions once the order is paid but keeps the method", () => {
    render(
      <ConfirmationSummary order={makeOrder({ paymentStatus: "paid" })} />,
    );

    // "Call us to pay by Zelle" is a lie on a paid order; the method it was
    // placed with still belongs on the page.
    expect(screen.getByText("Payment: Zelle")).toBeTruthy();
    expect(
      screen.queryByText((text) => text.includes("No payment is taken")),
    ).toBeNull();
    expect(
      screen.queryByText((text) => text.includes("Zelle name")),
    ).toBeNull();
  });

  it("renders no payment block when the order stores no method", () => {
    render(<ConfirmationSummary order={makeOrder({ checkoutMeta: null })} />);

    expect(screen.queryByText(/^Payment:/)).toBeNull();
  });
});
