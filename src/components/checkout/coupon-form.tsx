"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface CouponFormProps {
  /** The code currently sent to the server, or null when none is applied. */
  appliedCode: string | null;
  onApply: (code: string) => void;
  onRemove: () => void;
  /** Rejection message from the server quote, shown under the input. */
  error?: string;
  disabled?: boolean;
  className?: string;
}

const PANEL_ID = "checkout-coupon-panel";
const EMPTY_CODE_MESSAGE = "Enter a coupon code.";

/**
 * Collapsed by default, like the reference. Applying a code only changes what
 * the next quote asks for: the server decides whether the code is valid and
 * what it is worth, and the order still prices when it is rejected.
 *
 * Deliberately not a `<form>`: this sits inside the checkout form, and nested
 * forms are invalid HTML. Enter in the input applies the code instead of
 * submitting the order.
 */
export function CouponForm({
  appliedCode,
  onApply,
  onRemove,
  error,
  disabled = false,
  className,
}: CouponFormProps) {
  const [open, setOpen] = useState(appliedCode !== null);
  const [code, setCode] = useState(appliedCode ?? "");
  const [emptyError, setEmptyError] = useState<string | null>(null);

  function apply() {
    const trimmed = code.trim();
    if (trimmed === "") {
      setEmptyError(EMPTY_CODE_MESSAGE);
      return;
    }
    setEmptyError(null);
    onApply(trimmed);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    apply();
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="flex flex-wrap items-center gap-2 text-ink-muted">
        Have a coupon?
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={PANEL_ID}
          className="font-medium text-ink underline underline-offset-4 hover:text-brand"
        >
          Click here to enter your code
        </button>
      </p>
      {open ? (
        <div id={PANEL_ID} className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <Input
              id="checkout-coupon-code"
              label="Coupon code"
              autoComplete="off"
              autoCapitalize="characters"
              disabled={disabled}
              value={code}
              error={emptyError ?? error}
              onKeyDown={handleKeyDown}
              onChange={(event) => {
                setCode(event.target.value);
                if (emptyError) setEmptyError(null);
              }}
              className="flex-1 sm:max-w-xs"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={disabled}
              onClick={apply}
              className="sm:mt-7"
            >
              Apply coupon
            </Button>
          </div>
          {appliedCode ? (
            <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              <span>
                Code <strong className="text-ink">{appliedCode}</strong> sent
                with your order.
              </span>
              <button
                type="button"
                onClick={() => {
                  setCode("");
                  setEmptyError(null);
                  onRemove();
                }}
                className="underline underline-offset-4 hover:text-ink"
              >
                Remove
              </button>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
