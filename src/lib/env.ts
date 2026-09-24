import "server-only";
import { z } from "zod";

const optionalString = z.string().min(1).optional();

/**
 * Stripe keys are optional everywhere: with none of them set the shop simply
 * does not offer card payments (`stripeConfigured` is false, the `card` radio
 * is filtered out and the server rejects it), which is also the off switch if
 * Stripe ever declines or terminates the account.
 */
const STRIPE_VARIABLES = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

/** `test` or `live` out of a Stripe key, or null when it is not a Stripe key. */
function stripeKeyMode(value: string | undefined): "test" | "live" | null {
  const mode = /^(?:sk|rk|pk)_(test|live)_/.exec(value ?? "")?.[1];
  return mode === "test" || mode === "live" ? mode : null;
}

/**
 * Server environment. Parsed once per process by `getServerEnv()`.
 *
 * `DATABASE_URL` is only required when the app talks to Neon: on Vercel
 * (`VERCEL=1`) or locally with `USE_NEON_LOCALLY=1`. Local development
 * otherwise runs on an in-memory PGlite database and ignores it.
 */
export const serverEnvSchema = z
  .object({
    DATABASE_URL: z.url().optional(),
    DATABASE_URL_UNPOOLED: z.url().optional(),
    BETTER_AUTH_SECRET: z
      .string({ error: "is required" })
      .min(32, { error: "must be at least 32 characters" }),
    BETTER_AUTH_URL: z.url().optional(),
    USE_NEON_LOCALLY: z.enum(["0", "1"]).optional(),
    VERCEL: optionalString,
    VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
    VERCEL_URL: optionalString,
    VERCEL_BRANCH_URL: optionalString,
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),
    RESEND_API_KEY: optionalString,
    EMAIL_FROM: optionalString,
    ORDER_NOTIFICATION_EMAIL: z.email().optional(),
    CONTACT_NOTIFICATION_EMAIL: z.email().optional(),
    STRIPE_SECRET_KEY: z
      .string()
      .regex(/^(?:sk|rk)_(?:test|live)_/, {
        error: "must start with sk_test_, sk_live_, rk_test_ or rk_live_",
      })
      .optional(),
    STRIPE_PUBLISHABLE_KEY: z
      .string()
      .regex(/^pk_(?:test|live)_/, {
        error: "must start with pk_test_ or pk_live_",
      })
      .optional(),
    STRIPE_WEBHOOK_SECRET: z
      .string()
      .regex(/^whsec_/, { error: "must start with whsec_" })
      .optional(),
  })
  .superRefine(
    (env, ctx) => {
      const usesNeon = env.VERCEL === "1" || env.USE_NEON_LOCALLY === "1";
      if (usesNeon && !env.DATABASE_URL) {
        ctx.addIssue({
          code: "custom",
          path: ["DATABASE_URL"],
          message: "is required on Vercel or when USE_NEON_LOCALLY=1",
        });
      }
      if (env.VERCEL_ENV === "production" && !env.BETTER_AUTH_URL) {
        ctx.addIssue({
          code: "custom",
          path: ["BETTER_AUTH_URL"],
          message: "is required when VERCEL_ENV=production",
        });
      }

      // All or nothing: a half-configured Stripe would take card details and
      // then have no way to verify the webhook that marks the order paid, so
      // it must fail at boot (via src/instrumentation.ts), not at checkout.
      const configured = STRIPE_VARIABLES.filter(
        (name) => env[name] !== undefined,
      );
      if (
        configured.length > 0 &&
        configured.length < STRIPE_VARIABLES.length
      ) {
        for (const name of STRIPE_VARIABLES) {
          if (env[name] !== undefined) continue;
          ctx.addIssue({
            code: "custom",
            path: [name],
            message: `is required once any of ${STRIPE_VARIABLES.join(", ")} is set`,
          });
        }
      }

      const secretMode = stripeKeyMode(env.STRIPE_SECRET_KEY);
      const publishableMode = stripeKeyMode(env.STRIPE_PUBLISHABLE_KEY);
      if (secretMode && publishableMode && secretMode !== publishableMode) {
        ctx.addIssue({
          code: "custom",
          path: ["STRIPE_PUBLISHABLE_KEY"],
          message: `must be a ${secretMode} key, to match STRIPE_SECRET_KEY`,
        });
      }

      // Live keys take real money. Until Stripe approves this business in
      // writing there is nothing to take money for, and even afterwards a
      // preview or a laptop must never charge a real card.
      if (env.VERCEL_ENV !== "production") {
        for (const [name, mode] of [
          ["STRIPE_SECRET_KEY", secretMode],
          ["STRIPE_PUBLISHABLE_KEY", publishableMode],
        ] as const) {
          if (mode !== "live") continue;
          ctx.addIssue({
            code: "custom",
            path: [name],
            message: "must be a test key unless VERCEL_ENV=production",
          });
        }
      }
    },
    // Report cross-field rules alongside per-field issues so one boot
    // failure lists everything that needs fixing. The rules only compare
    // values, so running them on partially invalid input is safe.
    {
      when: (payload) =>
        typeof payload.value === "object" && payload.value !== null,
    },
  );

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export type EnvSource = Readonly<Record<string, string | undefined>>;

export class EnvValidationError extends Error {
  readonly variables: string[];

  constructor(variables: string[], details: string[]) {
    super(`Invalid server environment: ${details.join("; ")}`);
    this.name = "EnvValidationError";
    this.variables = variables;
  }
}

/** Empty strings count as unset, which is how `.env` files leave blanks. */
function dropEmpty(source: EnvSource): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value !== "") result[key] = value;
  }
  return result;
}

/**
 * Pure parser. The thrown error names the offending variables and the
 * rule each broke, never their values.
 */
export function parseServerEnv(source: EnvSource): ServerEnv {
  const result = serverEnvSchema.safeParse(dropEmpty(source));
  if (result.success) return result.data;

  const variables: string[] = [];
  const details: string[] = [];
  for (const issue of result.error.issues) {
    const name = issue.path.map(String).join(".") || "(root)";
    if (!variables.includes(name)) variables.push(name);
    const message =
      issue.code === "invalid_format"
        ? `must be a valid ${issue.format}`
        : issue.message;
    details.push(`${name} ${message}`);
  }
  throw new EnvValidationError(variables, details);
}

let cached: ServerEnv | undefined;

/** Parses `process.env` on first call and memoizes the result. */
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

/**
 * Whether this environment can take card payments. The schema above already
 * guarantees all three variables come together, so one check answers for all
 * of them. Turning card payments off is an env change, never a code change.
 */
export function stripeConfigured(env: ServerEnv = getServerEnv()): boolean {
  return STRIPE_VARIABLES.every((name) => env[name] !== undefined);
}
