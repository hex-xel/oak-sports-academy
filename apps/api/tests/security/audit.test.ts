import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { appendAudit, verifyAuditChain } from "../../src/modules/audit/audit.service.js";
import { createSecurityDatabase } from "../helpers/db.js";

const fixture = createSecurityDatabase({ concurrency: true });
const genesis = "0".repeat(64);
const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const payload = { status: "ACTIVE" };

function event() {
  return {
    userId: fixture.actor.id,
    action: "STATUS_UPDATE",
    targetEntity: "User",
    targetId: fixture.alice.id,
    payload,
  };
}

async function append() {
  return fixture.asUser(fixture.actor.id, (tx) => appendAudit(tx, event()));
}

describe("SHA-256 append-only audit chain", () => {
  beforeAll(() => fixture.connect());
  beforeEach(() => fixture.reset());
  afterAll(() => fixture.close());

  it("hashes the genesis record in the exact specification field order", async () => {
    const row = await append();
    expect(row.previousHash).toBe(genesis);
    expect(row.payloadHash).toBe(sha256('{"status":"ACTIVE"}'));
    const expected = sha256(row.previousHash + row.timestamp.toISOString() + row.userId +
      row.action + row.targetEntity + row.targetId + row.payloadHash);
    expect(row.currentHash).toBe(expected);
    expect((await verifyAuditChain([row])).valid).toBe(true);
  });

  it("links entries and detects modification, injection, and middle deletion", async () => {
    const first = await append();
    const second = await append();
    const third = await append();
    expect(second.previousHash).toBe(first.currentHash);
    expect(third.previousHash).toBe(second.currentHash);
    expect((await verifyAuditChain([first, second, third])).valid).toBe(true);
    expect((await verifyAuditChain([first, { ...second, action: "FORGED" }, third])).valid).toBe(false);
    expect((await verifyAuditChain([first, { ...second, id: third.id, currentHash: "f".repeat(64) }, second, third])).valid).toBe(false);
    expect((await verifyAuditChain([first, third])).valid).toBe(false);
  });

  it("does not claim to detect tail deletion without a trusted head checkpoint", async () => {
    const first = await append();
    await append();
    expect((await verifyAuditChain([first])).valid).toBe(true);
  });

  it("canonicalizes equivalent payload objects identically", async () => {
    const first = await fixture.asUser(fixture.actor.id, (tx) =>
      appendAudit(tx, { ...event(), payload: { status: "ACTIVE", meta: { b: 2, a: 1 } } }));
    const second = await fixture.asUser(fixture.actor.id, (tx) =>
      appendAudit(tx, { ...event(), payload: { meta: { a: 1, b: 2 }, status: "ACTIVE" } }));
    expect(first.payloadHash).toBe(second.payloadHash);
  });

  it("serializes concurrent appends into one chain without forks or lost records", async () => {
    await Promise.all(Array.from({ length: 8 }, () => append()));
    const rows = await fixture.admin.auditLog.findMany();
    expect(rows).toHaveLength(8);
    expect(new Set(rows.map((row) => row.previousHash)).size).toBe(8);
    let previous = genesis;
    const ordered = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows.find((candidate) => candidate.previousHash === previous);
      expect(row).toBeDefined();
      if (!row) throw new Error("Audit chain fork or missing link");
      ordered.push(row);
      previous = row.currentHash;
    }
    expect((await verifyAuditChain(ordered)).valid).toBe(true);
  });

  it("rolls back the business mutation and audit append together", async () => {
    await expect(fixture.asUser(fixture.alice.id, async (tx) => {
      // Revoke a different owned session so this transaction's identity stays live.
      const result = await tx.session.updateMany({ where: { id: fixture.aliceOtherSession.id },
        data: { revokedAt: new Date() } });
      expect(result.count).toBe(1);
      await appendAudit(tx, { userId: fixture.alice.id, action: "SESSION_REVOKED",
        targetEntity: "Session", targetId: fixture.aliceOtherSession.id, payload: { revoked: true } });
      throw new Error("deliberate rollback");
    })).rejects.toThrow("deliberate rollback");
    expect(await fixture.admin.auditLog.count()).toBe(0);
    const session = await fixture.admin.session.findUniqueOrThrow({ where: { id: fixture.aliceOtherSession.id } });
    expect(session.revokedAt).toBeNull();
  });

  it("grants no UPDATE, DELETE, or TRUNCATE audit privilege to the runtime role", async () => {
    const rows = await fixture.runtime.$queryRaw<Array<{
      can_update: boolean; can_delete: boolean; can_truncate: boolean;
    }>>`SELECT has_table_privilege(current_user, 'public.audit_logs', 'UPDATE') AS can_update,
      has_table_privilege(current_user, 'public.audit_logs', 'DELETE') AS can_delete,
      has_table_privilege(current_user, 'public.audit_logs', 'TRUNCATE') AS can_truncate`;
    expect(rows).toEqual([{ can_update: false, can_delete: false, can_truncate: false }]);
    const row = await append();
    await expect(fixture.runtime.auditLog.update({ where: { id: row.id }, data: { action: "FORGED" } })).rejects.toThrow();
    await expect(fixture.runtime.auditLog.delete({ where: { id: row.id } })).rejects.toThrow();
    expect(await fixture.admin.auditLog.count()).toBe(1);
  });
});
