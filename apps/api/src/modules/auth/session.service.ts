import { createHash, randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma, withSession, type SessionIdentity } from "../../lib/prisma.js";
import { ApiError, SessionContextError } from "../../middleware/error-handler.js";

/** Optional server-observed session metadata; never used to establish identity. */
export type SessionMetadata = { ipAddress?: string; userAgent?: string };

/** Successful creation result; the raw token may be delivered only in the login response. */
export type CreatedSession = { sessionToken: string; expiresAt: Date };

/** Verified session view; no session database row, token, or hash is included. */
export type VerifiedSession = { user: SessionIdentity; expiresAt: Date };

function tokenHash(token: string): string {
  // Accept well-formed opaque Bearer values, including unknown ones, so logout remains
  // idempotent. Issued tokens are 64 lowercase hex characters (32 random bytes).
  if (typeof token !== "string" || /\s/.test(token) || !/^[A-Za-z0-9._~+/-]+=*$/.test(token)) {
    throw new SessionContextError();
  }
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function isEligibilityRejection(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2010" && error.meta?.["code"] === "28000";
}

/**
 * Issue a fresh 256-bit token after the auth service has verified credentials.
 * @param userId Server-resolved account UUID, never an untrusted request claim.
 * @param metadata Optional server-observed IP/agent, truncated to storage limits.
 * @param client Trusted restricted runtime client; defaults to the shared singleton.
 * @returns Only raw token and expiry; the token is returned once for secure delivery.
 * @throws ApiError/FORBIDDEN if the account is no longer ACTIVE/verified at insertion;
 * other DB errors propagate to T023's safe handler. No credentials are attached/logged.
 * @remarks oak_create_session rechecks eligibility under a row lock, stores only SHA-256,
 * sets the approved 8-hour absolute expiry and last login. No sliding renewal or retries.
 * The caller must authenticate/rate-limit first; this function does not verify passwords.
 */
export async function createSession(
  userId: string,
  metadata: SessionMetadata = {},
  client: Pick<PrismaClient, "$queryRaw"> = prisma,
): Promise<CreatedSession> {
  const sessionToken = randomBytes(32).toString("hex");
  const hash = tokenHash(sessionToken);
  try {
    const rows = await client.$queryRaw<Array<{ expiresAt: Date }>>`
      SELECT "expiresAt" FROM public.oak_create_session(
        ${userId}::uuid, ${hash}, ${metadata.ipAddress?.slice(0, 45) ?? null},
        ${metadata.userAgent?.slice(0, 255) ?? null})`;
    const expiry = rows[0]?.expiresAt;
    if (rows.length !== 1 || !(expiry instanceof Date) || !Number.isFinite(expiry.getTime())) {
      throw new ApiError("INTERNAL_ERROR");
    }
    return { sessionToken, expiresAt: expiry };
  } catch (error) {
    if (isEligibilityRejection(error)) throw new ApiError("FORBIDDEN");
    throw error;
  }
}

/**
 * Validate a bearer token and return a safe identity/expiry view.
 * @param token Raw token from the parsed Authorization header; never logged/persisted.
 * @param client Trusted restricted runtime client, optionally the isolated test client.
 * @returns Explicit safe user fields and absolute expiry only.
 * @throws SessionContextError for missing/malformed, expired, revoked, unknown, or
 * currently ineligible sessions; DB failures propagate to the safe API error boundary.
 * @remarks Session/account validity is checked in PostgreSQL on protected requests.
 * RLS lookup and context share one transaction; no renewal, DB mutation, or token echo.
 */
export async function verifySession(token: string, client: PrismaClient = prisma): Promise<VerifiedSession> {
  const hash = tokenHash(token);
  return withSession(hash, async (tx, identity) => {
    const session = await tx.session.findUnique({
      where: { tokenHash: hash }, select: { expiresAt: true },
    });
    if (!session) throw new SessionContextError();
    return {
      user: { id: identity.id, email: identity.email, displayName: identity.displayName,
        role: identity.role, status: identity.status },
      expiresAt: session.expiresAt,
    };
  }, client);
}

/**
 * Revoke only the session identified by a supplied bearer token.
 * @param token Parsed opaque Bearer value; malformed/missing values reject with 401.
 * @param client Restricted runtime client, never a privileged database connection.
 * @returns Completion without exposing whether any matching session existed.
 * @throws SessionContextError for malformed input; DB failures reach the safe handler.
 * @remarks The narrow hash-based function is idempotent for unknown/expired/revoked
 * tokens and preserves other-device sessions. Does not require a still-active context.
 */
export async function revokeSession(token: string, client: PrismaClient = prisma): Promise<void> {
  const hash = tokenHash(token);
  // Execute rather than deserialize PostgreSQL's void return; no raw token enters SQL.
  await client.$executeRaw`SELECT public.oak_revoke_session(${hash})`;
}

/**
 * Revoke all still-unrevoked sessions belonging to the currently authenticated account.
 * @param token Active bearer token establishing account ownership, never a request userId.
 * @param client Restricted runtime client, optionally the dedicated integration client.
 * @returns Completion after the account-scoped revocation transaction commits.
 * @throws SessionContextError for invalid/ineligible context; DB failures propagate safely.
 * @remarks Runs atomically under verified identity/RLS and revokes current session last
 * so later statements can still use the context. This helper requires an active session;
 * a future reset-token workflow must design its separately authorized revocation path.
 * It is not exposed as an endpoint here and does not grant cross-account revocation.
 */
export async function revokeAllSessions(token: string, client: PrismaClient = prisma): Promise<void> {
  const hash = tokenHash(token);
  await withSession(hash, async (tx, identity) => {
    const revokedAt = new Date();
    await tx.session.updateMany({
      where: { userId: identity.id, tokenHash: { not: hash }, revokedAt: null },
      data: { revokedAt },
    });
    // Use the already-authorized narrow function for the final current-session revoke;
    // it does not need RLS identity to remain live after updating the current row.
    await tx.$executeRaw`SELECT public.oak_revoke_session(${hash})`;
  }, client);
}
