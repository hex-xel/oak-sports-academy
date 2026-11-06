import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createSecurityDatabase } from "../helpers/db.js";

// T031 supplies this real-database fixture; no Prisma mocks or privileged query adapter.
const fixture = createSecurityDatabase();

describe("runtime-role row-level security", () => {
  beforeAll(() => fixture.connect());
  beforeEach(() => fixture.reset());
  afterAll(() => fixture.close());

  it("runs as a non-superuser, non-BYPASSRLS role that owns no sensitive tables", async () => {
    const roles = await fixture.runtime.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
    expect(roles).toEqual([{ rolsuper: false, rolbypassrls: false }]);
    const tables = await fixture.runtime.$queryRaw<Array<{
      relname: string; relrowsecurity: boolean; owns: boolean;
    }>>`
      SELECT c.relname, c.relrowsecurity, pg_get_userbyid(c.relowner) = current_user AS owns
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN ('users', 'sessions', 'sign_in_attempts')`;
    expect(tables).toHaveLength(3);
    for (const table of tables) {
      expect(table.relrowsecurity).toBe(true);
      expect(table.owns).toBe(false);
    }
  });

  it("filters an unqualified users query to the authenticated account", async () => {
    const rows = await fixture.asUser(fixture.alice.id, (tx) => tx.user.findMany());
    expect(rows.map((row) => row.id)).toEqual([fixture.alice.id]);
  });

  it("hides another account even when its ID is explicitly queried", async () => {
    const row = await fixture.asUser(fixture.alice.id, (tx) =>
      tx.user.findUnique({ where: { id: fixture.bob.id } }));
    expect(row).toBeNull();
  });

  it("limits unqualified profile updates to the authenticated account", async () => {
    const result = await fixture.asUser(fixture.alice.id, (tx) =>
      tx.user.updateMany({ data: { displayName: "Updated self" } }));
    expect(result.count).toBe(1);
    const alice = await fixture.admin.user.findUniqueOrThrow({ where: { id: fixture.alice.id } });
    expect(alice.displayName).toBe("Updated self");
    const bob = await fixture.admin.user.findUniqueOrThrow({ where: { id: fixture.bob.id } });
    expect(bob.displayName).toBe(fixture.bob.displayName);
  });

  it("permits self-profile changes without approval but rejects protected account changes", async () => {
    await fixture.asUser(fixture.alice.id, (tx) => tx.user.update({
      where: { id: fixture.alice.id }, data: { displayName: "Self correction" },
    }));
    const after = await fixture.admin.user.findUniqueOrThrow({ where: { id: fixture.alice.id } });
    expect(after.displayName).toBe("Self correction");
    await expect(fixture.asUser(fixture.alice.id, (tx) => tx.user.update({
      where: { id: fixture.alice.id }, data: { role: "ADMIN" },
    }))).rejects.toThrow();
    await expect(fixture.asUser(fixture.alice.id, (tx) => tx.user.update({
      where: { id: fixture.alice.id }, data: { status: "SUSPENDED" },
    }))).rejects.toThrow();
    const unchanged = await fixture.admin.user.findUniqueOrThrow({ where: { id: fixture.alice.id } });
    expect(unchanged.role).toBe("STUDENT");
    expect(unchanged.status).toBe("ACTIVE");
  });

  it("cannot change a different account's profile explicitly", async () => {
    const result = await fixture.asUser(fixture.alice.id, (tx) => tx.user.updateMany({
      where: { id: fixture.bob.id }, data: { displayName: "Forbidden cross-user edit" },
    }));
    expect(result.count).toBe(0);
    const bob = await fixture.admin.user.findUniqueOrThrow({ where: { id: fixture.bob.id } });
    expect(bob.displayName).toBe(fixture.bob.displayName);
  });
  it("cannot read or revoke another account's sessions", async () => {
    const rows = await fixture.asUser(fixture.alice.id, (tx) => tx.session.findMany());
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.userId === fixture.alice.id)).toBe(true);
    const result = await fixture.asUser(fixture.alice.id, (tx) =>
      tx.session.updateMany({ where: { userId: fixture.bob.id }, data: { revokedAt: new Date() } }));
    expect(result.count).toBe(0);
    const bob = await fixture.admin.session.findUniqueOrThrow({ where: { id: fixture.bobSession.id } });
    expect(bob.revokedAt).toBeNull();
  });

  it("fails closed without identity and does not leak identity between pooled requests", async () => {
    await fixture.asUser(fixture.alice.id, (tx) => tx.user.findMany());
    expect(await fixture.runtime.user.findMany()).toEqual([]);
    const bobRows = await fixture.asUser(fixture.bob.id, (tx) => tx.user.findMany());
    expect(bobRows.map((row) => row.id)).toEqual([fixture.bob.id]);
    expect(await fixture.runtime.session.findMany()).toEqual([]);
  });

  it("isolates concurrent identity scopes", async () => {
    const [alice, bob] = await Promise.all([
      fixture.asUser(fixture.alice.id, (tx) => tx.user.findMany()),
      fixture.asUser(fixture.bob.id, (tx) => tx.user.findMany()),
    ]);
    expect(alice.map((row) => row.id)).toEqual([fixture.alice.id]);
    expect(bob.map((row) => row.id)).toEqual([fixture.bob.id]);
  });

  it("hides sign-in attempts from an ordinary customer", async () => {
    expect(await fixture.asUser(fixture.alice.id, (tx) => tx.signInAttempt.findMany())).toEqual([]);
  });

  it("clears transaction identity after rollback as well as commit", async () => {
    await expect(fixture.asUser(fixture.alice.id, async (tx) => {
      expect(await tx.user.count()).toBe(1);
      throw new Error("deliberate rollback");
    })).rejects.toThrow("deliberate rollback");
    expect(await fixture.runtime.user.findMany()).toEqual([]);
  });
});
