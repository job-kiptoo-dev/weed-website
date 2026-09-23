import { z } from "zod";
import { slugSchema } from "./product.schema";

/** A site-relative path (`/images/...`) or an absolute https URL. */
const imageUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      (value.startsWith("/") && !value.startsWith("//")) ||
      z.url({ protocol: /^https$/ }).safeParse(value).success,
    { error: "Use a site path starting with / or an https URL." },
  );

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  description: z.string().trim().min(1).max(1000),
  imageUrl: imageUrlSchema.nullable(),
  sortOrder: z.number().int().min(0),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
