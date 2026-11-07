import { createHash, randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/error-handler.js";
import { hashAuditPayload } from "../audit/audit.service.js";

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const actions = ["REGISTRATION_STARTED", "EMAIL_VERIFICATION_REQUESTED",
  "EMAIL_VERIFICATION_FAILED", "EMAIL_VERIFIED", "REGISTRATION_AGREEMENTS_ACCEPTED",
  "REGISTRATION_DOCUMENT_READY", "REGISTRATION_SUBMITTED"] as const;

/** Safe registration-only context; it is never a Student/Admin login identity. */
export type RegistrationIdentity = Readonly<{
  applicationId: string;
  userId: string;
  verified: boolean;
  version: number;
}>;

/** Fixed registration events; callers cannot choose an actor or cross-application target. */
export type RegistrationAuditAction = typeof actions[number];

/**
 * Create a cryptographically random registration-only bearer and its SHA-256 digest.
 * @returns Transient token plus hash; only the hash may be persisted.
 * @throws Crypto runtime errors if secure random generation is unavailable.
 * @remarks No I/O/logging; creation alone grants no authority until bound server-side.
 */
export function createRegistrationCapability(): Readonly<{ token: string; tokenHash: string }> {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: registrationCapabilityHash(token) };
}

/**
 * Validate canonical 256-bit base64url registration proof and compute its digest.
 * @param token Raw separately parsed registration header, never a user/application ID.
 * @returns Lowercase SHA-256 digest for bound SQL queries, never the raw token.
 * @throws ApiError/REGISTRATION_EXPIRED for malformed input; no existence information.
 * @remarks No logging/storage. Canonical round-trip rejects alternate final-bit encodings.
 */
export function registrationCapabilityHash(token: string): string {
  if (typeof token !== "string" || !tokenPattern.test(token) ||
    Buffer.from(token, "base64url").toString("base64url") !== token) {
    throw new ApiError("REGISTRATION_EXPIRED");
  }
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function isProofRejection(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2010" && error.meta?.["code"] === "28000";
}

/**
 * Run database-only work under an independently verified registration capability.
 * @param token Raw registration-only bearer; never an ordinary login token or user ID.
 * @param requireVerified Trusted route requirement; personal/document work requires true.
 * @param work Awaited callback using this transaction and safe technical identity only.
 * @param client Restricted runtime client; optional injection is for guarded fixtures only.
 * @returns Callback result after commit. No implicit mutation retry or lifetime extension.
 * @throws ApiError/REGISTRATION_EXPIRED for rejected proof; DB/callback failures propagate
 * to the safe error handler without logging or serializing raw diagnostic values.
 * @remarks SQL clears login context, checks current eligibility/version/expiry and uses
 * transaction-local proof. External email/Storage operations must occur outside this work.
 */
export async function withRegistration<T>(
  token: string,
  requireVerified: boolean,
  work: (tx: Prisma.TransactionClient, identity: RegistrationIdentity) => Promise<T>,
  client: PrismaClient = prisma,
): Promise<T> {
  const hash = registrationCapabilityHash(token);
  if (typeof requireVerified !== "boolean") throw new ApiError("INTERNAL_ERROR");
  try {
    return await client.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<RegistrationIdentity[]>`
        SELECT "applicationId", "userId", verified, version
        FROM public.oak_set_registration_context(${hash}, ${requireVerified})`;
      const identity = rows[0];
      if (rows.length !== 1 || !identity || !uuidPattern.test(identity.applicationId) ||
        !uuidPattern.test(identity.userId) || typeof identity.verified !== "boolean" ||
        !Number.isSafeInteger(identity.version) || identity.version < 1 ||
        (requireVerified && !identity.verified)) throw new ApiError("REGISTRATION_EXPIRED");
      return work(tx, Object.freeze(identity));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 5_000, timeout: 10_000 });
  } catch (error) {
    if (isProofRejection(error)) throw new ApiError("REGISTRATION_EXPIRED");
    throw error;
  }
}

/**
 * Append a fixed-target preapproval event inside the caller's registration transaction.
 * @param tx Transaction already established by withRegistration, never an outer client.
 * @param action Server-selected allowlisted event; SQL independently checks this list/proof.
 * @param payload Explicit safe JSON metadata, processed by the existing audit redaction/hash.
 * @returns Inserted audit UUID only; no actor, raw payload or credential echo.
 * @throws ApiError for invalid internal data/proof; DB failures must roll back related work.
 * @remarks SQL derives actor/target, takes the shared chain lock and uses the existing
 * insert/hash guard. Never catch an audit failure and commit the registration mutation.
 */
export async function appendRegistrationAudit(
  tx: Prisma.TransactionClient,
  action: RegistrationAuditAction,
  payload: unknown,
): Promise<string> {
  if ("$transaction" in tx || "$connect" in tx || !actions.includes(action)) {
    throw new ApiError("INTERNAL_ERROR");
  }
  const digest = hashAuditPayload(payload);
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT public.oak_registration_append_audit(${action}, ${digest})::text AS id`;
  if (rows.length !== 1 || !rows[0] || !uuidPattern.test(rows[0].id)) {
    throw new ApiError("INTERNAL_ERROR");
  }
  return rows[0].id;
}
