import { Star, StarFilled } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

interface RatingStarsProps {
  value: number;
  count?: number;
  className?: string;
}

const STAR_COUNT = 5;

export function RatingStars({ value, count, className }: RatingStarsProps) {
  const rounded = Math.round(value * 10) / 10;
  const filled = Math.round(value);

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        role="img"
        aria-label={`${rounded} out of 5 stars`}
        className="inline-flex gap-0.5 text-accent"
      >
        {Array.from({ length: STAR_COUNT }, (_, index) =>
          index < filled ? (
            <StarFilled key={index} className="size-4" />
          ) : (
            <Star key={index} className="size-4" />
          ),
        )}
      </span>
      {count !== undefined ? (
        <span className="text-sm text-ink-muted tabular-nums">({count})</span>
      ) : null}
    </div>
  );
}
