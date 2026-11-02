-- Owner-run read-only inspection after T020. This does not establish test coverage.
-- Use the same development database as Prisma DIRECT_URL; do not paste credentials.
SELECT current_database() AS database_name, current_user AS inspection_role,
  current_setting('TimeZone') AS database_timezone;

SELECT rolname, rolcanlogin, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, rolreplication
FROM pg_roles WHERE rolname IN ('oak_runtime', 'oak_auth_owner') ORDER BY rolname;

-- No rows: neither restricted Oak role inherits any other role.
SELECT member_role.rolname AS member_role, granted_role.rolname AS granted_role
FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid = m.member
JOIN pg_roles granted_role ON granted_role.oid = m.roleid
WHERE member_role.rolname IN ('oak_runtime', 'oak_auth_owner');

SELECT c.relname, c.relrowsecurity, pg_get_userbyid(c.relowner) AS table_owner
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('users', 'sessions', 'sign_in_attempts', 'audit_logs')
ORDER BY c.relname;

SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
  AND tablename IN ('users', 'sessions', 'sign_in_attempts', 'audit_logs')
ORDER BY tablename, policyname;

-- All false; runtime has no permission to mutate audit history.
SELECT has_table_privilege('oak_runtime', 'public.audit_logs', 'UPDATE') AS audit_update,
  has_table_privilege('oak_runtime', 'public.audit_logs', 'DELETE') AS audit_delete,
  has_table_privilege('oak_runtime', 'public.audit_logs', 'TRUNCATE') AS audit_truncate;

SELECT p.oid::regprocedure AS function_signature, pg_get_userbyid(p.proowner) AS function_owner,
  p.prosecdef AS security_definer, p.proconfig AS fixed_settings
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'oak_%' ORDER BY p.proname;

-- No rows: no PUBLIC or Supabase API role may execute these definer functions.
SELECT p.oid::regprocedure AS unexpected_executable, a.grantee
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
WHERE n.nspname = 'public' AND p.proname LIKE 'oak_%' AND a.privilege_type = 'EXECUTE'
  AND (a.grantee = 0 OR a.grantee IN
    (SELECT oid FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role')));

SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid = 'public.audit_logs'::regclass AND NOT tgisinternal;
