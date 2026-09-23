"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import {
  authErrorMessage,
  GENERIC_AUTH_ERROR,
} from "@/lib/auth/error-messages";
import { siteConfig } from "@/lib/site-config";
import { forgotPasswordSchema } from "@/lib/validation/auth.schema";
import {
  collectFieldErrors,
  hasFieldErrors,
  SUMMARY_MESSAGE,
  type FieldErrors,
} from "./field-errors";
import { FormAlert } from "./form-alert";

interface ForgotPasswordFormProps {
  /**
   * True while reset emails can only reach the store owner
   * (`isEmailDeliveryLimited()`), which shows the demo-mode notice.
   */
  deliveryLimited: boolean;
  /** Development without an email key: the link goes to the server log. */
  linkInServerLog?: boolean;
}

type ForgotField = "email";

const FIELDS: readonly ForgotField[] = ["email"];

/** Shown for every accepted request, so it can't reveal which emails exist. */
export const RESET_REQUESTED_MESSAGE =
  "If an account exists for that email, we've sent a reset link. It expires in 1 hour.";

export const DEMO_DELIVERY_NOTICE = `Heads up: while the store is in demo mode, reset emails can only be delivered to the store owner's inbox. If nothing arrives in a few minutes, email ${siteConfig.contact.email} and we'll help you get back in.`;

export const DEV_LOG_NOTICE =
  "Dev: the reset link is printed in the server log.";

export function ForgotPasswordForm({
  deliveryLimited,
  linkInServerLog = false,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors<ForgotField>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    setRequested(false);
    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setErrors(collectFieldErrors(result.error.issues, FIELDS));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email: result.data.email,
        redirectTo: "/reset-password",
      });
      if (error) {
        setServerError(authErrorMessage(error));
      } else {
        setRequested(true);
      }
    } catch (cause) {
      console.error("Password reset request failed", cause);
      setServerError(GENERIC_AUTH_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {hasFieldErrors(errors) ? <FormAlert>{SUMMARY_MESSAGE}</FormAlert> : null}
      {serverError ? <FormAlert>{serverError}</FormAlert> : null}
      {requested ? (
        <FormAlert tone="success">{RESET_REQUESTED_MESSAGE}</FormAlert>
      ) : null}
      <Input
        id="forgot-password-email"
        label="Email address"
        type="email"
        autoComplete="email"
        required
        value={email}
        error={errors.email}
        onChange={(event) => {
          setEmail(event.target.value);
          if (errors.email) setErrors({});
        }}
      />
      <Button type="submit" loading={submitting} fullWidth>
        {submitting ? "Sending reset link…" : "Send reset link"}
      </Button>
      {deliveryLimited ? (
        <p className="text-sm text-ink-muted">{DEMO_DELIVERY_NOTICE}</p>
      ) : null}
      {linkInServerLog ? (
        <p className="text-sm text-ink-muted">{DEV_LOG_NOTICE}</p>
      ) : null}
      <p className="text-center text-sm text-ink-muted">
        Remembered it?{" "}
        <Link
          href="/sign-in"
          className="rounded-btn font-medium text-accent-strong hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
