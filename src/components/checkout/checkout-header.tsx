import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Leaf } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/lib/site-config";

interface CheckoutHeaderProps {
  className?: string;
}

/**
 * The only chrome checkout gets: the shop name linking home on the left and
 * the page name on the right. No nav, search or cart button, so nothing
 * invites leaving halfway through an order.
 */
export function CheckoutHeader({ className }: CheckoutHeaderProps) {
  return (
    <header
      className={cn("bg-brand text-on-brand focus-scope-dark", className)}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-btn font-display text-lg font-semibold whitespace-nowrap text-on-brand sm:text-xl"
        >
          <Leaf className="text-accent" />
          {siteConfig.name}
        </Link>
        <span className="font-medium text-on-brand-muted">Checkout</span>
      </Container>
    </header>
  );
}
