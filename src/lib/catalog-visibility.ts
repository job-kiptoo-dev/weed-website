import type { FeatureFlags } from "@/lib/site-config";

/** Pre-rolls, hidden unless `features.smokableHemp` is on. */
export const HEMP_PRE_ROLLS_CATEGORY = "hemp-pre-rolls";

/** Loose flower by the strain, hidden unless `features.smokableHemp` is on. */
export const HEMP_FLOWER_CATEGORY = "hemp-flower";

/** Every category the `smokableHemp` flag controls. */
export const SMOKABLE_HEMP_CATEGORIES: ReadonlySet<string> = new Set([
  HEMP_PRE_ROLLS_CATEGORY,
  HEMP_FLOWER_CATEGORY,
]);

/**
 * True when a category is shown under the given feature flags. Smokable hemp
 * categories are dropped entirely (not drafted) while their flag is off, so
 * nothing leaks into the category bar, rail, search, `/shop/hemp-pre-rolls`
 * or `/shop/hemp-flower`. The database always holds every category; services
 * apply this rule at query time, so flipping the flag needs no data change.
 */
export function isCategoryEnabled(
  categorySlug: string,
  features: FeatureFlags,
): boolean {
  return !SMOKABLE_HEMP_CATEGORIES.has(categorySlug) || features.smokableHemp;
}

/**
 * The category slugs hidden under the given feature flags: empty when
 * everything is shown, both smokable hemp slugs when the flag is off.
 */
export function hiddenCategorySlugs(features: FeatureFlags): readonly string[] {
  return features.smokableHemp ? [] : [...SMOKABLE_HEMP_CATEGORIES];
}
