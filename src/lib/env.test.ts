import { describe, expect, it } from "vitest";
import { EnvValidationError, parseServerEnv } from "./env";

const SECRET = "s".repeat(40);

function captureError(source: Record<string, string | undefined>) {
  try {
    parseServerEnv(source);
  } catch (error) {
    if (error instanceof EnvValidationError) return error;
    throw error;
  }
  throw new Error("expected parseServerEnv to throw");
}

describe("parseServerEnv", () => {
  it("accepts a minimal local environment without DATABASE_URL (PGlite)", () => {
    const env = parseServerEnv({ BETTER_AUTH_SECRET: SECRET });
    expect(env.BETTER_AUTH_SECRET).toBe(SECRET);
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it("parses every supported variable", () => {
    const env = parseServerEnv({
      DATABASE_URL: "postgres://u:p@db.example.com/app",
      DATABASE_URL_UNPOOLED: "postgres://u:p@db-direct.example.com/app",
      BETTER_AUTH_SECRET: SECRET,
      BETTER_AUTH_URL: "http://localhost:3002",
      USE_NEON_LOCALLY: "1",
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "Botanics Supply Co. <onboarding@resend.dev>",
      ORDER_NOTIFICATION_EMAIL: "owner@example.com",
      CONTACT_NOTIFICATION_EMAIL: "contact@example.com",
    });
    expect(env.USE_NEON_LOCALLY).toBe("1");
    expect(env.ORDER_NOTIFICATION_EMAIL).toBe("owner@example.com");
    expect(env.CONTACT_NOTIFICATION_EMAIL).toBe("contact@example.com");
    expect(env.RESEND_API_KEY).toBe("re_test");
  });

  it("treats empty strings as unset", () => {
    const env = parseServerEnv({
      BETTER_AUTH_SECRET: SECRET,
      RESEND_API_KEY: "",
      ORDER_NOTIFICATION_EMAIL: "",
    });
    expect(env.RESEND_API_KEY).toBeUndefined();
    expect(env.ORDER_NOTIFICATION_EMAIL).toBeUndefined();
  });

  it("names a missing BETTER_AUTH_SECRET", () => {
    const error = captureError({});
    expect(error.variables).toEqual(["BETTER_AUTH_SECRET"]);
    expect(error.message).toContain("BETTER_AUTH_SECRET is required");
  });

  it("rejects a short BETTER_AUTH_SECRET without echoing its value", () => {
    const value = "short-secret-value";
    const error = captureError({ BETTER_AUTH_SECRET: value });
    expect(error.variables).toEqual(["BETTER_AUTH_SECRET"]);
    expect(error.message).toContain("at least 32 characters");
    expect(error.message).not.toContain(value);
  });

  it("never echoes the value of an invalid URL", () => {
    const value = "not a url with password hunter2";
    const error = captureError({
      BETTER_AUTH_SECRET: SECRET,
      DATABASE_URL: value,
    });
    expect(error.variables).toEqual(["DATABASE_URL"]);
    expect(error.message).not.toContain("hunter2");
  });

  it("requires DATABASE_URL on Vercel", () => {
    const error = captureError({ BETTER_AUTH_SECRET: SECRET, VERCEL: "1" });
    expect(error.variables).toEqual(["DATABASE_URL"]);
  });

  it("requires DATABASE_URL when USE_NEON_LOCALLY=1", () => {
    const error = captureError({
      BETTER_AUTH_SECRET: SECRET,
      USE_NEON_LOCALLY: "1",
    });
    expect(error.variables).toEqual(["DATABASE_URL"]);
  });

  it("requires BETTER_AUTH_URL when VERCEL_ENV=production", () => {
    const error = captureError({
      BETTER_AUTH_SECRET: SECRET,
      VERCEL: "1",
      VERCEL_ENV: "production",
      DATABASE_URL: "postgres://u:p@db.example.com/app",
    });
    expect(error.variables).toEqual(["BETTER_AUTH_URL"]);
  });

  it("does not require BETTER_AUTH_URL on previews", () => {
    const env = parseServerEnv({
      BETTER_AUTH_SECRET: SECRET,
      VERCEL: "1",
      VERCEL_ENV: "preview",
      DATABASE_URL: "postgres://u:p@db.example.com/app",
    });
    expect(env.BETTER_AUTH_URL).toBeUndefined();
  });

  it("rejects an invalid notification email", () => {
    const error = captureError({
      BETTER_AUTH_SECRET: SECRET,
      ORDER_NOTIFICATION_EMAIL: "not-an-email",
    });
    expect(error.variables).toEqual(["ORDER_NOTIFICATION_EMAIL"]);
    expect(error.message).toContain("must be a valid email");
  });

  it("lists every invalid variable at once", () => {
    const error = captureError({ VERCEL: "1", VERCEL_ENV: "production" });
    expect(error.variables).toEqual(
      expect.arrayContaining([
        "BETTER_AUTH_SECRET",
        "DATABASE_URL",
        "BETTER_AUTH_URL",
      ]),
    );
  });
});
