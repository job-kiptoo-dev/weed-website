export type AppErrorCode =
  "NOT_FOUND" | "VALIDATION" | "UNAUTHENTICATED" | "FORBIDDEN" | "CONFLICT";

export type FieldErrors = Record<string, string[]>;

/**
 * Base class for expected failures. `message` is safe to show users;
 * anything that is not an `AppError` is treated as unexpected and answered
 * with a generic message (see `action-result.ts`).
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;

  constructor(code: AppErrorCode, message: string, status: number) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super("NOT_FOUND", message, 404);
  }
}

export class ValidationError extends AppError {
  readonly fieldErrors: FieldErrors;

  constructor(
    message = "Please fix the highlighted fields.",
    fieldErrors: FieldErrors = {},
  ) {
    super("VALIDATION", message, 400);
    this.fieldErrors = fieldErrors;
  }
}

export type AuthErrorCode = "UNAUTHENTICATED" | "FORBIDDEN";

const AUTH_ERROR_DEFAULTS: Record<
  AuthErrorCode,
  { message: string; status: number }
> = {
  UNAUTHENTICATED: { message: "Please sign in to continue.", status: 401 },
  FORBIDDEN: { message: "You don't have access to this.", status: 403 },
};

export class AuthError extends AppError {
  constructor(
    code: AuthErrorCode,
    message = AUTH_ERROR_DEFAULTS[code].message,
  ) {
    super(code, message, AUTH_ERROR_DEFAULTS[code].status);
  }
}

export class ConflictError extends AppError {
  constructor(message = "This conflicts with existing data.") {
    super("CONFLICT", message, 409);
  }
}
