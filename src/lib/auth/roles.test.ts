import { describe, expect, it } from "vitest";
import { isAdmin, parseRole } from "./roles";

describe("parseRole", () => {
  it("returns admin only for exactly 'admin'", () => {
    expect(parseRole("admin")).toBe("admin");
  });

  it.each([
    "customer",
    "Admin",
    " admin",
    "admin,customer",
    "user",
    "",
    null,
    undefined,
    1,
    ["admin"],
    { role: "admin" },
  ])("fails closed to customer for %j", (value) => {
    expect(parseRole(value)).toBe("customer");
  });
});

describe("isAdmin", () => {
  it("is true for admin users", () => {
    expect(isAdmin({ role: "admin" })).toBe(true);
  });

  it("is false for customers, unknown roles and missing users", () => {
    expect(isAdmin({ role: "customer" })).toBe(false);
    expect(isAdmin({ role: "superuser" })).toBe(false);
    expect(isAdmin({})).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});
