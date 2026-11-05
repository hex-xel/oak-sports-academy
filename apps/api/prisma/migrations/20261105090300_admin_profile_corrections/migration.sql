-- T065: Student personal/contact corrections require an Administrator workflow.
-- Removing both table and column grants avoids a table grant overriding column denial.
-- Auth-owner last-sign-in updates remain narrowly granted by the earlier migration.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
REVOKE UPDATE ON public.users FROM oak_runtime;
REVOKE UPDATE ("displayName", "updatedAt") ON public.users FROM oak_runtime;
DROP POLICY users_self_profile ON public.users;
COMMIT;
