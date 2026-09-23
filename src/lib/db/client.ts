import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getServerEnv } from "@/lib/env";
import { createDevDb, seedDevDatabase } from "./dev-db";
import * as schema from "./schema";
import { describeDbHost, selectDbTarget } from "./target";
import type { Database } from "./types";

// Cached on globalThis so dev HMR reloads reuse one pool / one PGlite
// instance, and concurrent first requests share the same startup promise.
const globalForDb = globalThis as typeof globalThis & {
  __bscDevDb?: Promise<Database>;
  __bscNeonDb?: Database;
  __bscNeonWarned?: boolean;
};

function getNeonDb(url: string): Database {
  globalForDb.__bscNeonDb ??= drizzle(
    // `prepare: false`: the Neon pooler is PgBouncer in transaction mode.
    postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      // Postgres NOTICEs (e.g. to_tsquery dropping stopwords) are noise.
      onnotice: () => {},
    }),
    { schema },
  );
  return globalForDb.__bscNeonDb;
}

function getDevDb(): Promise<Database> {
  const existing = globalForDb.__bscDevDb;
  if (existing) return existing;

  console.info(
    "[db] using in-memory PGlite (migrated from drizzle/, resets on restart). DATABASE_URL is ignored; set USE_NEON_LOCALLY=1 to use Neon.",
  );
  const promise = createDevDb({ seed: seedDevDatabase }).then(({ db }) => db);
  globalForDb.__bscDevDb = promise;
  // Callers still receive the rejection; this only clears the cache so the
  // next request retries instead of reusing a failed startup.
  promise.catch(() => {
    if (globalForDb.__bscDevDb === promise) globalForDb.__bscDevDb = undefined;
  });
  return promise;
}

/**
 * The app database: Neon on Vercel (or with USE_NEON_LOCALLY=1), otherwise
 * an in-memory PGlite. Throws under Vitest; tests inject their own.
 */
export async function getDb(): Promise<Database> {
  const target = selectDbTarget({
    VITEST: process.env.VITEST,
    VERCEL: process.env.VERCEL,
    USE_NEON_LOCALLY: process.env.USE_NEON_LOCALLY,
    DATABASE_URL: process.env.DATABASE_URL,
  });
  getServerEnv();

  if (target.kind === "pglite") return getDevDb();

  if (target.reason === "use-neon-locally" && !globalForDb.__bscNeonWarned) {
    globalForDb.__bscNeonWarned = true;
    console.warn(
      `[db] USE_NEON_LOCALLY=1: using Neon at ${describeDbHost(target.url)}`,
    );
  }
  return getNeonDb(target.url);
}
