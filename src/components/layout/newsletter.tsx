"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { newsletterSchema } from "@/lib/validation/newsletter.schema";

interface NewsletterProps {
  heading?: string;
  className?: string;
}

const SUCCESS_MESSAGE = "Thanks. You're on the list.";
const INVALID_EMAIL_MESSAGE = "Enter a valid email address.";

/**
 * Phase 1 newsletter form: validates locally and shows a success state with
 * no network call. Phase 10 wires the server action that stores the email.
 * Styled for the navy footer's contact column.
 */
export function Newsletter({
  heading = "Get the occasional update",
  className,
}: NewsletterProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = newsletterSchema.safeParse({ email: email.trim() });
    if (!result.success) {
      setError(INVALID_EMAIL_MESSAGE);
      return;
    }
    setError(null);
    setSubscribed(true);
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <h3
        id="newsletter-heading"
        className="font-sans text-base font-medium text-on-brand"
      >
        {heading}
      </h3>
      <p className="text-sm text-on-brand-muted">
        New products, restocks and lab report notes. No more than twice a month,
        and you can leave any time.
      </p>
      {subscribed ? (
        <p role="status" className="font-medium text-on-brand">
          {SUCCESS_MESSAGE}
        </p>
      ) : (
        <form
          aria-labelledby="newsletter-heading"
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-3"
        >
          <Input
            id="newsletter-email"
            label="Email address"
            type="email"
            autoComplete="email"
            required
            tone="on-dark"
            value={email}
            error={error ?? undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError(null);
            }}
            className="[&>label]:sr-only"
            placeholder="you@example.com"
          />
          <Button type="submit" variant="accent" fullWidth>
            Subscribe
          </Button>
        </form>
      )}
    </div>
  );
}
