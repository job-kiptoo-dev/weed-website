import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect for signed-out visitors: checks only that a session
 * cookie exists (no database call). Pages still verify the session with
 * `requireUser` / `requireAdmin`, and so must every server action.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(signIn);
}

// Only the protected areas; static files, _next and the API never run it.
export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
