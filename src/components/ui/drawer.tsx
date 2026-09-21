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

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  side?: "right" | "left";
  className?: string;
}

/** The UA `dialog` style sets `left: 0` and `right: 0`; release the far edge. */
const sides = {
  right: "right-0 left-auto motion-safe:starting:translate-x-full",
  left: "left-0 right-auto motion-safe:starting:-translate-x-full",
};

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  side = "right",
  className,
}: DrawerProps) {
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
        "fixed inset-y-0 m-0 h-full max-h-none w-[min(100vw,26rem)] max-w-none translate-x-0 bg-surface p-0 text-ink shadow-elevation transition-transform duration-300 ease-soft [--focus-ring:var(--color-accent-strong)] backdrop:bg-ink/40",
        sides[side],
        className,
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
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
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </dialog>
  );
}
