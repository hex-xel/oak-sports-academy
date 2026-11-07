/** Reviewed authentication/registration API codes; local network/storage errors stay local. */
export const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNSUPPORTED_CLIENT: "UNSUPPORTED_CLIENT",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
  ACCOUNT_PENDING_APPROVAL: "ACCOUNT_PENDING_APPROVAL",
  FORBIDDEN: "FORBIDDEN",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  RATE_LIMITED: "RATE_LIMITED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  INVALID_VERIFICATION_CODE: "INVALID_VERIFICATION_CODE",
  VERIFICATION_EXPIRED: "VERIFICATION_EXPIRED",
  VERIFICATION_LIMITED: "VERIFICATION_LIMITED",
  REGISTRATION_EXPIRED: "REGISTRATION_EXPIRED",
  REGISTRATION_CONFLICT: "REGISTRATION_CONFLICT",
  UPLOAD_INVALID: "UPLOAD_INVALID",
  DELIVERY_UNAVAILABLE: "DELIVERY_UNAVAILABLE",
} as const);

/** Exact server error-code union from the authentication and registration contracts. */
export type ErrorCode = keyof typeof ERROR_CODES;

/** Known login fields allowed in safe validation feedback. */
export const VALIDATION_FIELDS = Object.freeze(["email", "password"] as const);

/** Known-field union; never surface arbitrary request keys or custom validator messages. */
export type ValidationField = typeof VALIDATION_FIELDS[number];

/** Safe authentication error body; Retry-After belongs to response headers, not this body. */
export type ApiErrorResponse = Readonly<{
  code: ErrorCode;
  message: string;
  details?: Readonly<Partial<Record<ValidationField, string>>>;
}>;

/**
 * Recognize a server code without trusting inherited object properties or coercion.
 * @param value Untrusted decoded value.
 * @returns True for exact reviewed code strings only. Pure, no exceptions or side effects.
 * @remarks Does not validate a complete response or make its message safe for display.
 */
export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && Object.hasOwn(ERROR_CODES, value);
}
