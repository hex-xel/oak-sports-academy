import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RegistrationStartResponse } from "@oak/shared";

const native = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() }));
vi.mock("expo-secure-store", () => ({ getItemAsync: native.get, setItemAsync: native.set,
  deleteItemAsync: native.remove, WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6 }));
// Mock the workspace-resolved entry, as in api/auth-context tests; the bare package
// specifier resolves differently from apps/api and otherwise loads Expo's native graph.
vi.mock("../../../mobile/node_modules/expo-constants/build/Constants.js", () => ({ default: { expoConfig: { extra: { apiUrl: "https://api.example.test/api/v1" } } } }));
import { api, ApiClientError } from "../../../mobile/lib/api.js";
import { createRegistrationApi, parseRegistrationVerification } from "../../../mobile/lib/registration-api.js";
import { readRegistration, writeRegistration, removeRegistration, RegistrationStorageError,
  type SavedRegistration } from "../../../mobile/lib/registration-store.js";
import { createRegistrationState } from "../../../mobile/features/registration/registration-state.js";

const operationId = "00000000-0000-4000-8000-000000000101";
const token = "A".repeat(43);
const rotated = "E".repeat(43);
const flow: RegistrationStartResponse = { registrationToken: token, challengeId: operationId,
  codeExpiresAt: "2026-11-07T12:10:00.000Z", resendAfter: "2026-11-07T12:01:00.000Z",
  registrationExpiresAt: "2026-11-07T13:00:00.000Z", next: "verify-email", delivery: "unconfirmed" };
const saved: SavedRegistration = { operationId, email: "synthetic@example.test", studentType: "experienced", flow };

beforeEach(() => {
  native.get.mockReset().mockResolvedValue(null);
  native.set.mockReset().mockResolvedValue(undefined);
  native.remove.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe("independent mobile registration transport/storage", () => {
  it("sends only registration headers and preserves ordinary login on a registration 401", async () => {
    const invalidate = vi.fn(async () => {});
    const capture = vi.fn(() => invalidate);
    const unsubscribe = api.setUnauthorizedHandler(capture);
    try {
      const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"code":"REGISTRATION_EXPIRED","message":"private"}', { status: 401 }));
      const client = createRegistrationApi({ baseUrl: () => "https://api.example.test/api/v1", fetch: transport });
      await expect(client.current(token)).rejects.toMatchObject({ code: "REGISTRATION_EXPIRED", status: 401 });
      expect(capture).not.toHaveBeenCalled(); expect(invalidate).not.toHaveBeenCalled();
      expect(native.get).not.toHaveBeenCalled(); expect(native.remove).not.toHaveBeenCalled();
      const options = transport.mock.calls[0]?.[1];
      expect(options?.headers).toMatchObject({ "X-Client-Platform": "mobile", "X-Registration-Token": token });
      expect(options?.headers).not.toHaveProperty("Authorization"); expect(options?.credentials).toBe("omit");
    } finally { unsubscribe(); }
  });

  it("validates server verification and bounds a stalled request without automatic retry", async () => {
    expect(() => parseRegistrationVerification({ verified: true })).toThrow(ApiClientError);
    vi.useFakeTimers();
    const transport = vi.fn<typeof fetch>().mockImplementation(() => new Promise<Response>(() => {}));
    const client = createRegistrationApi({ baseUrl: () => "https://api.example.test/api/v1", fetch: transport, timeoutMs: 1000 });
    const assertion = expect(client.current(token)).rejects.toMatchObject({ code: "TIMEOUT" });
    await vi.advanceTimersByTimeAsync(1000); await assertion;
    expect(transport).toHaveBeenCalledTimes(1); expect(transport.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it("uses a separate secure key, saves no credentials/profile, and surfaces native failure safely", async () => {
    await writeRegistration(saved);
    expect(native.set.mock.calls[0]?.[0]).toBe("oak.registration.flow");
    expect(JSON.parse(native.set.mock.calls[0]?.[1])).toEqual(saved);
    const unsafe = { ...saved, password: "private-password" };
    await expect(writeRegistration(unsafe as SavedRegistration)).rejects.toBeInstanceOf(RegistrationStorageError);
    expect(native.set).toHaveBeenCalledTimes(1);
    native.get.mockResolvedValueOnce(JSON.stringify(saved));
    expect(await readRegistration()).toEqual(saved);
    native.get.mockRejectedValueOnce(new Error("private-native-value"));
    await expect(readRegistration()).rejects.toThrow("Secure registration storage");
    await removeRegistration();
    expect(native.remove).toHaveBeenCalledWith("oak.registration.flow");
  });
});

function lifecycle() {
  const backend = {
    start: vi.fn<ReturnType<typeof createRegistrationApi>["start"]>().mockResolvedValue(flow),
    verify: vi.fn<ReturnType<typeof createRegistrationApi>["verify"]>().mockResolvedValue({ verified: true,
      registrationToken: rotated, registrationExpiresAt: flow.registrationExpiresAt, next: "complete-profile" }),
    resend: vi.fn<ReturnType<typeof createRegistrationApi>["resend"]>().mockResolvedValue({ ...flow, registrationToken: rotated }),
    current: vi.fn<ReturnType<typeof createRegistrationApi>["current"]>().mockResolvedValue({ next: "verify-email", verified: false }),
  };
  const storage = { read: vi.fn(async (): Promise<SavedRegistration | null> => null),
    write: vi.fn(async (_value: SavedRegistration): Promise<void> => {}), remove: vi.fn(async (): Promise<void> => {}) };
  const state = createRegistrationState({ api: backend, storage, newId: () => operationId });
  return { state, backend, storage };
}

describe("mobile registration lifecycle", () => {
  it("persists operation before dispatch, excludes password and verifies only after a server result/write", async () => {
    const { state, backend, storage } = lifecycle();
    await state.restore();
    expect(await state.start(saved.email, saved.studentType, "Synthetic-Only1!")).toBe(true);
    expect(storage.write.mock.calls[0]?.[0]).toEqual({ operationId, email: saved.email, studentType: saved.studentType });
    expect(storage.write.mock.invocationCallOrder[0]).toBeLessThan(backend.start.mock.invocationCallOrder[0]!);
    expect(state.getSnapshot().verified).toBe(false);
    expect(await state.verify("012345")).toBe(true);
    expect(state.getSnapshot().verified).toBe(true);
    expect(state.getSnapshot().saved?.flow?.registrationToken).toBe(rotated);
    expect(JSON.stringify(storage.write.mock.calls)).not.toContain("Synthetic-Only1!");
    expect(JSON.stringify(storage.write.mock.calls)).not.toContain("012345");
  });

  it("discards a late start response after account reset and prevents double submission", async () => {
    const { state, backend, storage } = lifecycle();
    let finish: ((value: RegistrationStartResponse) => void) | undefined;
    backend.start.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await state.restore();
    const first = state.start(saved.email, saved.studentType, "Synthetic-Only1!");
    await vi.waitFor(() => expect(backend.start).toHaveBeenCalledTimes(1));
    expect(await state.start(saved.email, saved.studentType, "Synthetic-Only1!")).toBe(false);
    await state.reset(); finish?.(flow); await first;
    expect(state.getSnapshot().saved).toBeNull(); expect(state.getSnapshot().verified).toBe(false);
    expect(storage.write.mock.calls.every(call => !call[0].flow)).toBe(true);
    expect(storage.remove).toHaveBeenCalledTimes(1);
  });

  it("blocks advancement after a rotated proof write fails and retries storage without replaying OTP", async () => {
    const { state, backend, storage } = lifecycle();
    await state.restore(); await state.start(saved.email, saved.studentType, "Synthetic-Only1!");
    storage.write.mockRejectedValueOnce(new Error("private-native-detail"));
    expect(await state.verify("012345")).toBe(false);
    expect(state.getSnapshot()).toMatchObject({ verified: false, storageError: true });
    backend.current.mockResolvedValueOnce({ next: "complete-profile", verified: true });
    expect(await state.retryStorage()).toBe(true); expect(state.getSnapshot().verified).toBe(true);
    expect(backend.verify).toHaveBeenCalledTimes(1);
  });

  it("reconfirms restored proof, retains safe context on transient failures and never treats cache as verified", async () => {
    const { state, backend, storage } = lifecycle();
    storage.read.mockResolvedValue(saved);
    backend.current.mockRejectedValueOnce(new ApiClientError("NETWORK_ERROR"));
    expect(await state.restore()).toBe(false);
    expect(state.getSnapshot()).toMatchObject({ verified: false, needsConfirmation: true, saved });
    expect(storage.remove).not.toHaveBeenCalled();
    backend.current.mockResolvedValueOnce({ next: "complete-profile", verified: true });
    expect(await state.restore()).toBe(true); expect(state.getSnapshot().verified).toBe(true);
    expect(backend.start).not.toHaveBeenCalled(); expect(backend.verify).not.toHaveBeenCalled();
  });

  it("blocks a new flow until failed registration deletion succeeds", async () => {
    const { state, backend, storage } = lifecycle();
    await state.restore(); storage.remove.mockRejectedValueOnce(new Error("private-native-detail"));
    expect(await state.reset()).toBe(false);
    expect(await state.start(saved.email, saved.studentType, "Synthetic-Only1!")).toBe(false);
    expect(backend.start).not.toHaveBeenCalled();
    expect(await state.retryStorage()).toBe(true); expect(state.getSnapshot().storageError).toBe(false);
  });
});
