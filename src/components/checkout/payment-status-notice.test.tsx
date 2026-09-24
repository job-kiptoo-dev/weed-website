import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/lib/site-config";
import { PaymentStatusNotice } from "./payment-status-notice";

describe("PaymentStatusNotice", () => {
  it("keeps the no-payment-taken copy on a pending order", () => {
    const { container } = render(<PaymentStatusNotice status="pending" />);

    expect(screen.getByText("We have not taken payment yet")).toBeTruthy();
    expect(container.textContent).toMatch(/Nothing has been charged/);
  });

  it("never claims nothing was charged on a paid order", () => {
    const { container } = render(<PaymentStatusNotice status="paid" />);

    expect(screen.getByText("Payment recorded")).toBeTruthy();
    expect(container.textContent).not.toMatch(/nothing has been charged/i);
    expect(container.textContent).not.toMatch(/not taken payment/i);
    expect(container.textContent).toContain(siteConfig.contact.phone);
  });

  it("says a refunded order was refunded", () => {
    const { container } = render(<PaymentStatusNotice status="refunded" />);

    expect(screen.getByText("This order was refunded")).toBeTruthy();
    expect(container.textContent).not.toMatch(/nothing has been charged/i);
    expect(container.textContent).toContain(siteConfig.contact.phone);
  });

  it("tells a failed order what to do next, with both contact routes", () => {
    const { container } = render(<PaymentStatusNotice status="failed" />);

    expect(
      screen.getByText("The last payment attempt did not go through"),
    ).toBeTruthy();
    expect(container.textContent).toContain(siteConfig.contact.phone);
    expect(container.textContent).toContain(siteConfig.contact.email);
  });

  it("promises no email and no card handling at any status", () => {
    for (const status of ["pending", "paid", "refunded", "failed"] as const) {
      const { container } = render(<PaymentStatusNotice status={status} />);

      expect(container.textContent).not.toMatch(
        /confirmation email|email receipt|emailed you/i,
      );
      expect(container.textContent).toMatch(
        /never collect card numbers, CVV codes or bank credentials/,
      );
    }
  });
});
