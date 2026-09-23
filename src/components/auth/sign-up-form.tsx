"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth/client";
import {
  authErrorMessage,
  GENERIC_AUTH_ERROR,
} from "@/lib/auth/error-messages";
import {
  PASSWORD_MIN_LENGTH,
  signUpSchema,
} from "@/lib/validation/auth.schema";
import { authPathWithNext } from "./auth-links";
import {
  collectFieldErrors,
  hasFieldErrors,
  SUMMARY_MESSAGE,
  type FieldErrors,
} from "./field-errors";
import { FormAlert } from "./form-alert";

interface SignUpFormProps {
  /** Safe relative path to go to after the account is created. */
  next: string;
}

type SignUpField =
  "name" | "email" | "password" | "confirmPassword" | "ageConfirmed";

type TextField = Exclude<SignUpField, "ageConfirmed">;

const FIELDS: readonly SignUpField[] = [
  "name",
  "email",
  "password",
  "confirmPassword",
  "ageConfirmed",
];

const AGE_ERROR_ID = "sign-up-age-error";

export function SignUpForm({ next }: SignUpFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<TextField, string>>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<SignUpField>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function clearError(field: SignUpField) {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function updateField(field: TextField, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    const result = signUpSchema.safeParse({ ...values, ageConfirmed });
    if (!result.success) {
      setErrors(collectFieldErrors(result.error.issues, FIELDS));
      return;
    }
    setErrors({});
    setSubmitting(true);
    // The 21+ confirmation is validated above but never sent or stored
    // (Phase 2 spec, Q5). Sending extra fields such as `role` is rejected.
    const { name, email, password } = result.data;
    try {
      const { error } = await signUp.email({ name, email, password });
      if (error) {
        setServerError(authErrorMessage(error));
        setSubmitting(false);
        return;
      }
    } catch (cause) {
      console.error("Sign-up request failed", cause);
      setServerError(GENERIC_AUTH_ERROR);
      setSubmitting(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {hasFieldErrors(errors) ? <FormAlert>{SUMMARY_MESSAGE}</FormAlert> : null}
      {serverError ? <FormAlert>{serverError}</FormAlert> : null}
      <Input
        id="sign-up-name"
        label="Name"
        autoComplete="name"
        required
        value={values.name}
        error={errors.name}
        onChange={(event) => updateField("name", event.target.value)}
      />
      <Input
        id="sign-up-email"
        label="Email address"
        type="email"
        autoComplete="email"
        required
        value={values.email}
        error={errors.email}
        onChange={(event) => updateField("email", event.target.value)}
      />
      <Input
        id="sign-up-password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        value={values.password}
        error={errors.password}
        onChange={(event) => updateField("password", event.target.value)}
      />
      <Input
        id="sign-up-confirm-password"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        required
        value={values.confirmPassword}
        error={errors.confirmPassword}
        onChange={(event) => updateField("confirmPassword", event.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <Checkbox
          id="sign-up-age"
          label="I am 21 or older"
          required
          checked={ageConfirmed}
          aria-invalid={errors.ageConfirmed ? true : undefined}
          aria-describedby={errors.ageConfirmed ? AGE_ERROR_ID : undefined}
          onChange={(event) => {
            setAgeConfirmed(event.target.checked);
            clearError("ageConfirmed");
          }}
        />
        {errors.ageConfirmed ? (
          <p id={AGE_ERROR_ID} className="text-sm text-danger">
            {errors.ageConfirmed}
          </p>
        ) : null}
      </div>
      <Button type="submit" loading={submitting} fullWidth>
        {submitting ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link
          href={authPathWithNext("/sign-in", next)}
          className="rounded-btn font-medium text-accent-strong hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
