import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolve } from "node:path";
import postgres from "postgres";
import { hasNeonTargetFlag, NEON_TARGET_FLAG } from "./cli";
import { loadLocalEnv } from "./load-local-env";
import { describeDbHost } from "./target";

async function main(): Promise<number> {
  if (!hasNeonTargetFlag(process.argv.slice(2))) {
    console.error(
      `Refusing to migrate without ${NEON_TARGET_FLAG}. Local dev migrates its in-memory database automatically; this command only migrates Neon.`,
    );
    return 1;
  }

  loadLocalEnv();
  const url = process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    console.error("DATABASE_URL_UNPOOLED is not set.");
    return 1;
  }

  console.info(`Migrating ${describeDbHost(url)}...`);
  const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    await migrate(drizzle(client), {
      migrationsFolder: resolve(process.cwd(), "drizzle"),
    });
    console.info("Migrations applied.");
    return 0;
  } catch (error) {
    console.error(
      "Migration failed:",
      error instanceof Error ? error.message : error,
    );
    return 1;
  } finally {
    await client.end();
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(
      "Migration failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  },
);
