import { cn } from "@/lib/cn";
import { productService } from "@/services/product.service";
import { ProductGrid } from "./product-grid";

interface RelatedProductsProps {
  productId: string;
  className?: string;
}

export async function RelatedProducts({
  productId,
  className,
}: RelatedProductsProps) {
  const products = await productService.getRelatedProducts(productId);
  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby="related-heading"
      className={cn("flex flex-col gap-6", className)}
    >
      <h2 id="related-heading" className="text-3xl">
        You might also like
      </h2>
      <ProductGrid products={products} />
    </section>
  );
}
