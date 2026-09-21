import { cn } from "@/lib/cn";
import type { Review } from "@/types/catalog";
import { RatingStars } from "./rating-stars";

interface ReviewListProps {
  reviews: Review[];
  ratingAverage: number;
  reviewCount: number;
  className?: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function summaryLine(ratingAverage: number, reviewCount: number): string {
  const rounded = Math.round(ratingAverage * 10) / 10;
  const noun = reviewCount === 1 ? "review" : "reviews";
  return `${rounded} out of 5 from ${reviewCount} ${noun}`;
}

export function ReviewList({
  reviews,
  ratingAverage,
  reviewCount,
  className,
}: ReviewListProps) {
  const published = reviews.filter((review) => review.status === "published");

  return (
    <section
      aria-labelledby="reviews-heading"
      className={cn("flex flex-col gap-6", className)}
    >
      <div className="flex flex-col gap-2">
        <h2 id="reviews-heading" className="text-3xl">
          Reviews
        </h2>
        {reviewCount > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <RatingStars value={ratingAverage} />
            <p className="text-ink-muted">
              {summaryLine(ratingAverage, reviewCount)}
            </p>
          </div>
        ) : (
          <p className="text-ink-muted">No reviews yet.</p>
        )}
      </div>

      {published.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface">
          {published.map((review) => {
            const titleId = `review-${review.id}-title`;
            return (
              <li key={review.id}>
                <article
                  aria-labelledby={titleId}
                  className="flex flex-col gap-2 p-5"
                >
                  <RatingStars value={review.rating} />
                  <h3 id={titleId} className="font-sans text-base font-medium">
                    {review.title}
                  </h3>
                  <p className="text-sm text-ink-muted">
                    {review.authorName},{" "}
                    <time dateTime={review.createdAt}>
                      {dateFormatter.format(new Date(review.createdAt))}
                    </time>
                  </p>
                  <p className="text-ink">{review.body}</p>
                </article>
              </li>
            );
          })}
        </ul>
      ) : null}

      <p className="text-sm text-ink-muted">
        Reviews open with customer accounts in a later phase.
      </p>
    </section>
  );
}
