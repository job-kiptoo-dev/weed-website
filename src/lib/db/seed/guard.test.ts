import { describe, expect, it } from "vitest";
import { devAccounts } from "../seed-data/dev-accounts";
import { buildNeonAccounts } from "./accounts";
import {
  assertNeonAccounts,
  assertSeedAllowed,
  isSeedEmail,
  SeedGuardError,
} from "./guard";

const seedUsers = [
  "admin@botanicssupply.test",
  "ada@botanicssupply.example",
  "BEN@BotanicsSupply.Example",
];

describe("isSeedEmail", () => {
  it("accepts both seed domains and nothing else", () => {
    expect(isSeedEmail("ada@botanicssupply.example")).toBe(true);
    expect(isSeedEmail("ada@botanicssupply.test")).toBe(true);
    expect(isSeedEmail(" Ada@BOTANICSSUPPLY.TEST ")).toBe(true);
    expect(isSeedEmail("ada@gmail.com")).toBe(false);
    expect(isSeedEmail("ada@evil-botanicssupply.example.com")).toBe(false);
    expect(isSeedEmail("ada@notbotanicssupply.example")).toBe(false);
  });
});

describe("assertSeedAllowed", () => {
  it("allows an empty database", () => {
    expect(() =>
      assertSeedAllowed({ force: false, existingEmails: [] }),
    ).not.toThrow();
  });

  it("allows a database that only holds seed users", () => {
    expect(() =>
      assertSeedAllowed({ force: false, existingEmails: seedUsers }),
    ).not.toThrow();
  });

  it("treats SEED_ADMIN_EMAIL as a seed user even on a real domain", () => {
    expect(() =>
      assertSeedAllowed({
        force: false,
        existingEmails: [...seedUsers, "owner@example.com"],
        adminEmail: "Owner@Example.com",
      }),
    ).not.toThrow();
  });

  it("refuses when real users exist, without naming them", () => {
    const attempt = () =>
      assertSeedAllowed({
        force: false,
        existingEmails: [...seedUsers, "jane.real@gmail.com"],
        adminEmail: "admin@botanicssupply.example",
      });
    expect(attempt).toThrow(SeedGuardError);
    expect(attempt).toThrow(/1 user\(s\).*--force/);
    expect(attempt).not.toThrow(/jane/);
  });

  it("refuses in production", () => {
    expect(() =>
      assertSeedAllowed({
        force: false,
        nodeEnv: "production",
        existingEmails: [],
      }),
    ).toThrow(SeedGuardError);
    expect(() =>
      assertSeedAllowed({
        force: false,
        vercelEnv: "production",
        existingEmails: [],
      }),
    ).toThrow(SeedGuardError);
  });

  it("passes everything with --force", () => {
    expect(() =>
      assertSeedAllowed({
        force: true,
        nodeEnv: "production",
        vercelEnv: "production",
        existingEmails: ["jane.real@gmail.com"],
      }),
    ).not.toThrow();
  });
});

describe("assertNeonAccounts", () => {
  it("refuses the public dev accounts", () => {
    expect(() => assertNeonAccounts(devAccounts)).toThrow(SeedGuardError);
  });

  it("refuses the dev password even on demo emails", () => {
    const accounts = buildNeonAccounts({
      adminEmail: "admin@botanicssupply.example",
      adminPassword: "botanics-dev-password",
    });
    expect(() => assertNeonAccounts(accounts)).toThrow(/dev password/);
  });

  it("accepts Neon accounts built from the seed env", () => {
    const accounts = buildNeonAccounts({
      adminEmail: "admin@botanicssupply.example",
      adminPassword: "a-long-admin-password",
    });
    expect(() => assertNeonAccounts(accounts)).not.toThrow();
  });
});
