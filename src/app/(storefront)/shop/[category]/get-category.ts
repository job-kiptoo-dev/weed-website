import { cache } from "react";
import { categoryService } from "@/services/category.service";

/** Deduped across the layout, `generateMetadata` and the page within one request. */
export const getCategory = cache((slug: string) =>
  categoryService.getCategoryBySlug(slug),
);
