-- Owner policy revision: Students may edit their own personal/contact profile.
-- Current auth schema has only displayName; future profile fields need reviewed grants.
-- Never restore table-wide UPDATE or allow role/status/verification/credential changes.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
GRANT UPDATE ("displayName", "updatedAt") ON public.users TO oak_runtime;
CREATE POLICY users_self_profile ON public.users FOR UPDATE TO oak_runtime
  USING (id = public.oak_current_user_id())
  WITH CHECK (id = public.oak_current_user_id());
COMMIT;
