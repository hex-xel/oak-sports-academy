import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, SessionContextError } from "../../src/middleware/error-handler.js";

const db = vi.hoisted(() => ({
  query: vi.fn(), execute: vi.fn(), scoped: vi.fn(), find: vi.fn(), update: vi.fn(),
}));
vi.mock("../../src/lib/prisma.js", () => ({
  prisma: { $queryRaw: db.query, $executeRaw: db.execute }, withSession: db.scoped,
}));
import { createSession, revokeAllSessions, revokeSession, verifySession } from "../../src/modules/auth/session.service.js";

const user = { id: "00000000-0000-4000-8000-000000000001", email: "synthetic@example.test",
  displayName: null, role: "CUSTOMER", status: "ACTIVE" };
const token = "a".repeat(64);
const hash = createHash("sha256").update(token).digest("hex");
const expiresAt = new Date("2026-11-03T22:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  db.query.mockResolvedValue([{ expiresAt }]);
  db.execute.mockResolvedValue(1);
  db.find.mockResolvedValue({ expiresAt });
  db.update.mockResolvedValue({ count: 2 });
  db.scoped.mockImplementation(async (_hash, work) => work({
    session: { findUnique: db.find, updateMany: db.update }, $executeRaw: db.execute,
  }, user));
});

describe("opaque session service orchestration", () => {
  it("generates independent 256-bit tokens and sends only their hashes to SQL", async () => {
    const first = await createSession(user.id);
    const second = await createSession(user.id);
    expect(first.sessionToken).toMatch(/^[0-9a-f]{64}$/);
    expect(first.sessionToken).not.toBe(second.sessionToken);
    expect(first).toEqual({ sessionToken: expect.any(String), expiresAt });
    const args = db.query.mock.calls[0];
    expect(args?.[1]).toBe(user.id);
    expect(args?.[2]).toBe(createHash("sha256").update(first.sessionToken).digest("hex"));
    expect(args?.slice(1)).not.toContain(first.sessionToken);
    expect(args?.[3]).toBeNull();
    expect(args?.[4]).toBeNull();
  });

  it("truncates metadata without using it as identity", async () => {
    await createSession(user.id, { ipAddress: "i".repeat(60), userAgent: "u".repeat(300) });
    expect(db.query.mock.calls[0]?.slice(1)).toEqual([user.id, expect.any(String), "i".repeat(45), "u".repeat(255)]);
  });

  it("maps database eligibility rejection to a safe forbidden error", async () => {
    db.query.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("private DB detail", {
      code: "P2010", clientVersion: "6", meta: { code: "28000" },
    }));
    await expect(createSession(user.id)).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("does not fabricate expiry if the create function returns no row", async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(createSession(user.id)).rejects.toBeInstanceOf(ApiError);
  });

  it("verifies via scoped identity and returns no raw token/hash or session row", async () => {
    const result = await verifySession(token);
    expect(result).toEqual({ user, expiresAt });
    expect(db.scoped.mock.calls[0]?.[0]).toBe(hash);
    expect(db.find).toHaveBeenCalledWith({ where: { tokenHash: hash }, select: { expiresAt: true } });
    expect(result).not.toHaveProperty("sessionToken");
    expect(result).not.toHaveProperty("tokenHash");
  });

  it("rejects malformed tokens before querying or opening a scoped transaction", async () => {
    for (const invalid of ["", "contains spaces", "token\nheader", "token\n"]) {
      await expect(verifySession(invalid)).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
      await expect(revokeSession(invalid)).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
    }
    expect(db.scoped).not.toHaveBeenCalled();
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("propagates identical safe invalid-session rejections from the DB context", async () => {
    db.scoped.mockRejectedValueOnce(new SessionContextError());
    await expect(verifySession(token)).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
  });

  it("rejects if a session disappears or becomes ineligible between scoped queries", async () => {
    db.find.mockResolvedValueOnce(null);
    await expect(verifySession(token)).rejects.toBeInstanceOf(SessionContextError);
  });

  it("revokes only the supplied hash and permits repeated/unknown-token logout", async () => {
    await revokeSession(token);
    await revokeSession(token);
    await revokeSession("well-formed-unknown-token");
    expect(db.execute.mock.calls[0]?.slice(1)).toEqual([hash]);
    expect(db.execute.mock.calls[1]?.slice(1)).toEqual([hash]);
    expect(db.execute).toHaveBeenCalledTimes(3);
    expect(db.scoped).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("scopes revoke-all to the verified owner, revoking current session last", async () => {
    await expect(revokeAllSessions(token)).resolves.toBeUndefined();
    expect(db.update).toHaveBeenCalledWith({
      where: { userId: user.id, tokenHash: { not: hash }, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(db.execute.mock.calls[0]?.slice(1)).toEqual([hash]);
    expect(db.update.mock.invocationCallOrder[0]).toBeLessThan(db.execute.mock.invocationCallOrder[0]!);
  });

  it("never falls back to privileged access when scoped revocation fails", async () => {
    db.scoped.mockRejectedValueOnce(new SessionContextError());
    await expect(revokeAllSessions(token)).rejects.toBeInstanceOf(SessionContextError);
    expect(db.update).not.toHaveBeenCalled();
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("uses the explicitly supplied restricted fixture client", async () => {
    const query = vi.fn().mockResolvedValue([{ expiresAt }]);
    const client = { $queryRaw: query } as unknown as PrismaClient;
    await createSession(user.id, {}, client);
    expect(query).toHaveBeenCalledTimes(1);
    expect(db.query).not.toHaveBeenCalled();
    await verifySession(token, client);
    expect(db.scoped.mock.calls[0]?.[2]).toBe(client);
  });
});
