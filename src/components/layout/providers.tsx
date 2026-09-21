"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { CartProvider } from "@/hooks/use-cart";

/** Client context providers for the storefront. Rendered in the storefront layout only. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CartProvider>{children}</CartProvider>
    </ToastProvider>
  );
}
