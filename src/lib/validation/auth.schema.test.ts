import { describe, expect, it } from "vitest";
import {
  AUTH_FIELD_MESSAGES,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./auth.schema";

const VALID_SIGN_UP = {
  name: "Ada Park",
  email: "ada@botanicssupply.example",
  password: "correct-horse-9",
  confirmPassword: "correct-horse-9",
  ageConfirmed: true,
};

function issuesByField(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  const map: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) {
    const key = String(issue.path[0]);
    map[key] ??= issue.message;
  }
  return map;
}

describe("signUpSchema", () => {
  it("accepts valid input and trims and lowercases the email and name", () => {
    const result = signUpSchema.parse({
      ...VALID_SIGN_UP,
      name: "  Ada Park ",
      email: "  Ada@BotanicsSupply.Example ",
    });
    expect(result.email).toBe("ada@botanicssupply.example");
    expect(result.name).toBe("Ada Park");
  });

  it("rejects mismatched passwords on confirmPassword", () => {
    const result = signUpSchema.safeParse({
      ...VALID_SIGN_UP,
      confirmPassword: "something-else-9",
    });
    expect(result.success).toBe(false);
    expect(issuesByField(result)).toEqual({
      confirmPassword: AUTH_FIELD_MESSAGES.confirmPassword,
    });
  });

  it("rejects a password shorter than 10 characters", () => {
    const result = signUpSchema.safeParse({
      ...VALID_SIGN_UP,
      password: "short-9",
      confirmPassword: "short-9",
    });
    expect(issuesByField(result).password).toBe("Use at least 10 characters.");
  });

  it("rejects a password longer than 128 characters", () => {
    const long = "a".repeat(129);
    const result = signUpSchema.safeParse({
      ...VALID_SIGN_UP,
      password: long,
      confirmPassword: long,
    });
    expect(issuesByField(result).password).toBe(
      AUTH_FIELD_MESSAGES.passwordTooLong,
    );
  });

  it.each([false, undefined, "true", "on"])(
    "requires the 21+ checkbox (%j)",
    (ageConfirmed) => {
      const result = signUpSchema.safeParse({ ...VALID_SIGN_UP, ageConfirmed });
      expect(issuesByField(result)).toEqual({
        ageConfirmed: AUTH_FIELD_MESSAGES.ageConfirmed,
      });
    },
  );

  it("reports every invalid field at once", () => {
    const result = signUpSchema.safeParse({
      name: "",
      email: "nope",
      password: "",
      confirmPassword: "",
      ageConfirmed: false,
    });
    expect(Object.keys(issuesByField(result)).sort()).toEqual([
      "ageConfirmed",
      "email",
      "name",
      "password",
    ]);
  });
});

describe("signInSchema", () => {
  it("normalizes the email and only requires a non-empty password", () => {
    expect(
      signInSchema.parse({ email: " ADA@x.example ", password: "x" }),
    ).toEqual({ email: "ada@x.example", password: "x" });
  });

  it("rejects an invalid email and an empty password", () => {
    const result = signInSchema.safeParse({ email: "ada@", password: "" });
    expect(issuesByField(result)).toEqual({
      email: AUTH_FIELD_MESSAGES.email,
      password: AUTH_FIELD_MESSAGES.currentPassword,
    });
  });
});

describe("forgotPasswordSchema", () => {
  it("trims and lowercases the email", () => {
    expect(forgotPasswordSchema.parse({ email: " A@B.example " })).toEqual({
      email: "a@b.example",
    });
  });
});

describe("resetPasswordSchema", () => {
  it("accepts matching passwords of at least 10 characters", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "new-password-1",
        confirmPassword: "new-password-1",
      }).success,
    ).toBe(true);
  });

  it("rejects mismatches and short passwords", () => {
    expect(
      issuesByField(
        resetPasswordSchema.safeParse({
          password: "new-password-1",
          confirmPassword: "new-password-2",
        }),
      ),
    ).toEqual({ confirmPassword: AUTH_FIELD_MESSAGES.confirmPassword });
    expect(
      issuesByField(
        resetPasswordSchema.safeParse({
          password: "short",
          confirmPassword: "short",
        }),
      ).password,
    ).toBe(AUTH_FIELD_MESSAGES.newPassword);
  });
});
