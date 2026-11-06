import { ApiClientError } from "../../lib/api";
import { TokenStorageError } from "../../lib/token-store";
import type { UserSummary } from "@oak/shared";

/** Safe shared recovery copy; the client cannot distinguish server expiry/revocation causes. */
export const SESSION_ENDED_MESSAGE = "Your session has ended. Please log in again to continue.";

/** Accepts only implemented protected destinations; never preserves query strings or unknown input. */
export function intendedRoute(value: unknown): "/" | undefined {
  return value === "/" ? "/" : undefined;
}

/** Rechecks current server-confirmed identity before returning to an allowlisted Student route. */
export function recoveryDestination(value: unknown, user: UserSummary | null): "/" | undefined {
  if (user?.role !== "STUDENT" || user.status !== "ACTIVE") return undefined;
  return intendedRoute(value) ?? "/";
}

/** Returns reviewed login feedback for unknown failures; never renders server/native diagnostic text. */
export function loginMessage(error: unknown): string {
  if (error instanceof TokenStorageError) return "Your session could not be saved securely. Please try again.";
  if (!(error instanceof ApiClientError)) return "Unable to log in. Please try again.";
  switch (error.code) {
    case "INVALID_CREDENTIALS": return "Email or password is incorrect.";
    case "EMAIL_NOT_VERIFIED": return "Please verify your email before logging in.";
    case "ACCOUNT_PENDING_APPROVAL": return "Your account is awaiting academy approval.";
    case "ACCOUNT_SUSPENDED": return "Your account is suspended. Please contact the academy.";
    case "FORBIDDEN": return "This account cannot access the Student app.";
    case "NETWORK_ERROR": return "Unable to connect. Check your connection and try again.";
    case "TIMEOUT": return "The server is taking longer than expected. Tap Log in to try again.";
    case "RATE_LIMITED": return "Too many attempts. Please wait before trying again.";
    default: return "Unable to log in. Please try again.";
  }
}

/** Converts HTTP delta-seconds/date to a deadline; malformed values use the login window, no automatic retry. */
export function retryDeadline(value: string | null, now = Date.now()): number {
  const seconds = value !== null && /^\d+$/.test(value) ? Number(value) : NaN;
  const date = value !== null ? Date.parse(value) : NaN;
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Number.isFinite(date) ? Math.max(0, date - now) : 900_000;
  return now + Math.min(delay, 2_147_000_000);
}
