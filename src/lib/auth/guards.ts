import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { AuthError } from "@/lib/errors";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { isAdmin } from "./roles";
import { getAuth, type AuthSession } from "./server";

export type { AuthSession };

const SIGN_IN_PATH = "/sign-in";

/** `/sign-in?next=<path>`, where `next` is always a safe relative path. */
export function signInUrl(next: string): string {
  const target = safeRedirectPath(next, "/account");
  return `${SIGN_IN_PATH}?next=${encodeURIComponent(target)}`;
}

/** The current session, deduplicated per request. Null when signed out. */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  const auth = await getAuth();
  return auth.api.getSession({ headers: await headers() });
});

/** Reads the session from the database, bypassing the cookie cache. */
async function getFreshSession(): Promise<AuthSession | null> {
  const auth = await getAuth();
  return auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
}

/** For pages: the session, or a redirect to sign-in that returns to `next`. */
export async function requireUser(next: string): Promise<AuthSession> {
  const session = await getSession();
  if (!session) redirect(signInUrl(next));
  return session;
}

/**
 * For admin pages. Skips the 5-minute session cookie cache so a role change
 * or ban applies immediately. Non-admins get a 404 so the admin area's
 * existence isn't revealed.
 */
export async function requireAdmin(next: string): Promise<AuthSession> {
  const session = await getFreshSession();
  if (!session) redirect(signInUrl(next));
  if (!isAdmin(session.user)) notFound();
  return session;
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function assertUser(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) throw new AuthError("UNAUTHENTICATED");
  return session;
}

export async function assertAdmin(): Promise<AuthSession> {
  const session = await getFreshSession();
  if (!session) throw new AuthError("UNAUTHENTICATED");
  if (!isAdmin(session.user)) throw new AuthError("FORBIDDEN");
  return session;
}
