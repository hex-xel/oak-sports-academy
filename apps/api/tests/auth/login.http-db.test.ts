import { createHash } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp, type AppRuntime } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { createSecurityDatabase } from "../helpers/db.js";

const fixture = createSecurityDatabase();
let runtime: AppRuntime;
const credentials = () => ({ email: `${fixture.alice.id}@example.test`, password: "synthetic-fixture-password-only" });
const signIn = () => request(runtime.app).post("/api/v1/auth/login").set("X-Client-Platform", "mobile").send(credentials());
const session = (token: string) => request(runtime.app).get("/api/v1/auth/session?userId=untrusted&role=ADMIN").set("Authorization", `Bearer ${token}`);

describe("production auth HTTP with restricted local database", () => {
  beforeAll(() => fixture.connect());
  beforeEach(async () => { await fixture.reset(); runtime = createApp(); });
  afterEach(() => runtime?.close());
  afterAll(async () => { await prisma.$disconnect(); await fixture.close(); });
  it("logs in and returns only the current user's safe session without renewing idle expiry", async () => {
    const login = await signIn();
    expect(login.status).toBe(200);
    expect(login.headers["set-cookie"]).toBeUndefined();
    const tokenHash = createHash("sha256").update(login.body.sessionToken).digest("hex");
    const before = await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash } });
    const response = await session(login.body.sessionToken);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: { id: fixture.alice.id, email: credentials().email,
      displayName: fixture.alice.displayName, role: "STUDENT", status: "ACTIVE" }, landingPath: "/", expiresAt: login.body.expiresAt });
    expect(response.headers["set-cookie"]).toBeUndefined();
    const after = await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash } });
    expect(after.idleExpiresAt).toEqual(before.idleExpiresAt);
    expect(after.lastActivityAt).toEqual(before.lastActivityAt);
    expect(await fixture.runtime.user.findMany()).toEqual([]);
  });
  it("denies unknown/revoked/expired tokens identically and rechecks current account eligibility", async () => {
    const login = await signIn();
    expect(login.status).toBe(200);
    const token = login.body.sessionToken as string;
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const unknown = await session("unknown");
    expect(unknown.status).toBe(401);
    await fixture.admin.session.update({ where: { tokenHash }, data: { revokedAt: new Date() } });
    expect((await session(token)).body).toEqual(unknown.body);
    // PostgreSQL owns expiry decisions; host/VM clock skew must not place this
    // supposedly expired deadline in the database's future (T048 observed HTTP 200).
    await fixture.admin.$executeRaw`UPDATE public.sessions SET "revokedAt"=NULL,
      "idleExpiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')
      WHERE "tokenHash"=${tokenHash}`;
    expect((await session(token)).status).toBe(401);
    const second = await signIn();
    await fixture.admin.user.update({ where: { id: fixture.alice.id }, data: { status: "SUSPENDED" } });
    expect((await session(second.body.sessionToken)).status).toBe(401);
  });
  it("rejects missing/malformed Bearer headers before database work", async () => {
    for (const header of [undefined, "Basic synthetic", "Bearer a b"]) {
      const req = request(runtime.app).get("/api/v1/auth/session");
      if (header) req.set("Authorization", header);
      const response = await req;
      expect(response.status).toBe(401);
      expect(response.body.code).toBe("UNAUTHENTICATED");
    }
  });
});
