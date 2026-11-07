import type { Request, RequestHandler } from "express";
import { z } from "zod";
import type { RegistrationStartRequest, RegistrationStartResponse, RegistrationVerifyRequest,
  RegistrationVerifyResponse, RegistrationResendRequest, RegistrationProgressResponse } from "@oak/shared";
import { ApiError } from "../../middleware/error-handler.js";
import { validateMobileClient } from "../auth/auth.schemas.js";
import { RegistrationRetryError } from "./registration.errors.js";
import { registrationQuerySchema, registrationResendSchema, registrationStartSchema,
  registrationTokenSchema, registrationVerifySchema } from "./registration.schemas.js";

/** Server-owned operation seam; never supplied by a request or an authorization claim. */
export type RegistrationOperations = Readonly<{
  start: (input: RegistrationStartRequest) => Promise<RegistrationStartResponse>;
  verifyEmail: (token: string, input: RegistrationVerifyRequest) => Promise<RegistrationVerifyResponse>;
  resendCode: (token: string, input: RegistrationResendRequest) => Promise<RegistrationStartResponse>;
  current: (token: string) => Promise<RegistrationProgressResponse>;
}>;

function oneHeader(req: Request, name: string): string | undefined {
  const count = req.rawHeaders.filter((value, index) => index % 2 === 0 && value.toLowerCase() === name).length;
  const value = req.headers[name];
  return count === 1 && typeof value === "string" ? value : undefined;
}

function requestBoundary(req: Request): void {
  validateMobileClient(oneHeader(req, "x-client-platform"));
  registrationQuerySchema.parse(req.query);
  z.object({}).strict().parse(req.params);
  // Registration is a separate authority. Never accept a login Bearer as fallback,
  // or let a request mix two identities even if it also supplies a registration proof.
  if (req.rawHeaders.some((value, index) => index % 2 === 0 && value.toLowerCase() === "authorization")) {
    throw new ApiError("REGISTRATION_EXPIRED");
  }
}

/**
 * Parse exactly one canonical registration header without attaching it to identity state.
 * @param req Incoming Express request; raw duplicate/combined header values are rejected.
 * @returns Transient raw proof for the registration-only service, never logged/persisted here.
 * @throws ApiError/REGISTRATION_EXPIRED for missing/malformed/ambiguous proof; no I/O.
 */
export function readRegistrationToken(req: Request): string {
  const parsed = registrationTokenSchema.safeParse(oneHeader(req, "x-registration-token"));
  if (!parsed.success) throw new ApiError("REGISTRATION_EXPIRED");
  return parsed.data;
}

function publicFlow(result: RegistrationStartResponse): RegistrationStartResponse {
  return { registrationToken: result.registrationToken, challengeId: result.challengeId,
    codeExpiresAt: result.codeExpiresAt, resendAfter: result.resendAfter,
    registrationExpiresAt: result.registrationExpiresAt, next: "verify-email", delivery: "unconfirmed" };
}

/**
 * Build native registration handlers with explicit safe response projections.
 * @param getService Application-owned lazy loader; invoked only after transport/input validation.
 * @returns Start/resend 202, verification/progress 200 handlers, with no login cookies/session.
 * @throws No intentional construction errors; request failures forward through Express next.
 * @remarks JSON stays under the app's 10 KiB bound. Services own proof/RLS and commit before
 * responses. No body/query authority, token logging, provider diagnostics or automatic retries.
 */
export function createRegistrationControllers(getService: () => Promise<RegistrationOperations>) {
  function handler(status: number, work: (req: Request) => Promise<unknown>): RequestHandler {
    return (req, res, next) => {
      void (async () => {
        requestBoundary(req);
        if (req.method !== "GET" && !req.is("application/json")) throw new ApiError("VALIDATION_ERROR");
        const result = await work(req);
        res.status(status).json(result);
      })().catch((error: unknown) => {
        if (error instanceof RegistrationRetryError) {
          const seconds = Number.isFinite(error.retryAfterSeconds)
            ? Math.max(1, Math.min(900, Math.ceil(error.retryAfterSeconds))) : 60;
          res.setHeader("Retry-After", String(seconds));
        }
        next(error);
      });
    };
  }
  return {
    /** POST credentials: validates before lazy service load, returns generic acknowledgment only. */
    start: handler(202, async req => {
      const input = registrationStartSchema.parse(req.body);
      return publicFlow(await (await getService()).start(input));
    }),
    /** POST code: single-use service proof rotation, no automatic native login. */
    verify: handler(200, async req => {
      const token = readRegistrationToken(req);
      const input = registrationVerifySchema.parse(req.body);
      const result = await (await getService()).verifyEmail(token, input);
      return { verified: true, registrationToken: result.registrationToken,
        registrationExpiresAt: result.registrationExpiresAt, next: "complete-profile" };
    }),
    /** POST explicit resend: truthful acknowledgment, bounded cooldown failure via Retry-After. */
    resend: handler(202, async req => {
      const token = readRegistrationToken(req);
      const input = registrationResendSchema.parse(req.body);
      return publicFlow(await (await getService()).resendCode(token, input));
    }),
    /** GET progress: no profile/credentials or token echo, and no lifetime renewal. */
    current: handler(200, async req => {
      const token = readRegistrationToken(req);
      z.object({}).strict().optional().parse(req.body);
      const result = await (await getService()).current(token);
      if (!result.verified) return { next: "verify-email", verified: false };
      if (result.next === "await-assessment") return { next: "await-assessment", verified: true,
        receipt: { receiptId: result.receipt.receiptId, status: "New", submittedAt: result.receipt.submittedAt } };
      return { next: "complete-profile", verified: true };
    }),
  };
}
