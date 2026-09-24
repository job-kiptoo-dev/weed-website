import { RatingStars } from "@/components/catalog/rating-stars";
import { cn } from "@/lib/cn";
import type { FeaturedReview } from "@/types/catalog";

interface CheckoutReviewProps {
  /** The featured review, or null when no published review qualifies. */
  review: FeaturedReview | null;
  className?: string;
}

/** One quoted customer review beside the order summary. Renders nothing when there is none. */
export function CheckoutReview({ review, className }: CheckoutReviewProps) {
  if (!review) return null;

  return (
    <figure
      className={cn(
        "flex flex-col gap-3 rounded-card border border-line bg-brand-soft p-5",
        className,
      )}
    >
      <RatingStars value={review.rating} />
      <blockquote className="flex flex-col gap-2">
        <p className="font-medium">{review.title}</p>
        <p className="text-sm text-ink-muted">{review.body}</p>
      </blockquote>
      <figcaption className="text-sm text-ink-muted">
        {review.authorName} on {review.productName}
      </figcaption>
    </figure>
  );
}
