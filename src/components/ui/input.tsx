import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends Omit<ComponentProps<"input">, "id"> {
  label: string;
  id: string;
  hint?: string;
  error?: string;
  /** `on-dark` recolours the label, hint and error for navy surfaces. */
  tone?: InputTone;
}

type InputTone = "default" | "on-dark";

const toneClasses: Record<
  InputTone,
  { label: string; hint: string; error: string }
> = {
  default: {
    label: "text-ink",
    hint: "text-ink-muted",
    error: "text-danger",
  },
  "on-dark": {
    label: "text-on-brand",
    hint: "text-on-brand-muted",
    error: "text-danger-on-dark",
  },
};

export const fieldControlClass =
  "w-full rounded-input border border-line-strong bg-surface px-3 text-ink placeholder:text-ink-muted/70 aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-60";

export function Input({
  label,
  id,
  hint,
  error,
  tone = "default",
  className,
  "aria-describedby": ariaDescribedBy,
  ...props
}: InputProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [ariaDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;
  const toneClass = toneClasses[tone];

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className={cn("text-sm font-medium", toneClass.label)}
      >
        {label}
      </label>
      <input
        id={id}
        className={cn(fieldControlClass, "h-11")}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {hint ? (
        <p id={hintId} className={cn("text-sm", toneClass.hint)}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={cn("text-sm", toneClass.error)}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
