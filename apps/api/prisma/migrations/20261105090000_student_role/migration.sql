-- T063: preserve enum identity, defaults, users and relationships while renaming.
-- Source: https://www.postgresql.org/docs/current/sql-altertype.html (RENAME VALUE).
-- Owner inventories legacy STAFF using scripts/inspect-student-role.sql before deploy.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TYPE public."Role" RENAME VALUE 'CUSTOMER' TO 'STUDENT';

-- CREATE OR REPLACE preserves the existing owner, grants, signature and RLS callers.
-- STAFF records remain intact, but their sessions cannot establish protected identity.
CREATE OR REPLACE FUNCTION public.oak_current_user_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT s."userId" FROM public.sessions s JOIN public.users u ON u.id = s."userId"
  WHERE s."tokenHash" = nullif(current_setting('oak.session_hash', true), '')
    AND s."revokedAt" IS NULL AND s."expiresAt" > statement_timestamp() AT TIME ZONE 'UTC'
    AND u.status = 'ACTIVE' AND u."emailVerifiedAt" IS NOT NULL
    AND u.role IN ('STUDENT', 'ADMIN')
$fn$;

-- Credential verification remains the trusted API's responsibility. Recheck supported
-- role under the same account lock as approval before any session or last-login write.
CREATE OR REPLACE FUNCTION public.oak_create_session(p_user_id UUID, p_token_hash TEXT, p_ip TEXT, p_agent TEXT)
RETURNS TABLE(id UUID, "expiresAt" TIMESTAMP(3))
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE new_id UUID := gen_random_uuid(); expires TIMESTAMP(3); eligible BOOLEAN;
BEGIN
  SELECT u.status = 'ACTIVE' AND u."emailVerifiedAt" IS NOT NULL
    AND u.role IN ('STUDENT', 'ADMIN') INTO eligible
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

COMMIT;
