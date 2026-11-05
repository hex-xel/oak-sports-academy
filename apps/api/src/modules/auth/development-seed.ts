import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "./password.service.js";

/** Reserved synthetic Student identities; no Administrator or real participant data. */
export const SEED_ACCOUNTS = Object.freeze([
  { id: "00000000-0032-4000-8000-000000000001", email: "active.student@example.test", status: "ACTIVE", verified: true },
  { id: "00000000-0032-4000-8000-000000000002", email: "unverified.student@example.test", status: "ACTIVE", verified: false },
  { id: "00000000-0032-4000-8000-000000000003", email: "suspended.student@example.test", status: "SUSPENDED", verified: true },
  { id: "00000000-0032-4000-8000-000000000004", email: "pending.student@example.test", status: "PENDING_APPROVAL", verified: true },
] as const);

/** Private seed-only settings; never log or serialize this object. */
export type SeedSettings = Readonly<{ databaseUrl: string; password: string }>;

/**
 * Validate explicit development opt-in and private seed credentials before any I/O.
 * @param source Environment snapshot; privileged DIRECT_URL is seed-only, never runtime.
 * @returns Private validated URL/password. Does not mutate source or connect.
 * @throws Generic safe Error on production/unknown mode, absent opt-in or invalid inputs.
 */
export function parseSeedSettings(source: NodeJS.ProcessEnv): SeedSettings {
  try {
    if (source.NODE_ENV !== "development" || source.SEED_CONFIRM !== "DEVELOPMENT_FIXTURES_ONLY") throw 0;
    const password = source.SEED_PASSWORD;
    if (!password || password.length < 12 || password.length > 128) throw 0;
    const raw = source.DIRECT_URL;
    const url = new URL(raw ?? "");
    decodeURIComponent(url.password);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname ||
      !url.username || !url.password || url.pathname.length < 2 || url.hash ||
      /[\s<>\[\]]/.test(raw ?? "") || /%(?![0-9a-f]{2})/i.test(raw ?? "")) throw 0;
    return { databaseUrl: raw!, password };
  } catch { throw new Error("Seed refused. Use development mode, explicit seed confirmation, DIRECT_URL and a private 12–128 character SEED_PASSWORD."); }
}

/**
 * Add four synthetic development accounts atomically; never overwrite existing records.
 * @param client Privileged seed client targeting an explicitly selected development DB.
 * @param password Private seed password; unchanged, salted independently per new identity.
 * @returns Counts only. Existing reserved identities remain unchanged, including password.
 * @throws Safe collision/configuration errors or DB errors for the CLI's sanitized boundary.
 * @remarks Caller must validate development settings first. No sessions, attempts, audit
 * history or non-seed accounts are created/changed/deleted. No automatic retries/deletion.
 */
export async function seedDevelopmentAccounts(client: PrismaClient, password: string): Promise<{ created: number; existing: number }> {
  if (typeof password !== "string" || password.length < 12 || password.length > 128) {
    throw new Error("Invalid private development seed password.");
  }
  const hashes = await Promise.all(SEED_ACCOUNTS.map(() => hashPassword(password)));
  return client.$transaction(async (tx) => {
    let created = 0;
    let existing = 0;
    for (const [index, account] of SEED_ACCOUNTS.entries()) {
      const matches = await tx.user.findMany({ where: { OR: [{ id: account.id }, { email: account.email }] },
        select: { id: true, email: true, role: true } });
      if (matches.length !== 0) {
        if (matches.length !== 1 || matches[0]?.id !== account.id ||
          matches[0]?.email !== account.email || matches[0]?.role !== "STUDENT") {
          throw new Error("Seed collision: reserved identity is already used. No seed changes committed.");
        }
        existing++;
        continue;
      }
      await tx.user.create({ data: { id: account.id, email: account.email, role: "STUDENT",
        displayName: `Development seed: ${account.status.toLowerCase()}`,
        passwordHash: hashes[index]!, status: account.status,
        emailVerifiedAt: account.verified ? new Date() : null } });
      created++;
    }
    return { created, existing };
  }, { timeout: 10_000 });
}
