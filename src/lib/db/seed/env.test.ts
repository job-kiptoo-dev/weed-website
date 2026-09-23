import { describe, expect, it } from "vitest";
import { parseSeedEnv, SeedEnvError } from "./env";

const valid = {
  DATABASE_URL_UNPOOLED: "postgres://user:secret-value@db.example.com/app",
  SEED_ADMIN_EMAIL: "Admin@BotanicsSupply.Example",
  SEED_ADMIN_PASSWORD: "admin-password-123",
};

describe("parseSeedEnv", () => {
  it("parses a complete environment and lowercases the admin email", () => {
    expect(parseSeedEnv(valid, { catalogOnly: false })).toEqual({
      databaseUrl: valid.DATABASE_URL_UNPOOLED,
      adminEmail: "admin@botanicssupply.example",
      adminPassword: "admin-password-123",
      customerPassword: undefined,
      nodeEnv: undefined,
      vercelEnv: undefined,
    });
  });

  it("lists every missing or invalid name without printing values", () => {
    let caught: unknown;
    try {
      parseSeedEnv(
        {
          DATABASE_URL_UNPOOLED: "not a url",
          SEED_ADMIN_PASSWORD: "too-short",
          SEED_CUSTOMER_PASSWORD: "tiny",
        },
        { catalogOnly: false },
      );
    } catch (error) {
      caught = error;
    }
    if (!(caught instanceof SeedEnvError)) throw new Error("expected error");
    const error = caught;
    expect(error.variables.sort()).toEqual([
      "DATABASE_URL_UNPOOLED",
      "SEED_ADMIN_EMAIL",
      "SEED_ADMIN_PASSWORD",
      "SEED_CUSTOMER_PASSWORD",
    ]);
    expect(error.message).not.toContain("too-short");
    expect(error.message).not.toContain("tiny");
    expect(error.message).not.toContain("not a url");
  });

  it("does not need the admin variables for --catalog-only", () => {
    const env = parseSeedEnv(
      {
        DATABASE_URL_UNPOOLED: valid.DATABASE_URL_UNPOOLED,
        SEED_ADMIN_EMAIL: "",
      },
      { catalogOnly: true },
    );
    expect(env.adminEmail).toBeUndefined();
  });
});
