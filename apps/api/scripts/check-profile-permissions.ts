import { prisma } from "../src/lib/prisma.js";

try {
  const grants = await prisma.$queryRaw<Array<{ name: boolean; updated: boolean }>>`
    SELECT has_column_privilege(current_user, 'public.users', 'displayName', 'UPDATE') AS name,
      has_column_privilege(current_user, 'public.users', 'updatedAt', 'UPDATE') AS updated`;
  const policies = await prisma.$queryRaw<Array<{ policyname: string }>>`
    SELECT policyname FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'users' AND policyname = 'users_self_profile'`;
  const protectedFields = await prisma.$queryRaw<Array<{ allowed: boolean }>>`
    SELECT bool_or(has_column_privilege(current_user, 'public.users', field, 'UPDATE')) AS allowed
    FROM unnest(ARRAY['role', 'status', 'email', 'passwordHash', 'emailVerifiedAt']) AS fields(field)`;
  if (grants.length !== 1 || grants[0]?.name !== true || grants[0]?.updated !== true ||
    policies.length !== 1 || protectedFields[0]?.allowed !== false || await prisma.user.count() !== 0) {
    throw new Error("Profile permission check failed");
  }
  console.log("Profile permission check passed: runtime has scoped displayName/updatedAt grants, self-profile policy is present, and unscoped users stay hidden. Self-edit/cross-user isolation and protected-field denial await T031.");
} catch {
  console.error("Profile permission check failed. Share this safe message; do not print raw database errors or credentials.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
