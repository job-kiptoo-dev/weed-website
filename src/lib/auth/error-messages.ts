/** Shape of a Better Auth client error (`{ data, error }` from the SDK). */
export interface AuthErrorLike {
  code?: string | null;
  status?: number | null;
}

export const GENERIC_AUTH_ERROR = "Something went wrong. Please try again.";

export const RATE_LIMITED_MESSAGE =
  "Too many attempts. Wait a minute and try again.";

const INVALID_CREDENTIALS = "Email or password is incorrect.";
const ACCOUNT_EXISTS =
  "An account with this email already exists. Sign in instead.";
const INVALID_RESET_LINK = "This reset link is invalid or has expired.";

/** Better Auth error codes (1.7) mapped to user-facing copy. */
const MESSAGES: Readonly<Record<string, string>> = {
  INVALID_EMAIL_OR_PASSWORD: INVALID_CREDENTIALS,
  USER_ALREADY_EXISTS: ACCOUNT_EXISTS,
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: ACCOUNT_EXISTS,
  PASSWORD_TOO_SHORT: "Use at least 10 characters.",
  PASSWORD_TOO_LONG: "Use at most 128 characters.",
  INVALID_EMAIL: "Enter a valid email address.",
  INVALID_TOKEN: INVALID_RESET_LINK,
  TOKEN_EXPIRED: INVALID_RESET_LINK,
  BANNED_USER: "This account has been suspended. Contact us for help.",
};

/**
 * User-facing message for a failed auth call. Rate limiting (HTTP 429)
 * carries no code, so it is matched on status. Unknown codes fall back to a
 * generic message rather than echoing server text.
 */
export function authErrorMessage(
  error: AuthErrorLike | null | undefined,
): string {
  if (error?.status === 429) return RATE_LIMITED_MESSAGE;
  const code = error?.code;
  if (code && Object.hasOwn(MESSAGES, code)) return MESSAGES[code];
  return GENERIC_AUTH_ERROR;
}
