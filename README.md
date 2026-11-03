# Oak Sports Academy Training Registration and Management System

Oak Sports Academy is a proposed web and Android application system for the
Oak Sports Academy Taguig Branch. It will centralize the registration and
training-management activities that are currently handled through Google Forms
and manual staff processes.

> **Project status:** Mobile login UI is complete; foundational authentication backend
> work is in progress. Security tests and the Prisma schema are written; database
> migrations and environment/runtime-role checks passed; backend authentication and
> comprehensive security tests remain in progress. See
> [the project index](docs/index.md) and [login tasks](specs/001-user-login/tasks.md).

## Project goals

The planned system will support:

- Account registration, email verification, and role-based access.
- Participant profiles and parent/guardian management for minor participants.
- Free-trial registration, capacity tracking, and regular training enrollment.
- Training programs, packages, rates, schedules, and enrollment-status
  management.
- Document collection and verification workflows.
- Payment-status monitoring.
- Administrative management of academy information, schedules, announcements,
  events, and related content.

The proposed users are participants, parents/guardians, academy staff, and
administrators. A public website will provide approved academy information to
visitors.

## Planned technology stack

| Area | Planned technology |
| --- | --- |
| Mobile app | React Native, Expo, TypeScript |
| Website and admin dashboard | Next.js, React, TypeScript, Tailwind CSS |
| API | Node.js, Express.js, TypeScript, REST |
| Database | PostgreSQL on Supabase, accessed through Prisma |
| File storage | Private Supabase Storage buckets |
| Testing | Vitest, Supertest, and, if time permits, Playwright |

These choices are the approved project baseline. Dependencies and application
code will be added only as development begins.

## Repository layout

```text
apps/                       Future client and API applications
  api/                      Express API
  mobile/                   React Native and Expo app
  web/                      Next.js public website and admin dashboard
docs/                       Project documentation and design artifacts
  architecture/             Diagrams and architecture records
  decisions/                Architecture decision records
  milestone-1/              PBL Milestone 1 supporting materials
packages/
  shared/                   Shared TypeScript types and utilities
prototype/
  schedule-selection/       Future algorithm prototype and benchmark assets
    benchmarks/
    fixtures/
scripts/                    Development and validation scripts
specs/                      Approved project requirements
```

Folders marked as future are intentionally empty scaffolds. They do not imply
that the corresponding feature, design, or benchmark has been completed.

## Development workflow

1. Review `requirements.md` and the applicable specification before making changes.
2. Create focused work on a feature branch; do not push unreviewed work
   directly to `main`.
3. Keep credentials and real client data out of the repository.
4. Add relevant tests as features are implemented and report the checks run.

## Initial team roles

- Nathaniel Babalcon — Project Manager, Tester, and Quality Assurance
- Rommel Villanueva — UI/UX Lead Designer and Programmer
- Hexel John Ventura — Lead Programmer
- Jurie Aplaca — UI/UX Designer and Researcher
- Aaron Abiera — Business Analyst and Researcher

## Related project material

- `oak-sports.md` — approved technical baseline, repository guidance, and
  development rules.
- `specs/requirements.md` — requirements specification placeholder; changes
  require approval.

## T017 security-test checkpoint

Foundational tests are written in `apps/api/tests/security/`; the test-first module
interfaces and isolated database fixture requirements are documented in
[the security test guide](apps/api/tests/security/README.md).

Run these only after T019–T031 provide the implementation, reviewed development
migrations, and dedicated test database harness. The owner performs setup and execution.

1. Open PowerShell in `C:\Dev\School\oak-sports-academy`.
2. At T031, configure the ignored `apps/api/.env.test` using that task's documented
   runtime/fixture credentials and explicit disposable-database opt-in. Never point it
   at a shared, development, or production database. Apply reviewed migrations using
   T020's owner-run steps against the dedicated test database.
3. Run the security suites:
   ```powershell
   npm test -w apps/api -- tests/security
   ```
   Success means all four suites execute with no skipped cases, and all assertions
   pass under the runtime database role where required. Collection errors for missing
   modules before T031 are expected prerequisites, not a successful test result.
4. If any step fails, stop and share redacted output. Do not install new packages,
   weaken assertions, swap in privileged runtime credentials, or reset another database
   to make tests pass. Wait for fixes before continuing dependent work.

## T018 Prisma schema validation

The schema is in `apps/api/prisma/schema.prisma`. Its approved model is linked from
[the authentication data-layer note](docs/architecture/auth-data.md).

The owner runs validation with the already installed Prisma executable:

```powershell
cd C:\Dev\School\oak-sports-academy\apps\api
..\..\node_modules\.bin\prisma.cmd validate --schema prisma/schema.prisma
```

Expected: Prisma reports that `prisma/schema.prisma` is valid. This command does not
apply migrations or generate the client. It reads DATABASE_URL and DIRECT_URL from
the existing ignored `apps/api/.env`; never paste their values into chat. If either
variable is absent, provide the existing development connection settings privately
before retrying. If the executable is missing or validation fails, stop and share
redacted output; do not install/upgrade packages or apply migrations to work around it.
Wait for review before T019. Runtime role/grant changes are handled by T019/T021.

## T019 migrations and T020 owner application

T018 schema validation passed. T019 adds the baseline and security migrations; no SQL
has been applied by the agent. See [the data-layer boundary](docs/architecture/auth-data.md)
for function interfaces, restricted roles, and trusted-backend limitations.

1. Confirm `.env` DIRECT_URL identifies the intended **development** database, with
   no existing application tables that conflict with this initial migration. Use the
   privileged migration principal only for this step. It needs permission to create
   restricted roles, grant membership, and transfer function ownership. If managed
   hosting denies those operations, stop and share the redacted error for review.
   Never substitute the migration principal as the eventual API runtime role.
2. From `C:\Dev\School\oak-sports-academy\apps\api`, apply the committed migrations:
   ```powershell
   ..\..\node_modules\.bin\prisma.cmd migrate deploy --schema prisma/schema.prisma
   ..\..\node_modules\.bin\prisma.cmd generate --schema prisma/schema.prisma
   ```
   Run the second command only if the first succeeds. Expected: both initial migrations
   apply successfully, followed by successful Prisma Client generation. `migrate deploy`
   applies the authored SQL without generating a replacement migration or shadow DB.
3. In the Supabase SQL editor for that same development project, run the read-only
   contents of [scripts/inspect-auth-security.sql](scripts/inspect-auth-security.sql).
   Expected: two NOLOGIN Oak roles with all elevated flags false and no outbound role
   memberships; four RLS-enabled tables owned by the migration principal; policy rows
   scoped to Oak roles; eight SECURITY DEFINER functions owned by oak_auth_owner with
   fixed search_path; no unexpected PUBLIC/API execution grants; all audit mutation
   privilege checks false; enabled audit_insert_guard trigger. Database timezone should
   be UTC. Share the non-secret inspection output and migration result.
4. Stop on failure. Do not rerun a failing migration manually, edit applied migration
   files, accept a database reset prompt, use `db push`, or mark failed migrations
   resolved without review. PostgreSQL statements here are transactional, but Prisma
   may retain a failed migration record; share that error before choosing recovery.

The owner provisions a separate API login inheriting **only oak_runtime** at T021,
then updates DATABASE_URL privately. Do not start the API with the current privileged
example connection. No passwords or LOGIN role creation are committed. Keep migration
credentials and the future privileged fixture credentials out of request handling.
RLS/pooled-context/concurrency behavior still requires the T031 owner-run security tests;
metadata inspection alone is not proof those behaviors pass.

## T021 runtime environment setup (owner-run)

`apps/api/src/config/env.ts` loads the API-local development `.env` using Node 22's
built-in loader (existing process variables win), then validates with the installed Zod.
It never loads development `.env` implicitly in test/production. Production uses injected
variables; the T031 harness loads its dedicated test settings explicitly. No new package
is needed. The API source will import this module during startup in T030.

1. In your development project's Supabase SQL Editor, provision the dedicated runtime
   login below. Replace the password placeholder **locally before running** with a
   unique random password; do not reuse your migration password or share the SQL after
   replacement. SQL string literals escape an apostrophe by doubling it. This SQL is
   owner-run environment provisioning, not a migration or agent-executed operation.
   ```sql
   CREATE ROLE oak_api LOGIN INHERIT
     NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
     PASSWORD 'REPLACE_WITH_A_UNIQUE_RANDOM_PASSWORD';
   GRANT oak_runtime TO oak_api;
   GRANT CONNECT ON DATABASE postgres TO oak_api;
   ALTER ROLE oak_api SET timezone = 'UTC';
   ```
   Expected: all statements succeed. If oak_api already exists or any statement fails,
   stop and share the redacted error; do not grant postgres or oak_auth_owner membership.
2. Edit the ignored `apps/api/.env` privately using `.env.example` as a guide. Preserve
   your working migration DIRECT_URL, but change DATABASE_URL to the **oak_api login**
   and its new password. For Supabase's shared session pooler the username is
   `oak_api.PROJECT_REF`; use the host/project reference from your own Connect panel,
   port 5432, and percent-encode the password exactly once. For a direct connection
   the username is `oak_api`. Include `sslmode=require` and a small pool limit such as
   `connection_limit=5`. Never copy the migration user's credentials into DATABASE_URL.
   See [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres)
   and [Postgres roles](https://supabase.com/docs/guides/database/postgres/roles).
3. Set PORT to your existing mobile API URL's port (default 3000), NODE_ENV to
   development, SESSION_TTL_HOURS to 8, and leave TRUST_PROXY_IPS empty for local direct
   access. For a deployed reverse proxy, configure only verified literal upstream IPs,
   comma-separated; forwarded headers from other peers must not be trusted. Never set
   a blanket trust value or guess a hop count. T030 applies env.TRUST_PROXY to Express.
4. From `C:\Dev\School\oak-sports-academy\apps\api`, run these one at a time:
   ```powershell
   ..\..\node_modules\.bin\tsx.cmd scripts/check-env.ts
   ..\..\node_modules\.bin\tsc.cmd --project tsconfig.json --noEmit
   ..\..\node_modules\.bin\tsx.cmd scripts/check-runtime-db.ts
   ```
   Expected: environment configuration is valid; TypeScript exits without errors;
   runtime database check passes. The first two commands do not connect to the DB;
   the third uses only SELECT metadata/row-count queries against DATABASE_URL and
   does not print URLs, passwords, hashes, or account records. It confirms the actual
   login, only oak_runtime membership, no owned tables, no audit mutation grants,
   and zero visible users without session context. It is not a full RLS integration test.
5. Stop on any failure and share the safe output. `Invalid API environment` lists only
   field names: correct those privately. A role/connection check failure requires review
   of credentials and grants, not broader permissions. If commands are missing, report
   that rather than installing/upgrading packages. T031 still performs the comprehensive
   security suites. T021 checks were owner-confirmed passing on 2026-11-03.

RuntimeEnv excludes DIRECT_URL from its returned settings. If DIRECT_URL is present it
must be a valid PostgreSQL URL; it is optional in deployed runtime environments. Keep
migration-only credentials out of the deployed API. Runtime usernames are limited to
`oak_api` (or `oak_api_test` in test mode), with an optional Supabase project suffix.
The eight-hour lifetime is enforced to match the approved session SQL; changing it
requires aligning the specification and session creation behavior together.

## T022 Prisma transaction helper (owner validation)

`apps/api/src/lib/prisma.ts` exports the shared runtime `prisma`, `withSession`,
`SessionIdentity`, and `SessionContextError`. It uses DATABASE_URL only and opens no
connection until a query is made. Development reloads reuse the client; do not create
another client for each request. Query logging is disabled. See the architecture note
for the transaction/credential boundary and the future T031 fixture integration.

`withSession(hash, async (tx, identity) => ...)` accepts a **server-computed SHA-256
session hash**, not a raw token or request userId. It validates context and protected
queries on the same transaction client, committing/rolling back together. ReadCommitted
transactions wait at most 5 seconds for acquisition and run for at most 10 seconds.
Keep callbacks short, await all queries on tx, and never use the outer prisma client
inside them. Password verification/network I/O happens outside this transaction.

Run from `C:\Dev\School\oak-sports-academy\apps\api`:

```powershell
..\..\node_modules\.bin\tsc.cmd --project tsconfig.json --noEmit
..\..\node_modules\.bin\tsx.cmd scripts/check-session-context.ts
```

Run the second command only after typechecking succeeds. Expected: no TypeScript
errors, then `Session-context rejection check passed...`. The script uses malformed
and randomly generated unknown hashes, expects safe 401 errors and zero protected
callback calls, and confirms unscoped identity/row access remains closed afterward.
It creates no users/sessions, mutates no table data, and prints no hashes or credentials.
If either command fails, stop and share only the safe output, not .env or raw DB errors.
Do not rerun all security suites yet: valid-session isolation, commit/rollback cleanup,
and concurrency are verified with the real dedicated fixtures in T031.

T022 owner validation passed on 2026-11-03: TypeScript --noEmit and the session-context
rejection check. Positive-session isolation/concurrency remain scheduled for T031.

## T023 safe API error handling (owner validation)

`apps/api/src/middleware/error-handler.ts` provides ApiError, SessionContextError,
and errorHandler. Server code chooses a reviewed error code instead of passing arbitrary
messages. Validation feedback names only known login fields and uses generic copy;
Zod custom messages and rejected values are never forwarded. Unknown failures return
500 INTERNAL_ERROR, malformed JSON returns 400 VALIDATION_ERROR, and oversized JSON
returns 413 PAYLOAD_TOO_LARGE. Upstream Retry-After headers are retained.

The module has no environment or database imports. SessionContextError is re-exported
from prisma.ts for existing callers; T022's rejection semantics remain unchanged.
T030 registers errorHandler after the JSON parser and routes. Express 4 async handlers
must explicitly forward rejections with next(error), since they are not automatically
forwarded as in Express 5. See the architecture note for safe serialization boundaries.

From `C:\Dev\School\oak-sports-academy\apps\api`, run:

```powershell
..\..\node_modules\.bin\tsc.cmd --project tsconfig.json --noEmit
..\..\node_modules\.bin\vitest.cmd run tests/middleware/error-handler.test.ts
..\..\node_modules\.bin\tsx.cmd scripts/check-session-context.ts
```

Run one command at a time, stopping on failure. Expected: no TypeScript errors, all
focused error-handler tests pass without skips, and T022's rejection check still passes.
The focused suite uses an isolated Express app with synthetic input; it requires no
.env/database and writes no records. The final check uses the restricted runtime DB
connection without table mutations. These checks do not run the incomplete T017 suites.
Share safe output on failure; do not print private configuration or raw SQL errors.
Owner validation passed on 2026-11-03: TypeScript --noEmit, all 21 focused middleware
tests, and the session-context rejection regression check.

## T024 rate limiting (owner validation)

`apps/api/src/middleware/rate-limit.ts` exports createRateLimiters. It creates separate
15-minute in-memory stores: globalIp=100/IP, loginIp=10/IP, loginEmail=5/normalized-email.
All outcomes count. Email keys are SHA-256 hashes of trimmed, lowercase valid addresses;
invalid/missing emails skip only email limiting and remain under IP quotas. Blocked
requests return safe RATE_LIMITED/429 JSON, integer Retry-After seconds, and draft-6
RateLimit headers. No database, environment import, or extra dependency is required.

T030 creates one bundle per application, applies env.TRUST_PROXY before mounting IP
limiters, mounts the global tier before parsing and routes, and the login tiers before
credential work (email tier after bounded JSON parsing). Call bundle.shutdown() during
app/test teardown. Reuse this factory's sensitive tiers for future verification routes
when that feature defines its own route scope; do not create stores per request.

Proxy trust must be false locally or an explicit verified upstream-IP list. Blanket
true, hop counts, and unsupported proxy policies fail closed. Untrusted X-Forwarded-For
headers are ignored using Express's resolved client IP; only their v7 warning is disabled,
not all library validation. A trusted upstream must sanitize the forwarded client chain.
Memory counters expire inactive keys within two windows (at most 30 minutes); memory
still scales with distinct keys within that interval. Counters reset on restart and
are per-process, so deployment across instances requires revisiting the store design.

From `C:\Dev\School\oak-sports-academy\apps\api`, run one command at a time:

```powershell
..\..\node_modules\.bin\tsc.cmd --project tsconfig.json --noEmit
..\..\node_modules\.bin\vitest.cmd run tests/security/rate-limit.test.ts tests/middleware/error-handler.test.ts
```

Expected: no TypeScript errors, all 8 rate-limit cases and 21 existing error-handler
cases pass (29 total), with no skips. These focused suites use synthetic HTTP requests
and fake clocks, not a database; unrelated unfinished security suites are not run.
Stop on failure and share the safe output. Owner validation passed on 2026-11-03:
TypeScript --noEmit and all 29 focused/regression tests. Final server wiring is T030.

## T025 Argon2id password service (owner validation)

`apps/api/src/modules/auth/password.service.ts` exports hashPassword(password),
verifyPassword(password, digestOrNull), verifyDummyPassword(password), and
initializePasswordService(). It uses installed argon2 0.41.1: Argon2id, memoryCost=19456
KiB, timeCost=2, parallelism=1, library-generated salts. Passwords remain unchanged;
1–128 character bounds match login validation, while registration complexity belongs
in its separate feature. Never return/log a digest, password, native error, or request.

T030 awaits initializePasswordService before accepting requests. All concurrent warmup
calls share one per-process dummy digest of cryptographically random bytes. Known and
unknown accounts both await that initialization and do exactly one native verification;
null digest denotes unknown email and always returns false. The login service must run
credential checks before emitting account verification/approval outcomes. No database
client, environment import, custom hashing implementation, or new dependency is added.
Malformed stored hashes/native failures are safe operational errors rather than silently
accepted credential mismatches. Initialization failure must stop API startup, not skip
verification. Work-factor changes need approved spec/host-performance review.

From `C:\Dev\School\oak-sports-academy\apps\api`, run one at a time:

```powershell
..\..\node_modules\.bin\tsc.cmd --project tsconfig.json --noEmit
..\..\node_modules\.bin\vitest.cmd run tests/auth/password.service.test.ts tests/auth/password-dummy.test.ts
```

Expected: no TypeScript errors and all 11 tests pass. The 7 real-library tests exercise
encoded parameters, matching/mismatching input, independent salts, whitespace/Unicode,
length boundaries, dummy false outcomes, and corrupted digests. The 4 orchestration
tests mock only the native API to count calls and cover concurrent warmup/reuse/failure;
they do not replace the real-library checks. No database or .env is needed.
Stop on failure and share safe output; do not install/rebuild native packages until the
specific failure is reviewed. T025 owner TypeScript --noEmit and all 11 focused tests
passed on 2026-11-03; deployment-host performance measurement is still pending.

Before deployment or changing parameters, the owner can measure on the actual host:

```powershell
..\..\node_modules\.bin\tsx.cmd scripts/benchmark-password.ts
```

Expected: median/max verification durations for 10 sequential known/unknown samples.
Only durations are printed. This diagnostic does not prove constant-time behavior or
meet the whole-login p95 target by itself. Record hosting results before tuning; full
login/response-time comparisons belong to later service/API acceptance checks.

## T026 opaque session service (owner validation)

`apps/api/src/modules/auth/session.service.ts` provides createSession, verifySession,
revokeSession, and revokeAllSessions. Creation uses 32 random bytes encoded as hex;
only SHA-256 enters the database via oak_create_session. PostgreSQL rechecks verified
ACTIVE eligibility and assigns the approved 8-hour absolute expiry. createSession must
only follow successful password verification/rate limiting in the later login service.
It returns just sessionToken/expiresAt for secure login delivery, not a database record.

verifySession uses withSession and returns safe identity/expiry without tokens/hashes.
It does not slide/extend expiry. revokeSession hashes the supplied opaque Bearer value
and invokes the narrow idempotent revoke function, including for expired/unknown tokens;
other devices remain untouched. Missing/malformed values reject with safe 401.
revokeAllSessions establishes active identity, revokes that account's other sessions,
then revokes the caller last in the same transaction. No arbitrary userId or privileged
connection is accepted for revocation. Future unauthenticated password-reset revocation
needs its own authorized challenge design; this helper cannot be used to bypass it.

From `C:\Dev\School\oak-sports-academy\apps\api`, run one at a time:

```powershell
..\..\node_modules\.bin\tsc.cmd --project tsconfig.json --noEmit
..\..\node_modules\.bin\vitest.cmd run tests/auth/session.service.test.ts
..\..\node_modules\.bin\tsx.cmd scripts/check-session-service.ts
```

Expected: no TypeScript errors, all 12 orchestration tests pass, then
`Session-service rejection check passed...`. Tests use a mocked runtime boundary with
real token RNG/SHA-256, require no DB/.env, and verify no raw-token SQL parameters,
metadata bounds, eligibility-error mapping, safe response selection, owner-scoped
revocation, and missing-context rejection. They do not prove PostgreSQL/RLS behavior.

The final owner check uses the restricted real DB connection with a locally random
unknown token: verification must return safe 401; repeated unknown-token logout must
succeed; unscoped access remains closed. It creates no records and should match no
session to revoke. No tokens/hashes/credentials are printed. Stop on failure and share
safe output rather than raw SQL errors. Positive creation/8-hour expiry, current status
changes, concurrent revocation, other-device independence, and revoke-all transaction
behavior await the T031 isolated real-database fixtures and later API suites.
T026 owner validation passed on 2026-11-03: TypeScript --noEmit, all 12 orchestration
tests, and the unknown-session DB check. Existing applied migrations were not changed.
