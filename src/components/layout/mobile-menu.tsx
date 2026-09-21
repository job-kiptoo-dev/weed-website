"use client";

import Link from "next/link";
import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Menu } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { NavLink } from "@/lib/site-config";
import type { CategoryRef } from "@/types/catalog";

interface MobileMenuProps {
  nav: readonly NavLink[];
  categories: CategoryRef[];
  className?: string;
}

const linkClass =
  "block rounded-btn px-3 py-2.5 text-base text-ink hover:bg-brand-soft";

export function MobileMenu({ nav, categories, className }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-btn text-on-brand hover:bg-white/10 lg:hidden",
          className,
        )}
      >
        <Menu />
      </button>
      <Drawer open={open} onClose={close} title="Menu" side="left">
        <nav aria-label="Mobile" className="flex flex-col gap-6">
          <ul className="flex flex-col">
            {nav.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={close} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div>
            <p className="px-3 pb-2 text-sm font-medium text-ink-muted">
              Categories
            </p>
            <ul className="flex flex-col">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/shop/${category.slug}`}
                    onClick={close}
                    className={linkClass}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </Drawer>
    </>
  );
}
