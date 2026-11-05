import type { AcademyRole } from "./permissions.js";

/** Technical account approval state; not enrollment, payment or package status. */
export type AuthAccountStatus = "ACTIVE" | "PENDING_APPROVAL" | "SUSPENDED";

/** Minimal JSON identity; deliberately incompatible with raw credential-bearing DB rows. */
export type UserSummary = Readonly<{
  id: string;
  email: string;
  displayName?: string | null;
  role: AcademyRole;
  status: AuthAccountStatus;
  passwordHash?: never;
  tokenHash?: never;
}>;

/** Native credential body; no role, approval or Remember Me privilege claims. */
export type LoginRequest = Readonly<{ email: string; password: string }>;

/** Native login success; session token is delivered here once for SecureStore only. */
export type LoginResponse = Readonly<{
  user: UserSummary;
  landingPath: "/";
  sessionToken: string;
  /** ISO date-time absolute cap; idle expiry/revocation can end validity earlier. */
  expiresAt: string;
  passwordHash?: never;
  tokenHash?: never;
}>;

/** Session-restore success; JSON dates are strings and no bearer material is returned. */
export type SessionResponse = Readonly<{
  user: UserSummary;
  landingPath: "/";
  /** ISO date-time absolute cap, not a client authorization decision or idle renewal. */
  expiresAt: string;
  sessionToken?: never;
  passwordHash?: never;
  tokenHash?: never;
}>;

/** Successful logout is HTTP 204 with no response body. */
export type LogoutResponse = void;
