import { cn } from "@/lib/cn";
import { Button } from "./button";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <h2 className="text-xl">{title}</h2>
      {description ? (
        <p className="max-w-md text-ink-muted">{description}</p>
      ) : null}
      {action ? (
        <Button href={action.href} variant="secondary" className="mt-2">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
