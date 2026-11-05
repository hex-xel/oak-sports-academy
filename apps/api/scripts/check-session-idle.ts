import { prisma } from "../src/lib/prisma.js";

try {
  const columns = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions'
      AND column_name IN ('lastActivityAt', 'idleExpiresAt') AND is_nullable = 'NO'`;
  const grants = await prisma.$queryRaw<Array<{ activity: boolean; expiry: boolean }>>`
    SELECT has_column_privilege(current_user, 'public.sessions', 'lastActivityAt', 'UPDATE') AS activity,
      has_column_privilege(current_user, 'public.sessions', 'idleExpiresAt', 'UPDATE') AS expiry`;
  const renewal = await prisma.$queryRaw<Array<{ renewed: boolean }>>`
    SELECT public.oak_touch_session_activity() AS renewed`;
  if (columns[0]?.count !== 2n || grants[0]?.activity !== false || grants[0]?.expiry !== false ||
    renewal[0]?.renewed !== false || await prisma.user.count() !== 0) {
    throw new Error("Idle boundary check failed");
  }
  console.log("Idle boundary check passed: required activity columns, no direct runtime deadline updates, unscoped renewal denied, and unscoped users hidden. Positive expiry/concurrency checks await T031.");
} catch {
  console.error("Idle boundary check failed. Share this safe message; do not print raw database errors or credentials.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
