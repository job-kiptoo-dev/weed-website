export const USER_ROLES = ["customer", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Role given to every account created through sign-up. */
export const DEFAULT_ROLE: UserRole = "customer";

/**
 * Narrows an untrusted role value. Only the exact string `"admin"` grants
 * admin; anything else (missing, misspelled, a comma list, another type)
 * fails closed to `"customer"`.
 */
export function parseRole(value: unknown): UserRole {
  return value === "admin" ? "admin" : DEFAULT_ROLE;
}

export function isAdmin(user: { role?: unknown } | null | undefined): boolean {
  return parseRole(user?.role) === "admin";
}
