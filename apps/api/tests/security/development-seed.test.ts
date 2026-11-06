import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { parseSeedSettings, seedDevelopmentAccounts, SEED_ACCOUNTS } from "../../src/modules/auth/development-seed.js";
import { verifyPassword } from "../../src/modules/auth/password.service.js";
import { createSecurityDatabase } from "../helpers/db.js";

const fixture = createSecurityDatabase();
const password = "Synthetic-private-test-password-32";
const ids = SEED_ACCOUNTS.map((row) => row.id);

describe("development seed boundaries on disposable DB only", () => {
  beforeAll(() => fixture.connect());
  beforeEach(() => fixture.reset());
  afterEach(async () => { await fixture.admin.user.deleteMany({ where: { id: { in: [...ids] } } }); });
  afterAll(() => fixture.close());

  it.each(["production", "test", undefined])("rejects mode %s before any seed connection", (mode) => {
    expect(() => parseSeedSettings({ NODE_ENV: mode, SEED_CONFIRM: "DEVELOPMENT_FIXTURES_ONLY",
      DIRECT_URL: "postgresql://postgres:synthetic@127.0.0.1:55432/oak_auth_test", SEED_PASSWORD: password }))
      .toThrow("Seed refused");
  });
  it("requires opt-in and private password without exposing values", () => {
    expect(() => parseSeedSettings({ NODE_ENV: "development", SEED_PASSWORD: "short-secret" }))
      .toThrow(/^Seed refused/);
  });
  it("creates four distinct-salted Student hashes and correct restriction states, with no sessions", async () => {
    expect(await seedDevelopmentAccounts(fixture.admin, password)).toEqual({ created: 4, existing: 0 });
    const rows = await fixture.admin.user.findMany({ where: { id: { in: [...ids] } }, orderBy: { id: "asc" } });
    expect(rows).toHaveLength(4);
    expect(new Set(rows.map((row) => row.passwordHash)).size).toBe(4);
    for (const [index, row] of rows.entries()) {
      expect(row.role).toBe("STUDENT");
      expect(row.status).toBe(SEED_ACCOUNTS[index]!.status);
      expect(row.emailVerifiedAt !== null).toBe(SEED_ACCOUNTS[index]!.verified);
      expect(await verifyPassword(password, row.passwordHash)).toBe(true);
    }
    expect(await fixture.admin.session.count({ where: { userId: { in: [...ids] } } })).toBe(0);
  });
  it("preserves existing seed records and passwords on rerun", async () => {
    await seedDevelopmentAccounts(fixture.admin, password);
    const before = await fixture.admin.user.findMany({ where: { id: { in: [...ids] } }, orderBy: { id: "asc" } });
    expect(await seedDevelopmentAccounts(fixture.admin, "Another-private-test-password-32")).toEqual({ created: 0, existing: 4 });
    expect(await fixture.admin.user.findMany({ where: { id: { in: [...ids] } }, orderBy: { id: "asc" } })).toEqual(before);
  });
  it("rolls back earlier seed inserts when a reserved identity collision is found", async () => {
    const conflict = SEED_ACCOUNTS[2];
    await fixture.admin.user.create({ data: { id: conflict.id, email: "conflict@example.test",
      passwordHash: "synthetic-unusable-digest", role: "STUDENT", status: "PENDING_APPROVAL" } });
    await expect(seedDevelopmentAccounts(fixture.admin, password)).rejects.toThrow("Seed collision");
    expect(await fixture.admin.user.count({ where: { id: { in: [...ids] } } })).toBe(1);
    expect((await fixture.admin.user.findUniqueOrThrow({ where: { id: conflict.id } })).email).toBe("conflict@example.test");
  });
});
