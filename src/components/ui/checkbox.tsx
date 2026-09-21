import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export interface CheckboxProps extends Omit<
  ComponentProps<"input">,
  "id" | "type"
> {
  label: string;
  id: string;
  description?: string;
}

export function Checkbox({
  label,
  id,
  description,
  className,
  "aria-describedby": ariaDescribedBy,
  ...props
}: CheckboxProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const describedBy =
    [ariaDescribedBy, descriptionId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        className="rounded mt-1 size-4 shrink-0 accent-brand disabled:cursor-not-allowed disabled:opacity-60"
        aria-describedby={describedBy}
        {...props}
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-base text-ink">
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="text-sm text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
