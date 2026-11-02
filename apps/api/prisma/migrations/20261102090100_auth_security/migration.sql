-- T019. Owner applies this on a development database; no credentials are stored here.
-- SECURITY DEFINER hardening source: https://www.postgresql.org/docs/16/sql-createfunction.html
-- RLS trust boundary: specs/001-user-login/research.md R13. The API remains trusted
-- for credential verification and carefully constrained authentication function calls.
BEGIN;
DO $roles$
DECLARE role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['oak_runtime', 'oak_auth_owner'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', role_name);
    ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name AND
      (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolcanlogin)) THEN
      RAISE EXCEPTION 'Existing Oak role has unsafe attributes; review roles before migration';
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
    WHERE r.rolname IN ('oak_runtime', 'oak_auth_owner')) THEN
    RAISE EXCEPTION 'Oak runtime/function roles must not inherit other roles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner
    WHERE r.rolname IN ('oak_runtime', 'oak_auth_owner') AND c.relkind IN ('r', 'p')) THEN
    RAISE EXCEPTION 'Oak runtime/function roles must not own tables';
  END IF;
  -- Required to transfer function ownership; runtime is never granted auth-owner membership.
  EXECUTE format('GRANT oak_auth_owner TO %I', current_user);
END
$roles$;
GRANT USAGE ON SCHEMA public TO oak_runtime, oak_auth_owner;
-- Temporary CREATE permits ALTER FUNCTION OWNER; revoked at the end of this transaction.
GRANT CREATE ON SCHEMA public TO oak_auth_owner;
REVOKE ALL ON public.users, public.sessions, public.sign_in_attempts, public.audit_logs FROM oak_runtime;
GRANT SELECT ON public.users, public.sessions, public.sign_in_attempts, public.audit_logs TO oak_runtime;
GRANT UPDATE ("displayName", "updatedAt") ON public.users TO oak_runtime;
GRANT UPDATE ("revokedAt") ON public.sessions TO oak_runtime;
GRANT INSERT ON public.audit_logs TO oak_runtime;
GRANT SELECT ON public.users, public.sessions, public.audit_logs TO oak_auth_owner;
GRANT UPDATE ("lastSignInAt", "updatedAt") ON public.users TO oak_auth_owner;
GRANT INSERT, UPDATE ("revokedAt") ON public.sessions TO oak_auth_owner;
GRANT INSERT ON public.sign_in_attempts TO oak_auth_owner;

-- The function owner is neither a table owner nor a BYPASSRLS role; explicit policies
-- give it only the access needed for the closed authentication function interface.
CREATE POLICY auth_lookup ON public.users FOR SELECT TO oak_auth_owner USING (true);
CREATE POLICY auth_last_login ON public.users FOR UPDATE TO oak_auth_owner USING (true) WITH CHECK (true);
CREATE POLICY auth_sessions_read ON public.sessions FOR SELECT TO oak_auth_owner USING (true);
CREATE POLICY auth_sessions_create ON public.sessions FOR INSERT TO oak_auth_owner WITH CHECK (true);
CREATE POLICY auth_sessions_revoke ON public.sessions FOR UPDATE TO oak_auth_owner USING (true) WITH CHECK (true);
CREATE POLICY auth_attempts_record ON public.sign_in_attempts FOR INSERT TO oak_auth_owner WITH CHECK (true);
CREATE POLICY auth_audit_head ON public.audit_logs FOR SELECT TO oak_auth_owner USING (true);

-- Only a live verified ACTIVE session can establish identity; do not set identity from
-- a request userId. Missing context returns NULL so policy predicates fail closed.
-- No parameters; returns the current eligible account UUID or NULL; reads auth tables only.
CREATE FUNCTION public.oak_current_user_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT s."userId" FROM public.sessions s JOIN public.users u ON u.id = s."userId"
  WHERE s."tokenHash" = nullif(current_setting('oak.session_hash', true), '')
    AND s."revokedAt" IS NULL AND s."expiresAt" > statement_timestamp() AT TIME ZONE 'UTC'
    AND u.status = 'ACTIVE' AND u."emailVerifiedAt" IS NOT NULL
$fn$;

CREATE POLICY users_self_read ON public.users FOR SELECT TO oak_runtime
  USING (id = public.oak_current_user_id());
CREATE POLICY users_self_profile ON public.users FOR UPDATE TO oak_runtime
  USING (id = public.oak_current_user_id()) WITH CHECK (id = public.oak_current_user_id());
CREATE POLICY sessions_self_read ON public.sessions FOR SELECT TO oak_runtime
  USING ("userId" = public.oak_current_user_id());
CREATE POLICY sessions_self_revoke ON public.sessions FOR UPDATE TO oak_runtime
  USING ("userId" = public.oak_current_user_id()) WITH CHECK ("userId" = public.oak_current_user_id());
-- Ordinary customers cannot read sign-in attempts. SELECT permission plus no matching
-- policy yields zero rows; privileged fixtures use the separate migration connection.
CREATE POLICY audit_self_or_admin_read ON public.audit_logs FOR SELECT TO oak_runtime
  USING ("userId" = public.oak_current_user_id() OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = public.oak_current_user_id() AND u.role = 'ADMIN'
  ));
CREATE POLICY audit_actor_insert ON public.audit_logs FOR INSERT TO oak_runtime
  WITH CHECK ("userId" = public.oak_current_user_id());

-- Returns only what password verification and eligibility checks require. The Express
-- auth service must rate-limit and verify Argon2id before calling oak_create_session.
-- p_email: validated submitted email. Returns at most one credential/status row; no writes.
CREATE FUNCTION public.oak_auth_lookup(p_email TEXT)
RETURNS TABLE(id UUID, email TEXT, "passwordHash" TEXT, role public."Role",
  status public."AccountStatus", "emailVerifiedAt" TIMESTAMP(3))
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT u.id, u.email, u."passwordHash", u.role, u.status, u."emailVerifiedAt"
  FROM public.users u WHERE u.email = lower(btrim(p_email))
$fn$;

-- Inputs: verified account UUID, new SHA-256 hash, optional IP/agent. Returns ID/expiry.
-- Locks the account, creates a session, updates last login; raises 28000/22023 on rejection.
CREATE FUNCTION public.oak_create_session(p_user_id UUID, p_token_hash TEXT, p_ip TEXT, p_agent TEXT)
RETURNS TABLE(id UUID, "expiresAt" TIMESTAMP(3))
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE new_id UUID := gen_random_uuid(); expires TIMESTAMP(3); eligible BOOLEAN;
BEGIN
  SELECT u.status = 'ACTIVE' AND u."emailVerifiedAt" IS NOT NULL INTO eligible
    FROM public.users u WHERE u.id = p_user_id FOR UPDATE;
  IF eligible IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Account cannot sign in' USING ERRCODE = '28000';
  END IF;
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid session hash' USING ERRCODE = '22023';
  END IF;
  expires := (statement_timestamp() AT TIME ZONE 'UTC') + INTERVAL '8 hours';
  INSERT INTO public.sessions (id, "tokenHash", "userId", "expiresAt", "ipAddress", "userAgent", "createdAt")
    VALUES (new_id, p_token_hash, p_user_id, expires, left(p_ip, 45), left(p_agent, 255), statement_timestamp() AT TIME ZONE 'UTC');
  UPDATE public.users SET "lastSignInAt" = statement_timestamp() AT TIME ZONE 'UTC',
    "updatedAt" = statement_timestamp() AT TIME ZONE 'UTC' WHERE users.id = p_user_id;
  RETURN QUERY SELECT new_id, expires;
END
$fn$;

-- Must be called inside the same explicit transaction as protected queries. true makes
-- context transaction-local. Reset first, so callers cannot reuse a previous identity.
-- Input: SHA-256 bearer hash. Returns safe identity; writes transaction-local context only.
-- Raises 28000 identically for missing, invalid, expired, revoked, or ineligible sessions.
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

-- Logout revokes by hash even if the token is expired; missing rows are idempotent.
-- Input: SHA-256 hash from the supplied token. Returns void; updates matching revocation only.
CREATE FUNCTION public.oak_revoke_session(p_token_hash TEXT) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
  UPDATE public.sessions SET "revokedAt" = coalesce("revokedAt", statement_timestamp() AT TIME ZONE 'UTC')
  WHERE "tokenHash" = p_token_hash
$fn$;

-- Inputs: validated email, IP, outcome; returns void and inserts a standalone attempt.
-- Table constraints reject malformed values; no credentials or token material are accepted.
CREATE FUNCTION public.oak_record_sign_in_attempt(p_email TEXT, p_ip TEXT, p_succeeded BOOLEAN) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
  INSERT INTO public.sign_in_attempts (id, email, "ipAddress", succeeded, "createdAt")
  VALUES (gen_random_uuid(), lower(btrim(p_email)), left(p_ip, 45), p_succeeded, statement_timestamp() AT TIME ZONE 'UTC')
$fn$;

-- Reads only the chain head hash, not other actors' audit details. Take this same lock
-- in T027 before computing the record; the trigger re-acquires it in the transaction.
-- No parameters; returns head hash or genesis; acquires a transaction lock, raises 28000 if unauthenticated.
CREATE FUNCTION public.oak_audit_head() RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE head TEXT;
BEGIN
  IF public.oak_current_user_id() IS NULL THEN RAISE EXCEPTION 'Unauthenticated' USING ERRCODE = '28000'; END IF;
  PERFORM pg_advisory_xact_lock(1935764577, 1);
  SELECT a."currentHash" INTO head FROM public.audit_logs a WHERE NOT EXISTS (
    SELECT 1 FROM public.audit_logs successor WHERE successor."previousHash" = a."currentHash"
  );
  RETURN coalesce(head, repeat('0', 64));
END
$fn$;

-- Appends are guarded at the DB boundary as well as T027's service layer. No UPDATE/
-- DELETE grant exists for runtime. A privileged migration/fixture role remains trusted.
-- Trigger input NEW; returns NEW unchanged; takes the append lock and raises 23514 for an invalid chain/hash.
CREATE FUNCTION public.oak_guard_audit_insert() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE head TEXT; expected TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(1935764577, 1);
  SELECT a."currentHash" INTO head FROM public.audit_logs a WHERE NOT EXISTS (
    SELECT 1 FROM public.audit_logs successor WHERE successor."previousHash" = a."currentHash"
  );
  IF NEW."previousHash" <> coalesce(head, repeat('0', 64)) THEN
    RAISE EXCEPTION 'Audit predecessor mismatch' USING ERRCODE = '23514';
  END IF;
  expected := encode(sha256(convert_to(
    NEW."previousHash" || to_char(NEW.timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') ||
    NEW."userId"::TEXT || NEW.action || NEW."targetEntity" || NEW."targetId" || NEW."payloadHash",
    'UTF8')), 'hex');
  IF NEW."currentHash" <> expected THEN RAISE EXCEPTION 'Audit hash mismatch' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER audit_insert_guard BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.oak_guard_audit_insert();

-- Default EXECUTE belongs to PUBLIC even for SECURITY DEFINER. Remove it and any
-- inherited Supabase default grants on our functions before exposing a narrow API.
DO $functions$
DECLARE f RECORD; api_role TEXT;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'oak_current_user_id', 'oak_auth_lookup', 'oak_create_session', 'oak_set_session_context',
      'oak_revoke_session', 'oak_record_sign_in_attempt', 'oak_audit_head', 'oak_guard_audit_insert'
    ) LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f.signature);
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I', f.signature, api_role);
      END IF;
    END LOOP;
    EXECUTE format('ALTER FUNCTION %s OWNER TO oak_auth_owner', f.signature);
  END LOOP;
END
$functions$;
GRANT EXECUTE ON FUNCTION public.oak_current_user_id(), public.oak_auth_lookup(TEXT),
  public.oak_create_session(UUID, TEXT, TEXT, TEXT), public.oak_set_session_context(TEXT),
  public.oak_revoke_session(TEXT), public.oak_record_sign_in_attempt(TEXT, TEXT, BOOLEAN),
  public.oak_audit_head() TO oak_runtime;
REVOKE CREATE ON SCHEMA public FROM oak_auth_owner;
-- Never grant oak_auth_owner to a runtime login. Owner provisions its login separately.
COMMIT;
