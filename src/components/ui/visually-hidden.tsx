import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface VisuallyHiddenProps {
  children: ReactNode;
  className?: string;
}

export function VisuallyHidden({ children, className }: VisuallyHiddenProps) {
  return <span className={cn("sr-only", className)}>{children}</span>;
}
