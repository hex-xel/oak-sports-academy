import { describe, expect, it, vi } from "vitest";
vi.mock("../../../mobile/node_modules/expo-constants/build/Constants.js", () => ({ default: {} }));
vi.mock("expo-secure-store", () => ({}));
import { createAuthState } from "../../../mobile/lib/auth-context.js";
import { parseLoginResponse, parseSessionResponse } from "../../../mobile/lib/auth-response.js";
const response = { user: { id: "00000000-0000-4000-8000-000000000001", email: "synthetic@example.test",
  role: "STUDENT", status: "ACTIVE", passwordHash: "private" }, landingPath: "/", expiresAt: "2026-11-05T23:00:00.000Z", sessionToken: "a".repeat(64) };
function fixture(token: string | null = null) {
  const storage = { read: vi.fn().mockResolvedValue(token), write: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined) };
  return { storage, state: createAuthState(storage) };
}
describe("local auth lifecycle", () => {
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
    await state.invalidateSession();
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
