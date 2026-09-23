import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

export type Schema = typeof schema;

/**
 * Driver-agnostic database handle. Production uses postgres.js (Neon);
 * local development and tests use PGlite. Both satisfy this type.
 */
export type Database = PgDatabase<PgQueryResultHKT, Schema>;
