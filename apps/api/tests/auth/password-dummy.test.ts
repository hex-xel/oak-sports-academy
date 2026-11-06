import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ hash: vi.fn(), verify: vi.fn() }));
vi.mock("argon2", () => ({ argon2id: 2, hash: native.hash, verify: native.verify }));

beforeEach(() => {
  vi.resetModules();
  native.hash.mockReset().mockResolvedValue("synthetic-dummy-digest");
  native.verify.mockReset().mockResolvedValue(false);
});

describe("dummy work orchestration", () => {
  it("shares one initialization across concurrent calls and reuses it", async () => {
    const service = await import("../../src/modules/auth/password.service.js");
    await Promise.all([service.initializePasswordService(), service.initializePasswordService()]);
    await service.verifyDummyPassword("synthetic-input");
    await service.verifyDummyPassword("another-input");
    expect(native.hash).toHaveBeenCalledTimes(1);
    expect(native.hash).toHaveBeenCalledWith(expect.any(Buffer), { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    expect(native.verify).toHaveBeenCalledTimes(2);
  });

  it("performs one native verify for known and unknown accounts, never authenticating a dummy match", async () => {
    native.verify.mockResolvedValue(true);
    const service = await import("../../src/modules/auth/password.service.js");
    expect(await service.verifyPassword("synthetic-input", "synthetic-real-digest")).toBe(true);
    expect(await service.verifyPassword("synthetic-input", null)).toBe(false);
    expect(native.verify.mock.calls).toEqual([
      ["synthetic-real-digest", "synthetic-input"], ["synthetic-dummy-digest", "synthetic-input"],
    ]);
    expect(native.hash).toHaveBeenCalledTimes(1);
  });

  it("fails initialization safely and permits a later explicit retry", async () => {
    native.hash.mockRejectedValueOnce(new Error("DO_NOT_EXPOSE_NATIVE_DETAILS"));
    const service = await import("../../src/modules/auth/password.service.js");
    await expect(service.initializePasswordService()).rejects.toThrow("Password service unavailable.");
    await expect(service.initializePasswordService()).resolves.toBeUndefined();
    expect(native.hash).toHaveBeenCalledTimes(2);
  });

  it("does not invoke native methods for invalid input", async () => {
    const service = await import("../../src/modules/auth/password.service.js");
    await expect(service.verifyDummyPassword("")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(native.hash).not.toHaveBeenCalled();
    expect(native.verify).not.toHaveBeenCalled();
  });
});
