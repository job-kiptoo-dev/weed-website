import {
  AppError,
  ValidationError,
  type AppErrorCode,
  type FieldErrors,
} from "./errors";

export const GENERIC_ERROR_MESSAGE = "Something went wrong";

export type ActionErrorCode = AppErrorCode | "INTERNAL";

export interface ActionError {
  code: ActionErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
}

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: ActionError };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(
  code: ActionErrorCode,
  message: string,
  fieldErrors?: FieldErrors,
): ActionResult<never> {
  return {
    ok: false,
    error: fieldErrors ? { code, message, fieldErrors } : { code, message },
  };
}

function describeError(error: unknown): {
  name: string;
  message: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: "NonError", message: String(error) };
}

/** Server-side structured log for unexpected errors. Never sent to clients. */
export function logUnexpectedError(error: unknown, context: string): void {
  console.error({
    event: "unexpected_error",
    context,
    error: describeError(error),
  });
}

/**
 * Maps a thrown value to an `ActionResult`. Expected `AppError`s keep their
 * code and user-safe message; anything else is logged and replaced with a
 * generic message so internals (SQL, stack traces) never reach the client.
 */
export function handleActionError(
  error: unknown,
  context: string,
): ActionResult<never> {
  if (error instanceof ValidationError) {
    return fail(error.code, error.message, error.fieldErrors);
  }
  if (error instanceof AppError) {
    return fail(error.code, error.message);
  }
  logUnexpectedError(error, context);
  return fail("INTERNAL", GENERIC_ERROR_MESSAGE);
}

/** Route-handler counterpart of `handleActionError`. */
export function toErrorResponse(error: unknown, context: string): Response {
  if (error instanceof AppError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  logUnexpectedError(error, context);
  return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
}
