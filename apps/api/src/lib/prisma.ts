import { Prisma, PrismaClient, type User } from "@prisma/client";
import { env } from "../config/env.js";
import { SessionContextError } from "../middleware/error-handler.js";

/** Backward-compatible safe session error; defined with the API error classes. */
export { SessionContextError } from "../middleware/error-handler.js";

const runtimeGlobal = globalThis as typeof globalThis & { oakRuntimePrisma?: PrismaClient };

/**
 * Shared, lazily connecting runtime client; never uses privileged DIRECT_URL.
 * Development reloads reuse the client to avoid opening additional connection pools.
 * Query/event logging is disabled because parameters may contain credential hashes.
 */
export const prisma = runtimeGlobal.oakRuntimePrisma ?? new PrismaClient({
  datasources: { db: { url: env.DATABASE_URL } },
  log: [],
  errorFormat: "minimal",
});
if (env.NODE_ENV !== "production") runtimeGlobal.oakRuntimePrisma = prisma;

/** Safe server-verified identity returned by oak_set_session_context; contains no hashes. */
export type SessionIdentity = Pick<User, "id" | "email" | "displayName" | "role" | "status">;

function isSessionRejection(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2010" && error.meta?.["code"] === "28000";
}

/**
 * Execute protected queries in the transaction that establishes verified session identity.
 * @param tokenHash Lowercase 64-character SHA-256 bearer hash, computed server-side.
 * Never pass a client-supplied user ID or a raw bearer token to this helper.
 * @param work Awaited database-only callback receiving the scoped client and safe identity.
 * @param client Trusted runtime client, defaulting to the singleton. The T031 fixture may
 * inject its restricted test client; never supply a privileged fixture/migration client.
 * @returns The callback result, after its transaction commits successfully.
 * @throws SessionContextError for malformed, unknown, expired, revoked, or ineligible sessions.
 * @throws Database/transaction or callback errors unchanged for T023's safe handler.
 * Never log raw database errors or serialize them directly to a client.
 * @remarks Changes in work commit atomically or roll back together. Database identity is
 * transaction-local and expires on commit/rollback, including with transaction pooling.
 * Use only tx inside work; do not launch detached work, make network calls, or retain tx.
 * No automatic retries: callbacks may perform mutations that must not be replayed.
 */
export async function withSession<T>(
  tokenHash: string,
  work: (tx: Prisma.TransactionClient, identity: SessionIdentity) => Promise<T>,
  client: PrismaClient = prisma,
): Promise<T> {
  if (typeof tokenHash !== "string" || !/^[0-9a-f]{64}$/.test(tokenHash)) {
    throw new SessionContextError();
  }
  return client.$transaction(async (tx) => {
    let identities: SessionIdentity[];
    try {
      // Tagged SQL binds the hash as data; the function validates account/session state.
      // Source: T019 oak_set_session_context and research.md R13's identity boundary.
      identities = await tx.$queryRaw<SessionIdentity[]>`
        SELECT id, email, "displayName", role, status
        FROM public.oak_set_session_context(${tokenHash})`;
    } catch (error) {
      if (isSessionRejection(error)) throw new SessionContextError();
      throw error;
    }
    const identity = identities[0];
    if (identities.length !== 1 || !identity || identity.status !== "ACTIVE") {
      throw new SessionContextError();
    }
    return work(tx, identity);
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    maxWait: 5_000,
    timeout: 10_000,
  });
}
