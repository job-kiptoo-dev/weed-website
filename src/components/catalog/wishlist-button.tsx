"use client";

import { Heart, HeartFilled } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn } from "@/lib/cn";

interface WishlistButtonProps {
  productId: string;
  name: string;
  className?: string;
}

export function WishlistButton({
  productId,
  name,
  className,
}: WishlistButtonProps) {
  const { has, toggle } = useWishlist();
  const { toast } = useToast();
  const saved = has(productId);

  function handleClick() {
    toggle(productId);
    toast({
      title: saved ? "Removed from wishlist" : "Saved to wishlist",
      description: name,
      tone: saved ? "neutral" : "success",
    });
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={`Save ${name}`}
      onClick={handleClick}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-btn border border-line bg-surface text-ink hover:bg-brand-soft",
        saved && "text-accent-strong",
        className,
      )}
    >
      {saved ? <HeartFilled /> : <Heart />}
    </button>
  );
}
