import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword, initializePasswordService, verifyDummyPassword, verifyPassword } from "../../src/modules/auth/password.service.js";

// Synthetic test-only inputs; no actual account credentials or persisted hashes.
const password = "synthetic-password";

describe("Argon2id password service (real installed library)", () => {
  beforeAll(() => initializePasswordService());

  it("encodes the exact approved algorithm and work factors", async () => {
    const digest = await hashPassword(password);
    expect(digest).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await verifyPassword(password, digest)).toBe(true);
    expect(await verifyPassword("different-input", digest)).toBe(false);
  });

  it("uses independent library-generated salts for equal passwords", async () => {
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword(password, second)).toBe(true);
  });

  it("preserves whitespace and Unicode without trimming or normalization", async () => {
    const input = "  synthetic-é  ";
    const digest = await hashPassword(input);
    expect(await verifyPassword(input, digest)).toBe(true);
    expect(await verifyPassword(input.trim(), digest)).toBe(false);
    expect(await verifyPassword(input.normalize("NFD"), digest)).toBe(false);
  });

  it("accepts the 1 and 128 character login boundaries", async () => {
    for (const input of ["x", "x".repeat(128)]) {
      expect(await verifyPassword(input, await hashPassword(input))).toBe(true);
    }
  });

  it("rejects empty and oversized input consistently before native work", async () => {
    for (const input of ["", "x".repeat(129)]) {
      await expect(hashPassword(input)).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
      await expect(verifyPassword(input, null)).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
    }
  });

  it("returns false for unknown accounts via either public entry point", async () => {
    expect(await verifyPassword(password, null)).toBe(false);
    expect(await verifyDummyPassword(password)).toBe(false);
  });

  it("returns a safe operational error for a corrupted stored digest", async () => {
    await expect(verifyPassword(password, "not-an-encoded-digest")).rejects.toMatchObject({ message: "Password service unavailable." });
    try {
      await verifyPassword(password, "not-an-encoded-digest");
    } catch (error) {
      expect(error).not.toHaveProperty("cause");
      expect(String(error)).not.toContain(password);
    }
  });
});
