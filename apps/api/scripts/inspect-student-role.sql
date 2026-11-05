-- Owner-run read-only inventory before and after T063 deploy, using the migration
-- database in Supabase SQL Editor. Contains counts only, never credentials or tokens.
SELECT e.enumlabel AS role_name
FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typname = 'Role'
ORDER BY e.enumsortorder;

SELECT role::text AS role_name, count(*) AS account_count
FROM public.users GROUP BY role ORDER BY role::text;

SELECT count(*) AS legacy_staff_accounts,
  count(*) FILTER (WHERE status = 'ACTIVE' AND "emailVerifiedAt" IS NOT NULL)
    AS verified_active_legacy_staff_accounts
FROM public.users WHERE role::text = 'STAFF';

SELECT count(*) AS unrevoked_unexpired_staff_sessions
FROM public.sessions s JOIN public.users u ON u.id = s."userId"
WHERE u.role::text = 'STAFF' AND s."revokedAt" IS NULL
  AND s."expiresAt" > statement_timestamp() AT TIME ZONE 'UTC';
