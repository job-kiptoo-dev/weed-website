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

const features: FeatureFlags = {
  smokableHemp: true,
};

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
  shipping: {
    freeThresholdCents: 7500,
    flatRateCents: 695,
    estimateText: "Ships in 1 to 2 business days",
  },
  cart: {
    maxQuantityPerLine: 10,
  },
  contact: {
    email: "hello@botanicssupply.example",
    phone: "(555) 010-4242",
    address: ["120 Meadow Lane", "Portland, OR 97201"],
  },
  legal: {
    disclaimer:
      "These statements have not been evaluated by the Food and Drug Administration. These products are not intended to diagnose, treat, cure, or prevent any disease.",
    ageNotice: "For adults 21 and over.",
  },
  features,
} as const;
