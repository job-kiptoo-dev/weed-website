"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";

interface AddToCartButtonProps {
  productId: string;
  variantId: string | null;
  quantity?: number;
  disabled?: boolean;
  size?: ButtonProps["size"];
  fullWidth?: boolean;
  label?: string;
  className?: string;
}

/**
 * Adds the line and opens the cart drawer as confirmation. No toast: the
 * native `<dialog>` drawer sits in the top layer and would cover it.
 */
export function AddToCartButton({
  productId,
  variantId,
  quantity = 1,
  disabled = false,
  size,
  fullWidth,
  label = "Add to cart",
  className,
}: AddToCartButtonProps) {
  const { addLine, openDrawer } = useCart();

  function handleClick() {
    addLine(productId, variantId, quantity);
    openDrawer();
  }

  return (
    <Button
      type="button"
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      onClick={handleClick}
      className={className}
    >
      {label}
    </Button>
  );
}
