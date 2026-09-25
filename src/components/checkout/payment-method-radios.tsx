"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  effectivePaymentProvider,
  resolvePaymentInstructions,
  type PaymentMethodConfig,
  type PaymentMethodId,
} from "@/lib/payment-methods";
import { siteConfig } from "@/lib/site-config";

interface PaymentMethodRadiosProps {
  methods: readonly PaymentMethodConfig[];
  /**
   * Whether Stripe is configured in this environment. It decides only which
   * instruction copy a method shows: with no Stripe, the card method is one
   * more arrangement made by a person after the order.
   */
  stripeConfigured?: boolean;
  value: PaymentMethodId;
  onChange: (value: PaymentMethodId) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * How the customer wants to pay. Unless Stripe is configured and the method
 * is the card one, no payment is taken here and no card, bank or wallet
 * credential is collected: selecting a method only reveals how a person will
 * get in touch. The instructions follow the method's *effective* provider, so
 * they always describe what will really happen.
 *
 * Instructions render from `siteConfig` (the phone number lives there, never
 * in this file) and are tied to the selected radio with `aria-describedby`,
 * so a screen reader hears them as part of the choice.
 */
export function PaymentMethodRadios({
  methods,
  stripeConfigured = false,
  value,
  onChange,
  error,
  disabled = false,
  className,
}: PaymentMethodRadiosProps) {
  const errorId = error ? "checkout-payment-method-error" : undefined;

  return (
    <fieldset
      className={cn(
        "flex flex-col rounded-card border border-line bg-surface",
        className,
      )}
      aria-describedby={errorId}
    >
      <legend className="px-4 pt-4 text-base font-medium text-ink">
        Payment method
      </legend>
      <ul className="flex flex-col divide-y divide-line">
        {methods.map((method) => {
          const id = `checkout-payment-${method.id}`;
          const instructionsId = `${id}-instructions`;
          const selected = value === method.id;

          return (
            <li key={method.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex items-center gap-3">
                <input
                  id={id}
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={selected}
                  disabled={disabled}
                  onChange={() => onChange(method.id)}
                  aria-describedby={selected ? instructionsId : undefined}
                  className="size-4 shrink-0 accent-accent disabled:cursor-not-allowed disabled:opacity-60"
                />
                <label
                  htmlFor={id}
                  className="flex-1 font-medium text-ink select-none"
                >
                  {method.label}
                </label>
                {/* Freely licensed or own-drawn marks only (see
                    public/images/payments/README.md); a method without one
                    falls back to a neutral text badge. Decorative: the label
                    beside it already names the method, hence alt="".
                    A plain <img> on purpose — these are SVGs, and the image
                    optimiser refuses SVG unless `images.dangerouslyAllowSVG`
                    is set, which we will not turn on for six icons. */}
                {method.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={method.logo}
                    alt=""
                    width={24}
                    height={24}
                    loading="lazy"
                    className="size-6 shrink-0 object-contain"
                  />
                ) : (
                  <Badge>{method.label}</Badge>
                )}
              </div>
              {selected ? (
                <p id={instructionsId} className="text-sm text-ink-muted">
                  {resolvePaymentInstructions(
                    method,
                    siteConfig.contact,
                    effectivePaymentProvider(
                      method.id,
                      methods,
                      stripeConfigured,
                    ),
                  )}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p id={errorId} className="px-4 pb-4 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
