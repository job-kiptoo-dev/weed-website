import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { Providers } from "@/components/layout/providers";
import { Toaster } from "@/components/ui/toast";

/**
 * Checkout keeps its own minimal chrome: no announcement bar, nav, category
 * bar, cart drawer or footer, so nothing competes with finishing the order.
 * `Providers` is still required — the checkout island reads the cart and
 * `useCart` throws outside `CartProvider`. Unlike the storefront layout this
 * one sets no `revalidate`: checkout is per-customer and always dynamic, and
 * it fetches no categories.
 */
export default function CheckoutLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-btn bg-surface px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Skip to content
      </a>
      <Providers>
        <CheckoutHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Toaster />
      </Providers>
    </>
  );
}
