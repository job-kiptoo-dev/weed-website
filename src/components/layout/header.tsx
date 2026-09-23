import Link from "next/link";
import { Leaf } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/lib/site-config";
import type { CategoryRef } from "@/types/catalog";
import { AccountNavLink } from "./account-nav-link";
import { CartButton } from "./cart-button";
import { Container } from "./container";
import { MobileMenu } from "./mobile-menu";
import { SearchBar } from "./search-bar";

interface HeaderProps {
  categories: CategoryRef[];
  className?: string;
}

const navLinkClass =
  "inline-flex h-10 items-center rounded-btn px-3 font-medium text-on-brand hover:bg-white/10";

export function Header({ categories, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-brand text-on-brand focus-scope-dark",
        className,
      )}
    >
      <Container className="flex h-16 items-center gap-2 lg:gap-6">
        <MobileMenu nav={siteConfig.nav} categories={categories} />
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-btn font-display text-lg font-semibold whitespace-nowrap text-on-brand sm:text-xl"
        >
          <Leaf className="hidden text-accent sm:block" />
          {siteConfig.name}
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {siteConfig.nav.map((link) => (
            <Link key={link.href} href={link.href} className={navLinkClass}>
              {link.label}
            </Link>
          ))}
          <AccountNavLink className={navLinkClass} />
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <SearchBar />
          <CartButton />
        </div>
      </Container>
    </header>
  );
}
