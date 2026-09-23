import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import {
  createDevDb,
  MIGRATIONS_FOLDER,
  type DbSeeder,
  type DevDb,
} from "@/lib/db/dev-db";
import * as schema from "@/lib/db/schema";
import { buildSeedCatalog } from "@/lib/db/seed-data/catalog";
import { insertCatalog, insertReviews } from "@/lib/db/seed/insert";

export type TestDb = DevDb;

export interface CreateTestDbOptions {
  /** Runs after migrations. Defaults to leaving the schema empty. */
  seed?: DbSeeder;
}

const leaveEmpty: DbSeeder = async () => {};

/**
 * A migrated database for tests, built from the same `drizzle/` SQL as
 * production. Defaults to in-memory PGlite. When `TEST_DATABASE_URL` points
 * at a real Postgres server (for example Docker `postgres:17-alpine` on
 * port 5433), each call creates and later drops its own temporary database.
 *
 * Database test files run in the node environment
 * (`// @vitest-environment node`), create one database in `beforeAll` and
 * close it in `afterAll`.
 */
export async function createTestDb({
  seed = leaveEmpty,
}: CreateTestDbOptions = {}): Promise<TestDb> {
  const serverUrl = process.env.TEST_DATABASE_URL;
  if (serverUrl) return createServerTestDb(serverUrl, seed);
  return createDevDb({ seed });
}

async function createServerTestDb(
  serverUrl: string,
  seed: DbSeeder,
): Promise<TestDb> {
  const name = `bsc_test_${randomUUID().replaceAll("-", "")}`;
  const admin = postgres(serverUrl, { max: 1, onnotice: () => {} });
  await admin.unsafe(`create database "${name}"`);

  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  const client = postgres(url.toString(), { max: 1, onnotice: () => {} });

  const close = async () => {
    await client.end();
    await admin.unsafe(`drop database if exists "${name}" with (force)`);
    await admin.end();
  };

  try {
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    await seed(db);
    return { db, close };
  } catch (error) {
    await close();
    throw error;
  }
}

/**
 * The seed catalog plus its reviews (no users, orders or marketing rows):
 * everything the catalog services read. Reviews have no account behind
 * them, so no password hashing is needed.
 */
export const seedCatalogWithReviews: DbSeeder = async (db) => {
  const catalog = buildSeedCatalog();
  await insertCatalog(db, catalog);
  await insertReviews(db, catalog);
};
