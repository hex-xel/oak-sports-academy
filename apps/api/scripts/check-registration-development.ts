import { existsSync, readdirSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { registrationDevelopmentUrl } from "./helpers/registration-development-target.js";

// Owner-invoked checkpoint only; default mode is read-only. Never import from the API.
const envFile = fileURLToPath(new URL("../.env", import.meta.url));
const migrations = fileURLToPath(new URL("../prisma/migrations/", import.meta.url));
const expected = ["20261102090000_init_auth", "20261102090100_auth_security",
  "20261105090000_student_role", "20261105090100_remove_legacy_staff", "20261105090200_session_idle_expiry",
  "20261105090300_admin_profile_corrections", "20261105090400_student_self_profile",
  "20261107090000_registration_foundation", "20261107090100_registration_context", "20261107090200_registration_otp"];
let admin: PrismaClient | undefined;
let runtime: PrismaClient | undefined;
let stage = "command arguments (only optional --apply is accepted)";
try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--apply")) throw new Error();
  stage = "private .env loading";
  if (existsSync(envFile)) loadEnvFile(envFile);
  stage = "NODE_ENV (must be explicitly development)";
  if (process.env.NODE_ENV !== "development") throw new Error();
  stage = "DIRECT_URL (confirmed project, postgres login, port 5432 and sslmode=require)";
  const direct = registrationDevelopmentUrl(process.env.DIRECT_URL, "postgres");
  stage = "DATABASE_URL (confirmed project, oak_api login, port 5432 and sslmode=require)";
  const restricted = registrationDevelopmentUrl(process.env.DATABASE_URL, "oak_api");
  stage = "local migration directory allowlist";
  const local = readdirSync(migrations, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  if (JSON.stringify(local) !== JSON.stringify(expected)) throw new Error();
  stage = "Prisma client construction";
  admin = new PrismaClient({ datasources: { db: { url: direct } }, log: [], errorFormat: "minimal" });
  runtime = new PrismaClient({ datasources: { db: { url: restricted } }, log: [], errorFormat: "minimal" });
  stage = "database identity";
  const identity = await admin.$queryRaw<Array<{ db: string; role: string }>>`SELECT current_database() AS db, current_user AS role`;
  if (identity[0]?.db !== "postgres" || identity[0]?.role !== "postgres") throw new Error();
  const roles = await runtime.$queryRaw<Array<{ db: string; role: string; unsafe: boolean; members: string[]; owned: bigint; visible: bigint }>>`
    SELECT current_database() AS db, current_user AS role,
      (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication) AS unsafe,
      ARRAY(SELECT r.rolname::text FROM pg_roles r WHERE r.rolname <> current_user AND pg_has_role(current_user,r.oid,'MEMBER')) AS members,
      (SELECT count(*) FROM pg_class WHERE relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) AND relkind IN ('r','p')) AS owned,
      (SELECT count(*) FROM public.users) AS visible FROM pg_roles WHERE rolname=current_user`;
  const role = roles[0];
  if (!role || role.db !== "postgres" || role.role !== "oak_api" || role.unsafe || role.owned !== 0n || role.visible !== 0n ||
    role.members.length !== 1 || role.members[0] !== "oak_runtime") throw new Error();
  stage = "migration history";
  const history = async () => {
    const rows = await admin!.$queryRaw<Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>>`
      SELECT migration_name, finished_at, rolled_back_at FROM public._prisma_migrations ORDER BY migration_name`;
    // Failed or rolled-back entries need owner review; never silently repair history.
    if (rows.some(row => !row.finished_at || row.rolled_back_at) ||
      JSON.stringify(rows.map(row => row.migration_name)) !== JSON.stringify(expected.slice(0, rows.length)) || rows.length < 7 || rows.length > 10) throw new Error();
    return rows.length;
  };
  let count = await history();
  console.log(`Development target and restricted runtime passed. Pending migrations: ${10 - count}.`);
  if (args[0] === "--apply" && count < 10) {
    stage = "migration deployment (some migrations may have applied; inspect history before retrying)";
    const require = createRequire(import.meta.url);
    const child = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "deploy", "--schema",
      fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url))], {
      env: { ...process.env, DATABASE_URL: direct, DIRECT_URL: direct }, encoding: "utf8", stdio: "pipe",
      timeout: 120_000, windowsHide: true, maxBuffer: 1024 * 1024,
    });
    // Prisma diagnostics can contain connection metadata; never forward raw output.
    if (child.error || child.status !== 0) throw new Error();
    count = await history();
  }
  if (count === 10) {
    stage = "registration table security";
    const tables = ["registration_applications", "registration_capabilities", "email_verification_challenges", "student_profiles",
      "consent_evidence", "registration_documents", "trial_assessments", "email_deliveries", "registration_decoy_flows"];
    const rows = await admin.$queryRaw<Array<{ name: string; rls: boolean; owner: string; writes: boolean; reads: boolean; exposed: boolean }>>`
      SELECT c.relname AS name,c.relrowsecurity AS rls,pg_get_userbyid(c.relowner) AS owner,
        has_table_privilege('oak_api',c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS writes,
        has_table_privilege('oak_api',c.oid,'SELECT') AS reads,
        EXISTS(SELECT 1 FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) acl
          LEFT JOIN pg_roles grantee ON grantee.oid=acl.grantee
          WHERE acl.grantee=0 OR grantee.rolname IN ('anon','authenticated','service_role')) AS exposed
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relname=ANY(${tables}::text[])`;
    if (rows.length !== tables.length || rows.some(row => !row.rls || row.owner !== "postgres" || row.writes || row.exposed ||
      (["registration_capabilities", "email_verification_challenges", "registration_decoy_flows"].includes(row.name) && row.reads))) throw new Error();
    const visible = await runtime.registrationApplication.count();
    if (visible !== 0) throw new Error();
    console.log("Registration migrations and table security checkpoint passed. Real OTP receipt is still pending.");
  } else console.log("Read-only checkpoint passed. No migrations applied; real OTP remains blocked until deployment.");
} catch {
  console.error(`Registration development checkpoint failed at ${stage}. Stop and report this safe message; do not reset or repair the database.`);
  process.exitCode = 1;
} finally {
  await Promise.all([admin?.$disconnect(), runtime?.$disconnect()]);
}
