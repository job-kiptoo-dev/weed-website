import "server-only";
import { z } from "zod";

const optionalString = z.string().min(1).optional();

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
