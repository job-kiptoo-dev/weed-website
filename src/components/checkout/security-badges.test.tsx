import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { enabledPaymentMethods } from "@/lib/payment-methods";
import { siteConfig } from "@/lib/site-config";
import { SecurityBadges } from "./security-badges";

describe("SecurityBadges", () => {
  it("renders every configured badge", () => {
    render(<SecurityBadges />);

    for (const badge of siteConfig.checkout.securityBadges) {
      expect(screen.getByText(badge.label)).toBeTruthy();
    }
  });

  it("lists the payment methods that are actually enabled", () => {
    render(<SecurityBadges />);

    const labels = enabledPaymentMethods(
      siteConfig.checkout.paymentMethods,
    ).map((method) => method.label);
    expect(screen.getByText(`We accept ${labels.join(", ")}.`)).toBeTruthy();
  });

  it("makes no claim we cannot stand behind", () => {
    const { container } = render(<SecurityBadges />);

    expect(container.textContent).not.toMatch(
      /accredited|antivirus|buyer protection|guarantee|visa|mastercard/i,
    );
  });
});
