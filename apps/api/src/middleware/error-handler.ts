import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { VALIDATION_FIELDS, type ErrorCode, type ValidationField as SharedValidationField,
  type ApiErrorResponse } from "@oak/shared";

// Contract: specs/001-user-login/contracts/auth.openapi.yaml. Only reviewed static
// copy is serialized; Error.message and Zod custom messages may contain input values.
const catalog = {
  VALIDATION_ERROR: { status: 400, message: "Check the submitted information." },
  UNSUPPORTED_CLIENT: { status: 400, message: "This client is not supported." },
  INVALID_CREDENTIALS: { status: 401, message: "Email or password is incorrect." },
  EMAIL_NOT_VERIFIED: { status: 403, message: "Verify your email before signing in." },
  ACCOUNT_SUSPENDED: { status: 403, message: "This account cannot sign in." },
  ACCOUNT_PENDING_APPROVAL: { status: 403, message: "Your account is awaiting approval." },
  FORBIDDEN: { status: 403, message: "You do not have permission to perform this action." },
  PAYLOAD_TOO_LARGE: { status: 413, message: "The request is too large." },
  RATE_LIMITED: { status: 429, message: "Too many attempts. Try again later." },
  UNAUTHENTICATED: { status: 401, message: "Unauthenticated" },
  INTERNAL_ERROR: { status: 500, message: "Something went wrong. Please try again." },
} as const satisfies Record<ErrorCode, { status: number; message: string }>;

/** Backward-compatible API alias for the shared contract's reviewed codes. */
export type ApiErrorCode = ErrorCode;

/** Known login input names allowed in field-level feedback; never use arbitrary input keys. */
export type ValidationField = SharedValidationField;
const validationFields = new Set<string>(VALIDATION_FIELDS);

/**
 * An intentional API rejection with reviewed copy and optional known validation fields.
 * No database errors, request objects, or arbitrary messages are accepted or attached.
 */
export class ApiError extends Error {
  /** Reviewed code used to select response copy; never derive this from request input. */
  readonly code: ApiErrorCode;
  /** HTTP status selected from the reviewed error catalog. */
  readonly status: number;
  /** Generic field messages only; absent for non-validation errors or no known fields. */
  readonly details?: Readonly<Record<string, string>>;

  /**
   * @param code Reviewed contract error code, supplied by server-side code only.
   * @param fields Known invalid fields; used only for VALIDATION_ERROR.
   * @returns A safe error object with no credential/request references.
   * @throws TypeError if a runtime caller bypasses typing and supplies an unknown code.
   * @remarks No logging, I/O, or database side effects.
   */
  constructor(code: ApiErrorCode, fields: readonly ValidationField[] = []) {
    if (!Object.hasOwn(catalog, code)) throw new TypeError("Unknown API error code");
    const entry = catalog[code];
    super(entry.message);
    this.name = "ApiError";
    this.code = code;
    this.status = entry.status;
    const known = fields.filter((field) => validationFields.has(field));
    if (code === "VALIDATION_ERROR" && known.length > 0) {
      this.details = Object.freeze(Object.fromEntries(known.map((field) => [field, "Enter a valid value."])));
    }
  }
}

/** Uniform invalid-session error; used by the transaction helper and authentication middleware. */
export class SessionContextError extends ApiError {
  /** Create a safe UNAUTHENTICATED/401 error without inputs, I/O, or nested causes. */
  constructor() {
    super("UNAUTHENTICATED");
    this.name = "SessionContextError";
  }
}

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError && Object.hasOwn(catalog, error.code)) {
    // Reconstruct rather than trusting mutated message/status/details on an Error instance.
    const fields = error.details ? Object.keys(error.details).filter((field): field is ValidationField =>
      validationFields.has(field)) : [];
    return new ApiError(error.code, fields);
  }
  if (error instanceof ZodError) {
    const fields = error.issues.map((issue) => issue.path[0]).filter((field): field is ValidationField =>
      typeof field === "string" && validationFields.has(field));
    return new ApiError("VALIDATION_ERROR", fields);
  }
  if (typeof error === "object" && error !== null && "type" in error && "status" in error) {
    // Body-parser documents these exact type/status pairs. Its body/message properties
    // may contain submitted credentials: never log or copy them.
    // Source: https://expressjs.com/en/resources/middleware/body-parser.html#errors
    if (error.type === "entity.too.large" && error.status === 413) return new ApiError("PAYLOAD_TOO_LARGE");
    if (error.type === "entity.parse.failed" && error.status === 400) return new ApiError("VALIDATION_ERROR");
  }
  return new ApiError("INTERNAL_ERROR");
}

/**
 * Final Express error middleware returning only {code, message, details?} JSON.
 * @param error Rejected server/parser/validation error; treated as untrusted data.
 * @param _req Request, intentionally never read or logged here.
 * @param res Response receiving reviewed status/copy and optional generic field feedback.
 * @param next Delegates a fresh sanitized error if headers have already been sent.
 * @returns Nothing; writes a response or delegates without writing a second response.
 * @throws No intentional errors; Express handles response transport failures.
 * @remarks Register after routes/body parsing in T030. Logs no errors, bodies, headers,
 * credentials, or SQL. Upstream Retry-After headers are preserved. Shared contract types
 * constrain the response. No runtime config or database client is imported by this module.
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next): void => {
  if (res.headersSent) {
    // Express requires delegation after streaming has begun; never delegate the raw error.
    // Source: https://expressjs.com/en/guide/error-handling.html#the-default-error-handler
    next(new ApiError("INTERNAL_ERROR"));
    return;
  }
  const safe = normalizeError(error);
  const body: ApiErrorResponse = {
    code: safe.code,
    message: safe.message,
    ...(safe.details ? { details: safe.details } : {}),
  };
  res.status(safe.status).json(body);
};
