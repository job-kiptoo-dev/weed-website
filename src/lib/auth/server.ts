import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { after } from "next/server";
import { getDb } from "@/lib/db/client";
import {
  accounts,
  authRateLimits,
  sessions,
  users,
  verifications,
} from "@/lib/db/schema";
import type { Database } from "@/lib/db/types";
import {
  passwordResetEmail,
  RESET_LINK_LIFETIME_SECONDS,
} from "@/lib/email/password-reset";
import { sendEmail } from "@/lib/email/send";
import { getServerEnv, type ServerEnv } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/validation/auth.schema";
import { DEFAULT_ROLE } from "./roles";
import {
  buildTrustedOrigins,
  resolveBaseUrl,
  shouldUseSecureCookies,
} from "./trusted-origins";

const DAY_SECONDS = 60 * 60 * 24;

/**
 * Better Auth for one database handle. `getAuth()` is the app instance;
 * tests call this directly with a test database and environment.
 */
export function createAuth(db: Database, env: ServerEnv = getServerEnv()) {
  return betterAuth({
    appName: siteConfig.name,
    baseURL: resolveBaseUrl(env),
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      usePlural: true,
      schema: { users, sessions, accounts, verifications, authRateLimits },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      autoSignIn: true,
      // Off until a sending domain is verified (Resend test sender only
      // reaches the account owner).
      requireEmailVerification: false,
      resetPasswordTokenExpiresIn: RESET_LINK_LIFETIME_SECONDS,
      revokeSessionsOnPasswordReset: true,
      // Better Auth answers identically whether or not the account exists;
      // sending after the response keeps the timing identical too.
      sendResetPassword: async ({ user, url }) => {
        after(() =>
          sendEmail(
            passwordResetEmail({ to: user.email, name: user.name, url }),
            { env },
          ),
        );
      },
    },
    user: {
      additionalFields: {
        phone: { type: "string", required: false, input: false },
      },
    },
    session: {
      expiresIn: 30 * DAY_SECONDS,
      updateAge: DAY_SECONDS,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    trustedOrigins: buildTrustedOrigins(env),
    advanced: {
      useSecureCookies: shouldUseSecureCookies(env),
    },
    rateLimit: {
      // Better Auth only enables rate limiting in production by default;
      // enabled everywhere so local dev behaves like production.
      enabled: true,
      // In-memory counters are per instance on serverless; use the DB.
      storage: "database",
      modelName: "authRateLimit",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/request-password-reset": { window: 300, max: 3 },
      },
    },
    plugins: [
      admin({ defaultRole: DEFAULT_ROLE, adminRoles: ["admin"] }),
      // Must stay last: it copies Set-Cookie from auth.api calls made in
      // server actions onto the Next response.
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth["$Infer"]["Session"];

let authPromise: Promise<Auth> | undefined;

/** The app's Better Auth instance, created once the database is ready. */
export function getAuth(): Promise<Auth> {
  if (authPromise) return authPromise;
  const promise = getDb().then((db) => createAuth(db));
  authPromise = promise;
  // Callers still get the rejection; clearing the cache lets the next
  // request retry instead of reusing a failed startup.
  promise.catch(() => {
    if (authPromise === promise) authPromise = undefined;
  });
  return promise;
}
