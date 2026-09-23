import { describe, expect, it } from "vitest";
import { buildNeonAccounts, randomPassword } from "./accounts";

describe("buildNeonAccounts", () => {
  it("uses the admin env and the demo customer emails", () => {
    const accounts = buildNeonAccounts(
      {
        adminEmail: "admin@botanicssupply.example",
        adminPassword: "x".repeat(12),
      },
      () => "generated",
    );
    expect(accounts.admin).toEqual({
      email: "admin@botanicssupply.example",
      password: "x".repeat(12),
    });
    expect(Object.values(accounts.customers).map((c) => c.email)).toEqual([
      "ada@botanicssupply.example",
      "ben@botanicssupply.example",
      "cara@botanicssupply.example",
      "dev@botanicssupply.example",
    ]);
  });

  it("gives each customer its own random password by default", () => {
    const accounts = buildNeonAccounts({
      adminEmail: "admin@botanicssupply.example",
      adminPassword: "x".repeat(12),
    });
    const passwords = Object.values(accounts.customers).map((c) => c.password);
    expect(new Set(passwords).size).toBe(4);
    expect(passwords.every((p) => p.length >= 32)).toBe(true);
  });

  it("shares SEED_CUSTOMER_PASSWORD when it is set", () => {
    const accounts = buildNeonAccounts({
      adminEmail: "admin@botanicssupply.example",
      adminPassword: "x".repeat(12),
      customerPassword: "shared-pass",
    });
    expect(
      Object.values(accounts.customers).every(
        (c) => c.password === "shared-pass",
      ),
    ).toBe(true);
  });
});

describe("randomPassword", () => {
  it("returns 24 random bytes, url-safe", () => {
    const value = randomPassword();
    expect(value).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(randomPassword()).not.toBe(value);
  });
});
