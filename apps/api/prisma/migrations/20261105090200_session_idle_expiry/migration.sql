-- T064. Keep old sessions' age: deploying must not silently extend their validity.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public.sessions ADD COLUMN "lastActivityAt" TIMESTAMP(3),
  ADD COLUMN "idleExpiresAt" TIMESTAMP(3);
UPDATE public.sessions SET "lastActivityAt" = "createdAt",
  "idleExpiresAt" = least("expiresAt", "createdAt" + INTERVAL '30 minutes');
ALTER TABLE public.sessions ALTER COLUMN "lastActivityAt" SET NOT NULL,
  ALTER COLUMN "lastActivityAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "idleExpiresAt" SET NOT NULL;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_idle_bounds CHECK (
  "lastActivityAt" >= "createdAt" AND "idleExpiresAt" > "lastActivityAt"
  AND "idleExpiresAt" <= "expiresAt"
  AND "idleExpiresAt" <= "lastActivityAt" + INTERVAL '30 minutes');
GRANT UPDATE ("lastActivityAt", "idleExpiresAt") ON public.sessions TO oak_auth_owner;

-- clock_timestamp checks actual time even after waiting within a transaction.
CREATE OR REPLACE FUNCTION public.oak_current_user_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT s."userId" FROM public.sessions s JOIN public.users u ON u.id = s."userId"
  WHERE s."tokenHash" = nullif(current_setting('oak.session_hash', true), '')
    AND s."revokedAt" IS NULL
    AND s."expiresAt" > clock_timestamp() AT TIME ZONE 'UTC'
    AND s."idleExpiresAt" > clock_timestamp() AT TIME ZONE 'UTC'
    AND u.status = 'ACTIVE' AND u."emailVerifiedAt" IS NOT NULL
    AND u.role IN ('STUDENT', 'ADMIN')
$fn$;

CREATE OR REPLACE FUNCTION public.oak_create_session(p_user_id UUID, p_token_hash TEXT, p_ip TEXT, p_agent TEXT)
RETURNS TABLE(id UUID, "expiresAt" TIMESTAMP(3))
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE new_id UUID := gen_random_uuid(); expires TIMESTAMP(3); started TIMESTAMP(3); eligible BOOLEAN;
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
  started := clock_timestamp() AT TIME ZONE 'UTC';
  expires := started + INTERVAL '8 hours';
  INSERT INTO public.sessions (id, "tokenHash", "userId", "expiresAt", "lastActivityAt",
    "idleExpiresAt", "ipAddress", "userAgent", "createdAt")
    VALUES (new_id, p_token_hash, p_user_id, expires, started, started + INTERVAL '30 minutes',
      left(p_ip, 45), left(p_agent, 255), started);
  UPDATE public.users SET "lastSignInAt" = started, "updatedAt" = started WHERE users.id = p_user_id;
  RETURN QUERY SELECT new_id, expires;
END
$fn$;

-- No parameters: renew only the already verified transaction-local bearer identity.
-- Locks before reading the clock; replay after a wait cannot revive an invalid session.
-- Returns false without changing rows when expired, revoked, unscoped or ineligible.
CREATE FUNCTION public.oak_touch_session_activity() RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE scoped_hash TEXT := nullif(current_setting('oak.session_hash', true), '');
  activity_time TIMESTAMP(3); changed INTEGER;
BEGIN
  PERFORM 1 FROM public.sessions WHERE "tokenHash" = scoped_hash FOR UPDATE;
  activity_time := clock_timestamp() AT TIME ZONE 'UTC';
  UPDATE public.sessions s SET "lastActivityAt" = greatest(s."lastActivityAt", activity_time),
    "idleExpiresAt" = least(s."expiresAt", greatest(s."lastActivityAt", activity_time) + INTERVAL '30 minutes')
  WHERE s."tokenHash" = scoped_hash AND s."revokedAt" IS NULL
    AND s."expiresAt" > activity_time AND s."idleExpiresAt" > activity_time
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = s."userId"
      AND u.status = 'ACTIVE' AND u."emailVerifiedAt" IS NOT NULL AND u.role IN ('STUDENT', 'ADMIN'));
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed = 1;
END
$fn$;
REVOKE ALL ON FUNCTION public.oak_touch_session_activity() FROM PUBLIC;
DO $grants$
DECLARE api_role TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.oak_touch_session_activity() FROM %I', api_role);
    END IF;
  END LOOP;
END
$grants$;
GRANT CREATE ON SCHEMA public TO oak_auth_owner;
ALTER FUNCTION public.oak_touch_session_activity() OWNER TO oak_auth_owner;
GRANT EXECUTE ON FUNCTION public.oak_touch_session_activity() TO oak_runtime;
REVOKE CREATE ON SCHEMA public FROM oak_auth_owner;
COMMIT;
