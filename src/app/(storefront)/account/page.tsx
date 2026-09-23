import type { Metadata } from "next";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { isAdmin } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false },
};

const COMING_SOON = ["Orders", "Saved addresses", "Profile settings"];

const memberSince = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export default async function AccountPage() {
  const { user } = await requireUser("/account");

  return (
    <Container className="flex flex-col gap-8 py-10 md:py-14">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl tracking-display break-words md:text-5xl">
              Hi, {user.name}
            </h1>
            {isAdmin(user) ? <Badge tone="brand">Admin</Badge> : null}
          </div>
          <p className="break-all text-ink-muted">{user.email}</p>
          <p className="text-sm text-ink-muted">
            Member since {memberSince.format(new Date(user.createdAt))}
          </p>
        </div>
        <SignOutButton className="self-start" />
      </header>
      <section
        aria-labelledby="account-coming-soon-heading"
        className="flex max-w-xl flex-col gap-4 rounded-card border border-line bg-surface p-6"
      >
        <h2 id="account-coming-soon-heading" className="text-2xl">
          Coming soon
        </h2>
        <p className="text-ink-muted">
          Order history and saved addresses arrive with checkout.
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-ink-muted">
          {COMING_SOON.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Button href="/shop" className="self-start">
          Continue shopping
        </Button>
      </section>
    </Container>
  );
}
