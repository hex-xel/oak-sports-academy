-- T008: closed credential/OTP operations. The API verifies Argon2 outside transactions;
-- database functions recheck the account/hash snapshot and serialize all state changes.
BEGIN;
GRANT SELECT ("passwordHash") ON public.users TO oak_registration_owner;
GRANT INSERT ON public.users TO oak_registration_owner;
GRANT UPDATE ("emailVerifiedAt", "updatedAt") ON public.users TO oak_registration_owner;
CREATE POLICY registration_create_student ON public.users FOR INSERT TO oak_registration_owner
  WITH CHECK (role = 'STUDENT' AND status = 'PENDING_APPROVAL' AND "emailVerifiedAt" IS NULL);
CREATE POLICY registration_verify_student ON public.users FOR UPDATE TO oak_registration_owner
  USING (role = 'STUDENT' AND status = 'PENDING_APPROVAL')
  WITH CHECK (role = 'STUDENT' AND status = 'PENDING_APPROVAL');
DO $grants$
DECLARE name TEXT;
BEGIN
  FOREACH name IN ARRAY ARRAY['registration_applications','registration_capabilities',
    'email_verification_challenges','email_deliveries'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO oak_registration_owner',name);
    EXECUTE format('CREATE POLICY registration_closed_insert ON public.%I FOR INSERT TO oak_registration_owner WITH CHECK (true)',name);
    EXECUTE format('CREATE POLICY registration_closed_update ON public.%I FOR UPDATE TO oak_registration_owner USING (true) WITH CHECK (true)',name);
  END LOOP;
END
$grants$;
CREATE POLICY registration_delivery_lookup ON public.email_deliveries FOR SELECT TO oak_registration_owner USING (true);

-- Inputs email/original operation UUID. Returns internal application identity only;
-- not public recovery authorization. No mutation. Caller still must verify credentials.
CREATE FUNCTION public.oak_registration_start_match(p_email TEXT,p_operation UUID)
RETURNS TABLE ("applicationId" UUID,"userId" UUID)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
 SELECT a.id,a."userId" FROM public.registration_applications a JOIN public.users u ON u.id=a."userId"
 WHERE u.email=p_email AND a."startOperationId"=p_operation
$fn$;

-- Internal issuer, never executable by runtime. Caller holds application lock, then
-- user/challenge locks; audit is last. Returns outcome/timing only, never code/token.
-- Keeps the original application deadline. Counter counts all actual issue intents,
-- including failed delivery, so a new capability cannot reset the account quota.
CREATE FUNCTION public.oak_registration_issue(p_app UUID,p_cap TEXT,p_challenge UUID,
 p_digest TEXT,p_operation UUID,p_fresh BOOLEAN,p_audit TEXT)
RETURNS TABLE(outcome TEXT,"challengeId" UUID,"codeExpiresAt" TIMESTAMPTZ(3),
 "resendAfter" TIMESTAMPTZ(3),"registrationExpiresAt" TIMESTAMPTZ(3),"deliveryId" UUID,issued BOOLEAN,"retryAfter" INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE a public.registration_applications%ROWTYPE; v public.email_verification_challenges%ROWTYPE;
 n TIMESTAMPTZ(3):=clock_timestamp(); deadline TIMESTAMPTZ(3); delivery UUID;
 next_version INTEGER; preserve BOOLEAN; retry INTEGER;
BEGIN
 IF p_cap IS NULL OR p_cap !~ '^[0-9a-f]{64}$' OR p_digest IS NULL OR p_digest !~ '^[0-9a-f]{64}$'
   OR p_challenge IS NULL OR p_operation IS NULL OR p_fresh IS NULL THEN
   RAISE EXCEPTION 'Invalid registration operation' USING ERRCODE='22023';
 END IF;
 SELECT * INTO a FROM public.registration_applications WHERE id=p_app FOR UPDATE;
 IF NOT FOUND OR a.stage<>'DRAFT' OR a.status<>'NEW' THEN
   RAISE EXCEPTION 'Registration authorization required' USING ERRCODE='28000';
 END IF;
 deadline:=a."createdAt"+INTERVAL '1 hour';
 IF deadline<=n THEN
   RETURN QUERY SELECT 'EXPIRED',NULL::UUID,NULL::TIMESTAMPTZ,NULL::TIMESTAMPTZ,deadline,NULL::UUID,false,0; RETURN;
 END IF;
 SELECT * INTO v FROM public.email_verification_challenges WHERE "applicationId"=p_app FOR UPDATE;
 preserve:=v.id IS NOT NULL AND NOT p_fresh AND v."consumedAt" IS NULL AND v."expiresAt">n AND v.attempts<5;
 IF NOT preserve THEN
   IF v.id IS NOT NULL AND v."resendAfter">n THEN
     retry:=greatest(1,ceil(extract(epoch FROM v."resendAfter"-n))::INTEGER);
     RETURN QUERY SELECT 'LIMITED',NULL::UUID,NULL::TIMESTAMPTZ,NULL::TIMESTAMPTZ,deadline,NULL::UUID,false,retry; RETURN;
   END IF;
   SELECT greatest(1,ceil(extract(epoch FROM min(d."createdAt")+INTERVAL '15 minutes'-n))::INTEGER)
     INTO retry FROM public.email_deliveries d WHERE d."applicationId"=p_app AND d.kind='OTP'
       AND d."createdAt">n-INTERVAL '15 minutes' HAVING count(*)>=5;
   IF retry IS NOT NULL THEN
     RETURN QUERY SELECT 'LIMITED',NULL::UUID,NULL::TIMESTAMPTZ,NULL::TIMESTAMPTZ,deadline,NULL::UUID,false,retry; RETURN;
   END IF;
   next_version:=coalesce(v.version,0)+1;
   IF v.id IS NULL THEN
     INSERT INTO public.email_verification_challenges(id,"applicationId","codeDigest",version,attempts,
       "expiresAt","resendAfter","issueOperationId","issuedAt")
       VALUES(p_challenge,p_app,p_digest,next_version,0,n+INTERVAL '10 minutes',n+INTERVAL '60 seconds',p_operation,n);
   ELSE
     UPDATE public.email_verification_challenges SET id=p_challenge,"codeDigest"=p_digest,version=next_version,
       attempts=0,"consumedAt"=NULL,"expiresAt"=n+INTERVAL '10 minutes',"resendAfter"=n+INTERVAL '60 seconds',
       "issueOperationId"=p_operation,"issuedAt"=n WHERE "applicationId"=p_app;
   END IF;
   delivery:=gen_random_uuid();
   INSERT INTO public.email_deliveries(id,"applicationId","operationId",kind,"eventVersion",state,
     "idempotencyKey","attemptCount","createdAt","updatedAt")
     VALUES(delivery,p_app,gen_random_uuid(),'OTP',next_version,'PENDING',
       'registration-otp/'||p_challenge::TEXT,0,n,n);
   SELECT * INTO v FROM public.email_verification_challenges WHERE "applicationId"=p_app;
 END IF;
 UPDATE public.registration_capabilities SET "revokedAt"=coalesce("revokedAt",n) WHERE "applicationId"=p_app;
 INSERT INTO public.registration_capabilities(id,"applicationId","tokenHash","challengeVersion","expiresAt","createdAt")
   VALUES(gen_random_uuid(),p_app,p_cap,v.version,deadline,n);
 PERFORM set_config('oak.session_hash','',true);
 PERFORM set_config('oak.registration_hash',p_cap,true);
 IF NOT preserve THEN PERFORM public.oak_registration_append_audit('EMAIL_VERIFICATION_REQUESTED',p_audit); END IF;
 RETURN QUERY SELECT 'OK',v.id,v."expiresAt",v."resendAfter",deadline,delivery,NOT preserve,0;
END
$fn$;

-- Inputs are server-validated credentials/digests and fresh IDs; no role/status input.
-- p_retry is trusted only after Argon2 verification in the API (same boundary as login).
-- Revalidates stored digest, original operation, email/type and eligibility under locks.
-- Returns no row for unrelated duplicates; never overwrites an existing password.
CREATE FUNCTION public.oak_registration_start(p_email TEXT,p_password TEXT,p_type TEXT,p_operation UUID,
 p_user UUID,p_app UUID,p_cap TEXT,p_challenge UUID,p_digest TEXT,p_retry BOOLEAN,p_expected TEXT,p_audit TEXT)
RETURNS TABLE(outcome TEXT,"challengeId" UUID,"codeExpiresAt" TIMESTAMPTZ(3),
 "resendAfter" TIMESTAMPTZ(3),"registrationExpiresAt" TIMESTAMPTZ(3),"deliveryId" UUID,issued BOOLEAN,"retryAfter" INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE u public.users%ROWTYPE; a public.registration_applications%ROWTYPE; fresh BOOLEAN:=false;
BEGIN
 IF p_email IS NULL OR p_email<>lower(btrim(p_email)) OR char_length(p_email) NOT BETWEEN 3 AND 254
   OR p_password IS NULL OR p_password !~ '^\$argon2id\$' OR char_length(p_password)>255
   OR p_type IS NULL OR p_type NOT IN ('NEW_WHITE_BELT','EXPERIENCED') OR p_operation IS NULL THEN
   RAISE EXCEPTION 'Invalid registration operation' USING ERRCODE='22023';
 END IF;
 -- Same lock order for every start, independent of which email won a race.
 PERFORM pg_advisory_xact_lock(hashtextextended('registration-operation/'||p_operation::TEXT,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('registration-email/'||p_email,0));
 SELECT usr.id,usr.email,usr."passwordHash",usr.role,usr.status INTO u.id,u.email,u."passwordHash",u.role,u.status FROM public.users usr WHERE usr.email=p_email;
 IF u.id IS NULL THEN
   IF EXISTS(SELECT 1 FROM public.registration_applications WHERE "startOperationId"=p_operation) THEN RETURN; END IF;
   INSERT INTO public.users(id,email,"passwordHash",role,status,"createdAt","updatedAt")
     VALUES(p_user,p_email,p_password,'STUDENT','PENDING_APPROVAL',CURRENT_TIMESTAMP AT TIME ZONE 'UTC',CURRENT_TIMESTAMP AT TIME ZONE 'UTC');
   INSERT INTO public.registration_applications(id,"userId","studentType","startOperationId","updatedAt")
     VALUES(p_app,p_user,p_type::public."RegistrationStudentType",p_operation,clock_timestamp());
   SELECT * INTO a FROM public.registration_applications WHERE id=p_app FOR UPDATE;
   fresh:=true;
 ELSE
   SELECT * INTO a FROM public.registration_applications WHERE "userId"=u.id FOR UPDATE;
   SELECT usr.id,usr.email,usr."passwordHash",usr.role,usr.status INTO u.id,u.email,u."passwordHash",u.role,u.status FROM public.users usr WHERE usr.id=u.id FOR UPDATE;
   IF p_retry IS DISTINCT FROM true OR p_expected IS DISTINCT FROM u."passwordHash"
     OR u.role<>'STUDENT' OR u.status<>'PENDING_APPROVAL' OR a.id IS NULL
     OR a."startOperationId"<>p_operation OR a."studentType"::TEXT<>p_type OR a.stage<>'DRAFT' OR a.status<>'NEW'
     OR a.id IS DISTINCT FROM p_app OR u.id IS DISTINCT FROM p_user THEN RETURN; END IF;
 END IF;
 RETURN QUERY SELECT * FROM public.oak_registration_issue(a.id,p_cap,p_challenge,p_digest,p_operation,false,p_audit);
 IF fresh THEN PERFORM public.oak_registration_append_audit('REGISTRATION_STARTED',p_audit); END IF;
END
$fn$;

-- Authenticated resend. Returns internal recipient for the server adapter only; API
-- response must project the shared DTO. All actual issuance is serialized by app lock.
CREATE FUNCTION public.oak_registration_resend(p_old_challenge UUID,p_operation UUID,p_cap TEXT,p_challenge UUID,p_digest TEXT,p_audit TEXT)
RETURNS TABLE(outcome TEXT,"challengeId" UUID,"codeExpiresAt" TIMESTAMPTZ(3),
 "resendAfter" TIMESTAMPTZ(3),"registrationExpiresAt" TIMESTAMPTZ(3),"deliveryId" UUID,issued BOOLEAN,"retryAfter" INTEGER,email TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE app_id UUID; a public.registration_applications%ROWTYPE; u public.users%ROWTYPE;
 v public.email_verification_challenges%ROWTYPE;
BEGIN
 app_id:=public.oak_current_registration_id(false);
 SELECT * INTO a FROM public.registration_applications WHERE id=app_id FOR UPDATE;
 SELECT usr.id,usr.email INTO u.id,u.email FROM public.users usr WHERE usr.id=a."userId" FOR UPDATE;
 SELECT * INTO v FROM public.email_verification_challenges WHERE "applicationId"=app_id FOR UPDATE;
 IF app_id IS NULL OR public.oak_current_registration_id(false) IS DISTINCT FROM app_id THEN
   RAISE EXCEPTION 'Registration authorization required' USING ERRCODE='28000'; END IF;
 IF p_old_challenge IS DISTINCT FROM v.id OR v."consumedAt" IS NOT NULL OR p_operation IS NOT DISTINCT FROM v."issueOperationId" THEN
   RETURN QUERY SELECT 'CONFLICT',NULL::UUID,NULL::TIMESTAMPTZ,NULL::TIMESTAMPTZ,NULL::TIMESTAMPTZ,NULL::UUID,false,0,NULL::TEXT; RETURN;
 END IF;
 RETURN QUERY SELECT i.*,u.email FROM public.oak_registration_issue(app_id,p_cap,p_challenge,p_digest,p_operation,true,p_audit) i;
END
$fn$;

-- Atomic verifier. Incorrect attempts return an outcome (not an exception), so the
-- caller commits the counter/audit before turning it into a safe HTTP error.
CREATE FUNCTION public.oak_registration_verify(p_challenge UUID,p_digest TEXT,p_new_cap TEXT,p_audit TEXT)
RETURNS TABLE(outcome TEXT,"registrationExpiresAt" TIMESTAMPTZ(3))
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE app_id UUID; a public.registration_applications%ROWTYPE; u public.users%ROWTYPE;
 v public.email_verification_challenges%ROWTYPE; n TIMESTAMPTZ(3); deadline TIMESTAMPTZ(3);
BEGIN
 app_id:=public.oak_current_registration_id(false);
 SELECT * INTO a FROM public.registration_applications WHERE id=app_id FOR UPDATE;
 SELECT usr.id,usr.email INTO u.id,u.email FROM public.users usr WHERE usr.id=a."userId" FOR UPDATE;
 SELECT * INTO v FROM public.email_verification_challenges WHERE "applicationId"=app_id FOR UPDATE;
 n:=clock_timestamp(); deadline:=a."createdAt"+INTERVAL '1 hour';
 IF app_id IS NULL OR public.oak_current_registration_id(false) IS DISTINCT FROM app_id OR deadline<=n THEN
   RAISE EXCEPTION 'Registration authorization required' USING ERRCODE='28000'; END IF;
 IF a.stage<>'DRAFT' OR a.status<>'NEW' OR v."consumedAt" IS NOT NULL THEN RETURN QUERY SELECT 'INVALID',deadline; RETURN; END IF;
 IF v.attempts>=5 THEN RETURN QUERY SELECT 'LIMITED',deadline; RETURN; END IF;
 IF v."expiresAt"<=n THEN RETURN QUERY SELECT 'EXPIRED',deadline; RETURN; END IF;
 IF p_digest IS NULL OR p_digest !~ '^[0-9a-f]{64}$' OR p_new_cap IS NULL OR p_new_cap !~ '^[0-9a-f]{64}$' THEN
   RAISE EXCEPTION 'Invalid registration operation' USING ERRCODE='22023'; END IF;
 -- A keyed 256-bit digest comparison discloses no incremental information about the
 -- six-digit code; the HMAC key never enters SQL. Codes are account/app/challenge bound.
 IF p_challenge IS DISTINCT FROM v.id OR p_digest<>v."codeDigest" THEN
   UPDATE public.email_verification_challenges SET attempts=attempts+1 WHERE "applicationId"=app_id;
   PERFORM public.oak_registration_append_audit('EMAIL_VERIFICATION_FAILED',p_audit);
   RETURN QUERY SELECT CASE WHEN v.attempts+1>=5 THEN 'LIMITED' ELSE 'INVALID' END,deadline; RETURN;
 END IF;
 UPDATE public.email_verification_challenges SET "consumedAt"=n WHERE "applicationId"=app_id;
 UPDATE public.users SET "emailVerifiedAt"=coalesce("emailVerifiedAt",n AT TIME ZONE 'UTC'),"updatedAt"=n AT TIME ZONE 'UTC' WHERE id=u.id;
 UPDATE public.registration_capabilities SET "revokedAt"=coalesce("revokedAt",n) WHERE "applicationId"=app_id;
 INSERT INTO public.registration_capabilities(id,"applicationId","tokenHash","challengeVersion","verifiedAt","expiresAt","createdAt")
   VALUES(gen_random_uuid(),app_id,p_new_cap,v.version,n,deadline,n);
 PERFORM set_config('oak.registration_hash',p_new_cap,true);
 PERFORM public.oak_registration_append_audit('EMAIL_VERIFIED',p_audit);
 RETURN QUERY SELECT 'OK',deadline;
END
$fn$;

-- Delivery result only. Hash binds this exact OTP intent/version even if its proof was
-- revoked meanwhile. Never restores authority, returns account data or stores a code.
CREATE FUNCTION public.oak_registration_delivery_result(p_delivery UUID,p_hash TEXT,p_provider TEXT,p_success BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
BEGIN
 IF p_success IS NULL OR (p_success AND (p_provider IS NULL OR char_length(p_provider) NOT BETWEEN 1 AND 255)) THEN
   RAISE EXCEPTION 'Invalid delivery result' USING ERRCODE='22023'; END IF;
 UPDATE public.email_deliveries d SET state=CASE WHEN p_success THEN 'SENT'::public."RegistrationEmailState" ELSE 'FAILED'::public."RegistrationEmailState" END,
   "providerId"=CASE WHEN p_success THEN p_provider ELSE NULL END,
   "acceptedAt"=CASE WHEN p_success THEN clock_timestamp() ELSE NULL END,
   "reasonCode"=CASE WHEN p_success THEN NULL ELSE 'PROVIDER_UNAVAILABLE' END,
   "attemptCount"="attemptCount"+1,"updatedAt"=clock_timestamp()
 WHERE d.id=p_delivery AND d.kind='OTP' AND d.state='PENDING' AND EXISTS (
   SELECT 1 FROM public.registration_capabilities c WHERE c."tokenHash"=p_hash
     AND c."applicationId"=d."applicationId" AND c."challengeVersion"=d."eventVersion");
END
$fn$;

-- Non-authorizing flow state makes duplicate responses behave like real unverified
-- flows across restart/process boundaries. No email, account reference or OTP is stored.
CREATE TABLE public.registration_decoy_flows (
 id UUID NOT NULL PRIMARY KEY,"startOperationId" UUID NOT NULL,"operationId" UUID NOT NULL,"tokenHash" CHAR(64) NOT NULL,
 "challengeId" UUID NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,"issueTimes" TIMESTAMPTZ(3)[] NOT NULL,
 "codeExpiresAt" TIMESTAMPTZ(3) NOT NULL,"resendAfter" TIMESTAMPTZ(3) NOT NULL,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL,"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT registration_decoy_hash CHECK("tokenHash" ~ '^[0-9a-f]{64}$'),
 CONSTRAINT registration_decoy_limits CHECK(attempts BETWEEN 0 AND 5 AND cardinality("issueTimes") BETWEEN 1 AND 5),
 CONSTRAINT registration_decoy_lifetime CHECK("expiresAt"="createdAt"+INTERVAL '1 hour')
);
CREATE UNIQUE INDEX "registration_decoy_flows_operationId_key" ON public.registration_decoy_flows("operationId");
CREATE UNIQUE INDEX "registration_decoy_flows_startOperationId_key" ON public.registration_decoy_flows("startOperationId");
CREATE UNIQUE INDEX "registration_decoy_flows_tokenHash_key" ON public.registration_decoy_flows("tokenHash");
CREATE INDEX "registration_decoy_flows_expiresAt_idx" ON public.registration_decoy_flows("expiresAt");
ALTER TABLE public.registration_decoy_flows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.registration_decoy_flows FROM PUBLIC,oak_runtime,oak_auth_owner;
DO $acl$
DECLARE r TEXT;
BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON public.registration_decoy_flows FROM %I',r); END IF;
 END LOOP;
END
$acl$;
GRANT SELECT,INSERT,UPDATE ON public.registration_decoy_flows TO oak_registration_owner;
CREATE POLICY registration_decoy_closed ON public.registration_decoy_flows TO oak_registration_owner USING(true) WITH CHECK(true);

-- Internal generic-duplicate state creation; no reference to the existing account.
CREATE FUNCTION public.oak_registration_decoy_start(p_operation UUID,p_hash TEXT,p_challenge UUID)
RETURNS TABLE(outcome TEXT,"challengeId" UUID,"codeExpiresAt" TIMESTAMPTZ(3),
 "resendAfter" TIMESTAMPTZ(3),"registrationExpiresAt" TIMESTAMPTZ(3),"deliveryId" UUID,issued BOOLEAN,"retryAfter" INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE d public.registration_decoy_flows%ROWTYPE; n TIMESTAMPTZ(3):=clock_timestamp();
BEGIN
 IF p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' OR p_operation IS NULL OR p_challenge IS NULL THEN
  RAISE EXCEPTION 'Invalid registration operation' USING ERRCODE='22023'; END IF;
 INSERT INTO public.registration_decoy_flows(id,"startOperationId","operationId","tokenHash","challengeId","codeExpiresAt","resendAfter","expiresAt","createdAt","issueTimes")
 VALUES(gen_random_uuid(),p_operation,p_operation,p_hash,p_challenge,n+INTERVAL '10 minutes',n+INTERVAL '60 seconds',n+INTERVAL '1 hour',n,ARRAY[n])
 ON CONFLICT("startOperationId") DO UPDATE SET "tokenHash"=excluded."tokenHash"
 RETURNING * INTO d;
 IF d."expiresAt">n AND (d."codeExpiresAt"<=n OR d.attempts>=5) THEN
  RETURN QUERY SELECT * FROM public.oak_registration_decoy_step(p_hash,'RESTART',d."challengeId",p_operation,p_hash,p_challenge); RETURN;
 END IF;
 RETURN QUERY SELECT CASE WHEN d."expiresAt">n THEN 'OK' ELSE 'EXPIRED' END,d."challengeId",d."codeExpiresAt",d."resendAfter",d."expiresAt",NULL::UUID,false,0;
END
$fn$;

-- Hash-authorized decoy step; returns zero rows when not a decoy. Always denies code
-- verification, with the same finite attempt/cooldown/expiry states as a real flow.
CREATE FUNCTION public.oak_registration_decoy_step(p_hash TEXT,p_action TEXT,p_old_challenge UUID,
 p_operation UUID,p_new_hash TEXT,p_new_challenge UUID)
RETURNS TABLE(outcome TEXT,"challengeId" UUID,"codeExpiresAt" TIMESTAMPTZ(3),
 "resendAfter" TIMESTAMPTZ(3),"registrationExpiresAt" TIMESTAMPTZ(3),"deliveryId" UUID,issued BOOLEAN,"retryAfter" INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $fn$
DECLARE d public.registration_decoy_flows%ROWTYPE; n TIMESTAMPTZ(3):=clock_timestamp(); retry INTEGER:=0; result TEXT:='OK'; history TIMESTAMPTZ[];
BEGIN
 SELECT * INTO d FROM public.registration_decoy_flows WHERE "tokenHash"=p_hash FOR UPDATE;
 IF NOT FOUND THEN RETURN; END IF;
 IF d."expiresAt"<=n THEN result:='EXPIRED_FLOW';
 ELSIF p_action='VERIFY' THEN
  IF d.attempts>=5 THEN result:='LIMITED'; retry:=greatest(1,ceil(extract(epoch FROM d."resendAfter"-n))::INTEGER);
  ELSIF d."codeExpiresAt"<=n THEN result:='EXPIRED';
  ELSE d.attempts:=d.attempts+1; result:=CASE WHEN d.attempts>=5 THEN 'LIMITED' ELSE 'INVALID' END;
   UPDATE public.registration_decoy_flows SET attempts=d.attempts WHERE id=d.id;
  END IF;
 ELSIF p_action IN ('RESEND','RESTART') THEN
  SELECT array_agg(issued_at ORDER BY issued_at) INTO history
    FROM unnest(d."issueTimes") AS times(issued_at) WHERE issued_at>n-INTERVAL '15 minutes';
  IF p_old_challenge IS DISTINCT FROM d."challengeId" OR (p_action='RESEND' AND p_operation IS NOT DISTINCT FROM d."operationId") THEN result:='CONFLICT';
  ELSIF d."resendAfter">n THEN result:='LIMITED'; retry:=greatest(1,ceil(extract(epoch FROM d."resendAfter"-n))::INTEGER);
  ELSIF cardinality(history)>=5 THEN
   result:='LIMITED'; retry:=greatest(1,ceil(extract(epoch FROM history[1]+INTERVAL '15 minutes'-n))::INTEGER);
  ELSE
   IF p_new_hash IS NULL OR p_new_hash !~ '^[0-9a-f]{64}$' OR p_new_challenge IS NULL OR p_operation IS NULL THEN
    RAISE EXCEPTION 'Invalid registration operation' USING ERRCODE='22023'; END IF;
   UPDATE public.registration_decoy_flows SET "tokenHash"=p_new_hash,"challengeId"=p_new_challenge,
    "operationId"=p_operation,attempts=0,"codeExpiresAt"=n+INTERVAL '10 minutes',"resendAfter"=n+INTERVAL '60 seconds',
    "issueTimes"=array_append(coalesce(history,ARRAY[]::TIMESTAMPTZ[]),n)
    WHERE id=d.id RETURNING * INTO d;
  END IF;
 ELSIF p_action<>'CURRENT' OR p_action IS NULL THEN RAISE EXCEPTION 'Invalid registration operation' USING ERRCODE='22023';
 END IF;
 RETURN QUERY SELECT result,d."challengeId",d."codeExpiresAt",d."resendAfter",d."expiresAt",NULL::UUID,false,retry;
END
$fn$;

GRANT CREATE ON SCHEMA public TO oak_registration_owner;
DO $functions$
DECLARE f RECORD; api_role TEXT;
BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN ('oak_registration_start_match','oak_registration_issue',
     'oak_registration_start','oak_registration_resend','oak_registration_verify','oak_registration_delivery_result',
     'oak_registration_decoy_start','oak_registration_decoy_step') LOOP
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',f.signature);
   FOREACH api_role IN ARRAY ARRAY['anon','authenticated','service_role','oak_runtime'] LOOP
     IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=api_role) THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I',f.signature,api_role); END IF;
   END LOOP;
   EXECUTE format('ALTER FUNCTION %s OWNER TO oak_registration_owner',f.signature);
   IF f.proname<>'oak_registration_issue' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO oak_runtime',f.signature); END IF;
 END LOOP;
END
$functions$;
REVOKE CREATE ON SCHEMA public FROM oak_registration_owner;
COMMIT;
