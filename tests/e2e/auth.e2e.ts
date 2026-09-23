import { describe, expect, it } from "vitest";

/*
 * Auth flows over plain HTTP against a running server:
 *
 *   E2E_BASE_URL=http://localhost:3002 pnpm test:e2e:auth
 *
 * It creates real accounts in whatever database the server uses, so point
 * it at a local dev server (in-memory PGlite), not production. The admin
 * credentials default to the public local dev account.
 */

const BASE_URL = (
  process.env.E2E_BASE_URL ??
  process.env.BASE_URL ??
  "http://localhost:3002"
).replace(/\/+$/, "");
const ORIGIN = new URL(BASE_URL).origin;

if (new URL(BASE_URL).port === "3000") {
  throw new Error("Port 3000 belongs to another project; use 3001 or 3002.");
}

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@botanicssupply.test";
const ADMIN_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD ?? "botanics-dev-password";

const RUN_ID = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const PASSWORD = "correct-horse-9";

/*
 * Better Auth rate-limits per client IP (sign-up 3/min, sign-in 5/min) and
 * reads it from X-Forwarded-For. Each run uses fresh documentation-range
 * addresses so reruns within the window don't collide, and the rate-limit
 * test gets its own so it can't exhaust the budget of the other tests.
 */
function randomIp(prefix: "198.51.100" | "203.0.113"): string {
  return `${prefix}.${1 + Math.floor(Math.random() * 254)}`;
}
const CLIENT_IP = randomIp("198.51.100");
const RATE_LIMIT_IP = randomIp("203.0.113");

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  cookie?: string;
  origin?: string | null;
  ip?: string;
}

function send(path: string, options: RequestOptions = {}): Promise<Response> {
  const { method = "GET", body, cookie, ip = CLIENT_IP } = options;
  const headers = new Headers({ "X-Forwarded-For": ip });
  if (cookie) headers.set("Cookie", cookie);
  if (method === "POST") {
    headers.set("Content-Type", "application/json");
    const origin = options.origin === undefined ? ORIGIN : options.origin;
    if (origin) headers.set("Origin", origin);
  }
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    redirect: "manual",
  });
}

/** Cookies from Set-Cookie merged into a jar; cleared cookies are dropped. */
function updateJar(jar: Map<string, string>, response: Response): void {
  for (const header of response.headers.getSetCookie()) {
    const [pair = "", ...attributes] = header.split(";").map((p) => p.trim());
    const separator = pair.indexOf("=");
    if (separator <= 0) continue;
    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    const cleared =
      value === "" ||
      attributes.some((attribute) => /^max-age=0$/i.test(attribute));
    if (cleared) jar.delete(name);
    else jar.set(name, value);
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

interface SessionBody {
  user: { email: string; role: string };
}

async function getSession(cookie: string): Promise<SessionBody | null> {
  const response = await send("/api/auth/get-session", { cookie });
  expect(response.status).toBe(200);
  return (await response.json()) as SessionBody | null;
}

function signIn(email: string, password: string, options: RequestOptions = {}) {
  return send("/api/auth/sign-in/email", {
    ...options,
    method: "POST",
    body: { email, password },
  });
}

describe(`auth over HTTP (${BASE_URL})`, () => {
  const customerEmail = `e2e+${RUN_ID}@botanicssupply.example`;
  const customerJar = new Map<string, string>();

  it("redirects signed-out visitors from /account to sign-in", async () => {
    const response = await send("/account");

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "", BASE_URL);
    expect(`${location.pathname}${location.search}`).toBe(
      "/sign-in?next=%2Faccount",
    );
  });

  it("signs up a customer and sets a session cookie", async () => {
    const response = await send("/api/auth/sign-up/email", {
      method: "POST",
      body: { name: "E2E Customer", email: customerEmail, password: PASSWORD },
    });

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie().length).toBeGreaterThan(0);
    updateJar(customerJar, response);
  });

  it("returns the new customer's session with role customer", async () => {
    const session = await getSession(cookieHeader(customerJar));

    expect(session?.user.email).toBe(customerEmail);
    expect(session?.user.role).toBe("customer");
  });

  it("serves /account to the signed-in customer", async () => {
    const response = await send("/account", {
      cookie: cookieHeader(customerJar),
    });

    expect(response.status).toBe(200);
  });

  it("rejects a sign-up that tries to set role admin", async () => {
    const response = await send("/api/auth/sign-up/email", {
      method: "POST",
      body: {
        name: "E2E Escalation",
        email: `e2e+${RUN_ID}-role@botanicssupply.example`,
        password: PASSWORD,
        role: "admin",
      },
    });

    expect(response.status).toBe(400);
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });

  it("signs out and ends the session on the server", async () => {
    const tokenOnly = [...customerJar]
      .filter(([name]) => name.endsWith("session_token"))
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
    expect(tokenOnly).not.toBe("");

    const response = await send("/api/auth/sign-out", {
      method: "POST",
      cookie: cookieHeader(customerJar),
    });
    expect(response.status).toBe(200);
    updateJar(customerJar, response);

    expect(await getSession(cookieHeader(customerJar))).toBeNull();
    // The old token, replayed without the cached session cookie, is revoked.
    expect(await getSession(tokenOnly)).toBeNull();
  });

  it("signs in the admin with role admin", async () => {
    const response = await signIn(ADMIN_EMAIL, ADMIN_PASSWORD);
    expect(response.status).toBe(200);

    const jar = new Map<string, string>();
    updateJar(jar, response);
    const session = await getSession(cookieHeader(jar));

    expect(session?.user.email).toBe(ADMIN_EMAIL);
    expect(session?.user.role).toBe("admin");
  });

  it("rejects a wrong password with 401", async () => {
    const response = await signIn(customerEmail, "wrong-password-1");

    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });

  it("rejects a sign-in from an untrusted origin with 403", async () => {
    const response = await signIn(customerEmail, PASSWORD, {
      origin: "https://evil.example",
    });

    expect(response.status).toBe(403);
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });

  // Last, and from its own IP, so it can't rate-limit the tests above.
  it("rate-limits repeated sign-in attempts with 429", async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const response = await signIn(customerEmail, "wrong-password-1", {
        ip: RATE_LIMIT_IP,
      });
      statuses.push(response.status);
      if (response.status === 429) break;
    }

    expect(statuses).toContain(429);
    expect(statuses.slice(0, -1).every((status) => status === 401)).toBe(true);
  });
});
