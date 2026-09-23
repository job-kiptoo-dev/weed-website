import { randomBytes } from "node:crypto";
import { DEMO_EMAIL_DOMAIN, type CustomerHandle } from "../seed-data/people";

export interface SeedCredentials {
  email: string;
  password: string;
}

/**
 * Sign-in credentials for the seeded users. Passwords are hashed by the seed
 * (Better Auth scrypt) and never stored or printed in plain text.
 */
export interface SeedAccounts {
  admin: SeedCredentials;
  customers: Record<CustomerHandle, SeedCredentials>;
}

export interface NeonAccountsInput {
  adminEmail: string;
  adminPassword: string;
  /** Shared demo-customer password; each customer gets a random one if unset. */
  customerPassword?: string;
}

/** A 24-byte random password. Nobody can sign in with it unless told it. */
export function randomPassword(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Neon accounts: the admin from `SEED_ADMIN_*` and the demo customers
 * `ada|ben|cara|dev@botanicssupply.example`.
 */
export function buildNeonAccounts(
  input: NeonAccountsInput,
  makePassword: () => string = randomPassword,
): SeedAccounts {
  const customer = (handle: CustomerHandle): SeedCredentials => ({
    email: `${handle}@${DEMO_EMAIL_DOMAIN}`,
    password: input.customerPassword ?? makePassword(),
  });
  return {
    admin: { email: input.adminEmail, password: input.adminPassword },
    customers: {
      ada: customer("ada"),
      ben: customer("ben"),
      cara: customer("cara"),
      dev: customer("dev"),
    },
  };
}
