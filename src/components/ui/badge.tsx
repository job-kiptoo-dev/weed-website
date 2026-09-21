import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "neutral" | "brand" | "accent" | "danger";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const tones: Record<BadgeTone, string> = {
  neutral: "border border-line bg-surface text-ink-muted",
  brand: "bg-brand-soft text-brand",
  accent: "bg-accent text-on-accent",
  danger: "bg-danger/10 text-danger",
};

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
