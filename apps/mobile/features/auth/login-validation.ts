import type { LoginRequest } from "@oak/shared";

/** Safe local validation feedback and normalized credentials; no I/O, logging or persistence. */
export type LoginValidation = Readonly<{
  credentials?: LoginRequest;
  errors: Readonly<{ email?: string; password?: string }>;
}>;

/**
 * Validates login fields before any submission callback/network call.
 * @param email Entered email; trim/lowercase for submission only.
 * @param password Entered password; preserve spaces and accept 1–128 characters.
 * @returns Normalized credentials on success, otherwise safe inline error copy.
 * @remarks Login does not apply registration/reset password complexity rules.
 */
export function validateLoginInput(email: string, password: string): LoginValidation {
  const normalized = email.trim().toLowerCase();
  const errors: { email?: string; password?: string } = {};
  if (!normalized) errors.email = "Email address is required.";
  else if (normalized.length < 3 || normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    errors.email = "Please enter a valid email address (e.g., name@example.com).";
  }
  if (password.length === 0) errors.password = "Password is required.";
  else if (password.length > 128) errors.password = "Password must be 128 characters or fewer.";
  return Object.keys(errors).length ? { errors } : { errors, credentials: { email: normalized, password } };
}
