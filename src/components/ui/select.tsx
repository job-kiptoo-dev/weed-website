import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { ChevronDown } from "./icons";
import { fieldControlClass } from "./input";

export interface SelectProps extends Omit<ComponentProps<"select">, "id"> {
  label: string;
  id: string;
  hint?: string;
  error?: string;
}

export function Select({
  label,
  id,
  hint,
  error,
  className,
  children,
  "aria-describedby": ariaDescribedBy,
  ...props
}: SelectProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [ariaDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          className={cn(fieldControlClass, "h-11 appearance-none pr-10")}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted" />
      </div>
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
