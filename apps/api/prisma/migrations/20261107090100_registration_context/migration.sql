-- T005. Capability context is independent of login identity. Apply after T004.
-- SECURITY DEFINER constraints: https://www.postgresql.org/docs/current/sql-createfunction.html
BEGIN;
GRANT SELECT ON public.registration_capabilities, public.email_verification_challenges TO oak_registration_owner;
CREATE POLICY registration_capability_lookup ON public.registration_capabilities
  FOR SELECT TO oak_registration_owner USING (true);
CREATE POLICY registration_challenge_lookup ON public.email_verification_challenges
  FOR SELECT TO oak_registration_owner USING (true);
GRANT SELECT (role, status) ON public.users TO oak_registration_owner;

-- Input: whether verified mailbox proof is required; returns its application UUID or
-- NULL. Revalidates hash/version/revocation/expiry/account at every statement. No writes.
CREATE FUNCTION public.oak_current_registration_id(p_verified BOOLEAN DEFAULT false) RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT a.id FROM public.registration_capabilities c
  JOIN public.registration_applications a ON a.id = c."applicationId"
  JOIN public.users u ON u.id = a."userId"
  JOIN public.email_verification_challenges v ON v."applicationId" = a.id
  WHERE c."tokenHash" = nullif(current_setting('oak.registration_hash', true), '')
    AND c."revokedAt" IS NULL AND c."expiresAt" > statement_timestamp()
    AND c."challengeVersion" = v.version
    AND u.role = 'STUDENT' AND u.status = 'PENDING_APPROVAL'
    AND a.status IN ('NEW', 'FREE_TRIAL_SCHEDULED')
    AND (p_verified IS FALSE OR (p_verified IS TRUE AND c."verifiedAt" IS NOT NULL
      AND v."consumedAt" IS NOT NULL AND u."emailVerifiedAt" IS NOT NULL))
$fn$;

-- Inputs: server-computed hash and verification requirement. Returns safe technical
-- identity only. Sets transaction-local registration context, clearing login identity.
-- Raises 28000 for all malformed/unknown/expired/revoked/ineligible proof states.
CREATE FUNCTION public.oak_set_registration_context(p_hash TEXT, p_verified BOOLEAN DEFAULT false)
RETURNS TABLE ("applicationId" UUID, "userId" UUID, verified BOOLEAN, version INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE application_id UUID;
BEGIN
  PERFORM set_config('oak.session_hash', '', true);
  PERFORM set_config('oak.registration_hash', '', true);
  IF p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' OR p_verified IS NULL THEN
    RAISE EXCEPTION 'Registration authorization required' USING ERRCODE = '28000';
  END IF;
  PERFORM set_config('oak.registration_hash', p_hash, true);
  application_id := public.oak_current_registration_id(p_verified);
  IF application_id IS NULL THEN
    RAISE EXCEPTION 'Registration authorization required' USING ERRCODE = '28000';
  END IF;
  RETURN QUERY SELECT a.id, a."userId", public.oak_current_registration_id(true) IS NOT NULL, a.version
    FROM public.registration_applications a WHERE a.id = application_id;
END
$fn$;

-- Applicant sees only its technical application; personal/document/evidence reads
-- require mailbox proof. No capability digests or OTP rows are granted to runtime.
CREATE POLICY registration_applicant_read ON public.registration_applications FOR SELECT TO oak_runtime
  USING (id = public.oak_current_registration_id(false));
CREATE POLICY registration_applicant_profile ON public.student_profiles FOR SELECT TO oak_runtime
  USING ("applicationId" = public.oak_current_registration_id(true));
CREATE POLICY registration_applicant_consents ON public.consent_evidence FOR SELECT TO oak_runtime
  USING ("applicationId" = public.oak_current_registration_id(true));
CREATE POLICY registration_applicant_documents ON public.registration_documents FOR SELECT TO oak_runtime
  USING ("applicationId" = public.oak_current_registration_id(true));

-- Trial/delivery tables remain Admin-only. Public routes must return curated progress,
-- never serialize full Prisma records or arbitrary object keys as API responses.
GRANT SELECT, INSERT ON public.audit_logs TO oak_registration_owner;
CREATE POLICY registration_audit_head ON public.audit_logs FOR SELECT TO oak_registration_owner USING (true);
CREATE POLICY registration_audit_actor ON public.audit_logs FOR INSERT TO oak_registration_owner
  WITH CHECK ("userId" = (SELECT a."userId" FROM public.registration_applications a
    WHERE a.id = public.oak_current_registration_id(false))
    AND "targetEntity" = 'RegistrationApplication'
    AND "targetId" = public.oak_current_registration_id(false)::TEXT
    AND action IN ('REGISTRATION_STARTED', 'EMAIL_VERIFICATION_REQUESTED',
      'EMAIL_VERIFICATION_FAILED', 'EMAIL_VERIFIED', 'REGISTRATION_AGREEMENTS_ACCEPTED',
      'REGISTRATION_DOCUMENT_READY', 'REGISTRATION_SUBMITTED'));

-- Inputs: allowlisted action and Node's shared redacted/canonical payload digest.
-- Actor/target come only from valid capability context. Returns inserted UUID; no raw
-- metadata stored. Takes the existing chain lock and uses the existing insert trigger.
-- Raises 28000 for missing proof, 22023 for invalid action/hash; failures roll back caller.
CREATE FUNCTION public.oak_registration_append_audit(p_action TEXT, p_payload_hash TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE application_id UUID; actor_id UUID; head TEXT; digest TEXT;
  record_id UUID := gen_random_uuid(); recorded_at TIMESTAMPTZ(3);
  needs_verified BOOLEAN;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('REGISTRATION_STARTED', 'EMAIL_VERIFICATION_REQUESTED',
    'EMAIL_VERIFICATION_FAILED', 'EMAIL_VERIFIED', 'REGISTRATION_AGREEMENTS_ACCEPTED',
    'REGISTRATION_DOCUMENT_READY', 'REGISTRATION_SUBMITTED')
    OR p_payload_hash IS NULL OR p_payload_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid registration audit event' USING ERRCODE = '22023';
  END IF;
  needs_verified := p_action IN ('EMAIL_VERIFIED', 'REGISTRATION_AGREEMENTS_ACCEPTED',
    'REGISTRATION_DOCUMENT_READY', 'REGISTRATION_SUBMITTED');
  -- Lock order: application/challenge/capability changes precede this global audit lock
  -- in calling services. Never wait for an application lock while holding audit lock.
  PERFORM pg_advisory_xact_lock(1935764577, 1);
  application_id := public.oak_current_registration_id(needs_verified);
  IF application_id IS NULL THEN
    RAISE EXCEPTION 'Registration authorization required' USING ERRCODE = '28000';
  END IF;
  SELECT a."userId" INTO actor_id FROM public.registration_applications a WHERE a.id = application_id;
  SELECT a."currentHash" INTO head FROM public.audit_logs a WHERE NOT EXISTS (
    SELECT 1 FROM public.audit_logs successor WHERE successor."previousHash" = a."currentHash"
  );
  head := coalesce(head, repeat('0', 64));
  recorded_at := clock_timestamp();
  -- Same exact concatenation and millisecond UTC formatting as oak_guard_audit_insert.
  digest := encode(sha256(convert_to(head ||
    to_char(recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') ||
    actor_id::TEXT || p_action || 'RegistrationApplication' || application_id::TEXT || p_payload_hash,
    'UTF8')), 'hex');
  INSERT INTO public.audit_logs (id, timestamp, "userId", action, "targetEntity", "targetId",
    "payloadHash", "previousHash", "currentHash")
  VALUES (record_id, recorded_at, actor_id, p_action, 'RegistrationApplication', application_id::TEXT,
    p_payload_hash, head, digest);
  RETURN record_id;
END
$fn$;

-- Definer roles are never available through SET ROLE from the runtime login.
DO $membership$
BEGIN
  IF pg_has_role('oak_runtime', 'oak_registration_owner', 'MEMBER') THEN
    RAISE EXCEPTION 'Runtime must not inherit registration function-owner role';
  END IF;
END
$membership$;
GRANT CREATE ON SCHEMA public TO oak_registration_owner;
DO $functions$
DECLARE f RECORD; api_role TEXT;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'
    AND p.proname IN ('oak_current_registration_id', 'oak_set_registration_context', 'oak_registration_append_audit') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f.signature);
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I', f.signature, api_role);
      END IF;
    END LOOP;
    EXECUTE format('ALTER FUNCTION %s OWNER TO oak_registration_owner', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO oak_runtime', f.signature);
  END LOOP;
END
$functions$;
REVOKE CREATE ON SCHEMA public FROM oak_registration_owner;
COMMIT;
