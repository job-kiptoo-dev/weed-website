import { resolve } from "node:path";
import * as schema from "./schema";
import type { Database } from "./types";

/** Fills a freshly migrated database. Receives the same handle services use. */
export type DbSeeder = (db: Database) => Promise<void>;

export interface CreateDevDbOptions {
  seed: DbSeeder;
  migrationsFolder?: string;
}

export interface DevDb {
  db: Database;
  close: () => Promise<void>;
}

export const MIGRATIONS_FOLDER = resolve(process.cwd(), "drizzle");

/**
 * Local development seed: the full demo data (catalog, reviews, orders,
 * marketing) with the public dev accounts from `seed-data/dev-accounts.ts`.
 * Imported dynamically so production bundles never load the seed data.
 */
export const seedDevDatabase: DbSeeder = async (db) => {
  const [{ seedDatabase }, { devAccounts }] = await Promise.all([
    import("./seed/insert"),
    import("./seed-data/dev-accounts"),
  ]);
  await seedDatabase(db, { accounts: devAccounts });
};

/**
 * In-memory Postgres (PGlite) migrated with the same `drizzle/` SQL as
 * production, then seeded. Backs local development and tests. PGlite is
 * imported dynamically so production bundles never load it.
 */
export async function createDevDb({
  seed,
  migrationsFolder = MIGRATIONS_FOLDER,
}: CreateDevDbOptions): Promise<DevDb> {
  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);

  const client = new PGlite();
  try {
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder });
    await seed(db);
    return { db, close: () => client.close() };
  } catch (error) {
    await client.close();
    throw error;
  }
}
