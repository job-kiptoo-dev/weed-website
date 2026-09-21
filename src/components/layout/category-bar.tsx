import Link from "next/link";
import { cn } from "@/lib/cn";
import type { CategoryRef } from "@/types/catalog";
import { Container } from "./container";

interface CategoryBarProps {
  categories: CategoryRef[];
  className?: string;
}

/*
 * The list scrolls horizontally on small screens. `overflow-x-auto` also
 * clips vertically, so links use an inset focus ring that stays inside.
 */
const linkClass =
  "inline-flex h-11 items-center px-3 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-offset-[-3px]";

export function CategoryBar({ categories, className }: CategoryBarProps) {
  const links = [
    { key: "all", label: "Shop all", href: "/shop" },
    ...categories.map((category) => ({
      key: category.id,
      label: category.name,
      href: `/shop/${category.slug}`,
    })),
  ];

  return (
    <nav
      aria-label="Categories"
      className={cn(
        "w-full bg-accent text-on-accent focus-scope-accent",
        className,
      )}
    >
      <Container>
        <ul className="-mx-4 flex [scrollbar-width:none] overflow-x-auto overscroll-x-contain px-4 whitespace-nowrap sm:mx-0 sm:px-0">
          {links.map((link) => (
            <li key={link.key}>
              <Link href={link.href} className={linkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </nav>
  );
}
