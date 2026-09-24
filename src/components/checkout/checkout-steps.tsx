import Link from "next/link";
import { Check } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** The three steps of the purchase flow, in order. `current` is 1-based. */
export const CHECKOUT_STEPS = ["Cart", "Checkout", "Order complete"] as const;

interface CheckoutStepsProps {
  /** The step the customer is on: 1 cart, 2 checkout, 3 order complete. */
  current: number;
  className?: string;
}

/**
 * Only the cart is reachable from the progress bar: it is the way back out of
 * checkout when a stock issue blocks the order. Checkout and the confirmation
 * both depend on state this component cannot know, so they stay plain text.
 */
const STEP_HREFS: readonly (string | undefined)[] = [
  "/cart",
  undefined,
  undefined,
];

const markerBase =
  "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums";

/** A link when the step can be revisited, plain text otherwise. */
function StepLabel({
  href,
  isCurrent,
  isComplete,
  label,
}: {
  href: string | undefined;
  isCurrent: boolean;
  isComplete: boolean;
  label: string;
}) {
  const content = (
    <>
      {label}
      {isComplete ? <span className="sr-only"> completed</span> : null}
    </>
  );
  const className = isCurrent ? "font-medium text-ink" : "text-ink-muted";

  if (!href) {
    return (
      <span aria-current={isCurrent ? "step" : undefined} className={className}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isCurrent ? "step" : undefined}
      className={cn(
        className,
        "rounded-btn underline-offset-4 hover:underline",
      )}
    >
      {content}
    </Link>
  );
}

export function CheckoutSteps({ current, className }: CheckoutStepsProps) {
  return (
    <nav aria-label="Checkout progress" className={className}>
      <ol className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {CHECKOUT_STEPS.map((label, index) => {
          const step = index + 1;
          const isCurrent = step === current;
          const isComplete = step < current;

          return (
            <li key={label} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  markerBase,
                  isComplete && "bg-brand text-on-brand",
                  isCurrent && "bg-accent text-on-accent",
                  !isComplete && !isCurrent && "border border-line",
                )}
              >
                {isComplete ? <Check className="size-4" /> : step}
              </span>
              <StepLabel
                href={STEP_HREFS[index]}
                isCurrent={isCurrent}
                isComplete={isComplete}
                label={label}
              />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
