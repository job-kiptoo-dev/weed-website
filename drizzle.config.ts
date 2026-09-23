import { defineConfig } from "drizzle-kit";
import { loadLocalEnv } from "./src/lib/db/load-local-env";

// `db:generate` and `drizzle-kit check` need no database. Credentials are
// only loaded for commands that connect (`db:studio` sets
// DRIZZLE_TARGET=neon), so nothing touches Neon by accident.
const connectToNeon = process.env.DRIZZLE_TARGET === "neon";

function neonUrl(): string {
  loadLocalEnv();
  const url = process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    throw new Error(
      "DATABASE_URL_UNPOOLED is not set (checked the shell and local env files).",
    );
  }
  return url;
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  // Neon Auth may create a `neon_auth` schema. We use Better Auth, so
  // drizzle-kit must never read or diff anything outside `public`.
  schemaFilter: ["public"],
  strict: true,
  verbose: true,
  ...(connectToNeon ? { dbCredentials: { url: neonUrl() } } : {}),
});
