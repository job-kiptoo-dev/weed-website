import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError } from "@/lib/errors";

const getSessionMock = vi.fn();
const requestHeaders = new Headers({ cookie: "better-auth.session_token=t" });

class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}
class NotFoundSignal extends Error {}

vi.mock("./server", () => ({
  getAuth: async () => ({ api: { getSession: getSessionMock } }),
}));
vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
  notFound: () => {
    throw new NotFoundSignal();
  },
}));

const {
  assertAdmin,
  assertUser,
  getSession,
  requireAdmin,
  requireUser,
  signInUrl,
} = await import("./guards");

function sessionFor(role: string) {
  return {
    session: { id: "sess_1", userId: "user_1", token: "t" },
    user: { id: "user_1", email: "a@b.example", name: "A", role },
  };
}

async function thrown(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
}

beforeEach(() => {
  getSessionMock.mockReset();
});

describe("signInUrl", () => {
  it("encodes the return path", () => {
    expect(signInUrl("/account/orders?page=2")).toBe(
      "/sign-in?next=%2Faccount%2Forders%3Fpage%3D2",
    );
  });

  it("replaces unsafe return paths with /account", () => {
    expect(signInUrl("//evil.example")).toBe("/sign-in?next=%2Faccount");
    expect(signInUrl("https://evil.example")).toBe("/sign-in?next=%2Faccount");
  });
});

describe("getSession", () => {
  it("passes the request headers to Better Auth", async () => {
    getSessionMock.mockResolvedValue(null);
    await expect(getSession()).resolves.toBeNull();
    expect(getSessionMock).toHaveBeenCalledWith({ headers: requestHeaders });
  });
});

describe("requireUser", () => {
  it("redirects anonymous visitors to sign-in with the encoded next", async () => {
    getSessionMock.mockResolvedValue(null);
    const error = await thrown(requireUser("/account"));
    expect(error).toBeInstanceOf(RedirectSignal);
    expect((error as RedirectSignal).url).toBe("/sign-in?next=%2Faccount");
  });

  it("returns the session when signed in", async () => {
    const session = sessionFor("customer");
    getSessionMock.mockResolvedValue(session);
    await expect(requireUser("/account")).resolves.toBe(session);
  });
});

describe("requireAdmin", () => {
  it("bypasses the cookie cache", async () => {
    getSessionMock.mockResolvedValue(sessionFor("admin"));
    await requireAdmin("/admin");
    expect(getSessionMock).toHaveBeenCalledWith({
      headers: requestHeaders,
      query: { disableCookieCache: true },
    });
  });

  it("redirects anonymous visitors to sign-in", async () => {
    getSessionMock.mockResolvedValue(null);
    const error = await thrown(requireAdmin("/admin/products"));
    expect((error as RedirectSignal).url).toBe(
      "/sign-in?next=%2Fadmin%2Fproducts",
    );
  });

  it.each(["customer", "Admin", ""])("404s role %j", async (role) => {
    getSessionMock.mockResolvedValue(sessionFor(role));
    expect(await thrown(requireAdmin("/admin"))).toBeInstanceOf(NotFoundSignal);
  });

  it("returns admin sessions", async () => {
    const session = sessionFor("admin");
    getSessionMock.mockResolvedValue(session);
    await expect(requireAdmin("/admin")).resolves.toBe(session);
  });
});

describe("assertUser and assertAdmin", () => {
  it("assertUser throws UNAUTHENTICATED when signed out", async () => {
    getSessionMock.mockResolvedValue(null);
    const error = await thrown(assertUser());
    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe("UNAUTHENTICATED");
  });

  it("assertAdmin throws UNAUTHENTICATED when signed out", async () => {
    getSessionMock.mockResolvedValue(null);
    expect(((await thrown(assertAdmin())) as AuthError).code).toBe(
      "UNAUTHENTICATED",
    );
  });

  it("assertAdmin throws FORBIDDEN for customers", async () => {
    getSessionMock.mockResolvedValue(sessionFor("customer"));
    const error = await thrown(assertAdmin());
    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe("FORBIDDEN");
    expect((error as AuthError).status).toBe(403);
  });

  it("assertAdmin returns admin sessions, fresh from the database", async () => {
    const session = sessionFor("admin");
    getSessionMock.mockResolvedValue(session);
    await expect(assertAdmin()).resolves.toBe(session);
    expect(getSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ query: { disableCookieCache: true } }),
    );
  });
});
