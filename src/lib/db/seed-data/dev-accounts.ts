/**
 * PUBLIC, DEV-ONLY credentials for the in-memory local database (also listed
 * in the README). They exist only in local PGlite, which resets on every
 * restart. The Neon seed refuses these accounts (`assertNeonAccounts`).
 */
import type { SeedAccounts } from "../seed/accounts";
import { DEV_EMAIL_DOMAIN } from "./people";

export const DEV_ACCOUNT_PASSWORD = "botanics-dev-password";

function devAccount(localPart: string) {
  return {
    email: `${localPart}@${DEV_EMAIL_DOMAIN}`,
    password: DEV_ACCOUNT_PASSWORD,
  };
}

export const devAccounts: SeedAccounts = {
  admin: devAccount("admin"),
  customers: {
    ada: devAccount("ada"),
    ben: devAccount("ben"),
    cara: devAccount("cara"),
    dev: devAccount("dev"),
  },
};
