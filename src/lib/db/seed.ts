import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { NEON_TARGET_FLAG } from "./cli";
import { loadLocalEnv } from "./load-local-env";
import * as schema from "./schema";
import { users } from "./schema";
import { buildNeonAccounts } from "./seed/accounts";
import { parseSeedArgs } from "./seed/args";
import { parseSeedEnv } from "./seed/env";
import { assertNeonAccounts, assertSeedAllowed } from "./seed/guard";
import { countSeededRows, seedDatabase, type SeedOptions } from "./seed/insert";
import { describeDbHost } from "./target";

/*
 * `pnpm db:seed --target=neon [--force] [--catalog-only]`
 *
 * Truncates and reseeds the Neon database named by DATABASE_URL_UNPOOLED.
 * Local development never needs this: its in-memory database seeds itself.
 * Prints the target hostname and row counts only, never credentials.
 */

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function main(): Promise<number> {
  const args = parseSeedArgs(process.argv.slice(2));
  if (!args.neon) {
    console.error(
      `Local dev seeds itself; this command only seeds Neon. Re-run with ${NEON_TARGET_FLAG} to seed Neon.`,
    );
    return 1;
  }

  loadLocalEnv();
  const env = parseSeedEnv(process.env, { catalogOnly: args.catalogOnly });

  let options: SeedOptions;
  if (args.catalogOnly) {
    options = { catalogOnly: true };
  } else {
    if (!env.adminEmail || !env.adminPassword) {
      throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.");
    }
    const accounts = buildNeonAccounts({
      adminEmail: env.adminEmail,
      adminPassword: env.adminPassword,
      customerPassword: env.customerPassword,
    });
    assertNeonAccounts(accounts);
    options = { accounts };
  }

  console.info(`Seeding ${describeDbHost(env.databaseUrl)}...`);
  const client = postgres(env.databaseUrl, {
    max: 1,
    prepare: false,
    onnotice: () => {},
  });
  try {
    const db = drizzle(client, { schema });
    const existing = await db.select({ email: users.email }).from(users);
    assertSeedAllowed({
      force: args.force,
      nodeEnv: env.nodeEnv,
      vercelEnv: env.vercelEnv,
      existingEmails: existing.map((row) => row.email),
      adminEmail: env.adminEmail,
    });

    await seedDatabase(db, options);

    const counts = await countSeededRows(db);
    console.info(args.catalogOnly ? "Seeded (catalog only):" : "Seeded:");
    for (const [table, count] of Object.entries(counts)) {
      console.info(`  ${table.padEnd(24)} ${count}`);
    }
    return 0;
  } finally {
    await client.end();
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error("Seed failed:", errorMessage(error));
    process.exitCode = 1;
  },
);
