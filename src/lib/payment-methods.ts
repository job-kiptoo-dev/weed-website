/**
 * The payment methods the shop offers at checkout.
 *
 * No payment is ever taken on this site: every method means "place the order,
 * then a person arranges payment with you". Card payments are arranged by
 * phone, so no card number, CVV or bank credential is ever entered here (zero
 * PCI scope). Instruction copy must keep saying so, and must never imply
 * buyer protection — several of these methods give none for purchases.
 *
 * Instruction strings carry the `{phone}` placeholder instead of a literal
 * number; `resolvePaymentInstructions` fills it from `siteConfig.contact`, so
 * the number lives in exactly one place.
 */

/** Order matters: this is the order the radios render in. */
export const PAYMENT_METHOD_IDS = [
  "zelle",
  "apple-pay",
  "chime",
  "card",
  "bitcoin",
  "paypal",
  "cash-app",
  "venmo",
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHOD_IDS)[number];

/**
 * Who takes the money. `manual` means a person arranges it after the order;
 * `stripe` means the payment is taken at checkout by Stripe, which only works
 * where Stripe is configured — see `stripeConfigured` in `src/lib/env.ts`.
 */
export type PaymentProvider = "manual" | "stripe";

export interface PaymentMethodConfig {
  id: PaymentMethodId;
  label: string;
  provider: PaymentProvider;
  /** May contain `{phone}`; resolve before rendering. */
  instructions: string;
  /**
   * Path under `/public` of a mark we are licensed to ship — a CC0 brand mark
   * or one we drew ourselves (see `public/images/payments/README.md`). Absent
   * → the UI renders a neutral text badge; we never ship copied logos.
   */
  logo?: string;
  enabled: boolean;
}

export type PaymentMethodPreset = Omit<PaymentMethodConfig, "enabled">;

/**
 * Labels and instruction copy per method. `siteConfig.checkout.paymentMethods`
 * spreads these and adds the `enabled` flag (and a `logo`, once assets exist),
 * so copy is never duplicated.
 */
export const PAYMENT_METHOD_PRESETS: Record<
  PaymentMethodId,
  PaymentMethodPreset
> = {
  zelle: {
    id: "zelle",
    label: "Zelle",
    provider: "manual",
    instructions:
      "Place your order first, then call or text us on {phone}. A person will send you the Zelle name and number to pay. No payment is taken on this site.",
  },
  "apple-pay": {
    id: "apple-pay",
    label: "Apple Pay",
    provider: "manual",
    instructions:
      "Place your order first, then call or text us on {phone} and we'll arrange your Apple Pay payment with you. Nothing is charged on this site.",
  },
  chime: {
    id: "chime",
    label: "Chime",
    provider: "manual",
    instructions:
      "Place your order first, then call or text us on {phone}. A person will send you the Chime tag to pay. No payment is taken on this site.",
  },
  card: {
    id: "card",
    label: "Pay With Card",
    provider: "stripe",
    instructions:
      "We'll contact you after your order to arrange card payment with a person. No card details are ever entered on this site, and we never see or store your card number. You can also reach us on {phone}.",
  },
  bitcoin: {
    id: "bitcoin",
    label: "Bitcoin",
    provider: "manual",
    instructions:
      "Place your order first, then call or text us on {phone}. A person will send you the Bitcoin address and the amount to send. No payment is taken on this site.",
  },
  paypal: {
    id: "paypal",
    label: "PayPal",
    provider: "manual",
    instructions:
      "Place your order first, then call or text us on {phone} and we'll arrange the PayPal payment with you. Nothing is charged on this site.",
  },
  "cash-app": {
    id: "cash-app",
    label: "Cash App",
    provider: "manual",
    instructions:
      "Place your order first, then call or text us on {phone}. A person will send you the Cash App $Cashtag to pay. No payment is taken on this site.",
  },
  venmo: {
    id: "venmo",
    label: "Venmo",
    provider: "manual",
    instructions:
      "Place your order first, then call or text us on {phone}. A person will send you the Venmo handle to pay. No payment is taken on this site.",
  },
};

/** Fills `{phone}` from the shop's contact details. */
export function resolvePaymentInstructions(
  method: Pick<PaymentMethodConfig, "instructions">,
  contact: { phone: string },
): string {
  return method.instructions.replaceAll("{phone}", contact.phone);
}

/**
 * The provider behind a method id, defaulting to `manual` for an id the config
 * does not list: an unknown method can never be treated as a taken payment.
 */
export function paymentProviderFor(
  id: PaymentMethodId,
  methods: readonly PaymentMethodConfig[],
): PaymentProvider {
  return methods.find((method) => method.id === id)?.provider ?? "manual";
}

/** The methods the shop actually accepts; the server rejects the rest. */
export function enabledPaymentMethods(
  methods: readonly PaymentMethodConfig[],
): PaymentMethodConfig[] {
  return methods.filter((method) => method.enabled);
}
