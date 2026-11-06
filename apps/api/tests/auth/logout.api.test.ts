import { createHash } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppRuntime } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { createSecurityDatabase } from "../helpers/db.js";

// T045's red phase exercises real production wiring, not a test-only logout route.
const fixture = createSecurityDatabase();
let runtime: AppRuntime;
const hash = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");
const session = (token: string) => request(runtime.app).get("/api/v1/auth/session").set("Authorization", `Bearer ${token}`);
const logout = (token: string) => request(runtime.app).post("/api/v1/auth/logout").set("Authorization", `Bearer ${token}`);

async function signIn(userId = fixture.alice.id): Promise<string> {
  const response = await request(runtime.app).post("/api/v1/auth/login")
    .set("X-Client-Platform", "mobile").send({ email: `${userId}@example.test`, password: "synthetic-fixture-password-only" });
  expect(response.status).toBe(200);
  expect(typeof response.body.sessionToken).toBe("string");
  return response.body.sessionToken as string;
}

function expectNoContent(response: request.Response): void {
  expect(response.status).toBe(204);
  expect(response.text).toBe("");
  expect(response.headers["set-cookie"]).toBeUndefined();
  expect(response.headers["cache-control"]).toBe("no-store");
}

describe("production current-session logout HTTP contract (T046 dependency)", () => {
  beforeAll(() => fixture.connect());
  beforeEach(async () => { await fixture.reset(); runtime = createApp(); });
  afterEach(() => { vi.restoreAllMocks(); runtime?.close(); });
  afterAll(async () => { await prisma.$disconnect(); await fixture.close(); });

  it("commits revocation before 204 and rejects immediate replay of the copied token", async () => {
    const token = await signIn();
    expect((await session(token)).status).toBe(200);
    expectNoContent(await logout(token));
    const stored = await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash: hash(token) } });
    expect(stored.revokedAt).not.toBeNull();
    const replay = await session(token);
    expect(replay.status).toBe(401);
    expect(replay.body.code).toBe("UNAUTHENTICATED");
  });

  it("returns empty 204 on repeated logout without requiring an active session", async () => {
    const token = await signIn();
    expectNoContent(await logout(token));
    expectNoContent(await logout(token));
    expect((await session(token)).status).toBe(401);
  });

  it("preserves another device and account, ignoring forged body/query identity claims", async () => {
    const current = await signIn();
    const otherDevice = await signIn();
    const otherUser = await signIn(fixture.bob.id);
    const response = await request(runtime.app).post(`/api/v1/auth/logout?userId=${fixture.bob.id}&allDevices=true`)
      .set("Authorization", `Bearer ${current}`)
      .send({ userId: fixture.bob.id, role: "ADMIN", sessionToken: otherDevice, allDevices: true });
    expectNoContent(response);
    expect((await session(current)).status).toBe(401);
    expect((await session(otherDevice)).status).toBe(200);
    expect((await session(otherUser)).status).toBe(200);
    for (const token of [otherDevice, otherUser]) {
      expect((await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash: hash(token) } })).revokedAt).toBeNull();
    }
  });

  it("returns empty 204 for a well-formed unknown token without modifying other sessions", async () => {
    const before = await fixture.admin.session.findMany({ orderBy: { id: "asc" } });
    expectNoContent(await logout("synthetic-unknown-token"));
    expect(await fixture.admin.session.findMany({ orderBy: { id: "asc" } })).toEqual(before);
  });

  it.each(["idle", "absolute"] as const)("returns empty 204 for an %s-expired token", async (expiry) => {
    const token = await signIn();
    // Match PostgreSQL's authoritative clock, not the host/VM wall clock. Keep
    // timestamp bounds intact and modify only this guarded fixture's session.
    if (expiry === "idle") {
      await fixture.admin.$executeRaw`UPDATE public.sessions
        SET "idleExpiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')
        WHERE "tokenHash"=${hash(token)}`;
    } else {
      await fixture.admin.$executeRaw`UPDATE public.sessions SET
        "createdAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '9 hours',
        "lastActivityAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '2 hours',
        "idleExpiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '90 minutes',
        "expiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '1 hour'
        WHERE "tokenHash"=${hash(token)}`;
    }
    expect((await session(token)).status).toBe(401);
    expectNoContent(await logout(token));
    expect((await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash: hash(token) } })).revokedAt).not.toBeNull();
  });

  it("can revoke a previously issued session after the owning account is suspended", async () => {
    const token = await signIn();
    await fixture.admin.user.update({ where: { id: fixture.alice.id }, data: { status: "SUSPENDED" } });
    expect((await session(token)).status).toBe(401);
    expectNoContent(await logout(token));
    expect((await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash: hash(token) } })).revokedAt).not.toBeNull();
  });

  it.each([undefined, "Basic synthetic", "Bearer", "Bearer ", "Bearer token extra", "Bearer a,b"])(
    "returns identical safe 401 for missing/malformed authorization %s", async (header) => {
      const before = await fixture.admin.session.count({ where: { revokedAt: { not: null } } });
      const req = request(runtime.app).post("/api/v1/auth/logout");
      if (header !== undefined) req.set("Authorization", header);
      const response = await req;
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ code: "UNAUTHENTICATED", message: "Unauthenticated" });
      expect(response.headers["set-cookie"]).toBeUndefined();
      expect(await fixture.admin.session.count({ where: { revokedAt: { not: null } } })).toBe(before);
    },
  );

  it("rejects ambiguous duplicate authorization headers", async () => {
    const response = await request(runtime.app).post("/api/v1/auth/logout")
      .set({ Authorization: ["Bearer first", "Bearer second"] });
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHENTICATED");
  });

  it("does not accept a cookie as a substitute for the native Bearer header", async () => {
    const response = await request(runtime.app).post("/api/v1/auth/logout").set("Cookie", "sessionToken=synthetic");
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHENTICATED");
  });

  it("returns safe 500 rather than claiming revocation if the database operation fails", async () => {
    const token = await signIn();
    vi.spyOn(prisma, "$executeRaw").mockRejectedValueOnce(new Error("Synthetic private database detail"));
    const response = await logout(token);
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." });
    expect(JSON.stringify(response.body)).not.toContain("private");
    expect((await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash: hash(token) } })).revokedAt).toBeNull();
  });
});
