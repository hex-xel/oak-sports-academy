import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() }));
vi.mock("expo-secure-store", () => ({
  getItemAsync: native.get,
  setItemAsync: native.set,
  deleteItemAsync: native.remove,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
}));

import {
  deleteSessionToken, getSessionToken, setSessionToken, TokenStorageError,
} from "../../../mobile/lib/token-store.js";

describe("mobile secure token storage", () => {
  beforeEach(() => {
    native.get.mockReset();
    native.set.mockReset();
    native.remove.mockReset();
  });

  it("round-trips the exact opaque token and deletes through the same secure key", async () => {
    const entries = new Map<string, string>();
    native.set.mockImplementation(async (key: string, value: string) => { entries.set(key, value); });
    native.get.mockImplementation(async (key: string) => entries.get(key) ?? null);
    native.remove.mockImplementation(async (key: string) => { entries.delete(key); });
    expect(await getSessionToken()).toBeNull();
    await setSessionToken("synthetic-opaque-token");
    expect(await getSessionToken()).toBe("synthetic-opaque-token");
    expect(native.set).toHaveBeenCalledWith(expect.any(String), "synthetic-opaque-token", {
      keychainAccessible: 6,
    });
    await deleteSessionToken();
    expect(await getSessionToken()).toBeNull();
    await expect(deleteSessionToken()).resolves.toBeUndefined();
  });

  it("waits for a native write before reporting persistence", async () => {
    let finish!: () => void;
    native.set.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    let settled = false;
    const write = setSessionToken("synthetic").then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    finish();
    await write;
    expect(settled).toBe(true);
  });

  it.each(["read", "write", "delete"] as const)("sanitizes %s failures without logging or cleanup", async (operation) => {
    const logs = ["log", "warn", "error", "info", "debug"] as const;
    const spies = logs.map((method) => vi.spyOn(console, method).mockImplementation(() => {}));
    const rawError = new Error("native diagnostic with synthetic secret");
    const mock = operation === "read" ? native.get : operation === "write" ? native.set : native.remove;
    mock.mockRejectedValue(rawError);
    const action = operation === "read" ? getSessionToken : operation === "write"
      ? () => setSessionToken("synthetic") : deleteSessionToken;
    const failure: unknown = await action().catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(TokenStorageError);
    expect(failure).not.toBe(rawError);
    expect(String(failure)).not.toContain("synthetic secret");
    expect(failure).not.toHaveProperty("cause");
    expect(native.get).toHaveBeenCalledTimes(operation === "read" ? 1 : 0);
    expect(native.set).toHaveBeenCalledTimes(operation === "write" ? 1 : 0);
    expect(native.remove).toHaveBeenCalledTimes(operation === "delete" ? 1 : 0);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it("sanitizes a synchronous native bridge failure", async () => {
    native.get.mockImplementation(() => { throw new Error("private native details"); });
    await expect(getSessionToken()).rejects.toThrow(TokenStorageError);
    expect(native.remove).not.toHaveBeenCalled();
  });

  it("rejects an empty token without changing secure storage", async () => {
    await expect(setSessionToken("")).rejects.toThrow(TokenStorageError);
    expect(native.set).not.toHaveBeenCalled();
    expect(native.remove).not.toHaveBeenCalled();
  });
});
