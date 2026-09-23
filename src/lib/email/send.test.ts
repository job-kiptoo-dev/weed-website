import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_EMAIL_FROM,
  RESEND_ENDPOINT,
  sendEmail,
  type EmailEnv,
  type EmailMessage,
} from "./send";

const RESET_URL =
  "http://localhost:3001/api/auth/reset-password/tok_secret123?callbackURL=%2Freset-password";

const MESSAGE: EmailMessage = {
  kind: "password-reset",
  to: "ada@botanicssupply.example",
  subject: "Reset your password",
  text: `Use this link: ${RESET_URL}`,
  actionUrl: RESET_URL,
};

const PRODUCTION_WITH_KEY: EmailEnv = {
  NODE_ENV: "production",
  RESEND_API_KEY: "re_test_key",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Every argument passed to any console method, serialized. */
function everythingLogged(): string {
  const spies = [console.info, console.warn, console.error, console.log];
  return JSON.stringify(spies.flatMap((spy) => vi.mocked(spy).mock.calls));
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("sendEmail with a Resend key", () => {
  it("posts to Resend and returns the message id on 200", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse(200, { id: "msg_123" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmail(MESSAGE, { env: PRODUCTION_WITH_KEY });

    expect(result).toEqual({ sent: true, id: "msg_123" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(RESEND_ENDPOINT);
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer re_test_key",
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      from: DEFAULT_EMAIL_FROM,
      to: [MESSAGE.to],
      subject: MESSAGE.subject,
      text: MESSAGE.text,
    });
    expect(everythingLogged()).not.toContain("tok_secret123");
  });

  it("uses EMAIL_FROM when set", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse(200, { id: "msg_1" }),
    );
    await sendEmail(MESSAGE, {
      env: { ...PRODUCTION_WITH_KEY, EMAIL_FROM: "Shop <hi@shop.example>" },
      fetch: fetchMock,
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).from).toBe(
      "Shop <hi@shop.example>",
    );
  });

  it("returns rejected on a 403 from the test sender and logs no URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(403, {
          statusCode: 403,
          name: "validation_error",
          message:
            "You can only send testing emails to your own email address (owner@example.com).",
        }),
      ),
    );

    const result = await sendEmail(MESSAGE, { env: PRODUCTION_WITH_KEY });

    expect(result).toEqual({ sent: false, reason: "rejected" });
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "email_rejected",
        status: 403,
        errorName: "validation_error",
      }),
    );
    expect(everythingLogged()).not.toContain("tok_secret123");
    expect(everythingLogged()).not.toContain("reset-password");
  });

  it("returns network when fetch throws, without throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(
      sendEmail(MESSAGE, { env: PRODUCTION_WITH_KEY }),
    ).resolves.toEqual({ sent: false, reason: "network" });
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: "email_network_error" }),
    );
    expect(everythingLogged()).not.toContain("tok_secret123");
  });

  it("still reports sent when the success body is unreadable", async () => {
    const result = await sendEmail(MESSAGE, {
      env: PRODUCTION_WITH_KEY,
      fetch: async () => new Response("not json", { status: 200 }),
    });
    expect(result).toEqual({ sent: true, id: "unknown" });
  });
});

describe("sendEmail without a key", () => {
  it("in production warns without the URL, recipient or body", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    const result = await sendEmail(MESSAGE, {
      env: { NODE_ENV: "production" },
      fetch: fetchMock,
    });

    expect(result).toEqual({ sent: false, reason: "not-configured" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: "email_not_configured" }),
    );
    const logged = everythingLogged();
    expect(logged).not.toContain("tok_secret123");
    expect(logged).not.toContain("http://");
    expect(logged).not.toContain(MESSAGE.to);
  });

  it("in development logs recipient, subject and the action URL", async () => {
    const result = await sendEmail(MESSAGE, {
      env: { NODE_ENV: "development" },
      fetch: vi.fn<typeof fetch>(),
    });

    expect(result).toEqual({ sent: false, reason: "not-configured" });
    expect(console.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "email_dev_log",
        to: MESSAGE.to,
        subject: MESSAGE.subject,
        actionUrl: RESET_URL,
      }),
    );
  });

  it("under test (neither dev nor prod) logs no URL", async () => {
    await sendEmail(MESSAGE, { env: { NODE_ENV: "test" } });
    expect(everythingLogged()).not.toContain("tok_secret123");
  });
});
