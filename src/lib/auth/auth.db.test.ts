// @vitest-environment node
import { hashPassword } from "better-auth/crypto";
import { eq, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  accounts,
  authRateLimits,
  users,
  verifications,
} from "@/lib/db/schema";
import { buildNeonAccounts } from "@/lib/db/seed/accounts";
import { seedDatabase } from "@/lib/db/seed/insert";
import type { ServerEnv } from "@/lib/env";
import { createTestDb, type TestDb } from "@/test/db";
import { createAuth, type Auth } from "./server";

/*
 * Better Auth against a real migrated database (PGlite, or Postgres when
 * TEST_DATABASE_URL is set), through the same HTTP handler the
 * /api/auth/[...all] route uses. Tests share one database and run in order.
 */

const shared = vi.hoisted(() => ({
  auth: undefined as Auth | undefined,
  requestHeaders: new Headers(),
  afterTasks: [] as (() => unknown)[],
}));

class RedirectSignal extends Error {}
class NotFoundSignal extends Error {}

vi.mock("./server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./server")>();
  return {
    ...actual,
    getAuth: async () => {
      if (!shared.auth) throw new Error("test auth not ready");
      return shared.auth;
    },
  };
});
vi.mock("next/headers", () => ({
  headers: async () => shared.requestHeaders,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
  notFound: () => {
    throw new NotFoundSignal();
  },
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => {
    shared.afterTasks.push(task);
  },
}));

const { requireAdmin } = await import("./guards");

const BASE_URL = "http://localhost:3001";
const ENV: ServerEnv = {
  BETTER_AUTH_SECRET: "test-secret-".padEnd(48, "x"),
  BETTER_AUTH_URL: BASE_URL,
  NODE_ENV: "test",
};

const ADMIN = {
  email: "owner@botanicssupply.example",
  password: "seeded-admin-password-1",
};
const CUSTOMER = {
  name: "Ada Park",
  email: "new-customer@botanicssupply.example",
  password: "correct-horse-9",
};

let testDb: TestDb;
let auth: Auth;
let customerCookie = "";
let adminCookie = "";

function post(path: string, body: unknown, cookie?: string): Promise<Response> {
  return auth.handler(
    new Request(`${BASE_URL}/api/auth${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}

/** `name=value` pairs from Set-Cookie, ready for a Cookie header. */
function cookieFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

async function sessionFor(cookie: string) {
  return auth.api.getSession({
    headers: new Headers({ cookie }),
    query: { disableCookieCache: true },
  });
}

beforeAll(async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  testDb = await createTestDb({
    // The production seed path: SEED_ADMIN_* hashed with better-auth/crypto.
    seed: (db) =>
      seedDatabase(db, {
        accounts: buildNeonAccounts({
          adminEmail: ADMIN.email,
          adminPassword: ADMIN.password,
          customerPassword: "seeded-customer-password-1",
        }),
      }),
  });
  auth = createAuth(testDb.db, ENV);
  shared.auth = auth;
}, 60_000);

afterAll(async () => {
  vi.restoreAllMocks();
  await testDb?.close();
});

describe("Better Auth with the app database", () => {
  it("signs up a customer, sets a session cookie and stores a hash", async () => {
    const response = await post("/sign-up/email", CUSTOMER);
    expect(response.status).toBe(200);
    customerCookie = cookieFrom(response);
    expect(customerCookie).toContain("better-auth.session_token=");

    const [row] = await testDb.db
      .select({ role: users.role, password: accounts.password })
      .from(users)
      .innerJoin(accounts, eq(accounts.userId, users.id))
      .where(eq(users.email, CUSTOMER.email));
    expect(row.role).toBe("customer");
    expect(row.password).not.toContain(CUSTOMER.password);
  });

  it("returns a session whose user has role customer", async () => {
    const session = await sessionFor(customerCookie);
    expect(session?.user.email).toBe(CUSTOMER.email);
    expect(session?.user.role).toBe("customer");
  });

  it("never lets sign-up choose a role", async () => {
    const response = await post("/sign-up/email", {
      name: "Mallory",
      email: "mallory@botanicssupply.example",
      password: "correct-horse-9",
      role: "admin",
    });
    const [row] = await testDb.db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.email, "mallory@botanicssupply.example"));
    // The admin plugin's role field is `input: false`: setting it is refused.
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "FIELD_NOT_ALLOWED" });
    expect(row).toBeUndefined();
  });

  it("signs in a new customer with their password", async () => {
    const response = await post("/sign-in/email", {
      email: CUSTOMER.email,
      password: CUSTOMER.password,
    });
    expect(response.status).toBe(200);
    expect((await sessionFor(cookieFrom(response)))?.user.role).toBe(
      "customer",
    );
  });

  it("signs in the seeded admin (hashPassword hash) with role admin", async () => {
    const response = await post("/sign-in/email", {
      email: ADMIN.email,
      password: ADMIN.password,
    });
    expect(response.status).toBe(200);
    adminCookie = cookieFrom(response);
    const session = await sessionFor(adminCookie);
    expect(session?.user.email).toBe(ADMIN.email);
    expect(session?.user.role).toBe("admin");
  });

  it("accepts a hash made by hashPassword directly", async () => {
    const hash = await hashPassword("a-directly-hashed-password");
    await testDb.db
      .update(accounts)
      .set({ password: hash })
      .where(eq(accounts.userId, "user_customer_1"));
    const [row] = await testDb.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, "user_customer_1"));
    const response = await post("/sign-in/email", {
      email: row.email,
      password: "a-directly-hashed-password",
    });
    expect(response.status).toBe(200);
  });

  it("rejects a wrong password with INVALID_EMAIL_OR_PASSWORD", async () => {
    const response = await post("/sign-in/email", {
      email: ADMIN.email,
      password: "not-the-password",
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      code: "INVALID_EMAIL_OR_PASSWORD",
    });
    expect(cookieFrom(response)).not.toContain("session_token=");
  });

  it("requireAdmin 404s a customer and returns the admin", async () => {
    shared.requestHeaders = new Headers({ cookie: customerCookie });
    await expect(requireAdmin("/admin")).rejects.toBeInstanceOf(NotFoundSignal);

    shared.requestHeaders = new Headers({ cookie: adminCookie });
    const session = await requireAdmin("/admin");
    expect(session.user.role).toBe("admin");

    shared.requestHeaders = new Headers();
    await expect(requireAdmin("/admin")).rejects.toBeInstanceOf(RedirectSignal);
  });

  it("resets a password with the emailed token and revokes old sessions", async () => {
    const request = await post("/request-password-reset", {
      email: CUSTOMER.email,
      redirectTo: "/reset-password",
    });
    expect(request.status).toBe(200);

    // The email is sent after the response; without a key it is skipped.
    expect(shared.afterTasks).toHaveLength(1);
    await expect(shared.afterTasks[0]()).resolves.toEqual({
      sent: false,
      reason: "not-configured",
    });

    const [verification] = await testDb.db
      .select({ identifier: verifications.identifier })
      .from(verifications)
      .where(like(verifications.identifier, "reset-password:%"));
    const token = verification.identifier.slice("reset-password:".length);

    const reset = await post("/reset-password", {
      token,
      newPassword: "a-brand-new-password",
    });
    expect(reset.status).toBe(200);
    expect(await sessionFor(customerCookie)).toBeNull();

    const signIn = await post("/sign-in/email", {
      email: CUSTOMER.email,
      password: "a-brand-new-password",
    });
    expect(signIn.status).toBe(200);
  });

  it("answers a reset request for an unknown email the same way", async () => {
    const response = await post("/request-password-reset", {
      email: "nobody@botanicssupply.example",
    });
    expect(response.status).toBe(200);
    expect(shared.afterTasks).toHaveLength(1);
  });

  it("rate limits sign-in attempts in the database", async () => {
    let status = 0;
    for (let attempt = 0; attempt < 10 && status !== 429; attempt++) {
      const response = await post("/sign-in/email", {
        email: "nobody@botanicssupply.example",
        password: "whatever-password",
      });
      status = response.status;
    }
    expect(status).toBe(429);
    const rows = await testDb.db
      .select({ key: authRateLimits.key })
      .from(authRateLimits)
      .where(like(authRateLimits.key, "%/sign-in/email"));
    expect(rows).toHaveLength(1);
  });
});
