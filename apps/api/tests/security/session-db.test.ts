import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { errorHandler } from "../../src/middleware/error-handler.js";
import { requireAuth } from "../../src/middleware/require-auth.js";
import { withSession } from "../../src/lib/prisma.js";
import { SessionContextError } from "../../src/middleware/error-handler.js";
import { createSession, revokeSession, verifySession } from "../../src/modules/auth/session.service.js";
import { createSecurityDatabase } from "../helpers/db.js";

const fixture = createSecurityDatabase({ concurrency: true });

describe("real database session lifecycle", () => {
  beforeAll(() => fixture.connect());
  beforeEach(() => fixture.reset());
  afterAll(() => fixture.close());

  it("creates and verifies a hash-only eligible session and rejects its replay after logout", async () => {
    const created = await createSession(fixture.alice.id, {}, fixture.runtime);
    const view = await verifySession(created.sessionToken, fixture.runtime);
    expect(view.user.id).toBe(fixture.alice.id);
    expect(view.expiresAt).toEqual(created.expiresAt);
    expect(view).not.toHaveProperty("sessionToken");
    const sessions = await fixture.admin.session.findMany({ where: { userId: fixture.alice.id } });
    expect(sessions.every((s) => s.tokenHash !== created.sessionToken)).toBe(true);
    await revokeSession(created.sessionToken, fixture.runtime);
    await expect(verifySession(created.sessionToken, fixture.runtime)).rejects.toBeInstanceOf(SessionContextError);
    await revokeSession(created.sessionToken, fixture.runtime);
  });

  it("does not renew during background scopes and caps successful interactive renewal", async () => {
    await fixture.admin.$executeRaw`UPDATE public.sessions SET
      "createdAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '7 hours 50 minutes',
      "lastActivityAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '1 minute',
      "idleExpiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')+INTERVAL '5 minutes',
      "expiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')+INTERVAL '10 minutes'
      WHERE "userId"=${fixture.alice.id}::uuid`;
    const before = await fixture.admin.session.findMany({ where: { userId: fixture.alice.id }, orderBy: { id: "asc" } });
    await fixture.asUser(fixture.alice.id, (tx) => tx.user.count());
    const unchanged = await fixture.admin.session.findMany({ where: { userId: fixture.alice.id }, orderBy: { id: "asc" } });
    expect(unchanged).toEqual(before);
    await fixture.asUser(fixture.alice.id, (tx) => tx.user.count(), "interactive");
    const after = await fixture.admin.session.findMany({ where: { userId: fixture.alice.id } });
    const renewed = after.find((s) => before.some((old) => old.id === s.id && old.lastActivityAt < s.lastActivityAt));
    expect(renewed).toBeDefined();
    expect(renewed?.idleExpiresAt).toEqual(renewed?.expiresAt);
  });

  it("rejects an idle deadline at/past database time before any protected callback", async () => {
    await fixture.admin.$executeRaw`UPDATE public.sessions SET
      "idleExpiresAt"=clock_timestamp() AT TIME ZONE 'UTC'
      WHERE "userId"=${fixture.alice.id}::uuid`;
    let called = false;
    await expect(fixture.asUser(fixture.alice.id, async () => { called = true; }))
      .rejects.toBeInstanceOf(SessionContextError);
    expect(called).toBe(false);
    expect(await fixture.runtime.user.count()).toBe(0);
  });

  it("rejects absolute expiry even with more recent activity", async () => {
    await fixture.admin.$executeRaw`UPDATE public.sessions SET
      "createdAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '9 hours',
      "lastActivityAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '2 hours',
      "idleExpiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '90 minutes',
      "expiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '1 hour'
      WHERE "userId"=${fixture.alice.id}::uuid`;
    await expect(fixture.asUser(fixture.alice.id, (tx) => tx.user.count()))
      .rejects.toBeInstanceOf(SessionContextError);
  });

  it("rechecks current account restrictions and never permits unscoped renewal", async () => {
    await fixture.admin.user.update({ where: { id: fixture.alice.id }, data: { status: "SUSPENDED" } });
    await expect(fixture.asUser(fixture.alice.id, (tx) => tx.user.count()))
      .rejects.toBeInstanceOf(SessionContextError);
    const result = await fixture.runtime.$queryRaw<Array<{ renewed: boolean }>>`
      SELECT public.oak_touch_session_activity() AS renewed`;
    expect(result).toEqual([{ renewed: false }]);
  });

  it("rolls back interactive work when renewal discovers revocation", async () => {
    await expect(fixture.asUser(fixture.alice.id, async (tx) => {
      await tx.user.update({ where: { id: fixture.alice.id }, data: { displayName: "Must roll back" } });
      await tx.$executeRaw`SELECT public.oak_revoke_session(current_setting('oak.session_hash', true))`;
    }, "interactive")).rejects.toBeInstanceOf(SessionContextError);
    const alice = await fixture.admin.user.findUniqueOrThrow({ where: { id: fixture.alice.id } });
    expect(alice.displayName).toBe(fixture.alice.displayName);
    const sessions = await fixture.admin.session.findMany({ where: { userId: fixture.alice.id } });
    expect(sessions.every((s) => s.revokedAt === null)).toBe(true);
  });

  it("commits ownership-denial audit after rolling back the rejected scope", async () => {
    const created = await createSession(fixture.alice.id, {}, fixture.runtime);
    const app = express();
    let workCalled = false;
    app.get("/owned", requireAuth(1, async () => { workCalled = true; return {}; }, {
      client: fixture.runtime,
      owner: async ({ tx }) => {
        // Synthetic mutation makes rollback independently observable before audit commit.
        await tx.user.update({ where: { id: fixture.alice.id }, data: { displayName: "Must disappear" } });
        return fixture.bob.id;
      },
    }));
    app.use(errorHandler);
    const response = await request(app).get("/owned").set("Authorization", `Bearer ${created.sessionToken}`);
    expect(response.status).toBe(403);
    expect(workCalled).toBe(false);
    expect((await fixture.admin.user.findUniqueOrThrow({ where: { id: fixture.alice.id } })).displayName)
      .toBe(fixture.alice.displayName);
    const audits = await fixture.admin.auditLog.findMany();
    expect(audits).toHaveLength(1);
    expect(audits[0]?.action).toBe("OWNERSHIP_DENIED");
    expect(audits[0]?.userId).toBe(fixture.alice.id);
  });

  it.each(["revoke", "expire"] as const)("does not revive a session after a concurrent lock-wait %s", async (mode) => {
    const created = await createSession(fixture.alice.id, {}, fixture.runtime);
    const hash = createHash("sha256").update(created.sessionToken).digest("hex");
    if (mode === "expire") {
      await fixture.admin.$executeRaw`UPDATE public.sessions
        SET "idleExpiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')+INTERVAL '3 seconds'
        WHERE "tokenHash"=${hash}`;
    }
    let unlock!: () => void;
    let locked!: () => void;
    let entered!: () => void;
    const release = new Promise<void>((resolve) => { unlock = resolve; });
    const acquired = new Promise<void>((resolve) => { locked = resolve; });
    const working = new Promise<void>((resolve) => { entered = resolve; });
    const holding = fixture.admin.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM public.sessions WHERE "tokenHash"=${hash} FOR UPDATE`;
      locked(); await release;
      if (mode === "revoke") await tx.session.update({ where: { tokenHash: hash }, data: { revokedAt: new Date() } });
    }, { timeout: 15_000 });
    await acquired;
    const renewing = withSession(hash, async (tx) => {
      expect(await tx.user.count()).toBe(1);
      entered();
    }, fixture.runtime, "interactive");
    // Attach a rejection handler immediately while waiting for the deterministic barrier.
    const outcome = renewing.then(() => null, (error: unknown) => error);
    try {
      await Promise.race([working, outcome.then(() => { throw new Error("Session failed before lock-wait barrier"); }),
        delay(5_000).then(() => { throw new Error("Lock-wait barrier timed out"); })]);
      if (mode === "expire") await delay(3_200);
    } finally { unlock(); }
    await holding;
    expect(await outcome).toBeInstanceOf(SessionContextError);
    expect((await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash: hash } })).idleExpiresAt.getTime())
      .toBeLessThanOrEqual(created.expiresAt.getTime());
  });
});
