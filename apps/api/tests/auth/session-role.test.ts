import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

// Import the real transaction helper without loading local credentials or connecting.
vi.mock("../../src/config/env.js", () => ({ env: {
  NODE_ENV: "test", DATABASE_URL: "postgresql://oak_api_test:synthetic@localhost:5432/oak_role_test",
} }));
import { SessionContextError, withSession } from "../../src/lib/prisma.js";

describe("supported session roles", () => {
  it.each(["STUDENT", "ADMIN"])("permits verified database identity for %s", async (role) => {
    const identity = { id: "00000000-0000-4000-8000-000000000001",
      email: "synthetic@example.test", displayName: null, role, status: "ACTIVE" };
    const tx = { $queryRaw: vi.fn().mockResolvedValue([identity]) };
    const client = { $transaction: vi.fn(async (callback: (scoped: typeof tx) => Promise<unknown>) => callback(tx)) } as unknown as PrismaClient;
    const work = vi.fn().mockResolvedValue("scoped");
    await expect(withSession("a".repeat(64), work, client)).resolves.toBe("scoped");
    expect(work).toHaveBeenCalledWith(tx, identity);
  });

  it.each(["STAFF", "CUSTOMER", "UNKNOWN"])("rejects legacy/unsupported identity %s before protected work", async (role) => {
    const tx = { $queryRaw: vi.fn().mockResolvedValue([{
      id: "00000000-0000-4000-8000-000000000001", email: "synthetic@example.test",
      displayName: null, role, status: "ACTIVE",
    }]) };
    const client = { $transaction: vi.fn(async (callback: (scoped: typeof tx) => Promise<unknown>) => callback(tx)) } as unknown as PrismaClient;
    const work = vi.fn();
    await expect(withSession("a".repeat(64), work, client)).rejects.toBeInstanceOf(SessionContextError);
    expect(work).not.toHaveBeenCalled();
  });
});
