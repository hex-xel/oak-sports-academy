-- T018 model baseline. Security policies/grants follow in the next migration.
-- UUID defaults and @updatedAt are managed by Prisma, matching schema.prisma.
BEGIN;
CREATE TYPE public."Role" AS ENUM ('CUSTOMER', 'STAFF', 'ADMIN');
CREATE TYPE public."AccountStatus" AS ENUM ('ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED');

CREATE TABLE public.users (
  id UUID NOT NULL,
  email TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "displayName" TEXT,
  role public."Role" NOT NULL DEFAULT 'CUSTOMER',
  status public."AccountStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "emailVerifiedAt" TIMESTAMP(3),
  "lastSignInAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 254)
);
CREATE UNIQUE INDEX users_email_key ON public.users(email);
CREATE INDEX users_role_idx ON public.users(role);

CREATE TABLE public.sessions (
  id UUID NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "userId" UUID NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "ipAddress" VARCHAR(45),
  "userAgent" VARCHAR(255),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_token_hash_hex CHECK ("tokenHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT sessions_expiry_after_creation CHECK ("expiresAt" > "createdAt"),
  CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON public.sessions("tokenHash");
CREATE INDEX "sessions_userId_idx" ON public.sessions("userId");
CREATE INDEX "sessions_expiresAt_idx" ON public.sessions("expiresAt");

-- No User FK: unknown-email attempts must be retained too.
CREATE TABLE public.sign_in_attempts (
  id UUID NOT NULL,
  email TEXT NOT NULL,
  "ipAddress" VARCHAR(45) NOT NULL,
  succeeded BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sign_in_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT attempts_email_normalized CHECK (email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 254)
);
CREATE INDEX "sign_in_attempts_email_createdAt_idx" ON public.sign_in_attempts(email, "createdAt");
CREATE INDEX "sign_in_attempts_ipAddress_createdAt_idx" ON public.sign_in_attempts("ipAddress", "createdAt");

-- Actor/target values deliberately have no cascading FK (approved data-model.md).
CREATE TABLE public.audit_logs (
  id UUID NOT NULL,
  timestamp TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" UUID NOT NULL,
  action TEXT NOT NULL,
  "targetEntity" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "payloadHash" CHAR(64) NOT NULL,
  "previousHash" CHAR(64) NOT NULL,
  "currentHash" CHAR(64) NOT NULL,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_payload_hex CHECK ("payloadHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT audit_previous_hex CHECK ("previousHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT audit_current_hex CHECK ("currentHash" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "audit_logs_previousHash_key" ON public.audit_logs("previousHash");
CREATE UNIQUE INDEX "audit_logs_currentHash_key" ON public.audit_logs("currentHash");
CREATE INDEX audit_logs_timestamp_idx ON public.audit_logs(timestamp);

-- Fail closed even between applying the baseline and the security migration.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sign_in_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.users, public.sessions, public.sign_in_attempts, public.audit_logs FROM PUBLIC;
-- Supabase may install default grants for these API roles. Remove them only on our tables.
DO $roles$
DECLARE api_role TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON public.users, public.sessions, public.sign_in_attempts, public.audit_logs FROM %I', api_role);
    END IF;
  END LOOP;
END
$roles$;
COMMIT;
