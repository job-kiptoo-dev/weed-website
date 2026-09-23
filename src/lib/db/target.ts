export type DbTarget =
  | { kind: "neon"; url: string; reason: "vercel" | "use-neon-locally" }
  | { kind: "pglite" };

export interface DbTargetEnv {
  VITEST?: string;
  VERCEL?: string;
  USE_NEON_LOCALLY?: string;
  DATABASE_URL?: string;
}

/**
 * Decides which database `getDb()` connects to. Pure, so the rules are
 * unit-tested:
 * 1. Under Vitest: throw. Tests inject a database (src/test/db.ts).
 * 2. On Vercel: Neon via `DATABASE_URL`.
 * 3. `USE_NEON_LOCALLY=1`: Neon via `DATABASE_URL`.
 * 4. Otherwise: in-memory PGlite. `DATABASE_URL` is ignored even if set.
 */
export function selectDbTarget(env: DbTargetEnv): DbTarget {
  if (env.VITEST) {
    throw new Error(
      "getDb() is disabled under Vitest. Inject a database instead (see src/test/db.ts).",
    );
  }

  const reason =
    env.VERCEL === "1"
      ? "vercel"
      : env.USE_NEON_LOCALLY === "1"
        ? "use-neon-locally"
        : null;
  if (reason === null) return { kind: "pglite" };

  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required on Vercel or when USE_NEON_LOCALLY=1.",
    );
  }
  return { kind: "neon", url: env.DATABASE_URL, reason };
}

/** Hostname of a connection string, for logs. Never includes credentials. */
export function describeDbHost(url: string): string {
  try {
    return new URL(url).hostname || "(unknown host)";
  } catch (error) {
    if (error instanceof TypeError) return "(invalid database URL)";
    throw error;
  }
}
