import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <Container className="flex flex-col items-center gap-6 py-24 text-center">
      <h1 className="text-4xl tracking-display md:text-5xl">Checkout</h1>
      <p className="max-w-md text-lg text-ink-muted">
        Checkout arrives in a later phase. Your cart contents are kept in this
        browser, so anything you have added will still be here when checkout
        opens.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button href="/cart" variant="secondary">
          Back to cart
        </Button>
        <Button href="/shop">Continue shopping</Button>
      </div>
    </Container>
  );
}
