"use client";

import { useState } from "react";
import { Truck } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { siteConfig } from "@/lib/site-config";
import { variantLegend } from "@/lib/variant-legend";
import type { ProductDetail } from "@/types/catalog";
import { AddToCartButton } from "./add-to-cart-button";
import { Price } from "./price";
import { QuantitySelector } from "./quantity-selector";
import { VariantSelector } from "./variant-selector";
import { WishlistButton } from "./wishlist-button";

interface ProductPurchasePanelProps {
  product: ProductDetail;
  className?: string;
}

const LOW_STOCK_THRESHOLD = 5;

function stockLine(inventory: number): string {
  if (inventory <= 0) return "Out of stock";
  if (inventory <= LOW_STOCK_THRESHOLD) return `Only ${inventory} left`;
  return "In stock";
}

export function ProductPurchasePanel({
  product,
  className,
}: ProductPurchasePanelProps) {
  const defaultVariant =
    product.variants.find((variant) => variant.isDefault) ??
    product.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    defaultVariant?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);

  const variant =
    product.variants.find((item) => item.id === selectedVariantId) ??
    defaultVariant;
  const unitPriceCents = variant?.priceCents ?? product.priceCents;
  const inventory = variant?.inventory ?? product.inventory;
  const outOfStock = inventory <= 0;
  // The compare-at price belongs to the product's default price.
  const compareAtPriceCents =
    variant === undefined || variant.isDefault
      ? product.compareAtPriceCents
      : null;
  const legend = variantLegend(product.variants, product.specs !== null);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Price
        priceCents={unitPriceCents}
        compareAtPriceCents={compareAtPriceCents}
        size="lg"
      />

      {product.variants.length > 1 && variant ? (
        <VariantSelector
          variants={product.variants}
          value={variant.id}
          onChange={setSelectedVariantId}
          legend={legend}
        />
      ) : null}

      <QuantitySelector
        id="purchase-quantity"
        value={quantity}
        onChange={setQuantity}
        disabled={outOfStock}
      />

      <div className="flex items-center gap-3">
        <AddToCartButton
          productId={product.id}
          variantId={variant?.id ?? null}
          quantity={quantity}
          disabled={outOfStock}
          label={outOfStock ? "Out of stock" : "Add to cart"}
          size="lg"
          fullWidth
        />
        <WishlistButton
          productId={product.id}
          name={product.name}
          className="size-13"
        />
      </div>

      <div className="flex flex-col gap-2 text-sm text-ink-muted">
        <p
          className={cn(
            "font-medium",
            outOfStock ? "text-ink-muted" : "text-success",
          )}
        >
          {stockLine(inventory)}
        </p>
        <p className="flex items-center gap-2">
          <Truck className="size-4 shrink-0" />
          <span>
            {siteConfig.shipping.estimateText}. Free shipping on orders over{" "}
            {formatMoney(siteConfig.shipping.freeThresholdCents)}, otherwise{" "}
            {formatMoney(siteConfig.shipping.flatRateCents)}.
          </span>
        </p>
      </div>
    </div>
  );
}
