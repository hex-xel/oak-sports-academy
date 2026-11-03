import { randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import { ApiError } from "../../middleware/error-handler.js";

// specifications.md §4: memoryCost is KiB, not bytes (19 MiB = 19456 KiB).
const options = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
});
let dummyHashPromise: Promise<string> | undefined;

function checkPassword(password: string): void {
  if (typeof password !== "string" || password.length < 1 || password.length > 128) {
    throw new ApiError("VALIDATION_ERROR", ["password"]);
  }
}

function unavailable(): Error {
  // Native-library exceptions can carry internals; no input or cause is attached.
  return new Error("Password service unavailable.");
}

function getDummyHash(): Promise<string> {
  dummyHashPromise ??= argon2.hash(randomBytes(32), options).catch(() => {
    dummyHashPromise = undefined;
    throw unavailable();
  });
  return dummyHashPromise;
}

/**
 * Prepare the one-per-process dummy digest before the API starts accepting logins.
 * @returns Completion once the library-generated dummy hash is ready.
 * @throws A generic service error if the native library cannot hash.
 * @remarks T030 must await this before listening. Concurrent calls share one promise;
 * no input, hash, or exception details are logged. Failure permits a later explicit retry.
 */
export async function initializePasswordService(): Promise<void> {
  await getDummyHash();
}

/**
 * Hash a password using the approved Argon2id parameters and library-generated salt.
 * @param password Unmodified 1–128 character password; never trimmed or normalized.
 * @returns The encoded Argon2id digest for private database storage only.
 * @throws ApiError for invalid length, or a generic service error on native failure.
 * @remarks Registration enforces its own complexity policy. No logging/database writes;
 * the caller must never return the digest to a client or put it in audit payloads.
 */
export async function hashPassword(password: string): Promise<string> {
  checkPassword(password);
  try {
    return await argon2.hash(password, options);
  } catch {
    throw unavailable();
  }
}

/**
 * Verify a known account or perform equivalent native work for an unknown email.
 * @param password Unmodified 1–128 character submitted password.
 * @param digest Stored encoded digest, or null when the account lookup found no user.
 * @returns True only for a real digest whose password matches; unknown accounts always false.
 * @throws ApiError for invalid password length; generic service error for malformed stored
 * digests or native failures. Database corruption is not silently treated as bad credentials.
 * @remarks Both paths await the same cached dummy initialization and invoke the library's
 * verify exactly once. No string/hash comparison replaces native verification. No logging
 * or writes. Comparable work does not guarantee identical end-to-end network timing.
 */
export async function verifyPassword(password: string, digest: string | null): Promise<boolean> {
  checkPassword(password);
  const dummy = await getDummyHash();
  try {
    const matches = await argon2.verify(digest ?? dummy, password);
    return digest !== null && matches;
  } catch {
    throw unavailable();
  }
}

/**
 * Perform reusable dummy verification for an unknown account, always returning false.
 * @param password Submitted password unchanged; same length validation as known accounts.
 * @returns False after one native Argon2 verification against the cached dummy digest.
 * @throws The same validation/service errors as verifyPassword.
 * @remarks Prefer verifyPassword(password, null) in the login service to keep one path.
 */
export async function verifyDummyPassword(password: string): Promise<boolean> {
  return verifyPassword(password, null);
}
