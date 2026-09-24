import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { CheckoutReview } from "@/components/checkout/checkout-review";
import { CheckoutSteps } from "@/components/checkout/checkout-steps";
import { SecurityBadges } from "@/components/checkout/security-badges";
import { Container } from "@/components/layout/container";
import { getSession } from "@/lib/auth/guards";
import { getServerEnv } from "@/lib/env";
import { reviewService } from "@/services/review.service";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default async function CheckoutPage() {
  // `getSession`, never `requireUser`: guests must be able to check out. A
  // session only prefills the customer's details and links the order to them.
  const [session, featuredReview] = await Promise.all([
    getSession(),
    reviewService.getFeaturedReview(),
  ]);

  return (
    <Container className="flex flex-col gap-6 py-8 md:gap-8 md:py-12">
      <CheckoutSteps current={2} />
      <h1 className="text-4xl tracking-display md:text-5xl">Checkout</h1>
      <CheckoutForm
        // Read here and passed down, so the key's name stays a server concern
        // and no page that does not need it carries it in its bundle. Null
        // where Stripe is unconfigured: the card method is then not offered.
        stripePublishableKey={getServerEnv().STRIPE_PUBLISHABLE_KEY ?? null}
        customer={
          session
            ? { name: session.user.name, email: session.user.email }
            : null
        }
        aside={
          <>
            <SecurityBadges />
            <CheckoutReview review={featuredReview} />
          </>
        }
      />
    </Container>
  );
}
