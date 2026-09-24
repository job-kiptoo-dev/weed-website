import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

/**
 * Checkout's own 404, so a stale or edited confirmation link (a missing `?t=`,
 * a changed order number, someone else's order) lands in the checkout chrome
 * instead of the storefront 404, and says why without hinting whether the
 * order exists.
 */
export default function CheckoutNotFound() {
  return (
    <Container className="flex flex-col items-center gap-6 py-24 text-center">
      <h1 className="text-4xl tracking-display md:text-5xl">
        We can&rsquo;t open that order
      </h1>
      <p className="max-w-md text-lg text-ink-muted">
        The link may be incomplete or out of date, or the order may belong to a
        different account. Use the full link from the page you saw after
        ordering, or contact us and quote your order number.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button href="/shop">Browse the shop</Button>
        <Button href="/contact" variant="secondary">
          Contact us
        </Button>
      </div>
    </Container>
  );
}
