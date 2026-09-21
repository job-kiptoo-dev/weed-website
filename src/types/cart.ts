import type { ProductSummary, ProductVariant } from "./catalog";

export interface CartLine {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export interface CartState {
  lines: CartLine[];
}

export type CartAction =
  | {
      type: "add";
      productId: string;
      variantId: string | null;
      quantity: number;
    }
  | {
      type: "setQuantity";
      productId: string;
      variantId: string | null;
      quantity: number;
    }
  | { type: "remove"; productId: string; variantId: string | null }
  | { type: "clear" };

export interface PricedCartLine extends CartLine {
  product: ProductSummary;
  variant: ProductVariant | null;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface CartTotals {
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  itemCount: number;
  freeShippingRemainingCents: number;
}
