import { createHmac, randomInt } from "node:crypto";
import { ApiError } from "../../middleware/error-handler.js";

/**
 * Construct account/application/challenge-bound OTP tools with a server-only key.
 * @param secret Independent cryptographically random 32-byte key, encoded as 64 hex characters.
 * @returns Code generator and keyed digest operation; never exposes the key.
 * @throws Safe configuration error for invalid key; ApiError for invalid internal code/IDs.
 * @remarks No environment reads, logging or persistence. Plain six-digit SHA-256 is unsafe.
 */
export function createOtpTools(secret: string) {
  if (typeof secret !== "string" || !/^[0-9a-f]{64}$/.test(secret)) {
    throw new Error("Registration verification key must be configured privately.");
  }
  const key = Buffer.from(secret, "hex");
  return {
    /** Generate six ASCII digits with secure randomness, including possible leading zeroes. */
    generateCode(): string { return randomInt(1_000_000).toString().padStart(6, "0"); },
    /** Hash a code only for these server-resolved identifiers; no I/O or raw-code storage. */
    digest(userId: string, applicationId: string, challengeId: string, code: string): string {
      if (![userId, applicationId, challengeId].every(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) || !/^[0-9]{6}$/.test(code)) {
        throw new ApiError("INTERNAL_ERROR");
      }
      return createHmac("sha256", key).update(JSON.stringify([
        "oak-registration-otp-v1", userId, applicationId, challengeId, code,
      ])).digest("hex");
    },
  };
}
