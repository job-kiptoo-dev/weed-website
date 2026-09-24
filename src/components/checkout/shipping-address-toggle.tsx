"use client";

import { Checkbox } from "@/components/ui/checkbox";

interface ShippingAddressToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Id of the region the toggle reveals, for `aria-controls`. */
  controls: string;
  disabled?: boolean;
}

/**
 * Reveals the second address block. A checkbox rather than a button so the
 * state ("deliver elsewhere: yes/no") is what gets announced, with
 * `aria-expanded` describing the disclosure it drives.
 */
export function ShippingAddressToggle({
  checked,
  onChange,
  controls,
  disabled = false,
}: ShippingAddressToggleProps) {
  return (
    <Checkbox
      id="checkout-ship-elsewhere"
      label="Deliver to a different address?"
      checked={checked}
      disabled={disabled}
      aria-expanded={checked}
      aria-controls={controls}
      onChange={(event) => onChange(event.target.checked)}
    />
  );
}
