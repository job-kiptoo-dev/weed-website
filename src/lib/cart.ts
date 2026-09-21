/**
 * Pure cart logic shared by the Phase 1 client store and, later, the server
 * cart service. No React, no storage.
 */
import { siteConfig } from "@/lib/site-config";
import type {
  CartAction,
  CartLine,
  CartState,
  CartTotals,
  PricedCartLine,
} from "@/types/cart";

export interface ShippingRules {
  freeThresholdCents: number;
  flatRateCents: number;
}

const MIN_QUANTITY = 1;

function clampQuantity(quantity: number): number {
  const whole = Math.floor(quantity);
  return Math.min(
    Math.max(whole, MIN_QUANTITY),
    siteConfig.cart.maxQuantityPerLine,
  );
}

function sameLine(
  line: Pick<CartLine, "productId" | "variantId">,
  productId: string,
  variantId: string | null,
): boolean {
  return line.productId === productId && line.variantId === variantId;
}

export function lineKey(
  line: Pick<CartLine, "productId" | "variantId">,
): string {
  return `${line.productId}::${line.variantId ?? ""}`;
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const existing = state.lines.find((line) =>
        sameLine(line, action.productId, action.variantId),
      );
      if (existing) {
        return {
          lines: state.lines.map((line) =>
            line === existing
              ? {
                  ...line,
                  quantity: clampQuantity(line.quantity + action.quantity),
                }
              : line,
          ),
        };
      }
      return {
        lines: [
          ...state.lines,
          {
            productId: action.productId,
            variantId: action.variantId,
            quantity: clampQuantity(action.quantity),
          },
        ],
      };
    }
    case "setQuantity": {
      if (action.quantity <= 0) {
        return cartReducer(state, {
          type: "remove",
          productId: action.productId,
          variantId: action.variantId,
        });
      }
      return {
        lines: state.lines.map((line) =>
          sameLine(line, action.productId, action.variantId)
            ? { ...line, quantity: clampQuantity(action.quantity) }
            : line,
        ),
      };
    }
    case "remove":
      return {
        lines: state.lines.filter(
          (line) => !sameLine(line, action.productId, action.variantId),
        ),
      };
    case "clear":
      return { lines: [] };
  }
}

export function computeTotals(
  lines: PricedCartLine[],
  rules: ShippingRules,
): CartTotals {
  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.lineTotalCents,
    0,
  );
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const qualifiesForFreeShipping =
    lines.length === 0 || subtotalCents >= rules.freeThresholdCents;
  const shippingCents = qualifiesForFreeShipping ? 0 : rules.flatRateCents;
  const discountCents = 0;
  return {
    subtotalCents,
    shippingCents,
    discountCents,
    totalCents: subtotalCents + shippingCents - discountCents,
    itemCount,
    freeShippingRemainingCents: qualifiesForFreeShipping
      ? 0
      : rules.freeThresholdCents - subtotalCents,
  };
}
