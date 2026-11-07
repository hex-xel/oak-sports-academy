import Constants from "expo-constants";
import { isErrorCode, type RegistrationStartRequest, type RegistrationStartResponse,
  type RegistrationVerifyResponse, type RegistrationProgressResponse } from "@oak/shared";
import { ApiClientError, resolveApiUrl } from "./api";

declare const __DEV__: boolean;
const proof = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiClientError("INVALID_RESPONSE");
  return value as Record<string, unknown>;
};
function date(value: unknown): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new ApiClientError("INVALID_RESPONSE");
  }
  return value;
}
function token(value: unknown): string {
  if (typeof value !== "string" || !proof.test(value)) throw new ApiClientError("INVALID_RESPONSE");
  return value;
}

/**
 * Project a server real/decoy flow without I/O or retaining extra fields.
 * @param value Untrusted decoded JSON.
 * @returns Validated credential-stage proof/timing DTO.
 * @throws ApiClientError/INVALID_RESPONSE on malformed values.
 */
export function parseRegistrationFlow(value: unknown): RegistrationStartResponse {
  const row = object(value);
  if (row.next !== "verify-email" || row.delivery !== "unconfirmed" || typeof row.challengeId !== "string" || !uuid.test(row.challengeId)) {
    throw new ApiClientError("INVALID_RESPONSE");
  }
  return { registrationToken: token(row.registrationToken), challengeId: row.challengeId,
    codeExpiresAt: date(row.codeExpiresAt), resendAfter: date(row.resendAfter),
    registrationExpiresAt: date(row.registrationExpiresAt), next: "verify-email", delivery: "unconfirmed" };
}

/**
 * Project server verification only; cached email flags are never authority.
 * @param value Untrusted decoded JSON.
 * @returns Verified registration-only proof, without a login identity.
 * @throws ApiClientError/INVALID_RESPONSE on malformed values. No I/O or logging.
 */
export function parseRegistrationVerification(value: unknown): RegistrationVerifyResponse {
  const row = object(value);
  if (row.verified !== true || row.next !== "complete-profile") throw new ApiClientError("INVALID_RESPONSE");
  return { verified: true, next: "complete-profile", registrationToken: token(row.registrationToken),
    registrationExpiresAt: date(row.registrationExpiresAt) };
}

/**
 * Project bounded progress/receipt without proof, file keys or account rows.
 * @param value Untrusted decoded JSON.
 * @returns Explicit next-step DTO only.
 * @throws ApiClientError/INVALID_RESPONSE on malformed values. No I/O or logging.
 */
export function parseRegistrationProgress(value: unknown): RegistrationProgressResponse {
  const row = object(value);
  if (row.next === "verify-email" && row.verified === false) return { next: "verify-email", verified: false };
  if (row.next === "complete-profile" && row.verified === true) return { next: "complete-profile", verified: true };
  if (row.next === "await-assessment" && row.verified === true) {
    const receipt = object(row.receipt);
    if (typeof receipt.receiptId !== "string" || !uuid.test(receipt.receiptId) || receipt.status !== "New") throw new ApiClientError("INVALID_RESPONSE");
    return { next: "await-assessment", verified: true, receipt: { receiptId: receipt.receiptId,
      status: "New", submittedAt: date(receipt.submittedAt) } };
  }
  throw new ApiClientError("INVALID_RESPONSE");
}

/** Native-free transport seam; there is deliberately no session-token or invalidation adapter. */
export type RegistrationApiOptions = Readonly<{ baseUrl: () => string; fetch?: typeof fetch; timeoutMs?: number }>;

/**
 * Create an independent registration JSON transport with one attempt per explicit action.
 * @param options Trusted base URL and optional test transport/deadline.
 * @returns Start/verify/resend/progress methods with runtime-validated DTOs.
 * @throws Safe ApiClientError for HTTP/network/timeout/shape failures; no raw causes.
 * @remarks Never reads or invalidates login storage, sends Bearer/cookies, logs credentials,
 * or retries mutations. The deadline includes JSON decoding; decoded text is size-checked.
 */
export function createRegistrationApi(options: RegistrationApiOptions) {
  const timeoutMs = options.timeoutMs ?? 10_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 30_000) throw new ApiClientError("API_CONFIGURATION");
  async function request(path: string, method: "GET" | "POST", body?: unknown, registrationToken?: string): Promise<unknown> {
    const base = options.baseUrl();
    if (registrationToken !== undefined) token(registrationToken);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const work = async () => {
      const response = await (options.fetch ?? fetch)(`${base}/registrations/${path}`, {
        method, credentials: "omit", redirect: "error", signal: controller.signal,
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-Client-Platform": "mobile",
          ...(registrationToken ? { "X-Registration-Token": registrationToken } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      let decoded: unknown;
      try {
        const text = await response.text();
        if (text.length > 10_240) throw new ApiClientError("INVALID_RESPONSE");
        decoded = JSON.parse(text);
      } catch {
        if (response.ok) throw new ApiClientError("INVALID_RESPONSE", response.status);
      }
      if (!response.ok) {
        const row = decoded && typeof decoded === "object" && "code" in decoded ? decoded : null;
        throw new ApiClientError(row && isErrorCode(row.code) ? row.code : "INTERNAL_ERROR",
          response.status, response.headers.get("Retry-After"));
      }
      return decoded;
    };
    try {
      return await Promise.race([work(), new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new ApiClientError("TIMEOUT")); }, timeoutMs);
      })]);
    } catch (error) {
      controller.abort();
      if (error instanceof ApiClientError) throw error;
      throw new ApiClientError("NETWORK_ERROR");
    } finally { if (timer !== undefined) clearTimeout(timer); }
  }
  return {
    /** Send only credential DTO fields; no confirmation password or authority claims. */
    start: async (input: RegistrationStartRequest) => parseRegistrationFlow(await request("start", "POST", {
      operationId: input.operationId, studentType: input.studentType, email: input.email, password: input.password,
    })),
    /** Verify once using only registration proof; does not log in the student. */
    verify: async (registrationToken: string, challengeId: string, code: string) =>
      parseRegistrationVerification(await request("verify-email", "POST", { challengeId, code }, registrationToken)),
    /** Explicit resend with a fresh operation ID; never automatically replays on failure. */
    resend: async (registrationToken: string, challengeId: string, operationId: string) =>
      parseRegistrationFlow(await request("resend-code", "POST", { challengeId, operationId }, registrationToken)),
    /** Nonrenewing server progress check; no token/profile echo is accepted. */
    current: async (registrationToken: string) => parseRegistrationProgress(await request("current", "GET", undefined, registrationToken)),
  };
}

/** Native registration client, separate from the login client's unauthorized handler. */
export const registrationApi = createRegistrationApi({ baseUrl: () => resolveApiUrl(
  Constants.expoConfig?.extra?.["apiUrl"], process.env.EXPO_PUBLIC_API_URL,
  typeof __DEV__ !== "undefined" && __DEV__,
) });
