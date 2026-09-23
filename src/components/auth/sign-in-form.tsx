"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth/client";
import {
  authErrorMessage,
  GENERIC_AUTH_ERROR,
} from "@/lib/auth/error-messages";
import { signInSchema } from "@/lib/validation/auth.schema";
import { authPathWithNext } from "./auth-links";
import {
  collectFieldErrors,
  hasFieldErrors,
  SUMMARY_MESSAGE,
  type FieldErrors,
} from "./field-errors";
import { FormAlert } from "./form-alert";

interface SignInFormProps {
  /** Safe relative path to go to after signing in. */
  next: string;
  /** Shows the "Password updated" status after a reset. */
  passwordReset?: boolean;
}

type SignInField = "email" | "password";

const FIELDS: readonly SignInField[] = ["email", "password"];

export function SignInForm({ next, passwordReset = false }: SignInFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<SignInField, string>>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FieldErrors<SignInField>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: SignInField, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    const result = signInSchema.safeParse(values);
    if (!result.success) {
      setErrors(collectFieldErrors(result.error.issues, FIELDS));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { error } = await signIn.email(result.data);
      if (error) {
        setServerError(authErrorMessage(error));
        setSubmitting(false);
        return;
      }
    } catch (cause) {
      console.error("Sign-in request failed", cause);
      setServerError(GENERIC_AUTH_ERROR);
      setSubmitting(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {passwordReset && !serverError && !hasFieldErrors(errors) ? (
        <FormAlert tone="success">
          Password updated. Sign in with your new password.
        </FormAlert>
      ) : null}
      {hasFieldErrors(errors) ? <FormAlert>{SUMMARY_MESSAGE}</FormAlert> : null}
      {serverError ? <FormAlert>{serverError}</FormAlert> : null}
      <Input
        id="sign-in-email"
        label="Email address"
        type="email"
        autoComplete="email"
        required
        value={values.email}
        error={errors.email}
        onChange={(event) => updateField("email", event.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <Input
          id="sign-in-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={values.password}
          error={errors.password}
          onChange={(event) => updateField("password", event.target.value)}
        />
        <Link
          href="/forgot-password"
          className="self-start rounded-btn text-sm font-medium text-accent-strong hover:underline"
        >
          Forgot your password?
        </Link>
      </div>
      <Button type="submit" loading={submitting} fullWidth>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-ink-muted">
        New here?{" "}
        <Link
          href={authPathWithNext("/sign-up", next)}
          className="rounded-btn font-medium text-accent-strong hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
