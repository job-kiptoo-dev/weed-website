/**
 * The payment methods the shop offers at checkout.
 *
 * Every method is offered in every environment. What changes with
 * configuration is only how `card` behaves: with no Stripe keys it is one more
 * manual arrangement ("place the order, then a person arranges payment with
 * you"), and once Stripe is configured the payment is taken on the page by
 * Stripe. `effectivePaymentProvider` is the single place that decides which,
 * and every method carries the copy for both modes so the two can never drift.
 *
 * Outside Stripe mode no card number, CVV or bank credential is ever entered
 * here (zero PCI scope), and the instruction copy must keep saying so. No
 * copy may ever imply buyer protection — several of these methods give none
 * for purchases.
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
  /**
   * The *intent*: who should take the money where the shop is fully set up.
   * Not what actually happens — a `stripe` method falls back to a manual
   * arrangement where Stripe is unconfigured. Ask
   * `effectivePaymentProvider` for the answer; never read this field to
   * decide behaviour.
   */
  provider: PaymentProvider;
  /** May contain `{phone}`; resolve before rendering. */
  instructions: string;
  /**
   * Copy for when this method really is taken by Stripe on the page. Only a
   * method whose intent is `stripe` needs it; `resolvePaymentInstructions`
   * falls back to `instructions` without one.
   */
  stripeInstructions?: string;
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
    // Shown while Stripe is unconfigured, which is the shop's state today:
    // there are no card fields, so the arrangement really is manual.
    instructions:
      "We'll contact you after your order to arrange card payment with a person. No card details are ever entered on this site, and we never see or store your card number. You can also reach us on {phone}.",
    // Shown once Stripe is configured and the card fields are on the page.
    stripeInstructions:
      "Enter your card details on this page. They go straight to Stripe over an encrypted connection, and we never see or store your card number. Any questions, call or text us on {phone}.",
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

/**
 * Picks the copy that matches how the method will actually behave, then fills
 * `{phone}` from the shop's contact details. Defaults to the manual copy, so a
 * caller that knows nothing about Stripe can never promise card fields that
 * are not there.
 */
export function resolvePaymentInstructions(
  method: Pick<PaymentMethodConfig, "instructions" | "stripeInstructions">,
  contact: { phone: string },
  provider: PaymentProvider = "manual",
): string {
  const copy =
    provider === "stripe" && method.stripeInstructions !== undefined
      ? method.stripeInstructions
      : method.instructions;
  return copy.replaceAll("{phone}", contact.phone);
}

/**
 * How a method behaves *here and now*: the config's `provider` is only the
 * intent, and a Stripe-backed method falls back to a manual arrangement
 * wherever Stripe is unconfigured. So `stripe` is returned only when the
 * method asks for it and the keys exist; everything else is `manual`,
 * including an id the config does not list — an unknown method can never be
 * treated as a taken payment.
 *
 * `stripeConfigured` is passed in rather than read here: this module must stay
 * usable in the browser bundle, where the server env does not exist.
 */
export function effectivePaymentProvider(
  id: PaymentMethodId,
  methods: readonly PaymentMethodConfig[],
  stripeConfigured: boolean,
): PaymentProvider {
  const intent =
    methods.find((method) => method.id === id)?.provider ?? "manual";
  return intent === "stripe" && stripeConfigured ? "stripe" : "manual";
}

/** The methods the shop actually accepts; the server rejects the rest. */
export function enabledPaymentMethods(
  methods: readonly PaymentMethodConfig[],
): PaymentMethodConfig[] {
  return methods.filter((method) => method.enabled);
}
