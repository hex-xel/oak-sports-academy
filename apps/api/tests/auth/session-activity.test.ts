import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/env.js", () => ({ env: {
  NODE_ENV: "test", DATABASE_URL: "postgresql://oak_api_test:synthetic@localhost:5432/oak_activity_test",
} }));
import { SessionContextError, withSession } from "../../src/lib/prisma.js";

function fixture(renewed: unknown = [{ renewed: true }]) {
  const identity = { id: "00000000-0000-4000-8000-000000000001",
    email: "synthetic@example.test", displayName: null, role: "STUDENT", status: "ACTIVE" };
  const query = vi.fn().mockResolvedValueOnce([identity]).mockResolvedValueOnce(renewed);
  const tx = { $queryRaw: query };
  const transaction = vi.fn(async (callback: (scoped: typeof tx) => Promise<unknown>) => callback(tx));
  return { query, tx, client: { $transaction: transaction } as unknown as PrismaClient };
}

describe("server-classified session activity", () => {
  it("does not renew default background/restore work", async () => {
    const f = fixture();
    await expect(withSession("a".repeat(64), async () => "restored", f.client)).resolves.toBe("restored");
    expect(f.query).toHaveBeenCalledTimes(1);
  });

  it("renews only after successful interactive work using the same transaction", async () => {
    const f = fixture();
    await expect(withSession("a".repeat(64), async (tx) => {
      expect(tx).toBe(f.tx);
      expect(f.query).toHaveBeenCalledTimes(1);
      return "done";
    }, f.client, "interactive")).resolves.toBe("done");
    expect(f.query).toHaveBeenCalledTimes(2);
    const renewal = f.query.mock.calls[1];
    expect(renewal?.[0].join("")).toContain("oak_touch_session_activity()");
    expect(renewal).toHaveLength(1);
  });

  it("does not renew failed work or retry it", async () => {
    const f = fixture();
    const failure = new Error("synthetic failure");
    const work = vi.fn().mockRejectedValue(failure);
    await expect(withSession("a".repeat(64), work, f.client, "interactive")).rejects.toBe(failure);
    expect(f.query).toHaveBeenCalledTimes(1);
    expect(work).toHaveBeenCalledTimes(1);
  });

  it.each([[[{ renewed: false }]], [[]], [[{ renewed: true }, { renewed: true }]]])(
    "rejects failed/ambiguous renewal so the transaction cannot commit", async (rows) => {
      const f = fixture(rows);
      await expect(withSession("a".repeat(64), async () => "done", f.client, "interactive"))
        .rejects.toBeInstanceOf(SessionContextError);
    },
  );

  it("propagates database renewal failure without a fallback or retry", async () => {
    const f = fixture();
    const failure = new Error("synthetic DB failure");
    f.query.mockReset().mockResolvedValueOnce([{
      id: "00000000-0000-4000-8000-000000000001", role: "STUDENT", status: "ACTIVE",
    }]).mockRejectedValueOnce(failure);
    await expect(withSession("a".repeat(64), async () => "done", f.client, "interactive"))
      .rejects.toBe(failure);
    expect(f.query).toHaveBeenCalledTimes(2);
  });
});
