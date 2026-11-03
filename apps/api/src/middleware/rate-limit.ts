import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type { Request } from "express";
import { MemoryStore, rateLimit, type RateLimitRequestHandler } from "express-rate-limit";
import { z } from "zod";
import { ApiError } from "./error-handler.js";

const windowMs = 15 * 60 * 1000;
const emailSchema = z.string().trim().toLowerCase().min(3).max(254).email();

function normalizedEmail(req: Request): string | undefined {
  const body: unknown = req.body;
  if (typeof body !== "object" || body === null || Array.isArray(body) || !("email" in body)) return undefined;
  const result = emailSchema.safeParse(body.email);
  return result.success ? result.data : undefined;
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
 */
export function createRateLimiters(): RateLimiters {
  const stores: MemoryStore[] = [];
  const error = new ApiError("RATE_LIMITED");

  function create(limit: number, property: string, byEmail = false): RateLimitRequestHandler {
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
        return byEmail && normalizedEmail(req) === undefined;
      },
      // Ignore untrusted forwarded headers instead of warning about their mere presence.
      // Other v7 validation checks (including permissive trust proxy) remain enabled.
      // Source: installed express-rate-limit 7.5.1 default keyGenerator validations.
      validate: { xForwardedForHeader: false },
      ...(byEmail ? {
        keyGenerator: (req: Request) => createHash("sha256")
          .update(normalizedEmail(req) ?? "invalid", "utf8").digest("hex"),
      } : {}),
    });
  }

  return {
    globalIp: create(100, "globalRateLimit"),
    loginIp: create(10, "loginIpRateLimit"),
    loginEmail: create(5, "loginEmailRateLimit", true),
    shutdown: () => { for (const store of stores) store.shutdown(); },
  };
}
