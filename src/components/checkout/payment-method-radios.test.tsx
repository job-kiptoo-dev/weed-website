import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  PAYMENT_METHOD_PRESETS,
  type PaymentMethodConfig,
} from "@/lib/payment-methods";
import { siteConfig } from "@/lib/site-config";
import { PaymentMethodRadios } from "./payment-method-radios";

// Zelle and card ship a mark; Chime has none, so it stands for the text-badge
// fallback (it has no freely licensed logo).
const METHODS: PaymentMethodConfig[] = [
  {
    ...PAYMENT_METHOD_PRESETS.zelle,
    enabled: true,
    logo: "/images/payments/zelle.svg",
  },
  { ...PAYMENT_METHOD_PRESETS.chime, enabled: true },
  {
    ...PAYMENT_METHOD_PRESETS.card,
    enabled: true,
    logo: "/images/payments/card.svg",
  },
];

describe("PaymentMethodRadios", () => {
  it("groups the radios in a labelled fieldset", () => {
    render(
      <PaymentMethodRadios
        methods={METHODS}
        value="zelle"
        onChange={vi.fn()}
      />,
    );

    const group = screen.getByRole("group", { name: "Payment method" });
    expect(group.tagName).toBe("FIELDSET");
    expect(screen.getAllByRole("radio")).toHaveLength(METHODS.length);
  });

  it("reveals the selected method's instructions and wires aria-describedby", () => {
    render(
      <PaymentMethodRadios
        methods={METHODS}
        value="zelle"
        onChange={vi.fn()}
      />,
    );

    const zelle = screen.getByRole("radio", { name: "Zelle" });
    const describedBy = zelle.getAttribute("aria-describedby");
    expect(describedBy).toBe("checkout-payment-zelle-instructions");

    const instructions = document.getElementById(describedBy ?? "");
    expect(instructions?.textContent).toContain(siteConfig.contact.phone);

    // The unselected method says nothing until it is chosen.
    const card = screen.getByRole("radio", { name: "Pay With Card" });
    expect(card.getAttribute("aria-describedby")).toBeNull();
    expect(document.getElementById("checkout-payment-card-instructions")).toBe(
      null,
    );
  });

  it("reports the chosen method and shows its instructions once selected", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <PaymentMethodRadios
        methods={METHODS}
        value="zelle"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Pay With Card" }));
    expect(onChange).toHaveBeenCalledWith("card");

    rerender(
      <PaymentMethodRadios
        methods={METHODS}
        value="card"
        onChange={onChange}
      />,
    );
    const card = screen.getByRole("radio", { name: "Pay With Card" });
    expect(card.getAttribute("aria-describedby")).toBe(
      "checkout-payment-card-instructions",
    );
    expect(
      document.getElementById("checkout-payment-card-instructions")
        ?.textContent,
    ).toContain("No card details are ever entered on this site");
  });

  it("renders a method's logo as a decorative image", () => {
    render(
      <PaymentMethodRadios
        methods={METHODS}
        value="zelle"
        onChange={vi.fn()}
      />,
    );

    const logo = document.querySelector<HTMLImageElement>(
      'img[src="/images/payments/zelle.svg"]',
    );
    expect(logo).not.toBeNull();
    // Decorative: the label beside it already names the method, so an empty
    // alt keeps a screen reader from announcing it twice.
    expect(logo?.getAttribute("alt")).toBe("");
    expect(screen.queryByRole("img")).toBeNull();
    expect(logo?.getAttribute("width")).toBe("24");
    expect(logo?.getAttribute("height")).toBe("24");
    expect(logo?.getAttribute("loading")).toBe("lazy");
    // Only the two methods with a mark get an image.
    expect(document.querySelectorAll("img")).toHaveLength(2);
  });

  it("falls back to a text badge when a method has no logo asset", () => {
    render(
      <PaymentMethodRadios
        methods={METHODS}
        value="zelle"
        onChange={vi.fn()}
      />,
    );

    // Chime: label plus badge, and no image standing in for a logo we do not
    // have the right to ship.
    expect(screen.getAllByText("Chime")).toHaveLength(2);
    expect(document.querySelector('img[src*="chime"]')).toBeNull();
  });

  it("shows a field error against the group", () => {
    render(
      <PaymentMethodRadios
        methods={METHODS}
        value="zelle"
        onChange={vi.fn()}
        error="Choose how you want to pay."
      />,
    );

    expect(screen.getByText("Choose how you want to pay.")).toBeTruthy();
  });
});
