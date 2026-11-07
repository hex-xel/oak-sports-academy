-- T004: additive registration foundation. Owner applies only after T005/T006 review.
-- No data backfill, account activation, public Storage policy or deletion is performed.
BEGIN;

CREATE TYPE public."RegistrationStage" AS ENUM ('DRAFT', 'SUBMITTED');
CREATE TYPE public."RegistrationStatus" AS ENUM ('NEW', 'FREE_TRIAL_SCHEDULED', 'APPROVED', 'REJECTED', 'ENROLLED');
CREATE TYPE public."RegistrationStudentType" AS ENUM ('NEW_WHITE_BELT', 'EXPERIENCED');
CREATE TYPE public."RegistrationDocumentSlot" AS ENUM ('PHOTO_2X2', 'VALID_ID');
CREATE TYPE public."RegistrationDocumentState" AS ENUM ('PENDING', 'READY', 'ATTACHED');
CREATE TYPE public."RegistrationEmailKind" AS ENUM ('OTP', 'TRIAL', 'RESULT');
CREATE TYPE public."RegistrationEmailState" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE public.registration_applications (
  id UUID NOT NULL,
  "userId" UUID NOT NULL,
  "studentType" public."RegistrationStudentType" NOT NULL,
  stage public."RegistrationStage" NOT NULL DEFAULT 'DRAFT',
  status public."RegistrationStatus" NOT NULL DEFAULT 'NEW',
  version INTEGER NOT NULL DEFAULT 1,
  "startOperationId" UUID NOT NULL,
  "submitOperationId" UUID,
  "submissionHash" CHAR(64),
  "submittedAt" TIMESTAMPTZ(3),
  "approvedAt" TIMESTAMPTZ(3),
  "rejectedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT registration_applications_pkey PRIMARY KEY (id),
  CONSTRAINT "registration_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT registration_version_positive CHECK (version > 0),
  CONSTRAINT registration_submission_hash CHECK ("submissionHash" IS NULL OR "submissionHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT registration_stage_receipt CHECK (
    (stage = 'DRAFT' AND status = 'NEW' AND "submittedAt" IS NULL AND "submitOperationId" IS NULL AND "submissionHash" IS NULL)
    OR (stage = 'SUBMITTED' AND "submittedAt" IS NOT NULL AND "submitOperationId" IS NOT NULL AND "submissionHash" IS NOT NULL)),
  CONSTRAINT registration_decision_timestamps CHECK (
    (status IN ('NEW', 'FREE_TRIAL_SCHEDULED') AND "approvedAt" IS NULL AND "rejectedAt" IS NULL)
    OR (status IN ('APPROVED', 'ENROLLED') AND "approvedAt" IS NOT NULL AND "rejectedAt" IS NULL)
    OR (status = 'REJECTED' AND "approvedAt" IS NULL AND "rejectedAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "registration_applications_userId_key" ON public.registration_applications("userId");
CREATE UNIQUE INDEX "registration_applications_startOperationId_key" ON public.registration_applications("startOperationId");
CREATE UNIQUE INDEX "registration_applications_submitOperationId_key" ON public.registration_applications("submitOperationId");
CREATE INDEX "registration_applications_stage_status_submittedAt_id_idx" ON public.registration_applications(stage, status, "submittedAt", id);

CREATE TABLE public.registration_capabilities (
  id UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "challengeVersion" INTEGER NOT NULL,
  "verifiedAt" TIMESTAMPTZ(3),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "revokedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT registration_capabilities_pkey PRIMARY KEY (id),
  CONSTRAINT "registration_capabilities_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES public.registration_applications(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT registration_capability_hash CHECK ("tokenHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT registration_capability_version CHECK ("challengeVersion" > 0),
  CONSTRAINT registration_capability_lifetime CHECK ("expiresAt" > "createdAt" AND "expiresAt" <= "createdAt" + INTERVAL '1 hour'),
  CONSTRAINT registration_capability_verified_time CHECK ("verifiedAt" IS NULL OR ("verifiedAt" >= "createdAt" AND "verifiedAt" < "expiresAt"))
);
CREATE UNIQUE INDEX "registration_capabilities_tokenHash_key" ON public.registration_capabilities("tokenHash");
CREATE INDEX "registration_capabilities_applicationId_idx" ON public.registration_capabilities("applicationId");
CREATE INDEX "registration_capabilities_expiresAt_idx" ON public.registration_capabilities("expiresAt");

CREATE TABLE public.email_verification_challenges (
  id UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "codeDigest" CHAR(64) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  attempts INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMPTZ(3),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "resendAfter" TIMESTAMPTZ(3) NOT NULL,
  "issueOperationId" UUID NOT NULL,
  "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_verification_challenges_pkey PRIMARY KEY (id),
  CONSTRAINT "email_verification_challenges_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES public.registration_applications(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT registration_otp_digest CHECK ("codeDigest" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT registration_otp_attempts CHECK (attempts BETWEEN 0 AND 5),
  CONSTRAINT registration_otp_version CHECK (version > 0),
  CONSTRAINT registration_otp_lifetime CHECK ("expiresAt" = "issuedAt" + INTERVAL '10 minutes'),
  CONSTRAINT registration_otp_cooldown CHECK ("resendAfter" = "issuedAt" + INTERVAL '60 seconds'),
  CONSTRAINT registration_otp_consumed_time CHECK ("consumedAt" IS NULL OR ("consumedAt" >= "issuedAt" AND "consumedAt" < "expiresAt"))
);
CREATE UNIQUE INDEX "email_verification_challenges_applicationId_key" ON public.email_verification_challenges("applicationId");
CREATE UNIQUE INDEX "email_verification_challenges_issueOperationId_key" ON public.email_verification_challenges("issueOperationId");

CREATE TABLE public.student_profiles (
  id UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "firstName" VARCHAR(100) NOT NULL,
  "middleName" VARCHAR(100),
  surname VARCHAR(100) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  "dateOfBirth" DATE NOT NULL,
  "ageAtSubmission" INTEGER NOT NULL,
  mobile VARCHAR(10) NOT NULL,
  "houseAndLot" VARCHAR(255) NOT NULL,
  barangay VARCHAR(100) NOT NULL,
  municipality VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  "guardianName" VARCHAR(200),
  "guardianRelationship" VARCHAR(20),
  "guardianOccupation" VARCHAR(100),
  "guardianContact" VARCHAR(10),
  "validIdType" VARCHAR(30) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT student_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT "student_profiles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES public.registration_applications(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT registration_profile_required CHECK (btrim("firstName") <> '' AND btrim(surname) <> '' AND btrim("houseAndLot") <> '' AND btrim(barangay) <> '' AND btrim(municipality) <> '' AND btrim(province) <> ''),
  CONSTRAINT registration_profile_gender CHECK (gender IN ('male', 'female')),
  CONSTRAINT registration_profile_age CHECK ("ageAtSubmission" >= 0),
  CONSTRAINT registration_profile_mobile CHECK (mobile ~ '^9[0-9]{9}$'),
  CONSTRAINT registration_profile_id_type CHECK ("validIdType" IN ('philid', 'passport', 'drivers-license', 'school-id', 'other')),
  CONSTRAINT registration_profile_guardian CHECK (
    ("ageAtSubmission" >= 18 AND "guardianName" IS NULL AND "guardianRelationship" IS NULL AND "guardianOccupation" IS NULL AND "guardianContact" IS NULL)
    OR ("ageAtSubmission" < 18 AND "guardianName" IS NOT NULL AND btrim("guardianName") <> ''
      AND "guardianRelationship" IS NOT NULL AND "guardianRelationship" IN ('parent', 'aunt-uncle', 'sibling', 'other')
      AND "guardianOccupation" IS NOT NULL AND btrim("guardianOccupation") <> ''
      AND "guardianContact" IS NOT NULL AND "guardianContact" ~ '^9[0-9]{9}$'))
);
CREATE UNIQUE INDEX "student_profiles_applicationId_key" ON public.student_profiles("applicationId");
CREATE INDEX "student_profiles_surname_firstName_applicationId_idx" ON public.student_profiles(surname, "firstName", "applicationId");

CREATE TABLE public.consent_evidence (
  id UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "operationId" UUID NOT NULL,
  "policyVersion" VARCHAR(80) NOT NULL,
  waiver BOOLEAN NOT NULL,
  fitness BOOLEAN NOT NULL,
  terms BOOLEAN NOT NULL,
  "acceptedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT consent_evidence_pkey PRIMARY KEY (id),
  CONSTRAINT "consent_evidence_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES public.registration_applications(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT registration_agreements_required CHECK (waiver AND fitness AND terms AND "policyVersion" = 'registration-2026-11-06')
);
CREATE UNIQUE INDEX "consent_evidence_operationId_key" ON public.consent_evidence("operationId");
CREATE UNIQUE INDEX "consent_evidence_applicationId_id_key" ON public.consent_evidence("applicationId", id);
CREATE INDEX "consent_evidence_applicationId_acceptedAt_idx" ON public.consent_evidence("applicationId", "acceptedAt");

CREATE TABLE public.registration_documents (
  id UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "consentId" UUID NOT NULL,
  "operationId" UUID NOT NULL,
  slot public."RegistrationDocumentSlot" NOT NULL,
  state public."RegistrationDocumentState" NOT NULL DEFAULT 'PENDING',
  "objectKey" VARCHAR(255) NOT NULL,
  "mimeType" VARCHAR(20) NOT NULL,
  "byteSize" INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  checksum CHAR(64) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT registration_documents_pkey PRIMARY KEY (id),
  CONSTRAINT "registration_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES public.registration_applications(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "registration_documents_applicationId_consentId_fkey" FOREIGN KEY ("applicationId", "consentId") REFERENCES public.consent_evidence("applicationId", id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT registration_document_mime CHECK ("mimeType" IN ('image/jpeg', 'image/png')),
  CONSTRAINT registration_document_size CHECK ("byteSize" BETWEEN 5120 AND 5242880),
  CONSTRAINT registration_document_dimensions CHECK (width >= 400 AND height >= 400),
  CONSTRAINT registration_document_checksum CHECK (checksum ~ '^[0-9a-f]{64}$'),
  -- Server names consist of application UUID / attempt UUID plus approved extension.
  CONSTRAINT registration_document_key CHECK ("objectKey" ~ ('^' || "applicationId"::TEXT || '/[0-9a-f-]{36}\.(jpg|png)$'))
);
CREATE UNIQUE INDEX "registration_documents_operationId_key" ON public.registration_documents("operationId");
CREATE UNIQUE INDEX "registration_documents_objectKey_key" ON public.registration_documents("objectKey");
CREATE INDEX "registration_documents_applicationId_slot_state_idx" ON public.registration_documents("applicationId", slot, state);
-- Prisma cannot represent this partial uniqueness in the current schema version.
CREATE UNIQUE INDEX registration_documents_attached_slot_key ON public.registration_documents("applicationId", slot) WHERE state = 'ATTACHED';

CREATE TABLE public.trial_assessments (
  id UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "operationId" UUID NOT NULL,
  "decisionOperationId" UUID,
  version INTEGER NOT NULL DEFAULT 1,
  "startsAt" TIMESTAMPTZ(3) NOT NULL,
  "endsAt" TIMESTAMPTZ(3) NOT NULL,
  timezone VARCHAR(40) NOT NULL DEFAULT 'Asia/Manila',
  capacity INTEGER NOT NULL,
  "scheduledBy" UUID NOT NULL,
  "decidedBy" UUID,
  "completedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT trial_assessments_pkey PRIMARY KEY (id),
  CONSTRAINT "trial_assessments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES public.registration_applications(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT registration_trial_times CHECK ("endsAt" > "startsAt" AND timezone = 'Asia/Manila'),
  CONSTRAINT registration_trial_capacity CHECK (capacity > 0 AND version > 0),
  CONSTRAINT registration_trial_decision CHECK (
    ("completedAt" IS NULL AND "decidedBy" IS NULL AND "decisionOperationId" IS NULL)
    OR ("completedAt" IS NOT NULL AND "decidedBy" IS NOT NULL AND "decisionOperationId" IS NOT NULL))
);
CREATE UNIQUE INDEX "trial_assessments_applicationId_key" ON public.trial_assessments("applicationId");
CREATE UNIQUE INDEX "trial_assessments_operationId_key" ON public.trial_assessments("operationId");
CREATE UNIQUE INDEX "trial_assessments_decisionOperationId_key" ON public.trial_assessments("decisionOperationId");
CREATE INDEX "trial_assessments_startsAt_id_idx" ON public.trial_assessments("startsAt", id);
CREATE INDEX "trial_assessments_completedAt_startsAt_idx" ON public.trial_assessments("completedAt", "startsAt");

CREATE TABLE public.email_deliveries (
  id UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "operationId" UUID NOT NULL,
  kind public."RegistrationEmailKind" NOT NULL,
  "eventVersion" INTEGER NOT NULL,
  state public."RegistrationEmailState" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" VARCHAR(256) NOT NULL,
  "providerId" VARCHAR(255),
  "reasonCode" VARCHAR(60),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "acceptedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT email_deliveries_pkey PRIMARY KEY (id),
  CONSTRAINT "email_deliveries_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES public.registration_applications(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT registration_delivery_counts CHECK ("eventVersion" > 0 AND "attemptCount" >= 0),
  CONSTRAINT registration_delivery_key CHECK (char_length("idempotencyKey") BETWEEN 1 AND 256),
  CONSTRAINT registration_delivery_reason CHECK ("reasonCode" IS NULL OR "reasonCode" ~ '^[A-Z][A-Z0-9_]{0,59}$'),
  CONSTRAINT registration_delivery_acceptance CHECK (
    (state = 'SENT' AND "providerId" IS NOT NULL AND "acceptedAt" IS NOT NULL)
    OR (state <> 'SENT' AND "acceptedAt" IS NULL))
);
CREATE UNIQUE INDEX "email_deliveries_operationId_key" ON public.email_deliveries("operationId");
CREATE UNIQUE INDEX "email_deliveries_idempotencyKey_key" ON public.email_deliveries("idempotencyKey");
CREATE UNIQUE INDEX "email_deliveries_applicationId_kind_eventVersion_key" ON public.email_deliveries("applicationId", kind, "eventVersion");
CREATE INDEX "email_deliveries_state_createdAt_idx" ON public.email_deliveries(state, "createdAt");

-- Isolated NOLOGIN/non-owner role for the closed registration function interface.
-- No runtime membership or direct applicant writes are granted by this migration.
DO $role$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'oak_registration_owner') THEN
    CREATE ROLE oak_registration_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'oak_registration_owner'
    AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls))
    OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member = 'oak_registration_owner'::regrole)
    OR EXISTS (SELECT 1 FROM pg_class WHERE relowner = 'oak_registration_owner'::regrole AND relkind IN ('r', 'p')) THEN
    RAISE EXCEPTION 'Unsafe registration function-owner role';
  END IF;
  EXECUTE format('GRANT oak_registration_owner TO %I', current_user);
END
$role$;
GRANT USAGE ON SCHEMA public TO oak_registration_owner;

-- Owner remains the migration role. Remove Supabase default/API grants explicitly.
DO $tables$
DECLARE table_name TEXT; api_role TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['registration_applications', 'registration_capabilities',
    'email_verification_challenges', 'student_profiles', 'consent_evidence',
    'registration_documents', 'trial_assessments', 'email_deliveries'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, oak_runtime, oak_auth_owner, oak_registration_owner', table_name);
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL ON public.%I FROM %I', table_name, api_role);
      END IF;
    END LOOP;
  END LOOP;
END
$tables$;

-- No public execution: same live-session validation as all existing protected data.
-- No parameters; returns true only for an eligible current ADMIN; reads auth state.
CREATE FUNCTION public.oak_registration_is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.users u
    WHERE u.id = public.oak_current_user_id() AND u.role = 'ADMIN')
$fn$;
REVOKE ALL ON FUNCTION public.oak_registration_is_admin() FROM PUBLIC;
DO $acl$
DECLARE api_role TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.oak_registration_is_admin() FROM %I', api_role);
    END IF;
  END LOOP;
END
$acl$;
GRANT CREATE ON SCHEMA public TO oak_auth_owner;
ALTER FUNCTION public.oak_registration_is_admin() OWNER TO oak_auth_owner;
REVOKE CREATE ON SCHEMA public FROM oak_auth_owner;
GRANT EXECUTE ON FUNCTION public.oak_registration_is_admin() TO oak_runtime, oak_registration_owner;

-- Only submitted applications are reviewable. Hashes/challenges are never Admin data.
GRANT SELECT ON public.registration_applications, public.student_profiles,
  public.consent_evidence, public.registration_documents, public.trial_assessments,
  public.email_deliveries TO oak_runtime;
CREATE POLICY registration_admin_read ON public.registration_applications FOR SELECT TO oak_runtime
  USING (stage = 'SUBMITTED' AND public.oak_registration_is_admin());
DO $policies$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['student_profiles', 'consent_evidence',
    'registration_documents', 'trial_assessments', 'email_deliveries'] LOOP
    EXECUTE format('CREATE POLICY registration_admin_read ON public.%I FOR SELECT TO oak_runtime USING (public.oak_registration_is_admin() AND EXISTS (SELECT 1 FROM public.registration_applications a WHERE a.id = "applicationId" AND a.stage = ''SUBMITTED''))', table_name);
  END LOOP;
END
$policies$;

-- Narrow cross-row account projection; no broad users RLS/column grants to runtime.
-- Input application UUID; returns safe account fields for a submitted Admin review,
-- or no rows when denied. No mutations, credentials, or ordinary session changes.
GRANT SELECT (id, email, "displayName", "emailVerifiedAt") ON public.users TO oak_registration_owner;
CREATE POLICY registration_account_projection ON public.users FOR SELECT TO oak_registration_owner USING (true);
GRANT SELECT ON public.registration_applications TO oak_registration_owner;
CREATE POLICY registration_projection_application ON public.registration_applications FOR SELECT TO oak_registration_owner USING (true);
CREATE FUNCTION public.oak_registration_account(p_application_id UUID)
RETURNS TABLE (id UUID, email TEXT, "displayName" TEXT, "emailVerifiedAt" TIMESTAMP(3))
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT u.id, u.email, u."displayName", u."emailVerifiedAt"
  FROM public.registration_applications a JOIN public.users u ON u.id = a."userId"
  WHERE a.id = p_application_id AND a.stage = 'SUBMITTED' AND public.oak_registration_is_admin()
$fn$;
REVOKE ALL ON FUNCTION public.oak_registration_account(UUID) FROM PUBLIC;
DO $acl$
DECLARE api_role TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.oak_registration_account(UUID) FROM %I', api_role);
    END IF;
  END LOOP;
END
$acl$;
GRANT CREATE ON SCHEMA public TO oak_registration_owner;
ALTER FUNCTION public.oak_registration_account(UUID) OWNER TO oak_registration_owner;
REVOKE CREATE ON SCHEMA public FROM oak_registration_owner;
GRANT EXECUTE ON FUNCTION public.oak_registration_account(UUID) TO oak_runtime;

-- Preserve the owner's verified dashboard hardening without editing migration rows.
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
COMMIT;
