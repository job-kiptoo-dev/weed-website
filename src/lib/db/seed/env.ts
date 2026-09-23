import { z } from "zod";

export interface SeedEnv {
  databaseUrl: string;
  adminEmail?: string;
  adminPassword?: string;
  customerPassword?: string;
  nodeEnv?: string;
  vercelEnv?: string;
}

export class SeedEnvError extends Error {
  readonly variables: string[];

  constructor(variables: string[], details: string[]) {
    super(`Invalid seed environment: ${details.join("; ")}`);
    this.name = "SeedEnvError";
    this.variables = variables;
  }
}

const optionalString = z.string().min(1).optional();

const baseSchema = z.object({
  DATABASE_URL_UNPOOLED: z.url({ error: "must be a valid url" }),
  SEED_CUSTOMER_PASSWORD: z
    .string()
    .min(10, { error: "must be at least 10 characters" })
    .optional(),
  NODE_ENV: optionalString,
  VERCEL_ENV: optionalString,
});

const adminSchema = z.object({
  SEED_ADMIN_EMAIL: z.email({ error: "must be a valid email" }),
  SEED_ADMIN_PASSWORD: z
    .string({ error: "is required" })
    .min(12, { error: "must be at least 12 characters" }),
});

type EnvSource = Readonly<Record<string, string | undefined>>;

/**
 * Pure parser for `pnpm db:seed`. The admin variables are only required when
 * people are seeded (not with `--catalog-only`). Errors name the variables
 * and the rule each broke, never their values.
 */
export function parseSeedEnv(
  source: EnvSource,
  { catalogOnly }: { catalogOnly: boolean },
): SeedEnv {
  const input: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value !== "") input[key] = value;
  }

  const base = baseSchema.safeParse(input);
  const admin = catalogOnly ? null : adminSchema.safeParse(input);
  const issues = [
    ...(base.success ? [] : base.error.issues),
    ...(admin && !admin.success ? admin.error.issues : []),
  ];
  if (!base.success || (admin && !admin.success)) {
    const variables: string[] = [];
    const details: string[] = [];
    for (const issue of issues) {
      const name = issue.path.map(String).join(".");
      if (!variables.includes(name)) variables.push(name);
      details.push(
        issue.code === "invalid_type"
          ? `${name} is required`
          : `${name} ${issue.message}`,
      );
    }
    throw new SeedEnvError(variables, details);
  }

  return {
    databaseUrl: base.data.DATABASE_URL_UNPOOLED,
    adminEmail: admin?.data.SEED_ADMIN_EMAIL.toLowerCase(),
    adminPassword: admin?.data.SEED_ADMIN_PASSWORD,
    customerPassword: base.data.SEED_CUSTOMER_PASSWORD,
    nodeEnv: base.data.NODE_ENV,
    vercelEnv: base.data.VERCEL_ENV,
  };
}
