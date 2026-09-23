import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type FormAlertTone = "danger" | "success" | "info";

interface FormAlertProps {
  tone?: FormAlertTone;
  children: ReactNode;
  className?: string;
}

const tones: Record<FormAlertTone, string> = {
  danger: "border-danger/40 bg-danger/5 text-danger",
  success: "border-success/40 bg-success/5 text-success",
  info: "border-line bg-brand-soft text-ink",
};

/**
 * Message box for auth forms. Errors are `role="alert"` (announced
 * immediately); success and info messages are `role="status"`.
 */
export function FormAlert({
  tone = "danger",
  children,
  className,
}: FormAlertProps) {
  return (
    <p
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-card border px-4 py-3 text-sm",
        tones[tone],
        className,
      )}
    >
      {children}
    </p>
  );
}
