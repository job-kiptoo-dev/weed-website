import { z } from "zod";

/** Shared with the Better Auth config (`emailAndPassword.minPasswordLength`). */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export const AUTH_FIELD_MESSAGES = {
  name: "Enter your name (at least 2 characters).",
  email: "Enter a valid email address.",
  currentPassword: "Enter your password.",
  newPassword: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
  passwordTooLong: `Use at most ${PASSWORD_MAX_LENGTH} characters.`,
  confirmPassword: "Passwords don't match.",
  ageConfirmed: "You must be 21 or older to create an account.",
} as const;

/** Trimmed and lowercased before validation, matching how accounts are stored. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: AUTH_FIELD_MESSAGES.email }));

const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: AUTH_FIELD_MESSAGES.newPassword })
  .max(PASSWORD_MAX_LENGTH, { error: AUTH_FIELD_MESSAGES.passwordTooLong });

function passwordsMatch(values: { password: string; confirmPassword: string }) {
  return values.password === values.confirmPassword;
}

const MISMATCH = {
  error: AUTH_FIELD_MESSAGES.confirmPassword,
  path: ["confirmPassword"],
};

export const signInSchema = z.object({
  email: emailSchema,
  // No length rule: the password is checked by the server, and hinting at
  // the policy on sign-in only helps guessing.
  password: z.string().min(1, { error: AUTH_FIELD_MESSAGES.currentPassword }),
});

/**
 * Sign-up. `ageConfirmed` is the required "I am 21 or older" checkbox: it
 * is validated here but not sent to or stored by the server in Phase 2.
 */
export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { error: AUTH_FIELD_MESSAGES.name })
      .max(80, { error: AUTH_FIELD_MESSAGES.name }),
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string(),
    ageConfirmed: z.literal(true, { error: AUTH_FIELD_MESSAGES.ageConfirmed }),
  })
  .refine(passwordsMatch, MISMATCH);

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: newPasswordSchema, confirmPassword: z.string() })
  .refine(passwordsMatch, MISMATCH);

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
