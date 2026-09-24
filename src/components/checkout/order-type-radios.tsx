"use client";

import { formatMoney } from "@/lib/money";
import { siteConfig } from "@/lib/site-config";
import type { OrderType } from "@/types/order";

const { freeDeliveryThresholdCents, deliveryFeeCents } =
  siteConfig.checkout.delivery;

interface OrderTypeRadiosProps {
  value: OrderType;
  onChange: (value: OrderType) => void;
  disabled?: boolean;
}

/**
 * The server prices whichever one is chosen. The delivery description states
 * the rule from `checkout.delivery` rather than promising "Free Delivery":
 * under the threshold the summary really does charge the fee. Formatting two
 * config constants is not cart maths, so the client still computes no money.
 */
const ORDER_TYPE_OPTIONS: readonly {
  value: OrderType;
  label: string;
  description: string;
}[] = [
  {
    value: "delivery",
    label: "Delivery",
    description: `We bring your order to the address above. Free over ${formatMoney(
      freeDeliveryThresholdCents,
    )}, otherwise ${formatMoney(deliveryFeeCents)}.`,
  },
  {
    value: "pickup",
    label: "Curbside Pickup",
    description: `Collect from ${siteConfig.contact.address.join(", ")}.`,
  },
];

export function OrderTypeRadios({
  value,
  onChange,
  disabled = false,
}: OrderTypeRadiosProps) {
  return (
    <fieldset className="flex flex-col gap-2 border-t border-line px-4 py-3">
      <legend className="text-sm font-medium text-ink-muted">Order Type</legend>
      {ORDER_TYPE_OPTIONS.map((option) => {
        const id = `checkout-order-type-${option.value}`;
        return (
          <div key={option.value} className="flex items-start gap-3">
            <input
              id={id}
              type="radio"
              name="orderType"
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              aria-describedby={`${id}-description`}
              className="mt-1 size-4 shrink-0 accent-accent disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="flex flex-col gap-0.5">
              <label htmlFor={id} className="font-medium text-ink">
                {option.label}
              </label>
              <p id={`${id}-description`} className="text-sm text-ink-muted">
                {option.description}
              </p>
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
