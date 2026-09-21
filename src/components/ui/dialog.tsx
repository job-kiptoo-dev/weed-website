"use client";

import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { Close } from "./icons";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md";
  className?: string;
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-lg",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
      if (dialog.open) dialog.close();
    };
  }, [open]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={handleBackdropClick}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] rounded-card bg-surface p-0 text-ink shadow-elevation [--focus-ring:var(--color-accent-strong)] backdrop:bg-ink/40 open:motion-safe:animate-reveal",
        sizes[size],
        className,
      )}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-2xl">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-btn text-ink-muted hover:bg-brand-soft hover:text-ink"
          >
            <Close />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </dialog>
  );
}
