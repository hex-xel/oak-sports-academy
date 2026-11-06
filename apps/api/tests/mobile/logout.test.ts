import { describe, expect, it, vi } from "vitest";
vi.mock("../../../mobile/node_modules/expo-constants/build/Constants.js", () => ({ default: {} }));
vi.mock("expo-secure-store", () => ({}));
import { createAuthState } from "../../../mobile/lib/auth-context.js";
import { ApiClientError } from "../../../mobile/lib/api.js";

const response = { user: { id: "00000000-0000-4000-8000-000000000001", email: "synthetic@example.test",
  role: "STUDENT", status: "ACTIVE" }, landingPath: "/", expiresAt: "2026-11-06T23:00:00.000Z", sessionToken: "a".repeat(64) };
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((finish) => { resolve = finish; });
  return { promise, resolve };
}
function fixture(revoke = vi.fn<() => Promise<unknown>>().mockResolvedValue(undefined)) {
  const storage = { read: vi.fn().mockResolvedValue("saved"), write: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined) };
  return { revoke, storage, state: createAuthState(storage, undefined, revoke) };
}

describe("remote logout with secure cleanup", () => {
  it("hides identity immediately, coalesces taps and waits for revocation before deletion", async () => {
    const remote = deferred();
    const local = fixture(vi.fn().mockReturnValue(remote.promise));
    await local.state.signIn(response);
    const first = local.state.signOut();
    const second = local.state.signOut();
    expect(first).toBe(second);
    expect(local.state.getSnapshot()).toMatchObject({ status: "signedOut", user: null, logoutPending: true });
    await vi.waitFor(() => expect(local.revoke).toHaveBeenCalledTimes(1));
    expect(local.storage.remove).not.toHaveBeenCalled();
    await expect(local.state.signIn(response)).rejects.toHaveProperty("name", "TokenStorageError");
    await local.state.restore();
    expect(local.storage.read).not.toHaveBeenCalled();
    remote.resolve(); await first;
    expect(local.storage.remove).toHaveBeenCalledTimes(1);
    expect(local.state.getSnapshot()).toEqual({ status: "signedOut", user: null, storageError: false });
  });

  it.each(["NETWORK_ERROR", "TIMEOUT", "INTERNAL_ERROR"] as const)("cleans up after %s and reports only unconfirmed remote logout", async (code) => {
    const local = fixture(vi.fn().mockRejectedValue(new ApiClientError(code)));
    await local.state.signIn(response);
    await expect(local.state.signOut()).resolves.toBeUndefined();
    expect(local.storage.remove).toHaveBeenCalledTimes(1);
    expect(local.revoke).toHaveBeenCalledTimes(1);
    expect(local.state.getSnapshot()).toEqual({ status: "signedOut", user: null, storageError: false, logoutRemoteFailed: true });
  });

  it("blocks sign-in/restore after deletion failure and retries only local cleanup", async () => {
    const local = fixture();
    await local.state.signIn(response);
    local.storage.remove.mockRejectedValueOnce(new Error("private native detail"));
    await expect(local.state.signOut()).rejects.toMatchObject({ name: "TokenStorageError" });
    expect(local.state.getSnapshot()).toEqual({ status: "signedOut", user: null, storageError: true, logoutCleanupFailed: true });
    await local.state.restore();
    await local.state.invalidateSession();
    await expect(local.state.signIn(response)).rejects.toHaveProperty("name", "TokenStorageError");
    expect(local.storage.read).not.toHaveBeenCalled();
    expect(local.storage.write).toHaveBeenCalledTimes(1);
    await local.state.retryLogoutCleanup();
    expect(local.storage.remove).toHaveBeenCalledTimes(2);
    expect(local.revoke).toHaveBeenCalledTimes(1);
    expect(local.state.getSnapshot()).toEqual({ status: "signedOut", user: null, storageError: false });
    await local.state.signIn(response);
    expect(local.state.getSnapshot().status).toBe("signedIn");
  });

  it("retains the remote warning through a failed delete and coalesces cleanup retries", async () => {
    const local = fixture(vi.fn().mockRejectedValue(new Error("private remote detail")));
    local.storage.remove.mockRejectedValueOnce(new Error("private storage detail"));
    await expect(local.state.signOut()).rejects.toHaveProperty("name", "TokenStorageError");
    expect(local.state.getSnapshot()).toMatchObject({ logoutCleanupFailed: true, logoutRemoteFailed: true });
    const cleanup = deferred();
    local.storage.remove.mockReturnValueOnce(cleanup.promise);
    const first = local.state.retryLogoutCleanup();
    expect(local.state.retryLogoutCleanup()).toBe(first);
    expect(local.state.getSnapshot().logoutPending).toBe(true);
    cleanup.resolve(); await first;
    expect(local.revoke).toHaveBeenCalledTimes(1);
    expect(local.state.getSnapshot()).toEqual({ status: "signedOut", user: null, storageError: false, logoutRemoteFailed: true });
  });

  it("waits behind an in-flight secure write then revokes and clears without reviving identity", async () => {
    const order: string[] = [];
    const write = deferred();
    const local = fixture(vi.fn().mockImplementation(async () => { order.push("revoke"); }));
    local.storage.write.mockImplementationOnce(async () => { await write.promise; order.push("write"); });
    local.storage.remove.mockImplementationOnce(async () => { order.push("remove"); });
    const signIn = local.state.signIn(response);
    await vi.waitFor(() => expect(local.storage.write).toHaveBeenCalledTimes(1));
    const signOut = local.state.signOut();
    expect(local.revoke).not.toHaveBeenCalled();
    write.resolve();
    await Promise.all([signIn, signOut]);
    expect(order).toEqual(["write", "revoke", "remove"]);
    expect(local.state.getSnapshot().status).toBe("signedOut");
  });

  it("suppresses stale restore identity and avoids deadlock with concurrent local invalidation", async () => {
    const restore = deferred();
    const local = fixture(vi.fn().mockImplementation(async () => { await state.invalidateSession(); }));
    const confirm = vi.fn().mockImplementation(async () => { await restore.promise; return response; });
    const state = createAuthState(local.storage, confirm, local.revoke);
    const statuses: string[] = [];
    state.subscribe(() => statuses.push(state.getSnapshot().status));
    const restoring = state.restore();
    await vi.waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    const signingOut = state.signOut();
    restore.resolve();
    await Promise.all([restoring, signingOut]);
    expect(statuses).not.toContain("signedIn");
    expect(local.storage.remove).toHaveBeenCalledTimes(1);
    expect(state.getSnapshot().status).toBe("signedOut");
  });
});
