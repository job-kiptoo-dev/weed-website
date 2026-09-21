import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";

interface PriceProps {
  priceCents: number;
  compareAtPriceCents?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
};

export function Price({
  priceCents,
  compareAtPriceCents = null,
  size = "md",
  className,
}: PriceProps) {
  const onSale =
    compareAtPriceCents !== null && compareAtPriceCents > priceCents;

  return (
    <p
      className={cn(
        "inline-flex items-baseline gap-2 font-medium tabular-nums",
        sizes[size],
        className,
      )}
    >
      <span className={cn(onSale ? "text-accent-strong" : "text-ink")}>
        {onSale ? <VisuallyHidden>Sale price </VisuallyHidden> : null}
        {formatMoney(priceCents)}
      </span>
      {onSale ? (
        <s className="font-normal text-ink-muted">
          <VisuallyHidden>Original price </VisuallyHidden>
          {formatMoney(compareAtPriceCents)}
        </s>
      ) : null}
    </p>
  );
}
