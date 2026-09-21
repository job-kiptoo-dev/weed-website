"use client";

import { useEffect } from "react";
import { Container } from "@/components/layout/container";
import { ErrorState } from "@/components/ui/error-state";

interface StorefrontErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function StorefrontError({
  error,
  retry,
}: StorefrontErrorProps) {
  useEffect(() => {
    console.error("Storefront error boundary caught an error.", error);
  }, [error]);

  return (
    <Container className="py-16">
      <ErrorState title="Something went wrong" onRetry={retry} />
    </Container>
  );
}
