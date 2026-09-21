"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { Alert, Check, Close } from "./icons";

type ToastTone = "neutral" | "success" | "danger";

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (input: ToastInput) => void;
  dismiss: (id: number) => void;
}

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

const ToastContext = createContext<ToastContextValue | null>(null);

let nextToastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function toast(input: ToastInput) {
    nextToastId += 1;
    const item: ToastItem = { ...input, id: nextToastId };
    setToasts((prev) => [...prev, item].slice(-MAX_TOASTS));
  }

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext value={{ toasts, toast, dismiss }}>{children}</ToastContext>
  );
}

function useToastContext(hookName: string): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error(
      `${hookName} must be used inside <ToastProvider>. Wrap your tree (for example in the storefront Providers component) before calling it.`,
    );
  }
  return context;
}

export function useToast(): { toast: (input: ToastInput) => void } {
  const { toast } = useToastContext("useToast");
  return { toast };
}

const tones: Record<ToastTone, string> = {
  neutral: "text-ink",
  success: "text-success",
  danger: "text-danger",
};

interface ToastCardProps {
  item: ToastItem;
  onDismiss: (id: number) => void;
}

function ToastCard({ item, onDismiss }: ToastCardProps) {
  const { id, title, description, tone = "neutral", action } = item;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div className="flex items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-elevation motion-safe:animate-reveal">
      {tone === "success" ? (
        <Check className={cn("mt-0.5", tones[tone])} />
      ) : null}
      {tone === "danger" ? (
        <Alert className={cn("mt-0.5", tones[tone])} />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={cn("font-medium", tones[tone])}>{title}</p>
        {description ? (
          <p className="text-sm text-ink-muted">{description}</p>
        ) : null}
        {action ? (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              onDismiss(id);
            }}
            className="self-start rounded-btn text-sm font-medium text-accent-strong hover:underline"
          >
            {action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="-mt-1 -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-btn text-ink-muted hover:bg-brand-soft hover:text-ink"
      >
        <Close className="size-4" />
        <span className="sr-only">Dismiss</span>
      </button>
    </div>
  );
}

export function Toaster({ className }: { className?: string }) {
  const { toasts, dismiss } = useToastContext("Toaster");

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className={cn(
        "pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-96",
        className,
      )}
    >
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastCard item={item} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
