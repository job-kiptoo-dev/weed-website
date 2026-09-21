import type { Metadata } from "next";
import { CartPageContent } from "@/components/cart/cart-page-content";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <Container className="flex flex-col gap-8 py-10 md:py-14">
      <h1 className="text-4xl tracking-display md:text-5xl">Your cart</h1>
      <CartPageContent />
    </Container>
  );
}
