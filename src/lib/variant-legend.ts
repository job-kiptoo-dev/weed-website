import type { ProductVariant } from "@/types/catalog";

export type VariantLegend = "Strength" | "Size" | "Option";

/** A variant name that is only a CBD amount, such as "500 mg" or "1,000 mg". */
const STRENGTH_NAME = /^\d[\d,]*\s?mg$/i;

/**
 * Legend for the variant radio group. Products without specs (accessories)
 * get "Option". Otherwise "Strength" only when every variant is a plain
 * milligram amount; count or pack variants ("10 mg, 30 count", "10 sachets")
 * read as "Size".
 */
export function variantLegend(
  variants: Pick<ProductVariant, "name">[],
  hasSpecs: boolean,
): VariantLegend {
  if (!hasSpecs) return "Option";
  const allStrengths =
    variants.length > 0 &&
    variants.every((variant) => STRENGTH_NAME.test(variant.name.trim()));
  return allStrengths ? "Strength" : "Size";
}
