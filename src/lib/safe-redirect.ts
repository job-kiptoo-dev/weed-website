const PLACEHOLDER_ORIGIN = "http://placeholder.invalid";

/**
 * Returns `next` when it is a same-origin relative path, otherwise
 * `fallback`. Guards post-sign-in redirects against open redirects such as
 * `//evil.com`, `/\evil.com`, absolute URLs and `javascript:` URLs.
 */
export function safeRedirectPath(next: unknown, fallback: string): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  // Browsers treat "\" like "/" and strip tabs and newlines, so either could
  // turn a path into a protocol-relative URL.
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;

  const url = new URL(next, PLACEHOLDER_ORIGIN);
  if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
