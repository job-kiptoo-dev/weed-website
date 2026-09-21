import { cache } from "react";
import { productService } from "@/services/product.service";

/** Deduped across the layout, `generateMetadata` and the page within one request. */
export const getProduct = cache((slug: string) =>
  productService.getProductBySlug(slug),
);
