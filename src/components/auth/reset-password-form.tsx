"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import {
  authErrorMessage,
  GENERIC_AUTH_ERROR,
} from "@/lib/auth/error-messages";
import {
  PASSWORD_MIN_LENGTH,
  resetPasswordSchema,
} from "@/lib/validation/auth.schema";
import {
  collectFieldErrors,
  hasFieldErrors,
  SUMMARY_MESSAGE,
  type FieldErrors,
} from "./field-errors";
import { FormAlert } from "./form-alert";

interface ResetPasswordFormProps {
  /** Token from the emailed link; null when missing or rejected. */
  token: string | null;
}

type ResetField = "password" | "confirmPassword";

const FIELDS: readonly ResetField[] = ["password", "confirmPassword"];

const INVALID_LINK_MESSAGE = authErrorMessage({ code: "INVALID_TOKEN" });

/** Where to land after a reset: sign-in shows "Password updated". */
export const RESET_SUCCESS_PATH = "/sign-in?reset=1";

function RequestNewLink() {
  return (
    <Link
      href="/forgot-password"
      className="rounded-btn font-medium text-accent-strong hover:underline"
    >
      Request a new reset link
    </Link>
  );
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<ResetField, string>>({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FieldErrors<ResetField>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <div className="flex flex-col gap-5">
        <FormAlert>{INVALID_LINK_MESSAGE}</FormAlert>
        <p className="text-sm text-ink-muted">
          Reset links work once and expire after 1 hour. <RequestNewLink />
        </p>
      </div>
    );
  }

  function updateField(field: ResetField, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
    resetToken: string,
  ) {
    event.preventDefault();
    setServerError(null);
    const result = resetPasswordSchema.safeParse(values);
    if (!result.success) {
      setErrors(collectFieldErrors(result.error.issues, FIELDS));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: result.data.password,
        token: resetToken,
      });
      if (error) {
        setServerError(authErrorMessage(error));
        setSubmitting(false);
        return;
      }
    } catch (cause) {
      console.error("Password reset failed", cause);
      setServerError(GENERIC_AUTH_ERROR);
      setSubmitting(false);
      return;
    }
    router.replace(RESET_SUCCESS_PATH);
  }

  const linkRejected = serverError === INVALID_LINK_MESSAGE;

  return (
    <form
      onSubmit={(event) => handleSubmit(event, token)}
      noValidate
      className="flex flex-col gap-5"
    >
      {hasFieldErrors(errors) ? <FormAlert>{SUMMARY_MESSAGE}</FormAlert> : null}
      {serverError ? (
        <FormAlert>
          {serverError}
          {linkRejected ? (
            <>
              {" "}
              <RequestNewLink />
            </>
          ) : null}
        </FormAlert>
      ) : null}
      <Input
        id="reset-password"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        value={values.password}
        error={errors.password}
        onChange={(event) => updateField("password", event.target.value)}
      />
      <Input
        id="reset-confirm-password"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        value={values.confirmPassword}
        error={errors.confirmPassword}
        onChange={(event) => updateField("confirmPassword", event.target.value)}
      />
      <Button type="submit" loading={submitting} fullWidth>
        {submitting ? "Setting new password…" : "Set new password"}
      </Button>
    </form>
  );
}
