import type { Prisma, PrismaClient, User } from "@prisma/client";
import type { LoginResponse } from "@oak/shared";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/error-handler.js";
import { loginSchema } from "./auth.schemas.js";
import { verifyPassword } from "./password.service.js";
import { createSession, type SessionMetadata } from "./session.service.js";

type CredentialRow = Pick<User, "id" | "email" | "passwordHash" | "role" | "status" | "emailVerifiedAt">;
type QueryClient = Pick<PrismaClient, "$queryRaw" | "$executeRaw">;

async function lookup(email: string, client: QueryClient): Promise<CredentialRow | null> {
  const rows = await client.$queryRaw<CredentialRow[]>`SELECT * FROM public.oak_auth_lookup(${email})`;
  if (rows.length > 1) throw new ApiError("INTERNAL_ERROR");
  return rows[0] ?? null;
}

function checkEligibility(account: CredentialRow): void {
  if (account.role !== "STUDENT") throw new ApiError("FORBIDDEN");
  if (account.status === "SUSPENDED") throw new ApiError("ACCOUNT_SUSPENDED");
  if (account.status === "PENDING_APPROVAL") throw new ApiError("ACCOUNT_PENDING_APPROVAL");
  if (account.status !== "ACTIVE") throw new ApiError("FORBIDDEN");
  if (account.emailVerifiedAt === null) throw new ApiError("EMAIL_NOT_VERIFIED");
}

async function recordAttempt(email: string, ip: string | null, succeeded: boolean, client: QueryClient): Promise<void> {
  await client.$executeRaw`SELECT public.oak_record_sign_in_attempt(${email}, ${ip}, ${succeeded})`;
}

/**
 * Authenticates a native Student through the existing restricted pre-auth SQL path.
 * @param input Untrusted JSON credentials; validation strips unknown claims.
 * @param metadata Server-observed IP/agent only, never used for account identity.
 * @param client Restricted runtime Prisma client (local restricted fixture in tests).
 * @returns Safe login JSON and the raw opaque token once; no password/token hashes.
 * @throws Safe validation/credential/account errors; infrastructure errors reach the
 * safe API boundary. Attempts are recorded without passwords or tokens, even for unknown emails.
 * @remarks Verification runs exactly once using a real/dummy digest before restrictions.
 * Session creation, lastSignInAt and successful attempt commit together. Failed attempts
 * are standalone writes after rollback. No retries, privileged fallback, enrollment or
 * payment mutations. Enrollment never promotes privileges or enables unpaid entitlements.
 */
export async function login(input: unknown, metadata: SessionMetadata = {}, client: PrismaClient = prisma): Promise<LoginResponse> {
  const credentials = loginSchema.parse(input);
  // Attempt IP is a required text field; absence is explicit, never a fabricated address.
  const ip = metadata.ipAddress?.slice(0, 45) ?? "unknown";
  try {
    const account = await lookup(credentials.email, client);
    const matches = await verifyPassword(credentials.password, account?.passwordHash ?? null);
    if (!account || !matches) throw new ApiError("INVALID_CREDENTIALS");
    checkEligibility(account);
    return await client.$transaction(async (tx: Prisma.TransactionClient): Promise<LoginResponse> => {
      const session = await createSession(account.id, metadata, tx);
      // oak_create_session holds the account row lock. Re-read under that lock to
      // prevent a concurrent role/password change from issuing a stale native login.
      const current = await lookup(credentials.email, tx);
      if (!current || current.id !== account.id || current.passwordHash !== account.passwordHash) throw new ApiError("FORBIDDEN");
      checkEligibility(current);
      await recordAttempt(credentials.email, ip, true, tx);
      return { user: { id: current.id, email: current.email, role: "STUDENT", status: "ACTIVE" },
        landingPath: "/", sessionToken: session.sessionToken, expiresAt: session.expiresAt.toISOString() };
    }, { isolationLevel: "ReadCommitted", maxWait: 5_000, timeout: 10_000 });
  } catch (error) {
    await recordAttempt(credentials.email, ip, false, client);
    throw error;
  }
}
