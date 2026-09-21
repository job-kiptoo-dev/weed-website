"use client";

import { useEffect } from "react";
import { Container } from "@/components/layout/container";
import { ErrorState } from "@/components/ui/error-state";

interface ShopErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function ShopError({ error, retry }: ShopErrorProps) {
  useEffect(() => {
    console.error("Shop error boundary caught an error.", error);
  }, [error]);

  return (
    <Container className="py-16">
      <ErrorState
        title="We couldn't load the shop"
        description="Something went wrong while loading products. Please try again."
        onRetry={retry}
      />
    </Container>
  );
}
