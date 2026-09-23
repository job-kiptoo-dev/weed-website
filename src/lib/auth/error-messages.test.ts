import { describe, expect, it } from "vitest";
import {
  authErrorMessage,
  GENERIC_AUTH_ERROR,
  RATE_LIMITED_MESSAGE,
} from "./error-messages";

describe("authErrorMessage", () => {
  it.each([
    ["INVALID_EMAIL_OR_PASSWORD", "Email or password is incorrect."],
    [
      "USER_ALREADY_EXISTS",
      "An account with this email already exists. Sign in instead.",
    ],
    [
      "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
      "An account with this email already exists. Sign in instead.",
    ],
    ["PASSWORD_TOO_SHORT", "Use at least 10 characters."],
    ["INVALID_TOKEN", "This reset link is invalid or has expired."],
    ["TOKEN_EXPIRED", "This reset link is invalid or has expired."],
  ])("maps %s", (code, message) => {
    expect(authErrorMessage({ code, status: 400 })).toBe(message);
  });

  it("maps HTTP 429 to the rate-limit message, whatever the code", () => {
    expect(authErrorMessage({ status: 429 })).toBe(RATE_LIMITED_MESSAGE);
    expect(
      authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 429 }),
    ).toBe(RATE_LIMITED_MESSAGE);
  });

  it.each([
    [{ code: "SOMETHING_NEW", status: 400 }],
    [{ code: "toString" }],
    [{ code: "__proto__" }],
    [{ status: 500 }],
    [{}],
    [null],
    [undefined],
  ])("falls back to the generic message for %j", (error) => {
    expect(authErrorMessage(error)).toBe(GENERIC_AUTH_ERROR);
  });
});
