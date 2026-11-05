import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { login } from "../../src/modules/auth/auth.service.js";
import { createSecurityDatabase } from "../helpers/db.js";

const fixture = createSecurityDatabase();
const password = "synthetic-fixture-password-only";
const metadata = { ipAddress: "127.0.0.1", userAgent: "synthetic-test" };
const email = () => `${fixture.alice.id}@example.test`;
describe("restricted database login integration", () => {
  beforeAll(() => fixture.connect());
  beforeEach(() => fixture.reset());
  afterAll(() => fixture.close());
  it("commits a hash-only session, successful attempt and lastSignInAt using only the runtime client", async () => {
    const result = await login({ email: ` ${email().toUpperCase()} `, password }, metadata, fixture.runtime);
    const hash = createHash("sha256").update(result.sessionToken).digest("hex");
    const row = await fixture.admin.session.findUniqueOrThrow({ where: { tokenHash: hash } });
    expect(row.userId).toBe(fixture.alice.id);
    expect(row.tokenHash).not.toBe(result.sessionToken);
    expect(row.expiresAt.toISOString()).toBe(result.expiresAt);
    expect((await fixture.admin.user.findUniqueOrThrow({ where: { id: fixture.alice.id } })).lastSignInAt).not.toBeNull();
    const attempts = await fixture.admin.signInAttempt.findMany({ where: { email: email() } });
    expect(attempts.filter((attempt) => attempt.succeeded)).toHaveLength(2); // Initial fixture + this login.
    expect(await fixture.runtime.user.findMany()).toEqual([]);
  });
  it("persists a failed credential attempt without creating a session or updating lastSignInAt", async () => {
    const count = await fixture.admin.session.count();
    await expect(login({ email: email(), password: "wrong" }, metadata, fixture.runtime)).rejects.toHaveProperty("code", "INVALID_CREDENTIALS");
    expect(await fixture.admin.session.count()).toBe(count);
    expect((await fixture.admin.user.findUniqueOrThrow({ where: { id: fixture.alice.id } })).lastSignInAt).toBeNull();
    expect(await fixture.admin.signInAttempt.count({ where: { email: email(), succeeded: false } })).toBe(1);
  });
  it("blocks pending approval and native Admin without creating sessions", async () => {
    const count = await fixture.admin.session.count();
    await fixture.admin.user.update({ where: { id: fixture.alice.id }, data: { status: "PENDING_APPROVAL" } });
    await expect(login({ email: email(), password }, metadata, fixture.runtime)).rejects.toHaveProperty("code", "ACCOUNT_PENDING_APPROVAL");
    await expect(login({ email: `${fixture.actor.id}@example.test`, password }, metadata, fixture.runtime)).rejects.toHaveProperty("code", "FORBIDDEN");
    expect(await fixture.admin.session.count()).toBe(count);
    await fixture.admin.user.update({ where: { id: fixture.alice.id }, data: { status: "ACTIVE" } });
    expect((await login({ email: email(), password }, metadata, fixture.runtime)).landingPath).toBe("/");
  });
  it("records an unknown email without requiring a user relation or an observed IP", async () => {
    await fixture.admin.user.delete({ where: { id: fixture.bob.id } });
    const unknown = `${fixture.bob.id}@example.test`;
    await expect(login({ email: unknown, password }, {}, fixture.runtime)).rejects.toHaveProperty("code", "INVALID_CREDENTIALS");
    expect(await fixture.admin.signInAttempt.findMany({ where: { email: unknown } }))
      .toEqual([expect.objectContaining({ email: unknown, succeeded: false, ipAddress: "unknown" })]);
  });
  it("rolls back a native session if role changes after password verification", async () => {
    const count = await fixture.admin.session.count();
    let changed = false;
    const client = fixture.runtime.$extends({ query: {
      $queryRaw: async ({ args, query }) => {
        if (!changed && args.strings.join("").includes("oak_create_session")) {
          changed = true;
          await fixture.admin.user.update({ where: { id: fixture.alice.id }, data: { role: "ADMIN" } });
        }
        return query(args);
      },
    } });
    await expect(login({ email: email(), password }, metadata, client as unknown as PrismaClient)).rejects.toHaveProperty("code", "FORBIDDEN");
    expect(await fixture.admin.session.count()).toBe(count);
    expect((await fixture.admin.user.findUniqueOrThrow({ where: { id: fixture.alice.id } })).lastSignInAt).toBeNull();
    expect(await fixture.admin.signInAttempt.count({ where: { email: email(), succeeded: false } })).toBe(1);
  });
  it("rolls back the session and lastSignInAt when successful-attempt insertion fails", async () => {
    const count = await fixture.admin.session.count();
    const client = fixture.runtime.$extends({ query: {
      $executeRaw: async ({ args, query }) => {
        if (args.values.includes(true)) throw new Error("Synthetic successful-attempt failure");
        return query(args);
      },
    } });
    await expect(login({ email: email(), password }, metadata, client as unknown as PrismaClient)).rejects.toThrow();
    expect(await fixture.admin.session.count()).toBe(count);
    expect((await fixture.admin.user.findUniqueOrThrow({ where: { id: fixture.alice.id } })).lastSignInAt).toBeNull();
    expect(await fixture.admin.signInAttempt.count({ where: { email: email(), succeeded: false } })).toBe(1);
  });
});
