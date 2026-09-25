import {
  PAYMENT_METHOD_PRESETS,
  type PaymentMethodConfig,
} from "@/lib/payment-methods";
import { HOUR_MS, MINUTE_MS, type RateLimitBudget } from "@/lib/rate-limit";

export interface NavLink {
  label: string;
  href: string;
}

export interface FeatureFlags {
  /**
   * Shows the hemp pre-rolls and hemp flower categories, their products and
   * the matching FAQ and terms copy. When false the services and site copy
   * drop them entirely (see
   * `@/lib/catalog-visibility`); the database still holds them. Smokable
   * hemp is restricted in some states and by payment processors; see the
   * Phase 1.5 spec, Addendum A0.
   */
  smokableHemp: boolean;
}

/** Percent rates; a tax row only renders when its rate is above 0. */
export interface CheckoutTaxRates {
  excisePercent: number;
  salesPercent: number;
}

export interface CheckoutDeliveryRules {
  freeDeliveryThresholdCents: number;
  deliveryFeeCents: number;
  /**
   * Any saving for choosing pickup. It goes into `discountCents`, never into
   * a negative `shippingCents` (the `orders_money_check` constraint).
   */
  pickupDiscountCents: number;
}

/**
 * Budgets for the checkout actions, which are open to guests: without these
 * a script can drain inventory, burn a coupon campaign's uses or guess codes
 * (see `@/app/(checkout)/checkout/actions`). Every number is generous next to
 * one real session: the form re-quotes on cart, order-type and coupon changes
 * (debounced), and a customer fixing form errors never reaches the
 * place-order budget because only schema-valid attempts count.
 */
export interface CheckoutRateLimits {
  placeOrderPerIp: RateLimitBudget;
  placeOrderPerEmail: RateLimitBudget;
  quotePerIp: RateLimitBudget;
  /** Distinct coupon codes quoted per IP; closes the coupon oracle. */
  quoteCouponCodesPerIp: RateLimitBudget;
}

export interface CheckoutSecurityBadge {
  id: string;
  label: string;
  /** Rendered as the padlock from `@/components/ui/icons`. */
  icon?: "lock";
}

const features: FeatureFlags = {
  smokableHemp: true,
};

/**
 * Shipping rates live in their own const so `checkout.delivery` can point at
 * them instead of repeating the numbers: `/cart` and `/checkout` must charge
 * the same delivery fee.
 */
const shipping = {
  freeThresholdCents: 7500,
  flatRateCents: 695,
  estimateText: "Ships in 1 to 2 business days",
} as const;

/** Store description; names flower and pre-rolls only while on sale. */
export function describeStore(flags: FeatureFlags): string {
  const extras = flags.smokableHemp
    ? "smoking accessories, glassware, hemp flower and pre-rolls"
    : "smoking accessories and glassware";
  return `Small-batch hemp-derived CBD tinctures, gummies, topicals and teas, plus ${extras}. Third-party lab tested and labeled by strength and spectrum.`;
}

export const siteConfig = {
  name: "Botanics Supply Co.",
  tagline: "Straight-up hemp. Lab tested, no fluff.",
  description: describeStore(features),
  announcement: "Free shipping on orders over $75",
  nav: [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "About", href: "/about" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ] satisfies NavLink[],
  quickLinks: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ] satisfies NavLink[],
  social: [
    { label: "Instagram", href: "https://instagram.com/botanicssupplyco" },
    { label: "TikTok", href: "https://tiktok.com/@botanicssupplyco" },
  ] satisfies NavLink[],
  shipping,
  cart: {
    maxQuantityPerLine: 10,
  },
  checkout: {
    /** Both 0 until the client confirms the real rates. */
    taxes: {
      excisePercent: 0,
      salesPercent: 0,
    } satisfies CheckoutTaxRates,
    delivery: {
      freeDeliveryThresholdCents: shipping.freeThresholdCents,
      deliveryFeeCents: shipping.flatRateCents,
      pickupDiscountCents: 0,
    } satisfies CheckoutDeliveryRules,
    rateLimits: {
      placeOrderPerIp: { limit: 5, windowMs: HOUR_MS },
      placeOrderPerEmail: { limit: 3, windowMs: HOUR_MS },
      /**
       * One session re-quotes a handful of times a minute at most (250 ms
       * debounce, one request per settled change), so 60 leaves plenty of
       * room for editing the cart and retrying a coupon.
       */
      quotePerIp: { limit: 60, windowMs: MINUTE_MS },
      quoteCouponCodesPerIp: { limit: 5, windowMs: HOUR_MS },
    } satisfies CheckoutRateLimits,
    /**
     * Flip `enabled` to false to stop offering a method; the server rejects
     * disabled ones. `logo` points at a mark in `public/images/payments`
     * (see the README there) — without one the UI shows a text badge, which
     * is what Chime does since it has no freely licensed mark.
     */
    paymentMethods: [
      {
        ...PAYMENT_METHOD_PRESETS.zelle,
        enabled: true,
        logo: "/images/payments/zelle.svg",
      },
      {
        ...PAYMENT_METHOD_PRESETS["apple-pay"],
        enabled: true,
        logo: "/images/payments/apple-pay.svg",
      },
      { ...PAYMENT_METHOD_PRESETS.chime, enabled: true },
      {
        ...PAYMENT_METHOD_PRESETS.card,
        enabled: true,
        logo: "/images/payments/card.svg",
      },
      {
        ...PAYMENT_METHOD_PRESETS.bitcoin,
        enabled: true,
        logo: "/images/payments/bitcoin.svg",
      },
      {
        ...PAYMENT_METHOD_PRESETS.paypal,
        enabled: true,
        logo: "/images/payments/paypal.svg",
      },
      {
        ...PAYMENT_METHOD_PRESETS["cash-app"],
        enabled: true,
        logo: "/images/payments/cash-app.svg",
      },
      {
        ...PAYMENT_METHOD_PRESETS.venmo,
        enabled: true,
        logo: "/images/payments/venmo.svg",
      },
    ] satisfies PaymentMethodConfig[],
    /**
     * Claims we can actually stand behind. No "Accredited Business",
     * antivirus seals or card-network marks. The "we accept" line is derived
     * from the enabled `paymentMethods` above, never listed here, so a badge
     * can't advertise a method we don't take.
     */
    securityBadges: [
      { id: "secure-checkout", label: "Secure checkout", icon: "lock" },
      {
        id: "no-card-details",
        label: "We never see or store card details",
      },
      { id: "lab-tested", label: "Lab tested, 21+" },
    ] satisfies CheckoutSecurityBadge[],
  },
  contact: {
    email: "Sharekac25@gmail.com",
    phone: "(850) 328-3550",
    address: ["120 Meadow Lane", "Portland, OR 97201"],
  },
  legal: {
    disclaimer:
      "These statements have not been evaluated by the Food and Drug Administration. These products are not intended to diagnose, treat, cure, or prevent any disease.",
    ageNotice: "For adults 21 and over.",
  },
  features,
} as const;
