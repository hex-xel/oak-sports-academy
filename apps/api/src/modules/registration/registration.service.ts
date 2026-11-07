import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { RegistrationProgressResponse, RegistrationStartRequest, RegistrationStartResponse,
  RegistrationResendRequest, RegistrationVerifyRequest, RegistrationVerifyResponse } from "@oak/shared";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/error-handler.js";
import { hashPassword, verifyPassword } from "../auth/password.service.js";
import { hashAuditPayload } from "../audit/audit.service.js";
import { createRegistrationCapability, registrationCapabilityHash, withRegistration } from "./capability.js";
import { registrationResendSchema, registrationStartSchema, registrationVerifySchema } from "./registration.schemas.js";
import { createOtpTools } from "./otp.service.js";
import { RegistrationRetryError } from "./registration.errors.js";

/** Backward-compatible service export; the HTTP error class has no database dependency. */
export { RegistrationRetryError } from "./registration.errors.js";

/** Transient adapter input; never persist, log, queue or return its code to the applicant. */
export type RegistrationOtpMessage = Readonly<{
  to: string; code: string; challengeId: string; idempotencyKey: string;
}>;

/** Trusted server dependencies. T009 supplies a bounded real sender; no success stub is installed. */
export type RegistrationServiceOptions = Readonly<{
  otpKey: string;
  sendOtp: (message: RegistrationOtpMessage) => Promise<Readonly<{ providerId: string }>>;
  client?: PrismaClient;
}>;

type IssueRow = {
  outcome: string; challengeId: string | null; codeExpiresAt: Date | null; resendAfter: Date | null;
  registrationExpiresAt: Date | null; deliveryId: string | null; issued: boolean; retryAfter: number;
  email?: string | null;
};
type Account = { id: string; passwordHash: string; role: string; status: string };

function checkOutcome(outcome: string, retryAfter = 60): void {
  if (outcome === "OK") return;
  if (outcome === "LIMITED") throw new RegistrationRetryError(retryAfter || 60);
  if (outcome === "INVALID") throw new ApiError("INVALID_VERIFICATION_CODE");
  if (outcome === "EXPIRED") throw new ApiError("VERIFICATION_EXPIRED");
  if (outcome === "EXPIRED_FLOW") throw new ApiError("REGISTRATION_EXPIRED");
  if (outcome === "CONFLICT") throw new ApiError("REGISTRATION_CONFLICT");
  throw new ApiError("INTERNAL_ERROR");
}

function flow(row: IssueRow, token: string): RegistrationStartResponse {
  checkOutcome(row.outcome === "EXPIRED" ? "EXPIRED_FLOW" : row.outcome, row.retryAfter);
  if (!row.challengeId || !row.codeExpiresAt || !row.resendAfter || !row.registrationExpiresAt) {
    throw new ApiError("INTERNAL_ERROR");
  }
  return { registrationToken: token, challengeId: row.challengeId, codeExpiresAt: row.codeExpiresAt.toISOString(),
    resendAfter: row.resendAfter.toISOString(), registrationExpiresAt: row.registrationExpiresAt.toISOString(),
    next: "verify-email", delivery: "unconfirmed" };
}

/**
 * Construct registration operations on a restricted client and private OTP/sender dependencies.
 * @param options Server-only key, sender adapter and optional guarded runtime fixture client.
 * @returns Start/verify/resend/current service methods; no login or account-edit operation.
 * @throws Safe configuration error for missing/invalid key; operations throw reviewed errors.
 * @remarks No provider I/O inside SQL transactions. Failed code counters commit before
 * API rejection. No automatic request replay, plaintext OTP queue or existing-password update.
 */
export function createRegistrationService(options: RegistrationServiceOptions) {
  if (typeof options.sendOtp !== "function") throw new Error("Registration email adapter must be configured.");
  const client = options.client ?? prisma;
  const otp = createOtpTools(options.otpKey);
  const audit = hashAuditPayload({});

  async function deliver(row: IssueRow, tokenHash: string, email: string, code: string): Promise<void> {
    if (!row.issued || !row.deliveryId || !row.challengeId) return;
    let provider: string | null = null;
    try {
      const receipt = await options.sendOtp({ to: email, code, challengeId: row.challengeId,
        idempotencyKey: `registration-otp/${row.challengeId}` });
      if (typeof receipt.providerId === "string" && receipt.providerId.length > 0 && receipt.providerId.length <= 255) provider = receipt.providerId;
    } catch { /* Sender failures become safe metadata; no sensitive cause escapes. */ }
    await client.$executeRaw`SELECT public.oak_registration_delivery_result(
      ${row.deliveryId}::uuid,${tokenHash},${provider},${provider !== null})`;
    // Before mailbox proof, real and decoy flows both say delivery is unconfirmed.
    // A provider failure must not become an account-enumeration oracle through status.
  }

  async function decoyStep(hash: string, action: "CURRENT" | "VERIFY" | "RESEND", challenge: string | null,
    operation: string | null = null, newHash: string | null = null, newChallenge: string | null = null): Promise<IssueRow | undefined> {
    const rows = await client.$queryRaw<IssueRow[]>`SELECT * FROM public.oak_registration_decoy_step(
      ${hash},${action},${challenge}::uuid,${operation}::uuid,${newHash},${newChallenge}::uuid)`;
    if (rows.length > 1) throw new ApiError("INTERNAL_ERROR");
    return rows[0];
  }

  return {
    /**
     * Start once or explicitly recover the same credential operation without replacing credentials.
     * @param input Untrusted credential DTO; unknown authority fields reject.
     * @returns Generic real/decoy flow acknowledgment, never a sent-email/login claim.
     * @throws Validation/quota/conflict/configuration errors; database errors propagate safely.
     * @remarks Argon2 runs before SQL; SQL serializes uniqueness and rechecks credential snapshot.
     */
    async start(input: RegistrationStartRequest): Promise<RegistrationStartResponse> {
      const request = registrationStartSchema.parse(input);
      const [accounts, matches] = await Promise.all([
        client.$queryRaw<Account[]>`SELECT id,"passwordHash",role,status FROM public.oak_auth_lookup(${request.email})`,
        client.$queryRaw<Array<{ applicationId: string; userId: string }>>`
          SELECT * FROM public.oak_registration_start_match(${request.email},${request.operationId}::uuid)`,
      ]);
      if (accounts.length > 1 || matches.length > 1) throw new ApiError("INTERNAL_ERROR");
      const account = accounts[0];
      // Both paths do native hash+verify work; this is not a constant-network-time claim.
      const [passwordDigest, correct] = await Promise.all([
        hashPassword(request.password), verifyPassword(request.password, account?.passwordHash ?? null),
      ]);
      const match = matches[0];
      const userId = account?.id ?? randomUUID();
      const applicationId = match?.applicationId ?? randomUUID();
      const capability = createRegistrationCapability();
      const challengeId = randomUUID();
      const code = otp.generateCode();
      const digest = otp.digest(userId, applicationId, challengeId, code);
      const retry = correct && account?.role === "STUDENT" && account.status === "PENDING_APPROVAL" && match?.userId === userId;
      let rows: IssueRow[];
      try {
        rows = await client.$queryRaw<IssueRow[]>`SELECT * FROM public.oak_registration_start(
          ${request.email},${passwordDigest},${request.studentType === "experienced" ? "EXPERIENCED" : "NEW_WHITE_BELT"},
          ${request.operationId}::uuid,${userId}::uuid,${applicationId}::uuid,${capability.tokenHash},
          ${challengeId}::uuid,${digest},${retry},${account?.passwordHash ?? null},${audit})`;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2010" && error.meta?.["code"] === "23505") rows = [];
        else throw error;
      }
      if (rows.length === 0) {
        rows = await client.$queryRaw<IssueRow[]>`SELECT * FROM public.oak_registration_decoy_start(
          ${request.operationId}::uuid,${capability.tokenHash},${challengeId}::uuid)`;
      }
      const row = rows[0];
      if (rows.length !== 1 || !row) throw new ApiError("INTERNAL_ERROR");
      const response = flow(row, capability.token);
      await deliver(row, capability.tokenHash, request.email, code);
      return response;
    },

    /**
     * Consume one code atomically and rotate proof; does not create an ordinary session.
     * @param token Raw registration proof header, never a login bearer.
     * @param input Challenge/code DTO, strictly validated.
     * @returns Verified registration proof with the original flow deadline.
     * @throws Safe invalid/expired/limited errors after failed-attempt persistence commits.
     */
    async verifyEmail(token: string, input: RegistrationVerifyRequest): Promise<RegistrationVerifyResponse> {
      const request = registrationVerifySchema.parse(input);
      const decoy = await decoyStep(registrationCapabilityHash(token), "VERIFY", request.challengeId);
      if (decoy) { checkOutcome(decoy.outcome, 60); throw new ApiError("INTERNAL_ERROR"); }
      const capability = createRegistrationCapability();
      const row = await withRegistration(token, false, async (tx, identity) => {
        const digest = otp.digest(identity.userId, identity.applicationId, request.challengeId, request.code);
        const rows = await tx.$queryRaw<Array<{ outcome: string; registrationExpiresAt: Date }>>`
          SELECT * FROM public.oak_registration_verify(${request.challengeId}::uuid,${digest},${capability.tokenHash},${audit})`;
        if (rows.length !== 1 || !rows[0]) throw new ApiError("INTERNAL_ERROR");
        return rows[0];
      }, client);
      // Throw after the transaction, otherwise invalid attempts would be rolled back.
      checkOutcome(row.outcome);
      return { verified: true, registrationToken: capability.token,
        registrationExpiresAt: row.registrationExpiresAt.toISOString(), next: "complete-profile" };
    },

    /**
     * Explicitly rotate an unverified challenge, respecting cooldown and durable issue quota.
     * @param token Current proof; a lost rotated response must use the original start recovery.
     * @param input New operation and current challenge UUIDs.
     * @returns Generic flow acknowledgment with delivery unconfirmed, no mailbox/profile echo.
     * @throws Safe proof/cooldown/conflict errors. Provider outcomes are recorded privately.
     */
    async resendCode(token: string, input: RegistrationResendRequest): Promise<RegistrationStartResponse> {
      const request = registrationResendSchema.parse(input);
      const hash = registrationCapabilityHash(token);
      const capability = createRegistrationCapability();
      const challengeId = randomUUID();
      const decoy = await decoyStep(hash, "RESEND", request.challengeId, request.operationId, capability.tokenHash, challengeId);
      if (decoy) return flow(decoy, capability.token);
      const code = otp.generateCode();
      const row = await withRegistration(token, false, async (tx, identity) => {
        const digest = otp.digest(identity.userId, identity.applicationId, challengeId, code);
        const rows = await tx.$queryRaw<IssueRow[]>`SELECT * FROM public.oak_registration_resend(
          ${request.challengeId}::uuid,${request.operationId}::uuid,${capability.tokenHash},${challengeId}::uuid,${digest},${audit})`;
        if (rows.length !== 1 || !rows[0]) throw new ApiError("INTERNAL_ERROR");
        return rows[0];
      }, client);
      const response = flow(row, capability.token);
      if (!row.email) throw new ApiError("INTERNAL_ERROR");
      await deliver(row, capability.tokenHash, row.email, code);
      return response;
    },

    /**
     * Read curated technical progress without revealing a raw application/profile record.
     * @param token Registration proof, revalidated against real/decoy state.
     * @returns Verification/profile/receipt next step; never passwords, digests or PII.
     * @throws Safe proof error for expired/revoked/ineligible proof; no lifetime renewal.
     */
    async current(token: string): Promise<RegistrationProgressResponse> {
      const decoy = await decoyStep(registrationCapabilityHash(token), "CURRENT", null);
      if (decoy) { checkOutcome(decoy.outcome); return { next: "verify-email", verified: false }; }
      return withRegistration<RegistrationProgressResponse>(token, false, async (tx, identity) => {
        if (!identity.verified) return { next: "verify-email", verified: false };
        const application = await tx.registrationApplication.findUnique({ where: { id: identity.applicationId },
          select: { stage: true, submittedAt: true } });
        if (!application) throw new ApiError("REGISTRATION_EXPIRED");
        if (application.stage === "SUBMITTED" && application.submittedAt) return {
          next: "await-assessment", verified: true,
          receipt: { receiptId: identity.applicationId, status: "New", submittedAt: application.submittedAt.toISOString() },
        };
        return { next: "complete-profile", verified: true };
      }, client);
    },
  };
}
