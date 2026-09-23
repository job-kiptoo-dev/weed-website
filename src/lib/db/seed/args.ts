import { NEON_TARGET_FLAG } from "../cli";

export interface SeedArgs {
  neon: boolean;
  force: boolean;
  catalogOnly: boolean;
}

const KNOWN_FLAGS = [NEON_TARGET_FLAG, "--force", "--catalog-only"];

/**
 * Parses `pnpm db:seed` flags. Unknown flags are rejected so a typo such as
 * `--catalogonly` never falls through to a full destructive reseed.
 */
export function parseSeedArgs(argv: readonly string[]): SeedArgs {
  const unknown = argv.filter((arg) => !KNOWN_FLAGS.includes(arg));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown option(s): ${unknown.join(" ")}. Usage: pnpm db:seed ${NEON_TARGET_FLAG} [--force] [--catalog-only]`,
    );
  }
  return {
    neon: argv.includes(NEON_TARGET_FLAG),
    force: argv.includes("--force"),
    catalogOnly: argv.includes("--catalog-only"),
  };
}
