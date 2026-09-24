"use client";

import { Button } from "@/components/ui/button";
import { Lock } from "@/components/ui/icons";

interface PlaceOrderButtonProps {
  disabled?: boolean;
  pending?: boolean;
}

/**
 * Submits the checkout. The padlock stands for "your details are sent over a
 * secure connection" — it must never be read as "payment taken here",
 * because none is.
 */
export function PlaceOrderButton({
  disabled = false,
  pending = false,
}: PlaceOrderButtonProps) {
  return (
    <Button
      type="submit"
      variant="accent"
      size="lg"
      fullWidth
      disabled={disabled}
      loading={pending}
    >
      {pending ? null : <Lock className="size-4" />}
      {pending ? "Placing order…" : "Place order"}
    </Button>
  );
}
