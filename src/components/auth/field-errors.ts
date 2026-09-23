import type { z } from "zod";

export const SUMMARY_MESSAGE = "Please fix the highlighted fields.";

export type FieldErrors<F extends string> = Partial<Record<F, string>>;

/**
 * First schema message per field, for the fields a form renders. Issues on
 * other paths are ignored. The auth schemas carry user-facing messages
 * (`AUTH_FIELD_MESSAGES`), so they are shown as-is.
 */
export function collectFieldErrors<F extends string>(
  issues: readonly z.core.$ZodIssue[],
  fields: readonly F[],
): FieldErrors<F> {
  const errors: FieldErrors<F> = {};
  for (const issue of issues) {
    const field = fields.find((name) => name === issue.path[0]);
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export function hasFieldErrors<F extends string>(
  errors: FieldErrors<F>,
): boolean {
  return Object.values(errors).some(Boolean);
}
