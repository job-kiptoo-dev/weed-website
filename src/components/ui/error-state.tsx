import { cn } from "@/lib/cn";
import { Button } from "./button";
import { Alert } from "./icons";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this right now. Please try again.",
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <Alert className="size-8 text-danger" />
      <h2 className="text-xl">{title}</h2>
      <p className="max-w-md text-ink-muted">{description}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} className="mt-2">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
