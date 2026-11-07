import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type { Request } from "express";
import { MemoryStore, rateLimit, type RateLimitRequestHandler } from "express-rate-limit";
import { ApiError } from "./error-handler.js";
import { loginEmailSchema } from "../modules/auth/auth.schemas.js";

const windowMs = 15 * 60 * 1000;

function normalizedEmail(req: Request): string | undefined {
  const body: unknown = req.body;
  if (typeof body !== "object" || body === null || Array.isArray(body) || !("email" in body)) return undefined;
  const result = loginEmailSchema.safeParse(body.email);
  return result.success ? result.data : undefined;
}

function proofKey(req: Request): string | undefined {
  const proof = req.headers["x-registration-token"];
  return typeof proof === "string" && /^[A-Za-z0-9_-]{43}$/.test(proof)
    ? createHash("sha256").update(proof, "utf8").digest("hex") : undefined;
}

function checkProxyPolicy(req: Request): void {
  const trust: unknown = req.app.get("trust proxy");
  // T021 allows false or an explicit literal upstream-IP list, never true/hop counts.
  if (trust !== false && !(Array.isArray(trust) && trust.every((ip: unknown) => typeof ip === "string" && isIP(ip) !== 0))) {
    throw new ApiError("INTERNAL_ERROR");
  }
}

/** Independent middleware instances and cleanup for one long-lived API application. */
export type RateLimiters = {
  /** General endpoint quota, 100 requests per 15 minutes per resolved client IP. */
  globalIp: RateLimitRequestHandler;
  /** Sensitive login quota, 10 requests per 15 minutes per resolved client IP. */
  loginIp: RateLimitRequestHandler;
  /** Sensitive login quota, 5 requests per 15 minutes per normalized email. */
  loginEmail: RateLimitRequestHandler;
  /** Shared start/resend admission quota: 10 requests per 15 minutes per client IP. */
  registrationIssueIp: RateLimitRequestHandler;
  /** Start admission quota: 5 requests per 15 minutes per normalized email. */
  registrationStartEmail: RateLimitRequestHandler;
  /** Verification admission quota: 30 requests per 15 minutes per client IP. */
  registrationVerifyIp: RateLimitRequestHandler;
  /** Verification admission quota: 5 requests per 15 minutes per hashed proof. */
  registrationVerifyProof: RateLimitRequestHandler;
  /** Release memory-store cleanup timers on application shutdown or test teardown. */
  shutdown: () => void;
};

/**
 * Create the approved global and sensitive-endpoint limiters using installed v7 APIs.
 * @returns Fresh, independent limiter stores and a synchronous cleanup callback.
 * @throws Configuration errors from express-rate-limit during construction.
 * @remarks Create once at app startup, not per request. Mount globalIp before parsing,
 * loginIp before credential work, and loginEmail after bounded JSON parsing. All requests
 * count, including successful authentication; invalid email input skips only its email
 * tier and still consumes global/login IP quota. IP trust must be false or verified IPs.
 * Blocks return reviewed JSON/429 and Retry-After in seconds. No credentials or keys
 * are logged. MemoryStore expires inactive keys within two 15-minute rotation windows;
 * quotas reset on restart and are not shared across instances. Call shutdown at teardown.
 * Registration uses independent shared start/resend IP, normalized-start-email and
 * verify IP/hash-proof stores. Durable per-account issue/attempt limits remain SQL-owned;
 * do not treat these process-local HTTP counters as a distributed authorization check.
 */
export function createRateLimiters(): RateLimiters {
  const stores: MemoryStore[] = [];
  const error = new ApiError("RATE_LIMITED");

  function create(limit: number, property: string, key: "ip" | "email" | "proof" = "ip"): RateLimitRequestHandler {
    const store = new MemoryStore();
    stores.push(store);
    return rateLimit({
      windowMs,
      limit,
      store,
      requestPropertyName: property,
      statusCode: 429,
      message: { code: error.code, message: error.message },
      standardHeaders: "draft-6",
      legacyHeaders: false,
      passOnStoreError: false,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      skip: (req) => {
        checkProxyPolicy(req);
        return (key === "email" && normalizedEmail(req) === undefined) || (key === "proof" && proofKey(req) === undefined);
      },
      // Ignore untrusted forwarded headers instead of warning about their mere presence.
      // Other v7 validation checks (including permissive trust proxy) remain enabled.
      // Source: installed express-rate-limit 7.5.1 default keyGenerator validations.
      validate: { xForwardedForHeader: false },
      ...(key === "email" ? {
        keyGenerator: (req: Request) => createHash("sha256")
          .update(normalizedEmail(req) ?? "invalid", "utf8").digest("hex"),
      } : {}),
      ...(key === "proof" ? { keyGenerator: (req: Request) => proofKey(req) ?? "invalid" } : {}),
    });
  }

  return {
    globalIp: create(100, "globalRateLimit"),
    loginIp: create(10, "loginIpRateLimit"),
    loginEmail: create(5, "loginEmailRateLimit", "email"),
    registrationIssueIp: create(10, "registrationIssueIpRateLimit"),
    registrationStartEmail: create(5, "registrationStartEmailRateLimit", "email"),
    registrationVerifyIp: create(30, "registrationVerifyIpRateLimit"),
    registrationVerifyProof: create(5, "registrationVerifyProofRateLimit", "proof"),
    shutdown: () => { for (const store of stores) store.shutdown(); },
  };
}
