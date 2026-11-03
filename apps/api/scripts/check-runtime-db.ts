import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/env.js";

// Explicit datasource override ensures DIRECT_URL never becomes the runtime connection.
const client = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } }, log: [] });
try {
  const roles = await client.$queryRaw<Array<{
    current_user: string; rolsuper: boolean; rolbypassrls: boolean;
    rolcreaterole: boolean; rolcreatedb: boolean; rolreplication: boolean;
  }>>`SELECT current_user, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, rolreplication
    FROM pg_roles WHERE rolname = current_user`;
  const role = roles[0];
  const expected = env.NODE_ENV === "test" ? ["oak_api", "oak_api_test"] : ["oak_api"];
  if (!role || !expected.includes(role.current_user) || role.rolsuper || role.rolbypassrls ||
    role.rolcreaterole || role.rolcreatedb || role.rolreplication) {
    throw new Error("Unexpected runtime role");
  }
  const memberships = await client.$queryRaw<Array<{ rolname: string }>>`
    SELECT r.rolname FROM pg_roles r WHERE r.rolname <> current_user
      AND pg_has_role(current_user, r.oid, 'MEMBER')`;
  if (memberships.length !== 1 || memberships[0]?.rolname !== "oak_runtime") {
    throw new Error("Unexpected runtime memberships");
  }
  const owned = await client.$queryRaw<Array<{ count: bigint }>>`
    SELECT count(*) FROM pg_class WHERE relowner = (SELECT oid FROM pg_roles WHERE rolname = current_user)
      AND relkind IN ('r', 'p')`;
  if (owned[0]?.count !== 0n) throw new Error("Runtime role owns tables");
  const rows = await client.$queryRaw<Array<{ mutation: boolean; rows: bigint }>>`
    SELECT (has_table_privilege(current_user, 'public.audit_logs', 'UPDATE') OR
      has_table_privilege(current_user, 'public.audit_logs', 'DELETE') OR
      has_table_privilege(current_user, 'public.audit_logs', 'TRUNCATE')) AS mutation,
      (SELECT count(*) FROM public.users) AS rows`;
  if (rows[0]?.mutation !== false || rows[0]?.rows !== 0n) {
    throw new Error("Runtime access does not fail closed");
  }
  console.log("Runtime database check passed: restricted login, oak_runtime membership, no owned tables, no audit mutation, and no users visible without session context.");
} catch {
  // Prisma errors can include connection metadata; never print the raw error here.
  console.error("Runtime database check failed. Check the private connection settings, login grants, and database availability. No credentials are printed.");
  process.exitCode = 1;
} finally {
  await client.$disconnect();
}
