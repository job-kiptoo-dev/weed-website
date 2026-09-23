/** Where auth forms go after success when no `?next=` is given. */
export const DEFAULT_AUTH_REDIRECT = "/account";

/**
 * Links between sign-in and sign-up keep a non-default `next`, so switching
 * forms still returns the user to the page they came from.
 */
export function authPathWithNext(path: string, next: string): string {
  return next === DEFAULT_AUTH_REDIRECT
    ? path
    : `${path}?next=${encodeURIComponent(next)}`;
}
