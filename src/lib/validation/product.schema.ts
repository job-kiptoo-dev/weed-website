import { z } from "zod";

/** Lowercase words joined by single hyphens: `calm-full-spectrum-oil`. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Uppercase segments joined by single hyphens: `HB-TIN-CALM-500`. */
export const SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export const slugSchema = z.string().trim().min(2).max(80).regex(SLUG_PATTERN, {
  error: "Use lowercase letters, numbers and single hyphens.",
});

export const skuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .max(40)
  .regex(SKU_PATTERN, {
    error: "Use letters, numbers and single hyphens.",
  });

const centsSchema = z.number().int().min(0);

/** Shape of `products.specs` (jsonb). The seed validates every product. */
export const productSpecsSchema = z.strictObject({
  strengthMg: z.number().int().min(0),
  spectrum: z.enum(["full", "broad", "isolate"]),
  labTested: z.boolean(),
  servingSize: z.string().trim().min(1).max(60),
  ingredients: z.array(z.string().trim().min(1).max(80)).min(1).max(40),
});

/**
 * Product create/update input, in cents (the admin form converts dollars).
 * `compareAtPriceCents` must exceed the price, mirroring the DB check.
 */
export const productInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: slugSchema,
    description: z.string().trim().min(1).max(5000),
    shortDescription: z.string().trim().min(1).max(300),
    priceCents: centsSchema,
    compareAtPriceCents: centsSchema.nullable(),
    sku: skuSchema,
    categoryId: z.string().trim().min(1),
    inventory: z.number().int().min(0),
    status: z.enum(["draft", "active", "archived"]),
    featured: z.boolean(),
    specs: productSpecsSchema.nullable(),
  })
  .refine(
    (product) =>
      product.compareAtPriceCents === null ||
      product.compareAtPriceCents > product.priceCents,
    {
      error: "The compare-at price must be higher than the price.",
      path: ["compareAtPriceCents"],
    },
  );

export type ProductSpecsInput = z.infer<typeof productSpecsSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
