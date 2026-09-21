"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ChevronDown } from "./icons";

export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
  className?: string;
}

const TRIGGER_SELECTOR = "[data-accordion-trigger]";

export function Accordion({
  items,
  allowMultiple = false,
  defaultOpenIds = [],
  className,
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);

  function toggle(id: string) {
    setOpenIds((prev) => {
      if (prev.includes(id)) return prev.filter((openId) => openId !== id);
      return allowMultiple ? [...prev, id] : [id];
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const root = event.currentTarget.closest("[data-accordion]");
    if (!root) return;
    const triggers = Array.from(
      root.querySelectorAll<HTMLButtonElement>(TRIGGER_SELECTOR),
    );
    const index = triggers.indexOf(event.currentTarget);
    if (index === -1 || triggers.length === 0) return;

    let nextIndex: number | null = null;
    switch (event.key) {
      case "ArrowDown":
        nextIndex = (index + 1) % triggers.length;
        break;
      case "ArrowUp":
        nextIndex = (index - 1 + triggers.length) % triggers.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = triggers.length - 1;
        break;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    triggers[nextIndex]?.focus();
  }

  return (
    <div
      data-accordion=""
      className={cn(
        "divide-y divide-line rounded-card border border-line bg-surface",
        className,
      )}
    >
      {items.map((item) => {
        const open = openIds.includes(item.id);
        const triggerId = `${item.id}-trigger`;
        const panelId = `${item.id}-panel`;
        return (
          <div key={item.id}>
            <h3 className="font-sans text-base">
              <button
                type="button"
                id={triggerId}
                data-accordion-trigger=""
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                onKeyDown={handleKeyDown}
                className="flex w-full items-center justify-between gap-4 rounded-btn px-4 py-4 text-left font-medium text-ink hover:text-accent-strong aria-expanded:text-accent-strong md:px-5"
              >
                <span>{item.title}</span>
                <ChevronDown
                  className={cn(
                    "shrink-0 text-ink-muted transition-transform duration-200 ease-soft",
                    open && "rotate-180 text-accent-strong",
                  )}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!open}
              className="px-4 pb-4 text-ink-muted md:px-5"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
