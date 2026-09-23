import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GENERIC_ERROR_MESSAGE,
  fail,
  handleActionError,
  ok,
  toErrorResponse,
} from "./action-result";
import {
  AuthError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "./errors";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ok / fail", () => {
  it("builds success and failure results", () => {
    expect(ok({ id: 1 })).toEqual({ ok: true, data: { id: 1 } });
    expect(fail("CONFLICT", "Taken")).toEqual({
      ok: false,
      error: { code: "CONFLICT", message: "Taken" },
    });
    expect(fail("VALIDATION", "Fix it", { email: ["Required"] })).toEqual({
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Fix it",
        fieldErrors: { email: ["Required"] },
      },
    });
  });
});

describe("handleActionError", () => {
  it.each([
    [new NotFoundError(), "NOT_FOUND", "Not found"],
    [new ConflictError("Email taken"), "CONFLICT", "Email taken"],
    [
      new AuthError("UNAUTHENTICATED"),
      "UNAUTHENTICATED",
      "Please sign in to continue.",
    ],
    [new AuthError("FORBIDDEN"), "FORBIDDEN", "You don't have access to this."],
  ])(
    "maps %o to its code and message without logging",
    (error, code, message) => {
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(handleActionError(error, "test")).toEqual({
        ok: false,
        error: { code, message },
      });
      expect(log).not.toHaveBeenCalled();
    },
  );

  it("keeps validation field errors", () => {
    const error = new ValidationError("Please fix the highlighted fields.", {
      email: ["Enter a valid email"],
    });
    expect(handleActionError(error, "test")).toEqual({
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Please fix the highlighted fields.",
        fieldErrors: { email: ["Enter a valid email"] },
      },
    });
  });

  it("hides unknown errors behind a generic message and logs them", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = handleActionError(
      new Error('relation "users" does not exist'),
      "account.update",
    );
    expect(result).toEqual({
      ok: false,
      error: { code: "INTERNAL", message: GENERIC_ERROR_MESSAGE },
    });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "unexpected_error",
        context: "account.update",
        error: expect.objectContaining({
          message: 'relation "users" does not exist',
        }),
      }),
    );
  });

  it("logs non-Error throwables", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    handleActionError("boom", "ctx");
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ error: { name: "NonError", message: "boom" } }),
    );
  });
});

describe("toErrorResponse", () => {
  it.each([
    [new NotFoundError(), 404],
    [new ValidationError(), 400],
    [new AuthError("UNAUTHENTICATED"), 401],
    [new AuthError("FORBIDDEN"), 403],
    [new ConflictError(), 409],
  ])("answers %o with status %i", async (error, status) => {
    const response = toErrorResponse(error, "api.test");
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({
      error: error.message,
      code: error.code,
    });
  });

  it("answers unknown errors with a generic 500 and no internals", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = toErrorResponse(
      new Error("connect ECONNREFUSED 10.0.0.1:5432"),
      "api.search",
    );
    expect(response.status).toBe(500);
    const body: unknown = await response.json();
    expect(body).toEqual({ error: GENERIC_ERROR_MESSAGE });
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ context: "api.search" }),
    );
  });
});
