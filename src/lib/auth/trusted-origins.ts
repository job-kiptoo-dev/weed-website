import type { ServerEnv } from "@/lib/env";

/** Local dev ports (never 3000, which other projects on this machine use). */
export const LOCAL_DEV_ORIGINS = [
  "http://localhost:3001",
  "http://localhost:3002",
] as const;

const DEFAULT_LOCAL_BASE_URL = LOCAL_DEV_ORIGINS[0];

export type AuthUrlEnv = Pick<
  ServerEnv,
  | "BETTER_AUTH_URL"
  | "VERCEL"
  | "VERCEL_ENV"
  | "VERCEL_URL"
  | "VERCEL_BRANCH_URL"
>;

/** `VERCEL_URL` and `VERCEL_BRANCH_URL` are hostnames without a scheme. */
function httpsOrigin(host: string | undefined): string | undefined {
  return host ? `https://${host}` : undefined;
}

function originOf(url: string): string {
  return new URL(url).origin;
}

function isPreview(env: AuthUrlEnv): boolean {
  return env.VERCEL_ENV === "preview";
}

/** Running on this machine (`next dev`, or a local `next build && next start`). */
function isLocal(env: AuthUrlEnv): boolean {
  return env.VERCEL !== "1" || env.VERCEL_ENV === "development";
}

/**
 * The public origin Better Auth builds links and cookies for:
 * 1. `BETTER_AUTH_URL` (required in production; env.ts enforces it)
 * 2. on previews, the branch URL (stable per branch), else the deployment URL
 * 3. otherwise the local dev server on port 3001
 */
export function resolveBaseUrl(env: AuthUrlEnv): string {
  if (env.BETTER_AUTH_URL) return originOf(env.BETTER_AUTH_URL);
  if (isPreview(env)) {
    const preview = httpsOrigin(env.VERCEL_BRANCH_URL ?? env.VERCEL_URL);
    if (preview) return preview;
  }
  return DEFAULT_LOCAL_BASE_URL;
}

/**
 * Origins allowed to make state-changing auth requests. Exact origins only:
 * no wildcards, so another project's `*.vercel.app` deployment can never
 * post to this one.
 */
export function buildTrustedOrigins(env: AuthUrlEnv): string[] {
  const origins = [resolveBaseUrl(env)];
  if (isPreview(env)) {
    for (const host of [env.VERCEL_URL, env.VERCEL_BRANCH_URL]) {
      const origin = httpsOrigin(host);
      if (origin) origins.push(origin);
    }
  }
  if (isLocal(env)) origins.push(...LOCAL_DEV_ORIGINS);
  return [...new Set(origins)];
}

/**
 * `Secure` cookies (with the `__Secure-` prefix) whenever the site is served
 * over https: always on Vercel, and locally only if the base URL is https.
 */
export function shouldUseSecureCookies(env: AuthUrlEnv): boolean {
  return env.VERCEL === "1" || resolveBaseUrl(env).startsWith("https://");
}
