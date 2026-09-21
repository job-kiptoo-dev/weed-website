/**
 * Icon names are declared here so content types never import from the
 * components layer. `src/components/ui/icons.tsx` (T3) must export the same
 * `IconName` union.
 */
export type IconName =
  | "cart"
  | "search"
  | "menu"
  | "close"
  | "chevronDown"
  | "chevronLeft"
  | "chevronRight"
  | "heart"
  | "heartFilled"
  | "user"
  | "plus"
  | "minus"
  | "check"
  | "star"
  | "starFilled"
  | "alert"
  | "leaf"
  | "truck"
  | "shield"
  | "refresh";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface TrustFeature {
  id: string;
  title: string;
  description: string;
  icon: IconName;
}

export interface StaticPageSection {
  heading: string;
  paragraphs: string[];
}

export interface StaticPage {
  slug: string;
  title: string;
  intro: string;
  sections: StaticPageSection[];
}

export interface Cta {
  label: string;
  href: string;
}

export interface PromoBannerContent {
  title: string;
  subtitle: string;
  productSlug: string;
  /** The href is derived as `/product/<productSlug>`, so it cannot drift. */
  ctaLabel: string;
  imageUrl: string;
  imageAlt: string;
}

export interface FeatureBandContent {
  id: string;
  title: string;
  paragraphs: string[];
  imageUrl: string;
  imageAlt: string;
  cta: Cta | null;
}

export interface HomeContent {
  promoBanner: PromoBannerContent;
  bands: [FeatureBandContent, FeatureBandContent];
  categoryRowSlugs: string[];
  trustFeatures: TrustFeature[];
}
