"use client";

import Image from "next/image";
import Link from "next/link";
import { QuantitySelector } from "@/components/catalog/quantity-selector";
import { Close } from "@/components/ui/icons";
import { useCart } from "@/hooks/use-cart";
import { lineKey } from "@/lib/cart";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import type { PricedCartLine } from "@/types/cart";

interface CartItemProps {
  line: PricedCartLine;
  compact?: boolean;
  className?: string;
}

export function CartItem({ line, compact = false, className }: CartItemProps) {
  const { setQuantity, removeLine } = useCart();
  const href = `/product/${line.product.slug}`;
  const quantityId = `qty-${lineKey(line).replace(/[^a-z0-9-]/gi, "-")}`;

  return (
    <div className={cn("flex gap-4", className)}>
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="shrink-0 self-start overflow-hidden rounded-card border border-line bg-brand-soft"
      >
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt=""
            width={96}
            height={96}
            sizes="96px"
            className={cn("object-cover", compact ? "size-20" : "size-24")}
          />
        ) : (
          <span className={cn("block", compact ? "size-20" : "size-24")} />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={href} className="font-medium text-ink hover:underline">
              {line.name}
            </Link>
            {line.variantName ? (
              <p className="text-sm text-ink-muted">{line.variantName}</p>
            ) : null}
            <p className="text-sm text-ink-muted tabular-nums">
              {formatMoney(line.unitPriceCents)} each
            </p>
          </div>
          <button
            type="button"
            aria-label={`Remove ${line.name}`}
            onClick={() => removeLine(line.productId, line.variantId)}
            className="-mt-1 -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-btn text-ink-muted hover:bg-brand-soft hover:text-ink"
          >
            <Close className="size-4" />
          </button>
        </div>
        <div className="flex items-end justify-between gap-3">
          <QuantitySelector
            id={quantityId}
            value={line.quantity}
            labelHidden
            onChange={(quantity) =>
              setQuantity(line.productId, line.variantId, quantity)
            }
          />
          <p className="font-medium text-ink tabular-nums">
            {formatMoney(line.lineTotalCents)}
          </p>
        </div>
      </div>
    </div>
  );
}
