import type { LoginResponse, SessionResponse, UserSummary } from "@oak/shared";
import { ApiClientError } from "./api";

function summary(value: unknown): UserSummary {
  if (!value || typeof value !== "object") throw new ApiClientError("INVALID_RESPONSE");
  const user = value as Record<string, unknown>;
  if (typeof user["id"] !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(user["id"]) ||
    typeof user["email"] !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user["email"]) ||
    user["role"] !== "STUDENT" || user["status"] !== "ACTIVE" ||
    (user["displayName"] !== undefined && user["displayName"] !== null && typeof user["displayName"] !== "string")) {
    throw new ApiClientError("INVALID_RESPONSE");
  }
  return Object.freeze({ id: user["id"], email: user["email"], role: "STUDENT", status: "ACTIVE",
    ...(user["displayName"] === undefined ? {} : { displayName: user["displayName"] as string | null }),
  });
}

/**
 * Validates/project a decoded session response without trusting unknown properties.
 * @param value Untrusted JSON from the configured API, never cached identity claims.
 * @returns Safe Student identity, absolute expiry and fixed internal landing route.
 * @throws ApiClientError on an invalid response; does not read storage or authorize API access.
 */
export function parseSessionResponse(value: unknown): SessionResponse {
  if (!value || typeof value !== "object") throw new ApiClientError("INVALID_RESPONSE");
  const data = value as Record<string, unknown>;
  if (data["landingPath"] !== "/" || typeof data["expiresAt"] !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(data["expiresAt"]) || !Number.isFinite(Date.parse(data["expiresAt"]))) {
    throw new ApiClientError("INVALID_RESPONSE");
  }
  return { user: summary(data["user"]), expiresAt: data["expiresAt"], landingPath: "/" };
}

/** Validates/project login JSON and its issued 256-bit token; throws safe ApiClientError, no I/O. */
export function parseLoginResponse(value: unknown): LoginResponse {
  const session = parseSessionResponse(value);
  const token = (value as Record<string, unknown>)["sessionToken"];
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) throw new ApiClientError("INVALID_RESPONSE");
  return { ...session, sessionToken: token };
}
