-- T063 follow-up: owner inventory confirms zero STAFF accounts/sessions.
-- PostgreSQL cannot remove an enum label in place:
-- https://www.postgresql.org/docs/current/datatype-enum.html#DATATYPE-ENUM-IMPLEMENTATION-DETAILS
-- Replace the type atomically without CASCADE; unknown dependencies fail closed.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.users IN ACCESS EXCLUSIVE MODE;
DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE role::text = 'STAFF') THEN
    RAISE EXCEPTION 'STAFF accounts require explicit disposition before removing the legacy role';
  END IF;
END
$guard$;

-- These two narrow functions return Role and must be recreated against the new type.
DROP FUNCTION public.oak_auth_lookup(TEXT);
DROP FUNCTION public.oak_set_session_context(TEXT);
DROP POLICY audit_self_or_admin_read ON public.audit_logs;
ALTER TABLE public.users ALTER COLUMN role DROP DEFAULT;
ALTER TYPE public."Role" RENAME TO "Role_legacy";
CREATE TYPE public."Role" AS ENUM ('STUDENT', 'ADMIN');
ALTER TABLE public.users ALTER COLUMN role TYPE public."Role"
  USING (role::text::public."Role");
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'STUDENT'::public."Role";
DROP TYPE public."Role_legacy" RESTRICT;

CREATE POLICY audit_self_or_admin_read ON public.audit_logs FOR SELECT TO oak_runtime
  USING ("userId" = public.oak_current_user_id() OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = public.oak_current_user_id() AND u.role = 'ADMIN'
  ));

CREATE FUNCTION public.oak_auth_lookup(p_email TEXT)
RETURNS TABLE(id UUID, email TEXT, "passwordHash" TEXT, role public."Role",
  status public."AccountStatus", "emailVerifiedAt" TIMESTAMP(3))
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT u.id, u.email, u."passwordHash", u.role, u.status, u."emailVerifiedAt"
  FROM public.users u WHERE u.email = lower(btrim(p_email))
$fn$;

CREATE FUNCTION public.oak_set_session_context(p_token_hash TEXT)
RETURNS TABLE(id UUID, email TEXT, "displayName" TEXT, role public."Role", status public."AccountStatus")
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE identity UUID;
BEGIN
  PERFORM set_config('oak.session_hash', '', true);
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Unauthenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM set_config('oak.session_hash', p_token_hash, true);
  identity := public.oak_current_user_id();
  IF identity IS NULL THEN RAISE EXCEPTION 'Unauthenticated' USING ERRCODE = '28000'; END IF;
  RETURN QUERY SELECT u.id, u.email, u."displayName", u.role, u.status FROM public.users u WHERE u.id = identity;
END
$fn$;

-- Recreating functions resets ownership/ACLs: explicitly restore the hardened boundary.
GRANT CREATE ON SCHEMA public TO oak_auth_owner;
DO $grants$
DECLARE signature regprocedure; api_role text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.oak_auth_lookup(text)'::regprocedure,
    'public.oak_set_session_context(text)'::regprocedure
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', signature);
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I', signature, api_role);
      END IF;
    END LOOP;
    EXECUTE format('ALTER FUNCTION %s OWNER TO oak_auth_owner', signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO oak_runtime', signature);
  END LOOP;
END
$grants$;
REVOKE CREATE ON SCHEMA public FROM oak_auth_owner;
COMMIT;
