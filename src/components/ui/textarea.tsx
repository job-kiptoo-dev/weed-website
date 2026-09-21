import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { fieldControlClass } from "./input";

export interface TextareaProps extends Omit<ComponentProps<"textarea">, "id"> {
  label: string;
  id: string;
  hint?: string;
  error?: string;
}

export function Textarea({
  label,
  id,
  hint,
  error,
  className,
  "aria-describedby": ariaDescribedBy,
  ...props
}: TextareaProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [ariaDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={id}
        className={cn(fieldControlClass, "min-h-32 py-2.5")}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
