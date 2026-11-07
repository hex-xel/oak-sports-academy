import { randomBytes, randomUUID } from "node:crypto";
import { PrismaClient, Prisma } from "@prisma/client";
import { withSession } from "../../src/lib/prisma.js";
import { hashPassword } from "../../src/modules/auth/password.service.js";

function localUrl(value: string | undefined, username: string, connections: number): string {
  try {
    const url = new URL(value ?? "");
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== "127.0.0.1" ||
      url.port !== "55432" || url.pathname !== "/oak_auth_test" ||
      decodeURIComponent(url.username) !== username || !url.password ||
      url.hash || [...url.searchParams.keys()].some((key) => key !== "connection_limit")) throw 0;
    url.searchParams.set("connection_limit", String(connections));
    return url.toString();
  } catch { throw new Error("Dedicated local test database URLs are required; see README T031."); }
}

/**
 * Construct real restricted/privileged clients without opening a connection.
 * @param options Use eight connections only for dedicated concurrent audit/session tests.
 * @returns Synthetic actors, clients, lifecycle and verified session helper.
 * @throws Safe configuration errors before any connection if local URL guards fail.
 * @remarks connect additionally verifies marker/roles/migrations/empty sandbox. Cleanup
 * deletes only this fixture's records after checking for unexpected data; never truncates.
 */
export function createSecurityDatabase(options: { concurrency?: boolean } = {}) {
  const runtimeUrl = localUrl(process.env.TEST_DATABASE_URL, "oak_api_test", options.concurrency ? 8 : 1);
  const adminUrl = localUrl(process.env.TEST_DIRECT_URL, "postgres", 1);
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl } }, log: [], errorFormat: "minimal" });
  const admin = new PrismaClient({ datasources: { db: { url: adminUrl } }, log: [], errorFormat: "minimal" });
  const alice = { id: randomUUID(), displayName: "Synthetic Alice" };
  const bob = { id: randomUUID(), displayName: "Synthetic Bob" };
  const actor = { id: randomUUID(), displayName: "Synthetic Administrator" };
  const aliceOtherSession = { id: randomUUID() };
  const bobSession = { id: randomUUID() };
  const ids: string[] = [alice.id, bob.id, actor.id];
  const emails = ids.map((id) => `${id}@example.test`);
  const registrationOperations: string[] = [];
  const hashes = new Map<string, string>(ids.map((id) => [id, randomBytes(32).toString("hex")]));
  let ready = false;
  let digest: string;
  // Children first; SQL identifiers are fixed here, never supplied by a test/request.
  const registrationChildren = ["email_deliveries", "trial_assessments", "registration_documents",
    "consent_evidence", "student_profiles", "registration_capabilities", "email_verification_challenges"] as const;

  async function clean(): Promise<void> {
    await admin.$transaction(async (tx) => {
      const outsiders = await Promise.all([
        tx.user.count({ where: { id: { notIn: ids } } }),
        tx.session.count({ where: { userId: { notIn: ids } } }),
        tx.auditLog.count({ where: { userId: { notIn: ids } } }),
        tx.signInAttempt.count({ where: { email: { notIn: emails } } }),
      ]);
      if (outsiders.some((count) => count !== 0)) throw new Error("Unexpected sandbox records; cleanup refused.");
      const applications = await tx.registrationApplication.findMany({ select: { id: true, userId: true } });
      if (applications.some((row) => !ids.includes(row.userId))) {
        throw new Error("Unexpected registration records; cleanup refused.");
      }
      if (await tx.registrationDecoyFlow.count({ where: { startOperationId: { notIn: registrationOperations } } }) !== 0) {
        throw new Error("Unexpected decoy flow; cleanup refused.");
      }
      // Check every child table before deleting anything. Never clean another fixture's
      // application merely because its account shares a synthetic email suffix.
      for (const table of registrationChildren) {
        const counts = await tx.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
          SELECT count(*) AS count FROM ${Prisma.raw(`public.${table}`)}
          WHERE "applicationId" NOT IN (SELECT id FROM public.registration_applications
            WHERE "userId"::text IN (${Prisma.join(ids)}))`);
        if (counts[0]?.count !== 0n) throw new Error("Unexpected registration children; cleanup refused.");
      }
      await tx.auditLog.deleteMany({ where: { userId: { in: ids } } });
      await tx.registrationDecoyFlow.deleteMany({ where: { startOperationId: { in: registrationOperations } } });
      for (const table of registrationChildren) {
        await tx.$executeRaw(Prisma.sql`DELETE FROM ${Prisma.raw(`public.${table}`)}
          WHERE "applicationId" IN (SELECT id FROM public.registration_applications
            WHERE "userId"::text IN (${Prisma.join(ids)}))`);
      }
      await tx.registrationApplication.deleteMany({ where: { userId: { in: ids } } });
      await tx.signInAttempt.deleteMany({ where: { email: { in: emails } } });
      await tx.session.deleteMany({ where: { userId: { in: ids } } });
      await tx.user.deleteMany({ where: { id: { in: ids } } });
    });
  }

  return {
    /** Restricted runtime client, single connection unless concurrency was explicitly requested. */
    runtime,
    /** Privileged fixture client, never used by application callbacks. */
    admin,
    /** Synthetic Student identity; never real participant data. */
    alice,
    /** Second synthetic Student identity for isolation assertions. */
    bob,
    /** Synthetic Administrator with an independently verified context session. */
    actor,
    /** Second Alice-owned session, distinct from her context session. */
    aliceOtherSession,
    /** Bob-owned session for cross-account revocation checks. */
    bobSession,
    /** Register only a test-created synthetic account UUID/email for this fixture's owned cleanup. */
    ownCreatedUser(id: string, email: string): void {
      if (!ready || !/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f-]{36}@example\.test$/.test(email)) {
        throw new Error("Synthetic fixture ownership registration refused.");
      }
      if (!ids.includes(id)) ids.push(id);
      if (!emails.includes(email)) emails.push(email);
    },
    /** Register a generated request operation before creating/rotating a non-authorizing decoy. */
    ownRegistrationOperation(id: string): void {
      if (!ready || !/^[0-9a-f-]{36}$/.test(id)) throw new Error("Synthetic operation registration refused.");
      if (!registrationOperations.includes(id)) registrationOperations.push(id);
    },
    /** Validate explicit opt-in, local database identity, marker, privileges and migrations before writes. */
    async connect(): Promise<void> {
      if (process.env.NODE_ENV !== "test" || process.env.TEST_ALLOW_RESET !== "LOCAL_OAK_AUTH_TEST_ONLY") {
        throw new Error("Explicit disposable-test reset opt-in required.");
      }
      try {
        const [adminIdentity, runtimeIdentity] = await Promise.all([
          admin.$queryRaw<Array<{ db: string; role: string }>>`SELECT current_database() AS db, current_user AS role`,
          runtime.$queryRaw<Array<{ db: string; role: string }>>`SELECT current_database() AS db, current_user AS role`,
        ]);
        if (adminIdentity[0]?.db !== "oak_auth_test" || adminIdentity[0]?.role !== "postgres" ||
          runtimeIdentity[0]?.db !== "oak_auth_test" || runtimeIdentity[0]?.role !== "oak_api_test") throw 0;
        const marker = await admin.$queryRaw<Array<{ name: string }>>`SELECT name FROM oak_test_control.marker`;
        if (marker.length !== 1 || marker[0]?.name !== "oak_auth_test_v1") throw 0;
        const roles = await runtime.$queryRaw<Array<{ safe: boolean }>>`
          SELECT NOT (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)
            AND pg_has_role(current_user, 'oak_runtime', 'MEMBER') AS safe
          FROM pg_roles WHERE rolname = current_user`;
        if (roles.length !== 1 || roles[0]?.safe !== true) throw 0;
        const authority = await runtime.$queryRaw<Array<{ owned: bigint; extra: bigint; audit_mutation: boolean }>>`
          SELECT (SELECT count(*) FROM pg_class c JOIN pg_roles r ON r.oid=c.relowner
            WHERE r.rolname=current_user AND c.relkind IN ('r','p')) AS owned,
            (SELECT count(*) FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid
             JOIN pg_roles member ON member.oid=m.member
             WHERE member.rolname=current_user AND r.rolname <> 'oak_runtime') AS extra,
            (has_table_privilege(current_user,'public.audit_logs','UPDATE') OR
             has_table_privilege(current_user,'public.audit_logs','DELETE') OR
             has_table_privilege(current_user,'public.audit_logs','TRUNCATE')) AS audit_mutation`;
        if (authority[0]?.owned !== 0n || authority[0]?.extra !== 0n || authority[0]?.audit_mutation !== false) throw 0;
        const migrations = await admin.$queryRaw<Array<{ migration_name: string }>>`
          SELECT migration_name FROM public._prisma_migrations
          WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
        if (!["20261105090400_student_self_profile", "20261107090000_registration_foundation",
          "20261107090100_registration_context", "20261107090200_registration_otp"].every((name) => migrations.some((row) => row.migration_name === name))) throw 0;
        const registrationSecurity = await runtime.$queryRaw<Array<{ safe: boolean }>>`
          SELECT NOT pg_has_role(current_user, 'oak_registration_owner', 'MEMBER')
            AND NOT pg_has_role('oak_runtime', 'oak_registration_owner', 'MEMBER')
            AND (SELECT count(*) = 8 AND bool_and(c.relrowsecurity
              AND c.relowner <> 'oak_registration_owner'::regrole
              AND NOT has_table_privilege(current_user,c.oid,'INSERT')
              AND NOT has_table_privilege(current_user,c.oid,'UPDATE')
              AND NOT has_table_privilege(current_user,c.oid,'DELETE')
              AND NOT has_table_privilege(current_user,c.oid,'TRUNCATE'))
              FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
              WHERE n.nspname='public' AND c.relname IN ('registration_applications',
                'registration_capabilities','email_verification_challenges','student_profiles',
                'consent_evidence','registration_documents','trial_assessments','email_deliveries'))
            AND NOT has_table_privilege(current_user,'public.registration_capabilities','SELECT')
            AND NOT has_table_privilege(current_user,'public.email_verification_challenges','SELECT') AS safe`;
        if (registrationSecurity.length !== 1 || registrationSecurity[0]?.safe !== true) throw 0;
        const decoySecurity = await runtime.$queryRaw<Array<{ safe: boolean }>>`
          SELECT relrowsecurity AND NOT has_table_privilege(current_user,oid,'SELECT')
            AND NOT has_table_privilege(current_user,oid,'INSERT')
            AND NOT has_table_privilege(current_user,oid,'UPDATE')
            AND NOT has_table_privilege(current_user,oid,'DELETE') AS safe
          FROM pg_class WHERE oid='public.registration_decoy_flows'::regclass`;
        if (decoySecurity[0]?.safe !== true) throw 0;
        await clean();
        digest = await hashPassword("synthetic-fixture-password-only");
        ready = true;
      } catch {
        throw new Error("Disposable database preflight failed; no shared database is permitted. See README T031.");
      }
    },
    /** Reset only validated synthetic fixture records, then seed current role/idle-compatible data. */
    async reset(): Promise<void> {
      if (!ready) throw new Error("Test database is not validated.");
      await clean();
      await admin.$transaction(async (tx) => {
        for (const [index, identity] of [alice, bob, actor].entries()) {
          await tx.user.create({ data: { ...identity, email: emails[index]!, passwordHash: digest,
            role: identity.id === actor.id ? "ADMIN" : "STUDENT", status: "ACTIVE", emailVerifiedAt: new Date() } });
          const sessionId = identity.id === bob.id ? bobSession.id : randomUUID();
          await tx.$executeRaw`INSERT INTO public.sessions
            (id,"tokenHash","userId","createdAt","lastActivityAt","idleExpiresAt","expiresAt") VALUES
            (${sessionId}::uuid,${hashes.get(identity.id)!},${identity.id}::uuid,
             CURRENT_TIMESTAMP AT TIME ZONE 'UTC',CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
             (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '30 minutes',
             (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '8 hours')`;
        }
        await tx.$executeRaw`INSERT INTO public.sessions
          (id,"tokenHash","userId","createdAt","lastActivityAt","idleExpiresAt","expiresAt") VALUES
          (${aliceOtherSession.id}::uuid,${randomBytes(32).toString("hex")},${alice.id}::uuid,
           CURRENT_TIMESTAMP AT TIME ZONE 'UTC',CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
           (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '30 minutes',
           (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '8 hours')`;
        await tx.signInAttempt.create({ data: { email: emails[0]!, ipAddress: "127.0.0.1", succeeded: true } });
      });
    },
    /** Resolve only fixture-owned session hashes and run the real scoped helper on the restricted client. */
    async asUser<T>(userId: string, callback: (tx: Prisma.TransactionClient) => Promise<T>,
      activity: "background" | "interactive" = "background"): Promise<T> {
      const hash = hashes.get(userId);
      if (!ready || !hash) throw new Error("Unknown fixture principal.");
      return withSession(hash, async (tx) => callback(tx), runtime, activity);
    },
    /** Remove only validated owned fixtures and disconnect both clients, including after failed setup. */
    async close(): Promise<void> {
      try { if (ready) await clean(); }
      finally { ready = false; await Promise.all([runtime.$disconnect(), admin.$disconnect()]); }
    },
  };
}
