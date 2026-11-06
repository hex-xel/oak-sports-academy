import { describe, expect, it, vi } from "vitest";
vi.mock("../../../mobile/node_modules/expo-constants/build/Constants.js", () => ({ default: {} }));
vi.mock("expo-secure-store", () => ({}));
import { ApiClientError } from "../../../mobile/lib/api.js";
import { TokenStorageError } from "../../../mobile/lib/token-store.js";
import { intendedRoute, recoveryDestination, SESSION_ENDED_MESSAGE, loginMessage, retryDeadline } from "../../../mobile/features/auth/messages.js";

describe("safe login feedback and explicit wait", () => {
  it("allows only the implemented internal route and rechecks current Student eligibility", () => {
    const student = { id: "synthetic", email: "s@example.test", role: "STUDENT", status: "ACTIVE" } as const;
    expect(intendedRoute("/")).toBe("/");
    for (const value of [undefined, null, ["/"], "//evil.example", "https://evil.example", "/login",
      "/register", "/admin", "/?token=secret", "/#secret", "/%2fexample", " /", "\\evil"]) {
      expect(intendedRoute(value)).toBeUndefined();
      expect(recoveryDestination(value, student)).toBe("/");
    }
    expect(recoveryDestination("/", null)).toBeUndefined();
    expect(recoveryDestination("/", { ...student, role: "ADMIN" })).toBeUndefined();
    expect(recoveryDestination("/", { ...student, status: "SUSPENDED" })).toBeUndefined();
    expect(SESSION_ENDED_MESSAGE).toBe("Your session has ended. Please log in again to continue.");
  });
  it("uses reviewed feedback without displaying arbitrary native/server text", () => {
    expect(loginMessage(new ApiClientError("INVALID_CREDENTIALS", 401))).toBe("Email or password is incorrect.");
    expect(loginMessage(new Error("private SQL password"))).not.toContain("private");
    expect(loginMessage(new TokenStorageError())).toContain("securely");
    expect(loginMessage(new ApiClientError("TIMEOUT"))).toContain("Tap Log in");
    expect(loginMessage(new ApiClientError("NETWORK_ERROR"))).toContain("connection");
    expect(loginMessage(new ApiClientError("ACCOUNT_PENDING_APPROVAL"))).toContain("approval");
  });
  it("honors seconds/date Retry-After and safely bounds missing or invalid input", () => {
    const now = Date.parse("2026-11-05T00:00:00Z");
    expect(retryDeadline("60", now)).toBe(now + 60_000);
    expect(retryDeadline("Thu, 05 Nov 2026 00:01:00 GMT", now)).toBe(now + 60_000);
    expect(retryDeadline(null, now)).toBe(now + 900_000);
    expect(retryDeadline("invalid", now)).toBe(now + 900_000);
    expect(retryDeadline("0", now)).toBe(now);
  });
});
