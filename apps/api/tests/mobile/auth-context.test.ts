import { describe, expect, it, vi } from "vitest";
vi.mock("../../../mobile/node_modules/expo-constants/build/Constants.js", () => ({ default: {} }));
vi.mock("expo-secure-store", () => ({}));
import { createAuthState } from "../../../mobile/lib/auth-context.js";
import { parseLoginResponse, parseSessionResponse } from "../../../mobile/lib/auth-response.js";
import { ApiClientError, createApiClient } from "../../../mobile/lib/api.js";
const response = { user: { id: "00000000-0000-4000-8000-000000000001", email: "synthetic@example.test",
  role: "STUDENT", status: "ACTIVE", passwordHash: "private" }, landingPath: "/", expiresAt: "2026-11-05T23:00:00.000Z", sessionToken: "a".repeat(64) };
function fixture(token: string | null = null) {
  const storage = { read: vi.fn().mockResolvedValue(token), write: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined) };
  return { storage, state: createAuthState(storage) };
}
describe("local auth lifecycle", () => {
  it("blocks login and restore after rejected-session deletion fails, then retries cleanup locally", async () => {
    const { storage } = fixture("saved");
    const revoke = vi.fn();
    const state = createAuthState(storage, vi.fn(), revoke);
    await state.signIn(response);
    storage.remove.mockRejectedValueOnce(new Error("private native detail"));
    await expect(state.captureUnauthorized()()).rejects.toHaveProperty("name", "TokenStorageError");
    expect(state.getSnapshot()).toMatchObject({ user: null, logoutCleanupFailed: true, sessionEnded: true });
    await expect(state.signIn(response)).rejects.toHaveProperty("name", "TokenStorageError");
    await state.restore();
    expect(storage.read).not.toHaveBeenCalled();
    expect(storage.write).toHaveBeenCalledTimes(1);
    await state.retryLogoutCleanup();
    expect(storage.remove).toHaveBeenCalledTimes(2);
    expect(revoke).not.toHaveBeenCalled();
    expect(state.getSnapshot()).toMatchObject({ status: "signedOut", storageError: false, sessionEnded: true });
    expect(state.getSnapshot().logoutCleanupFailed).toBeUndefined();
    await state.signIn(response);
    expect(state.getSnapshot().status).toBe("signedIn");
  });
  it("shows ended-session feedback for rejection and clears it after re-login or explicit logout", async () => {
    const { storage } = fixture("saved");
    const state = createAuthState(storage, vi.fn().mockRejectedValue(new ApiClientError("UNAUTHENTICATED", 401)),
      vi.fn().mockResolvedValue(undefined));
    await state.restore();
    expect(state.getSnapshot()).toMatchObject({ status: "signedOut", sessionEnded: true });
    await state.signIn(response);
    expect(state.getSnapshot().sessionEnded).toBeUndefined();
    await state.captureUnauthorized()();
    expect(state.getSnapshot().sessionEnded).toBe(true);
    await state.signIn(response);
    await state.signOut();
    expect(state.getSnapshot().sessionEnded).toBeUndefined();
  });
  it("finishes startup rejection and logout rejection without a transport/cleanup deadlock", async () => {
    const { storage } = fixture("saved");
    const client = createApiClient({ baseUrl: () => "https://synthetic.example.test/api/v1",
      readToken: storage.read, fetch: vi.fn().mockImplementation(async () => new Response("{}", { status: 401 })) });
    const state = createAuthState(storage, client.session, client.logout);
    client.setUnauthorizedHandler(state.captureUnauthorized);
    await state.restore();
    // Cleanup is queued behind restore; wait for the same invalidation operation.
    await state.invalidateSession();
    expect(state.getSnapshot().status).toBe("signedOut");
    expect(storage.remove).toHaveBeenCalledTimes(1);
    await state.signIn(response);
    await state.signOut();
    expect(state.getSnapshot()).toMatchObject({ status: "signedOut", logoutRemoteFailed: true });
    expect(storage.remove).toHaveBeenCalledTimes(2);
  });
  it("coalesces request-associated 401 cleanup and ignores a previous session's late rejection", async () => {
    const { storage, state } = fixture();
    await state.signIn(response);
    const old = state.captureUnauthorized();
    await state.signIn({ ...response, sessionToken: "b".repeat(64) });
    await old();
    expect(state.getSnapshot().status).toBe("signedIn");
    expect(storage.remove).not.toHaveBeenCalled();
    const first = state.captureUnauthorized();
    const second = state.captureUnauthorized();
    await Promise.all([first(), second()]);
    expect(state.getSnapshot().status).toBe("signedOut");
    expect(storage.remove).toHaveBeenCalledTimes(1);
  });
  it("coalesces startup/retry calls and exposes no identity before confirmation", async () => {
    const { storage } = fixture("saved");
    let finish!: (value: unknown) => void;
    const confirm = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const state = createAuthState(storage, confirm);
    const snapshots: string[] = [];
    state.subscribe(() => { snapshots.push(state.getSnapshot().status); });
    const first = state.restore();
    expect(state.restore()).toBe(first);
    await Promise.resolve(); await Promise.resolve();
    expect(state.getSnapshot()).toMatchObject({ status: "restoring", user: null });
    expect(storage.read).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledTimes(1);
    finish(response);
    await first;
    expect(snapshots).toEqual(["restoring", "signedIn"]);
    expect(storage.write).not.toHaveBeenCalled();
  });
  it("does not contact the server after a delayed read is superseded by sign-out", async () => {
    const { storage } = fixture();
    let finish!: (value: string) => void;
    storage.read.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const confirm = vi.fn();
    const state = createAuthState(storage, confirm, vi.fn().mockResolvedValue(undefined));
    const restoring = state.restore();
    await Promise.resolve();
    const logout = state.signOut();
    finish("saved");
    await Promise.all([restoring, logout]);
    expect(confirm).not.toHaveBeenCalled();
    expect(state.getSnapshot().status).toBe("signedOut");
  });
  it.each([new ApiClientError("NETWORK_ERROR"), new ApiClientError("INTERNAL_ERROR", 503),
    new ApiClientError("INVALID_RESPONSE"), new ApiClientError("TIMEOUT")])(
    "retains the saved token after a recoverable confirmation failure and retries explicitly: %s", async (error) => {
      const { storage } = fixture("saved");
      const confirm = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(response);
      const state = createAuthState(storage, confirm);
      await state.restore();
      expect(state.getSnapshot()).toEqual({ status: "restoring", user: null, storageError: false, restoreError: true });
      expect(storage.remove).not.toHaveBeenCalled();
      expect(confirm).toHaveBeenCalledTimes(1);
      await state.restore();
      expect(state.getSnapshot()).toMatchObject({ status: "signedIn", user: { role: "STUDENT" } });
      expect(confirm).toHaveBeenCalledTimes(2);
    });
  it("confirms saved identity, preserves tokens offline, and clears rejected tokens", async () => {
    const local = fixture("saved");
    const confirm = vi.fn().mockRejectedValueOnce(new ApiClientError("TIMEOUT"))
      .mockResolvedValueOnce(response).mockRejectedValueOnce(new ApiClientError("UNAUTHENTICATED", 401));
    const state = createAuthState(local.storage, confirm);
    await state.restore();
    expect(state.getSnapshot()).toMatchObject({ status: "restoring", restoreError: true });
    expect(local.storage.remove).not.toHaveBeenCalled();
    await state.restore();
    expect(state.getSnapshot()).toMatchObject({ status: "signedIn", user: { role: "STUDENT" } });
    await state.restore();
    expect(state.getSnapshot().status).toBe("signedOut");
    expect(local.storage.remove).toHaveBeenCalledTimes(1);
  });
  it("never restores a stale response after invalidation and surfaces failed rejection cleanup", async () => {
    const local = fixture("saved");
    let finish!: (value: unknown) => void;
    const confirm = vi.fn().mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const state = createAuthState(local.storage, confirm);
    const restoring = state.restore();
    await Promise.resolve(); await Promise.resolve();
    const invalidated = state.invalidateSession();
    finish(response);
    await Promise.all([restoring, invalidated]);
    expect(state.getSnapshot().status).toBe("signedOut");
    local.storage.remove.mockRejectedValueOnce(new Error("private"));
    confirm.mockRejectedValueOnce(new ApiClientError("UNAUTHENTICATED", 401));
    await expect(state.restore()).rejects.toHaveProperty("name", "TokenStorageError");
    expect(state.getSnapshot()).toMatchObject({ status: "restoring", storageError: true, user: null });
  });
  it("starts restoring, signs out only after a missing-token read and never trusts token presence", async () => {
    const absent = fixture();
    expect(absent.state.getSnapshot().status).toBe("restoring");
    await absent.state.restore();
    expect(absent.state.getSnapshot().status).toBe("signedOut");
    const saved = fixture("saved");
    await saved.state.restore();
    expect(saved.state.getSnapshot()).toMatchObject({ status: "restoring", user: null });
  });
  it("retains a recoverable restoring state on storage failure and permits retry", async () => {
    const { storage, state } = fixture();
    storage.read.mockRejectedValueOnce(new Error("private native error"));
    await expect(state.restore()).rejects.toHaveProperty("name", "TokenStorageError");
    expect(state.getSnapshot()).toEqual({ status: "restoring", user: null, storageError: true });
    expect(storage.remove).not.toHaveBeenCalled();
    await state.restore();
    expect(state.getSnapshot().status).toBe("signedOut");
  });
  it("waits for SecureStore before publishing a safe signedIn identity", async () => {
    const { storage, state } = fixture();
    let finish!: () => void;
    storage.write.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    const login = state.signIn(response);
    await Promise.resolve();
    expect(state.getSnapshot().status).toBe("restoring");
    finish(); await login;
    expect(state.getSnapshot().status).toBe("signedIn");
    expect(state.getSnapshot().user).not.toHaveProperty("passwordHash");
    expect(state.getSnapshot()).not.toHaveProperty("sessionToken");
  });
  it("fails closed on write or deletion failures and does not swallow them", async () => {
    const { storage, state } = fixture();
    storage.write.mockRejectedValueOnce(new Error("private"));
    await expect(state.signIn(response)).rejects.toHaveProperty("name", "TokenStorageError");
    expect(state.getSnapshot()).toMatchObject({ status: "signedOut", user: null, storageError: true });
    await state.signIn(response);
    storage.remove.mockRejectedValueOnce(new Error("private"));
    await expect(state.invalidateSession()).rejects.toHaveProperty("name", "TokenStorageError");
    expect(state.getSnapshot()).toMatchObject({ status: "signedOut", user: null, storageError: true });
    await state.retryLogoutCleanup();
    expect(storage.remove).toHaveBeenCalledTimes(2);
  });
  it("coalesces concurrent invalidations and prevents an in-flight login from reviving state", async () => {
    const { storage, state } = fixture();
    let finish!: () => void;
    storage.write.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    const login = state.signIn(response);
    await Promise.resolve();
    const first = state.invalidateSession();
    const second = state.invalidateSession();
    expect(first).toBe(second);
    finish(); await Promise.all([login, first, second]);
    expect(state.getSnapshot().status).toBe("signedOut");
    expect(storage.remove).toHaveBeenCalledTimes(1);
  });
  it("rejects unsupported native identities and projects unknown fields out of decoded responses", () => {
    for (const invalid of [null, {}, { ...response, user: { ...response.user, role: "ADMIN" } },
      { ...response, user: { ...response.user, status: "PENDING_APPROVAL" } }, { ...response, sessionToken: "invalid" },
      { ...response, landingPath: "https://evil.example" }, { ...response, expiresAt: "invalid" }]) {
      expect(() => parseLoginResponse(invalid)).toThrow();
    }
    const safe = parseSessionResponse(response);
    expect(safe).not.toHaveProperty("sessionToken");
    expect(safe.user).not.toHaveProperty("passwordHash");
  });
});
