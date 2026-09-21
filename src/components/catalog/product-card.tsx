import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { ProductSummary } from "@/types/catalog";
import { AddToCartButton } from "./add-to-cart-button";
import { Price } from "./price";
import { RatingStars } from "./rating-stars";
import { WishlistButton } from "./wishlist-button";

interface ProductCardProps {
  product: ProductSummary;
  priority?: boolean;
  /** `sizes` for the card image; override when the grid is narrower. */
  imageSizes?: string;
  className?: string;
}

const DEFAULT_IMAGE_SIZES =
  "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw";

export function ProductCard({
  product,
  priority = false,
  imageSizes = DEFAULT_IMAGE_SIZES,
  className,
}: ProductCardProps) {
  const href = `/product/${product.slug}`;
  const image = product.images[0];
  const defaultVariant =
    product.variants.find((variant) => variant.isDefault) ??
    product.variants[0];
  const onSale =
    product.compareAtPriceCents !== null &&
    product.compareAtPriceCents > product.priceCents;
  const outOfStock = product.inventory === 0;

  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-card border border-line bg-surface p-3 text-center",
        className,
      )}
    >
      <div className="relative">
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden="true"
          className="relative block aspect-square overflow-hidden rounded-btn bg-brand-soft"
        >
          {image ? (
            <Image
              src={image.url}
              alt={image.alt}
              fill
              preload={priority}
              sizes={imageSizes}
              className="object-cover transition-transform duration-300 ease-soft group-hover:scale-[1.02]"
            />
          ) : null}
        </Link>
        {onSale || outOfStock ? (
          <div className="pointer-events-none absolute top-2 left-2 flex flex-wrap gap-1.5">
            {onSale ? <Badge tone="accent">Sale</Badge> : null}
            {outOfStock ? <Badge>Out of stock</Badge> : null}
          </div>
        ) : null}
        <WishlistButton
          productId={product.id}
          name={product.name}
          className="absolute top-2 right-2 size-9 rounded-full border-line bg-surface/90"
        />
      </div>
      <div className="flex flex-1 flex-col items-center gap-1.5 pt-3">
        <p className="text-sm text-ink-muted">{product.category.name}</p>
        <h3 className="line-clamp-2 font-sans text-base font-medium">
          <Link href={href} className="rounded-btn text-ink hover:underline">
            {product.name}
          </Link>
        </h3>
        <Price
          priceCents={product.priceCents}
          compareAtPriceCents={product.compareAtPriceCents}
          size="sm"
        />
        {product.reviewCount > 0 ? (
          <RatingStars
            value={product.ratingAverage}
            count={product.reviewCount}
          />
        ) : null}
        <div className="mt-auto w-full pt-3">
          <AddToCartButton
            productId={product.id}
            variantId={defaultVariant?.id ?? null}
            size="sm"
            fullWidth
            disabled={outOfStock}
            label={outOfStock ? "Out of stock" : "Add to cart"}
          />
        </div>
      </div>
    </article>
  );
}
