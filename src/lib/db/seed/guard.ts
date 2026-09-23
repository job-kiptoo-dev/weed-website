import { DEV_ACCOUNT_PASSWORD } from "../seed-data/dev-accounts";
import { DEV_EMAIL_DOMAIN, SEED_EMAIL_DOMAINS } from "../seed-data/people";
import type { SeedAccounts } from "./accounts";

export class SeedGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedGuardError";
  }
}

/** True for users the seed itself creates (demo and dev domains). */
export function isSeedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return SEED_EMAIL_DOMAINS.some((domain) => normalized.endsWith(`@${domain}`));
}

export interface SeedGuardInput {
  force: boolean;
  nodeEnv?: string;
  vercelEnv?: string;
  /** Emails of the users currently in the target database. */
  existingEmails: readonly string[];
  /** `SEED_ADMIN_EMAIL`, which may be on a real domain. */
  adminEmail?: string;
}

/**
 * Refuses a destructive reseed unless `--force` is given when the
 * environment is production or the database holds users the seed did not
 * create (real data). Pure; the CLI supplies the inputs. The error names
 * how many foreign users exist, never their emails.
 */
export function assertSeedAllowed(input: SeedGuardInput): void {
  if (input.force) return;

  if (input.nodeEnv === "production" || input.vercelEnv === "production") {
    throw new SeedGuardError(
      "Refusing to reseed with NODE_ENV or VERCEL_ENV set to production. Re-run with --force if you really mean it.",
    );
  }

  const admin = input.adminEmail?.trim().toLowerCase();
  const foreign = input.existingEmails.filter(
    (email) => !isSeedEmail(email) && email.trim().toLowerCase() !== admin,
  );
  if (foreign.length > 0) {
    throw new SeedGuardError(
      `Refusing to reseed: the database has ${foreign.length} user(s) outside ${SEED_EMAIL_DOMAINS.map((d) => `@${d}`).join(" and ")}, which looks like real data. Reseeding deletes everything. Re-run with --force to wipe it.`,
    );
  }
}

/**
 * The Neon seed must never use the public dev accounts: no
 * `@botanicssupply.test` emails and not the published dev password.
 */
export function assertNeonAccounts(accounts: SeedAccounts): void {
  const all = [accounts.admin, ...Object.values(accounts.customers)];
  if (
    all.some((account) =>
      account.email.trim().toLowerCase().endsWith(`@${DEV_EMAIL_DOMAIN}`),
    )
  ) {
    throw new SeedGuardError(
      `Refusing to seed Neon with local dev accounts (@${DEV_EMAIL_DOMAIN}).`,
    );
  }
  if (all.some((account) => account.password === DEV_ACCOUNT_PASSWORD)) {
    throw new SeedGuardError(
      "Refusing to seed Neon with the public dev password. Choose another SEED_ADMIN_PASSWORD / SEED_CUSTOMER_PASSWORD.",
    );
  }
}
