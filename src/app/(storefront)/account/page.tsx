import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Account" };

const PLANNED_FEATURES = [
  "Order history",
  "Saved addresses",
  "Profile settings",
];

export default function AccountPage() {
  return (
    <Container className="flex flex-col items-center gap-6 py-24 text-center">
      <h1 className="text-4xl tracking-display md:text-5xl">Account</h1>
      <p className="max-w-md text-lg text-ink-muted">
        Accounts arrive in Phase 2. When they do, your account will include:
      </p>
      <ul className="flex flex-col gap-2 text-ink-muted">
        {PLANNED_FEATURES.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <Button href="/shop">Continue shopping</Button>
    </Container>
  );
}
