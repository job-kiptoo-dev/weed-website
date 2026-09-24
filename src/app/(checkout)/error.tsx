"use client";

import { useEffect } from "react";
import { Container } from "@/components/layout/container";
import { ErrorState } from "@/components/ui/error-state";

interface CheckoutErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function CheckoutError({ error, retry }: CheckoutErrorProps) {
  useEffect(() => {
    console.error("Checkout error boundary caught an error.", error);
  }, [error]);

  return (
    <Container className="py-16">
      <ErrorState
        title="Checkout is having a problem"
        description="Nothing has been ordered and your cart is untouched. Please try again."
        onRetry={retry}
      />
    </Container>
  );
}
