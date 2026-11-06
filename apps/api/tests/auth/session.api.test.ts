import { createHash } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@oak/shared";
import { createApp, type AppRuntime } from "../../src/app.js";
import { prisma, withSession } from "../../src/lib/prisma.js";
import { requireAuth, type AuthWorkContext } from "../../src/middleware/require-auth.js";
import { createSecurityDatabase } from "../helpers/db.js";

const fixture = createSecurityDatabase();
let runtime: AppRuntime;
const unauthorized = { code: "UNAUTHENTICATED", message: "Unauthenticated" };
const hash = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");
const session = (token: string) => request(runtime.app).get("/api/v1/auth/session").set("Authorization", `Bearer ${token}`);

async function signIn(userId = fixture.alice.id): Promise<string> {
  const response = await request(runtime.app).post("/api/v1/auth/login").set("X-Client-Platform", "mobile")
    .send({ email: `${userId}@example.test`, password: "synthetic-fixture-password-only" });
  expect(response.status).toBe(200);
  expect(typeof response.body.sessionToken).toBe("string");
  return response.body.sessionToken as string;
}

function expectUnauthorized(response: request.Response): void {
  expect(response.status).toBe(401);
  expect(response.body).toEqual(unauthorized);
  expect(response.headers["set-cookie"]).toBeUndefined();
  expect(response.headers["cache-control"]).toBe("no-store");
}

describe("production session HTTP contract and real restricted database", () => {
  beforeAll(() => fixture.connect());
  beforeEach(async () => { await fixture.reset(); runtime = createApp(); });
  afterEach(() => { vi.restoreAllMocks(); runtime?.close(); });
  afterAll(async () => { await prisma.$disconnect(); await fixture.close(); });

  it("projects only safe current identity and absolute expiry, with no token/hash/cookie", async () => {
    const token = await signIn();
    const stored = await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash: hash(token) } });
    const response = await session(token);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: { id: fixture.alice.id, email: `${fixture.alice.id}@example.test`,
      displayName: fixture.alice.displayName, role: "STUDENT", status: "ACTIVE" }, landingPath: "/", expiresAt: stored.expiresAt.toISOString() });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain(token);
    expect(JSON.stringify(response.body)).not.toContain(hash(token));
  });

  it.each([undefined, "Basic synthetic", "Bearer", "Bearer a b", "Bearer a,b"])(
    "returns identical safe 401 for missing/malformed header %s", async (header) => {
      const req = request(runtime.app).get("/api/v1/auth/session");
      if (header !== undefined) req.set("Authorization", header);
      expectUnauthorized(await req);
    },
  );

  it("rejects duplicate authorization and cookie-only authentication", async () => {
    expectUnauthorized(await request(runtime.app).get("/api/v1/auth/session")
      .set({ Authorization: ["Bearer first", "Bearer second"] }));
    expectUnauthorized(await request(runtime.app).get("/api/v1/auth/session").set("Cookie", "sessionToken=synthetic"));
  });

  it("returns exactly the same 401 for unknown and revoked tokens as a missing token", async () => {
    const token = await signIn();
    const absent = await request(runtime.app).get("/api/v1/auth/session");
    expectUnauthorized(absent);
    const unknown = await session("synthetic-unknown-token");
    expectUnauthorized(unknown);
    const revoked = await request(runtime.app).post("/api/v1/auth/logout").set("Authorization", `Bearer ${token}`);
    expect(revoked.status).toBe(204);
    const replay = await session(token);
    expectUnauthorized(replay);
    expect(replay.body).toEqual(unknown.body);
    expect(replay.body).toEqual(absent.body);
  });

  it("allows an unexpired idle window then denies the database-clock deadline without renewal", async () => {
    const token = await signIn();
    const tokenHash = hash(token);
    await fixture.admin.$executeRaw`UPDATE public.sessions SET
      "idleExpiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')+INTERVAL '1 minute'
      WHERE "tokenHash"=${tokenHash}`;
    expect((await session(token)).status).toBe(200);
    await fixture.admin.$executeRaw`UPDATE public.sessions SET
      "idleExpiresAt"=(clock_timestamp() AT TIME ZONE 'UTC') WHERE "tokenHash"=${tokenHash}`;
    const before = await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash } });
    expectUnauthorized(await session(token));
    const after = await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash } });
    expect(after.idleExpiresAt).toEqual(before.idleExpiresAt);
    expect(after.lastActivityAt).toEqual(before.lastActivityAt);
  });

  it("never renews activity or absolute expiry during repeated restore lookups", async () => {
    const token = await signIn();
    const tokenHash = hash(token);
    const before = await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash } });
    for (let index = 0; index < 3; index++) expect((await session(token)).status).toBe(200);
    const after = await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash } });
    expect(after.lastActivityAt).toEqual(before.lastActivityAt);
    expect(after.idleExpiresAt).toEqual(before.idleExpiresAt);
    expect(after.expiresAt).toEqual(before.expiresAt);
  });

  it("caps successful foreground renewal at absolute expiry and still rejects an aged session", async () => {
    const token = await signIn();
    const tokenHash = hash(token);
    await fixture.admin.$executeRaw`UPDATE public.sessions SET
      "createdAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '7 hours 50 minutes',
      "lastActivityAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '1 minute',
      "idleExpiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')+INTERVAL '5 minutes',
      "expiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')+INTERVAL '10 minutes'
      WHERE "tokenHash"=${tokenHash}`;
    await withSession(tokenHash, async (tx, user) => {
      expect(await tx.user.count({ where: { id: user.id } })).toBe(1);
    }, fixture.runtime, "interactive");
    const renewed = await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash } });
    expect(renewed.idleExpiresAt).toEqual(renewed.expiresAt);
    expect((await session(token)).status).toBe(200);
    // Age only this synthetic row, using the same authoritative DB clock as auth.
    // This is controlled expiry coverage, not an eight-hour wall-clock measurement.
    await fixture.admin.$executeRaw`UPDATE public.sessions SET
      "createdAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '9 hours',
      "lastActivityAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '2 hours',
      "idleExpiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '90 minutes',
      "expiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '1 hour'
      WHERE "tokenHash"=${tokenHash}`;
    expectUnauthorized(await session(token));
  });

  it.each(["SUSPENDED", "PENDING_APPROVAL"] as const)("rechecks current %s restrictions after issuance", async (status) => {
    const token = await signIn();
    await fixture.admin.user.update({ where: { id: fixture.alice.id }, data: { status } });
    expectUnauthorized(await session(token));
  });

  it("rechecks current email verification rather than trusting issuance-time eligibility", async () => {
    const token = await signIn();
    await fixture.admin.user.update({ where: { id: fixture.alice.id }, data: { emailVerifiedAt: null } });
    expectUnauthorized(await session(token));
  });

  it("ignores forged identity/role/token query claims and isolates users on reused connections", async () => {
    const alice = await signIn();
    const bob = await signIn(fixture.bob.id);
    for (const [token, own, other] of [[alice, fixture.alice.id, fixture.bob.id], [bob, fixture.bob.id, fixture.alice.id],
      [alice, fixture.alice.id, fixture.bob.id]] as const) {
      const response = await request(runtime.app).get("/api/v1/auth/session")
        .query({ userId: other, role: "ADMIN", sessionToken: token === alice ? bob : alice })
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(own);
      expect(response.body.user.role).toBe("STUDENT");
      expect(JSON.stringify(response.body)).not.toContain(other);
    }
    expect(await fixture.runtime.user.findMany()).toEqual([]);
    expect(await fixture.runtime.session.findMany()).toEqual([]);
  });

  it("returns fresh safe profile fields after a server-side change", async () => {
    const token = await signIn();
    await fixture.admin.user.update({ where: { id: fixture.alice.id }, data: { displayName: "Updated synthetic name" } });
    const response = await session(token);
    expect(response.status).toBe(200);
    expect(response.body.user.displayName).toBe("Updated synthetic name");
  });

  it("audits a real permission denial and rechecks the current role in a test-only gated route", async () => {
    // /auth/session is SELF_READ and all eligible roles have it. This test-only
    // route verifies its real shared wrapper without inventing a production API.
    const work = vi.fn(async ({ user }: AuthWorkContext) => ({ currentRole: user.role }));
    runtime.router.get("/__test/session-permission", requireAuth(PERMISSIONS.STUDENTS_MANAGE, work));
    const token = await signIn();
    const before = await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash: hash(token) } });
    const denied = await request(runtime.app).get("/api/v1/__test/session-permission").set("Authorization", `Bearer ${token}`);
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe("FORBIDDEN");
    expect(work).not.toHaveBeenCalled();
    expect(await fixture.admin.auditLog.count({ where: { userId: fixture.alice.id, action: "PERMISSION_DENIED" } })).toBe(1);
    const after = await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash: hash(token) } });
    expect(after.lastActivityAt).toEqual(before.lastActivityAt);
    expect(after.idleExpiresAt).toEqual(before.idleExpiresAt);
    await fixture.admin.user.update({ where: { id: fixture.alice.id }, data: { role: "ADMIN" } });
    const allowed = await request(runtime.app).get("/api/v1/__test/session-permission").set("Authorization", `Bearer ${token}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body).toEqual({ currentRole: "ADMIN" });
  });

  it("denies a foreign scoped owner and commits the denial audit in a test-only route", async () => {
    const work = vi.fn(async () => ({ unexpected: true }));
    runtime.router.get("/__test/session-owner", requireAuth(PERMISSIONS.SELF_READ, work, {
      owner: async ({ tx }) => (await tx.user.findUnique({ where: { id: fixture.bob.id }, select: { id: true } }))?.id ?? null,
    }));
    const token = await signIn();
    const denied = await request(runtime.app).get("/api/v1/__test/session-owner").set("Authorization", `Bearer ${token}`);
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe("FORBIDDEN");
    expect(work).not.toHaveBeenCalled();
    expect(await fixture.admin.auditLog.count({ where: { userId: fixture.alice.id, action: "OWNERSHIP_DENIED" } })).toBe(1);
    expect(await fixture.runtime.user.findMany()).toEqual([]);
  });

  it("sanitizes database/commit errors instead of returning identity or diagnostics", async () => {
    const token = await signIn();
    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("Synthetic private database detail"));
    const response = await session(token);
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." });
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(response.body).not.toHaveProperty("user");
    expect(JSON.stringify(response.body)).not.toContain("private");
  });
});
