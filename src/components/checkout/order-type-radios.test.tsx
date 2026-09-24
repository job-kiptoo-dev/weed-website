import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatMoney } from "@/lib/money";
import { siteConfig } from "@/lib/site-config";
import { OrderTypeRadios } from "./order-type-radios";

const { freeDeliveryThresholdCents, deliveryFeeCents } =
  siteConfig.checkout.delivery;

describe("OrderTypeRadios", () => {
  it("promises no free delivery, and states the rule the server prices", () => {
    const { container } = render(
      <OrderTypeRadios value="delivery" onChange={vi.fn()} />,
    );

    expect(screen.getByLabelText("Delivery")).toBeTruthy();
    expect(container.textContent).not.toMatch(/free delivery/i);
    expect(
      screen.getByText(
        `We bring your order to the address above. Free over ${formatMoney(
          freeDeliveryThresholdCents,
        )}, otherwise ${formatMoney(deliveryFeeCents)}.`,
      ),
    ).toBeTruthy();
  });

  it("offers curbside pickup from the configured address", () => {
    render(<OrderTypeRadios value="delivery" onChange={vi.fn()} />);

    expect(screen.getByLabelText("Curbside Pickup")).toBeTruthy();
    expect(
      screen.getByText(
        `Collect from ${siteConfig.contact.address.join(", ")}.`,
      ),
    ).toBeTruthy();
  });

  it("checks the selected type and reports a change", async () => {
    const onChange = vi.fn();
    render(<OrderTypeRadios value="pickup" onChange={onChange} />);

    const pickup = screen.getByLabelText<HTMLInputElement>("Curbside Pickup");
    expect(pickup.checked).toBe(true);

    screen.getByLabelText("Delivery").click();
    expect(onChange).toHaveBeenCalledWith("delivery");
  });
});
