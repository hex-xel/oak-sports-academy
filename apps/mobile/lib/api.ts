import Constants from "expo-constants";
import { isErrorCode, type ErrorCode, type LoginRequest } from "@oak/shared";
import { getSessionToken } from "./token-store";

// Supplied by Metro; declaring locally also permits native-free contract typechecks.
declare const __DEV__: boolean;

/** Local transport/configuration failures are distinct from reviewed server codes. */
export type ClientErrorCode = ErrorCode | "NETWORK_ERROR" | "TIMEOUT" | "INVALID_RESPONSE" | "API_CONFIGURATION";

/** Safe client failure; never retains response text, request data or native causes. */
export class ApiClientError extends Error {
  /** Builds static feedback with HTTP status and the server's retry interval only. */
  constructor(readonly code: ClientErrorCode, readonly status = 0, readonly retryAfter: string | null = null) {
    super(code === "TIMEOUT" ? "The request timed out. Please try again."
      : code === "NETWORK_ERROR" ? "Unable to connect. Check your connection and try again."
      : "The request could not be completed. Please try again.");
    this.name = "ApiClientError";
  }
}

/**
 * Resolves an explicit API base, allowing an HTTP LAN override only in development.
 * @param configured Expo extra.apiUrl including /api/v1.
 * @param override Public development URL, never a credential or secret.
 * @param development Whether this is a development bundle.
 * @returns Validated base without a trailing slash.
 * @throws ApiClientError on missing, credential-bearing or unsafe URLs; no I/O.
 */
export function resolveApiUrl(configured: unknown, override: unknown, development: boolean): string {
  try {
    const value = development && override ? override : configured;
    if (typeof value !== "string" || value.includes("$") || value.trim() !== value) throw 0;
    const url = new URL(value);
    if ((url.protocol !== "https:" && !(development && url.protocol === "http:")) ||
      url.username || url.password || url.search || url.hash || url.pathname.replace(/\/$/, "") !== "/api/v1") throw 0;
    return url.toString().replace(/\/$/, "");
  } catch { throw new ApiClientError("API_CONFIGURATION"); }
}

/** Trusted runtime adapters; injection permits native-free tests without new dependencies. */
export type ApiClientOptions = Readonly<{
  baseUrl: () => string;
  fetch?: typeof fetch;
  readToken?: () => Promise<string | null>;
  timeoutMs?: number;
}>;

/**
 * Creates a JSON client with one bounded attempt per explicit call and no replay.
 * @param options Trusted configuration and optional test adapters (1–30 second timeout).
 * @returns login/session/logout plus a generic validated-path JSON request.
 * @throws ApiClientError for config/network/HTTP/decoding failures; storage errors propagate.
 * @remarks Only authenticated calls read SecureStore. No cookies, logging or mutation
 * retry; callers explicitly retry after cold starts/Retry-After. Includes body decoding
 * in the timeout. A response remains unknown until the caller validates it at runtime.
 */
export function createApiClient(options: ApiClientOptions) {
  let unauthorized: (() => () => Promise<void>) | undefined;
  const timeoutMs = options.timeoutMs ?? 10_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 30_000) throw new ApiClientError("API_CONFIGURATION");
  async function request(path: string, method: "GET" | "POST", body?: unknown, authenticated = true): Promise<unknown> {
    if (!/^\/[a-zA-Z0-9/_-]+$/.test(path)) throw new ApiClientError("API_CONFIGURATION");
    const base = options.baseUrl();
    const rejectSession = authenticated ? unauthorized?.() : undefined;
    const invalidate = () => {
      // Cleanup may queue behind restoration, which is awaiting this request.
      // Hide identity synchronously, but never await that queue from transport.
      void rejectSession?.().catch(() => { /* Auth state exposes secure cleanup failure. */ });
    };
    const token = authenticated ? await (options.readToken ?? getSessionToken)() : null;
    if (authenticated && (!token || !/^[A-Za-z0-9._~+/-]+=*$/.test(token))) {
      invalidate();
      throw new ApiClientError("UNAUTHENTICATED", 401);
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new ApiClientError("TIMEOUT"));
      }, timeoutMs);
    });
    const run = async (): Promise<unknown> => {
      const response = await (options.fetch ?? fetch)(`${base}${path}`, {
        method, signal: controller.signal, credentials: "omit", redirect: "error",
        headers: { Accept: "application/json", "Content-Type": "application/json",
          ...(path === "/auth/login" ? { "X-Client-Platform": "mobile" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (path === "/auth/logout" && response.ok && response.status !== 204) {
        throw new ApiClientError("INVALID_RESPONSE", response.status);
      }
      let decoded: unknown;
      if (response.status !== 204) {
        try { decoded = await response.json(); }
        catch {
          if (response.ok) throw new ApiClientError("INVALID_RESPONSE", response.status);
        }
      }
      if (!response.ok) {
        const code = decoded && typeof decoded === "object" && "code" in decoded && isErrorCode(decoded.code)
          ? decoded.code : "INTERNAL_ERROR";
        throw new ApiClientError(code, response.status, response.headers.get("Retry-After"));
      }
      return decoded;
    };
    try { return await Promise.race([run(), deadline]); }
    catch (error) {
      if (error instanceof ApiClientError && error.status === 401) invalidate();
      if (error instanceof ApiClientError) throw error;
      throw new ApiClientError("NETWORK_ERROR");
    } finally { clearTimeout(timer); }
  }
  return {
    /** Registers a provider-owned request-generation capture; cleanup only removes this registration. */
    setUnauthorizedHandler: (handler: () => () => Promise<void>) => {
      unauthorized = handler;
      return () => { if (unauthorized === handler) unauthorized = undefined; };
    },
    request,
    login: (credentials: LoginRequest) => request("/auth/login", "POST", {
      email: credentials.email, password: credentials.password,
    }, false),
    session: () => request("/auth/session", "GET"),
    logout: () => request("/auth/logout", "POST"),
  };
}

/** Native client; configuration is resolved on demand, never by contacting a database. */
export const api = createApiClient({ baseUrl: () => resolveApiUrl(
  Constants.expoConfig?.extra?.["apiUrl"], process.env.EXPO_PUBLIC_API_URL,
  typeof __DEV__ !== "undefined" && __DEV__,
) });
