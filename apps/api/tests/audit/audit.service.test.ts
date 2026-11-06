import { createHash, randomUUID } from "node:crypto";
import type { AuditLog, Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendAudit, hashAuditPayload, verifyAuditChain } from "../../src/modules/audit/audit.service.js";

const actor = "00000000-0000-4000-8000-000000000001";
const genesis = "0".repeat(64);
const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const event = { userId: actor, action: "STATUS_UPDATE", targetEntity: "User", targetId: "synthetic-resource", payload: { status: "ACTIVE" } };
const query = vi.fn();
const create = vi.fn();
const tx = { $queryRaw: query, auditLog: { create } } as unknown as Prisma.TransactionClient;

function independentRow(previousHash = genesis): AuditLog {
  const row = { id: randomUUID(), timestamp: new Date("2026-11-03T00:00:00.123Z"),
    userId: actor, action: "STATUS_UPDATE", targetEntity: "User", targetId: "synthetic-resource",
    payloadHash: sha256('{"status":"ACTIVE"}'), previousHash };
  return { ...row, currentHash: sha256(row.previousHash + row.timestamp.toISOString() + row.userId +
    row.action + row.targetEntity + row.targetId + row.payloadHash) };
}

beforeEach(() => {
  query.mockReset().mockResolvedValue([{ previousHash: genesis, userId: actor }]);
  create.mockReset().mockImplementation(async ({ data }) => data);
});

describe("audit payload hashing and append", () => {
  it("uses the exact independent specification hash at genesis", async () => {
    const row = await appendAudit(tx, event);
    expect(row.payloadHash).toBe(sha256('{"status":"ACTIVE"}'));
    expect(row.previousHash).toBe(genesis);
    expect(row.currentHash).toBe(sha256(row.previousHash + row.timestamp.toISOString() + row.userId +
      row.action + row.targetEntity + row.targetId + row.payloadHash));
    expect(verifyAuditChain([row]).valid).toBe(true);
    expect(create.mock.calls[0]?.[0].data).not.toHaveProperty("payload");
  });

  it("gets the locked head before insert using only the supplied transaction", async () => {
    const prior = independentRow();
    query.mockResolvedValueOnce([{ previousHash: prior.currentHash, userId: actor }]);
    const row = await appendAudit(tx, event);
    expect(query.mock.calls[0]?.[0].join("")).toContain("public.oak_audit_head()");
    expect(query.mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0]!);
    expect(row.previousHash).toBe(prior.currentHash);
    expect(verifyAuditChain([prior, row]).valid).toBe(true);
  });

  it("canonicalizes nested object keys while preserving array order", () => {
    expect(hashAuditPayload({ z: [2, 1], meta: { b: 2, a: 1 } }))
      .toBe(sha256('{"meta":{"a":1,"b":2},"z":[2,1]}'));
    expect(hashAuditPayload({ meta: { a: 1, b: 2 }, z: [2, 1] }))
      .toBe(hashAuditPayload({ z: [2, 1], meta: { b: 2, a: 1 } }));
    expect(hashAuditPayload([1, 2])).not.toBe(hashAuditPayload([2, 1]));
  });

  it("redacts nested credential-like keys before hashing", () => {
    const payload = { password: "SYNTHETIC_PRIVATE", nested: { session_token: "SYNTHETIC_PRIVATE", otp: "123456" }, status: "ACTIVE" };
    expect(hashAuditPayload(payload)).toBe(sha256('{"nested":{"otp":"[REDACTED]","session_token":"[REDACTED]"},"password":"[REDACTED]","status":"ACTIVE"}'));
    expect(hashAuditPayload({ password: "one" })).toBe(hashAuditPayload({ password: "two" }));
  });

  it("rejects non-JSON, cyclic, sparse, and accessor payloads without querying", async () => {
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
    const getter = vi.fn(() => "SYNTHETIC_PRIVATE");
    const accessors = Object.defineProperty({}, "value", { enumerable: true, get: getter });
    for (const payload of [undefined, NaN, Infinity, 1n, new Date(), cyclic, Array(1), accessors]) {
      await expect(appendAudit(tx, { ...event, payload })).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    }
    expect(query).not.toHaveBeenCalled();
    expect(getter).not.toHaveBeenCalled();
  });

  it("rejects excessive nesting and invalid server metadata safely", async () => {
    let nested: unknown = 1;
    for (let i = 0; i < 35; i++) nested = { nested };
    await expect(appendAudit(tx, { ...event, payload: nested })).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    await expect(appendAudit(tx, { ...event, userId: "not-a-uuid" })).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(query).not.toHaveBeenCalled();
  });

  it("denies a mismatched actor and an invalid head without inserting", async () => {
    query.mockResolvedValueOnce([{ previousHash: genesis, userId: randomUUID() }]);
    await expect(appendAudit(tx, event)).rejects.toMatchObject({ code: "FORBIDDEN" });
    query.mockResolvedValueOnce([{ previousHash: "broken", userId: actor }]);
    await expect(appendAudit(tx, event)).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects an outer Prisma client rather than releasing the head lock between queries", async () => {
    const outer = { $transaction: vi.fn(), $queryRaw: query, auditLog: { create } } as unknown as Prisma.TransactionClient;
    await expect(appendAudit(outer, event)).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(query).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("does not swallow insertion failure or start a fallback transaction", async () => {
    const failure = new Error("synthetic DB failure");
    create.mockRejectedValueOnce(failure);
    await expect(appendAudit(tx, event)).rejects.toBe(failure);
    expect(query).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe("pure audit-chain verification", () => {
  it("accepts empty genesis and an independently built linked chain", () => {
    expect(verifyAuditChain([])).toEqual({ valid: true, checkedRecords: 0, headHash: genesis });
    const first = independentRow(); const second = independentRow(first.currentHash);
    expect(verifyAuditChain([first, second])).toEqual({ valid: true, checkedRecords: 2, headHash: second.currentHash });
  });

  it("detects content or payload-hash tampering", () => {
    const row = independentRow();
    expect(verifyAuditChain([{ ...row, action: "FORGED" }])).toEqual({ valid: false, invalidIndex: 0 });
    expect(verifyAuditChain([{ ...row, payloadHash: "f".repeat(64) }]).valid).toBe(false);
  });

  it("detects middle deletion and reordered records", () => {
    const first = independentRow(); const second = independentRow(first.currentHash);
    const third = independentRow(second.currentHash);
    expect(verifyAuditChain([first, third])).toEqual({ valid: false, invalidIndex: 1 });
    expect(verifyAuditChain([second, first, third]).valid).toBe(false);
  });

  it("rejects duplicate record IDs and injected records", () => {
    const first = independentRow(); const second = independentRow(first.currentHash);
    expect(verifyAuditChain([first, { ...second, id: first.id }]).valid).toBe(false);
    expect(verifyAuditChain([first, first, second]).valid).toBe(false);
  });

  it("rejects malformed hashes/dates without exposing raw fields", () => {
    const row = independentRow();
    expect(verifyAuditChain([{ ...row, timestamp: new Date(NaN) }])).toEqual({ valid: false, invalidIndex: 0 });
    expect(verifyAuditChain([{ ...row, previousHash: "invalid" }]).valid).toBe(false);
  });

  it("does not claim to detect tail truncation without a trusted checkpoint", () => {
    const first = independentRow(); const second = independentRow(first.currentHash);
    expect(verifyAuditChain([first, second]).valid).toBe(true);
    expect(verifyAuditChain([first]).valid).toBe(true);
  });
});
