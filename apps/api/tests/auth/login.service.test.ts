import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ verify: vi.fn(), query: vi.fn(), execute: vi.fn(), transaction: vi.fn() }));
vi.mock("../../src/lib/prisma.js", () => ({ prisma: { $queryRaw: mocks.query, $executeRaw: mocks.execute, $transaction: mocks.transaction } }));
vi.mock("../../src/modules/auth/password.service.js", () => ({ verifyPassword: mocks.verify }));
import { login } from "../../src/modules/auth/auth.service.js";

const account = { id: "00000000-0000-4000-8000-000000000001", email: "synthetic@example.test",
  passwordHash: "private-digest", role: "STUDENT", status: "ACTIVE", emailVerifiedAt: new Date() };
let found: Record<string, unknown> | null;
const expiry = new Date("2026-11-05T23:00:00.000Z");
beforeEach(() => {
  vi.clearAllMocks();
  found = { ...account };
  mocks.verify.mockImplementation(async (_password, digest) => digest !== null);
  mocks.execute.mockResolvedValue(1);
  mocks.query.mockImplementation(async (sql: TemplateStringsArray) => sql.join("").includes("oak_auth_lookup") ? (found ? [found] : []) : [{ expiresAt: expiry }]);
  mocks.transaction.mockImplementation(async (work) => work({ $queryRaw: mocks.query, $executeRaw: mocks.execute }));
});
const attemptValues = () => mocks.execute.mock.calls.map((args) => args.slice(1));
describe("native Student login orchestration", () => {
  it("normalizes email, preserves password, returns only safe fields and stores only the session hash", async () => {
    const result = await login({ email: " Synthetic@Example.Test ", password: " x " }, { ipAddress: "127.0.0.1" });
    expect(mocks.verify).toHaveBeenCalledTimes(1);
    expect(mocks.verify).toHaveBeenCalledWith(" x ", "private-digest");
    expect(mocks.query.mock.calls[0]?.slice(1)).toEqual(["synthetic@example.test"]);
    expect(result).toEqual({ user: { id: account.id, email: account.email, role: "STUDENT", status: "ACTIVE" },
      landingPath: "/", expiresAt: expiry.toISOString(), sessionToken: expect.stringMatching(/^[0-9a-f]{64}$/) });
    const insertion = mocks.query.mock.calls.find((args) => args[0].join("").includes("oak_create_session"));
    expect(insertion?.[2]).toBe(createHash("sha256").update(result.sessionToken).digest("hex"));
    expect(insertion?.slice(1)).not.toContain(result.sessionToken);
    expect(JSON.stringify(result)).not.toContain("private-digest");
    expect(attemptValues()).toEqual([["synthetic@example.test", "127.0.0.1", true]]);
  });
  it.each(["unknown", "wrong"])("returns identical credentials rejection for %s with one real/dummy verification", async (kind) => {
    if (kind === "unknown") found = null;
    mocks.verify.mockResolvedValue(false);
    await expect(login({ email: account.email, password: "wrong" })).rejects.toMatchObject({ code: "INVALID_CREDENTIALS", status: 401,
      message: "Email or password is incorrect." });
    expect(mocks.verify).toHaveBeenCalledTimes(1);
    expect(mocks.verify).toHaveBeenCalledWith("wrong", kind === "unknown" ? null : "private-digest");
    expect(attemptValues()).toEqual([[account.email, "unknown", false]]);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it.each([
    [{ emailVerifiedAt: null }, "EMAIL_NOT_VERIFIED"], [{ status: "SUSPENDED" }, "ACCOUNT_SUSPENDED"],
    [{ status: "PENDING_APPROVAL" }, "ACCOUNT_PENDING_APPROVAL"], [{ role: "ADMIN" }, "FORBIDDEN"],
    [{ role: "STAFF" }, "FORBIDDEN"], [{ role: "unknown" }, "FORBIDDEN"], [{ status: "unknown" }, "FORBIDDEN"],
  ])("checks account restriction %j only after a correct password", async (patch, code) => {
    found = { ...account, ...patch };
    mocks.verify.mockResolvedValueOnce(false);
    await expect(login({ email: account.email, password: "wrong" })).rejects.toHaveProperty("code", "INVALID_CREDENTIALS");
    await expect(login({ email: account.email, password: "correct" })).rejects.toHaveProperty("code", code);
    expect(attemptValues()).toEqual([[account.email, "unknown", false], [account.email, "unknown", false]]);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("does not consult enrollment/payment or activate entitlements for approved Students", async () => {
    for (const enrollment of ["approved", "enrolled"]) {
      found = { ...account, enrollment, paid: false };
      const result = await login({ email: account.email, password: "correct" });
      expect(result.landingPath).toBe("/");
      expect(result.user).not.toHaveProperty("enrollment");
      expect(result).not.toHaveProperty("paid");
    }
    expect(mocks.execute.mock.calls.every((args) => args[0].join("").includes("oak_record_sign_in_attempt"))).toBe(true);
  });
  it("rechecks credentials/role while the created session holds the account lock", async () => {
    let lookups = 0;
    mocks.query.mockImplementation(async (sql: TemplateStringsArray) => {
      if (sql.join("").includes("oak_auth_lookup")) return [{ ...account, role: ++lookups === 1 ? "STUDENT" : "ADMIN" }];
      return [{ expiresAt: expiry }];
    });
    await expect(login({ email: account.email, password: "correct" })).rejects.toHaveProperty("code", "FORBIDDEN");
    expect(attemptValues()).toEqual([[account.email, "unknown", false]]);
  });
  it("records infrastructure failure as failed and never returns a session on attempt insert failure", async () => {
    mocks.execute.mockRejectedValue(new Error("private SQL diagnostics"));
    await expect(login({ email: account.email, password: "correct" })).rejects.toThrow();
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });
  it("validates before credential/database work and accepts only an explicitly supplied client", async () => {
    await expect(login({ email: "bad", password: "" })).rejects.toThrow();
    expect(mocks.query).not.toHaveBeenCalled();
    const query = vi.fn().mockResolvedValue([]), execute = vi.fn().mockResolvedValue(1);
    await expect(login({ email: account.email, password: "x" }, {}, { $queryRaw: query, $executeRaw: execute } as unknown as PrismaClient))
      .rejects.toHaveProperty("code", "INVALID_CREDENTIALS");
    expect(query).toHaveBeenCalledTimes(1);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
