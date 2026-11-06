---
status: historical
owner: team
milestone: 1
---

# Authentication implementation checkpoints

Archived from README on 2026-11-06. This preserves earlier task evidence and commands,
including intermediate failures and superseded setup decisions. It is not the current
project status or an instruction to repeat completed setup. Use the [current README](../../README.md)
for routine commands, [tasks](../../specs/001-user-login/tasks.md) for progress, and the
[acceptance guide](../../specs/001-user-login/quickstart.md) for review scenarios. Review
current migrations/configuration before using historical provisioning instructions.

## T017 security-test checkpoint

Foundational tests are written in `apps/api/tests/security/`; the test-first module
interfaces and isolated database fixture requirements are documented in
[the security test guide](../../apps/api/tests/security/README.md).

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
[the authentication data-layer note](auth-data.md).

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
has been applied by the agent. See [the data-layer boundary](auth-data.md)
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
   contents of [scripts/inspect-auth-security.sql](../../scripts/inspect-auth-security.sql).
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

## T027 audit append/verification (owner validation)

`apps/api/src/modules/audit/audit.service.ts` exports appendAudit, hashAuditPayload,
verifyAuditChain, and their event/result types. Pass appendAudit the already-authorized
transaction from withSession, alongside server-defined actor/action/target and explicit
safe JSON metadata. It rejects an accidentally supplied outer PrismaClient, gets the
locked head through oak_audit_head, checks actor identity, then inserts into that same
transaction. Never catch an append failure and commit its administrative mutation.
Future permission-denial events commit in a separate authorized transaction at T028.
No administrative endpoints or existing SQL migrations were changed.

Payload encoding recursively sorts object keys, preserves arrays/strings, redacts
credential-like keys, and hashes UTF-8 using Node SHA-256. Only payloadHash is persisted;
no original payload is stored or logged. Callers must still choose safe metadata rather
than submit an entire request or hide secrets under ordinary keys. Non-JSON values,
cycles, sparse arrays, getters, and depth above 32 reject safely. UTC millisecond timestamps
and concatenation order match the existing DB trigger and approved specification.

verifyAuditChain is a pure routine for a complete snapshot ordered by hash links, not
by timestamps or actor-filtered subsets. It reports a count/head or first invalid index.
It cannot detect tail truncation without a trusted checkpoint, validate original payload
contents that were not retained, or defeat a privileged full-chain rewrite. The approved
formula does not hash the record ID; this limitation is explicit rather than changed.

From `C:\Dev\School\oak-sports-academy\apps\api`, run one at a time:

```powershell
..\..\node_modules\.bin\tsc.cmd --project tsconfig.json --noEmit
..\..\node_modules\.bin\vitest.cmd run tests/audit/audit.service.test.ts
```

Expected: no TypeScript errors, then all 15 focused tests pass. These tests exercise real
SHA-256/canonicalization/verification with synthetic records and a mocked transaction
boundary; no .env, database writes, or setup are needed. Stop on failure and share safe
output. Do not run tests/security/audit.test.ts until T031 provides its isolated fixture.
Real advisory-lock serialization, insert-trigger agreement, RLS/grants, and business/audit
atomic rollback remain T031 checks. T027 owner typecheck and all 15 focused tests passed 2026-11-05; real database checks remain pending T031.

## T063 Student role migration (owner-run)

T063 is complete: owner applied both migrations, regenerated Client, passed TypeScript,
17 tests and session rejection checks, and confirmed the final STUDENT/ADMIN enum.

### Follow-up: remove unused STAFF (current checkpoint)

Owner validation of the original Student rename passed, including 17 focused tests
and negative-session checks. Owner SQL inventory confirmed zero accounts and STAFF
sessions, and the enum now reads STUDENT/STAFF/ADMIN. The follow-up migration
`20261105090100_remove_legacy_staff` removes the unused value. It stops on any STAFF
account, replaces the enum in a bounded transaction, recreates the two functions whose
result includes Role, and restores their restricted owners/grants. It uses no CASCADE.

Stop the API, then run one command at a time from `apps/api`, stopping on failure:

```powershell
cd C:\Dev\School\oak-sports-academy\apps\api
..\..\node_modules\.bin\prisma.cmd validate --schema prisma/schema.prisma
..\..\node_modules\.bin\prisma.cmd migrate deploy --schema prisma/schema.prisma
..\..\node_modules\.bin\prisma.cmd generate --schema prisma/schema.prisma
..\..\node_modules\.bin\tsc.cmd --project tsconfig.json --noEmit
..\..\node_modules\.bin\vitest.cmd run tests/auth/session-role.test.ts tests/auth/session.service.test.ts
..\..\node_modules\.bin\tsx.cmd scripts/check-session-context.ts
```

Expected: valid schema; follow-up migration applied; Client generated; no TypeScript
errors; 17 focused tests pass; rejection check passes. Rerun each SELECT separately in
`scripts/inspect-student-role.sql`: enum must contain only STUDENT and ADMIN; STAFF
counts remain zero. No users are deleted or converted. On error stop and share redacted
output; do not reset the database or manually edit migration history. T031 still covers
positive database sessions/RLS. Refresh the graph using `graphify update .` from the
repository root after validation; no installer is needed.

### Original rename checkpoint (completed owner validation)

Implementation is written, not yet validated. Stop any running API before this change:
the old generated Prisma Client expects CUSTOMER while the new database returns STUDENT.
Do not restart until migration and Client generation both succeed.

1. In Supabase SQL Editor for the same development database as DIRECT_URL, run each
   SELECT in `apps/api/scripts/inspect-student-role.sql` separately. Save the role/count
   results for comparison; share legacy STAFF counts without account data. Before
   migration expect CUSTOMER/STAFF/ADMIN. STAFF may be present; it will stay unchanged
   but cannot create or use sessions. No coach role or promotion is inferred.
2. From PowerShell run the following, one at a time, stopping on any failure:

```powershell
cd C:\Dev\School\oak-sports-academy\apps\api
..\..\node_modules\.bin\prisma.cmd validate --schema prisma/schema.prisma
..\..\node_modules\.bin\prisma.cmd migrate deploy --schema prisma/schema.prisma
..\..\node_modules\.bin\prisma.cmd generate --schema prisma/schema.prisma
..\..\node_modules\.bin\tsc.cmd --project tsconfig.json --noEmit
..\..\node_modules\.bin\vitest.cmd run tests/auth/session-role.test.ts tests/auth/session.service.test.ts
..\..\node_modules\.bin\tsx.cmd scripts/check-session-context.ts
```

Expected: valid schema; migration `20261105090000_student_role` applied; Client generated;
no TypeScript errors; 17 focused tests pass (five role checks plus 12 session tests);
session-context rejection check passes without creating records. The role tests exercise
the real transaction helper with a mocked client; they do not prove SQL enforcement.

3. Rerun the inventory SELECTs separately. Expect STUDENT/STAFF/ADMIN, no CUSTOMER;
   Student account count equals the previous Customer count, other role counts unchanged.
   Existing sessions are not deleted or rewritten; STAFF replay is denied by identity
   checks even if its unrevoked-session inventory count remains nonzero. Positive real
   Student/Admin sessions and STAFF creation/replay denial require T031 fixtures.

On failure stop and share redacted output. A lock-timeout migration failure rolls back
its transaction; inspect the Prisma migration status before deciding recovery. Do not
edit applied SQL, reset the database, manually rename enums, or mark a failed migration
applied. No automatic STAFF conversion/deletion is authorized. Idle expiry and profile
grant removal remain T064/T065, not part of this migration.

After code changes, refresh the repository graph from the repository root (owner-run):

```powershell
cd C:\Dev\School\oak-sports-academy
graphify update .
```

Expected: graph update completes. If it fails, share the error without running installers.

## T064 idle-session expiry (owner validation)

For the next checkpoint see **T065 profile permissions** below.

Completed owner validation 2026-11-05: schema valid, migration applied, Client generated,
TypeScript passed, all 24 focused tests passed, and env/context/idle scripts passed.
Positive real database expiry/concurrency tests remain pending T031. Commands below
document the completed checkpoint; no repeat is required without further changes.

Stop the API. Run each command separately; stop on failure and share redacted output:

```powershell
cd C:\Dev\School\oak-sports-academy\apps\api
..\..\node_modules\.bin\prisma.cmd validate --schema prisma/schema.prisma
..\..\node_modules\.bin\prisma.cmd migrate deploy --schema prisma/schema.prisma
..\..\node_modules\.bin\prisma.cmd generate --schema prisma/schema.prisma
..\..\node_modules\.bin\tsc.cmd --project tsconfig.json --noEmit
..\..\node_modules\.bin\vitest.cmd run tests/auth/session-activity.test.ts tests/auth/session-role.test.ts tests/auth/session.service.test.ts
..\..\node_modules\.bin\tsx.cmd scripts/check-env.ts
..\..\node_modules\.bin\tsx.cmd scripts/check-session-context.ts
..\..\node_modules\.bin\tsx.cmd scripts/check-session-idle.ts
```

Expected: valid schema; migration `20261105090200_session_idle_expiry` applied; Client
generated; no TypeScript errors; 24 focused tests pass (7 activity, 5 role, 12 session);
all three scripts pass. SESSION_IDLE_TIMEOUT_MINUTES defaults to 30 if absent, so
editing the private .env is unnecessary. Only 30 is accepted to match SQL; changing
the policy requires a reviewed coordinated migration. Existing sessions are backfilled
from creation, so sessions older than 30 minutes can expire immediately after deploy.

The idle smoke script checks metadata, denied direct runtime updates, denied unscoped
renewal and hidden users; it creates no fixtures and does not validate positive expiry.
T031 must verify real exact deadlines, capped activity, concurrency and atomic rollback.
T029/T030 still need to classify user-initiated routes on the server; background/restore
checks remain nonrenewing. Do not reset data or change applied SQL on failure. After
validation run `graphify update .` from the repository root and share any failure.

## T065 profile permissions (owner validation)

Completed owner validation 2026-11-05: schema and migration succeeded, TypeScript
passed, all 39 focused tests passed and profile/context/idle scripts passed. Actual
scoped database denial and rollback remain pending T031. No repeat is needed unchanged.

T066 document reconciliation is complete. See the feature quickstart and
`specs/001-user-login/checklists/ui-states.md` for updated acceptance steps and design
conflicts. No UI/code change or additional test run is part of this documentation task.

Stop the API and run each command separately, stopping on failure:

```powershell
cd C:\Dev\School\oak-sports-academy\apps\api
..\..\node_modules\.bin\prisma.cmd validate --schema prisma/schema.prisma
..\..\node_modules\.bin\prisma.cmd migrate deploy --schema prisma/schema.prisma
..\..\node_modules\.bin\tsc.cmd --project tsconfig.json --noEmit
..\..\node_modules\.bin\vitest.cmd run tests/auth/session-activity.test.ts tests/auth/session-role.test.ts tests/auth/session.service.test.ts tests/audit/audit.service.test.ts
..\..\node_modules\.bin\tsx.cmd scripts/check-profile-permissions.ts
..\..\node_modules\.bin\tsx.cmd scripts/check-session-context.ts
..\..\node_modules\.bin\tsx.cmd scripts/check-session-idle.ts
```

Expected: valid schema; migration `20261105090300_admin_profile_corrections` applied;
no TypeScript errors; 39 focused regression tests pass; all three scripts pass. Prisma
model fields are unchanged, so no additional Client generation is required. The profile
script verifies effective runtime column grants, policy removal and hidden unscoped
users without creating or updating records. It does not establish scoped Student denial.

Do not run tests/security/rls.test.ts or tests/security/audit.test.ts until T031 supplies
its isolated real DB harness and second Alice session. Their revised assertions cover
self/unqualified profile denial, preserved values and atomic session-revocation/audit
rollback. Future Administrator correction functionality needs a separately constrained
write interface; this task creates no endpoint or broad Administrator database grants.
On failure share redacted output; do not edit applied migrations or reset the database.
After validation refresh the graph with `graphify update .` from the repository root.

## T028 permissions (owner validation)

Completed 2026-11-05: owner shared/API typechecks and all 62 focused tests passed
(26 permission, 21 error-handler, 15 audit). No repeat required without changes.
Identity, ownership and real denial-audit transaction wiring remain T029/T030;
database persistence/isolation verification remains T031.

No migration, install or setup is needed. Run these separately and stop on failure:

```powershell
cd C:\Dev\School\oak-sports-academy
.\node_modules\.bin\tsc.cmd --project packages/shared/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.json --noEmit
cd apps\api
..\..\node_modules\.bin\vitest.cmd run tests/middleware/require-permission.test.ts tests/middleware/error-handler.test.ts tests/audit/audit.service.test.ts
```

Expected: both typechecks pass and all focused tests pass. These checks cover unsigned
combined masks, malformed masks/unsupported roles, denial auditing and safe audit errors,
plus existing safe-error/audit regressions. No database credentials or connection needed.
The shared package now has a local tsconfig extending the repository baseline so its
existing typecheck command validates these pure exports without emitting files.
Do not run tests/security/permissions.test.ts yet: it still imports T029 ownership code.

The gate requires a trusted awaited audit callback. T029/T030 supply real identity,
independent denial-audit commit and ownership wiring; T031 checks persistence under real
RLS. T028 focused success alone does not certify those integrations. A permission bit
never activates an unpaid package or permits Student personal/contact correction.
After validation run `graphify update .` from the repository root; report failures
without installing tools.

## T029 authentication and ownership (owner validation)

Owner reports all requested typechecks/tests/rejection checks passed on 2026-11-05.
Real transaction guarantees remain pending T031.

**Current policy checkpoint T067:** owner now allows Students to edit owned personal/
contact details without Administrator approval. This supersedes T065. Deploy new
`20261105090400_student_self_profile`, then rerun API typecheck, the four T029 suites
below, check-profile-permissions.ts and check-session-context.ts. Expect successful
migration, passing typecheck/tests and both scripts. No Client regeneration is needed.
The current auth schema grants only displayName/updatedAt edits; full profile fields/UI
remain separate. Role/status/credentials/verification, progress and finances stay
protected. Applied migrations stay unchanged; T031 verifies positive ownership isolation.

Run separately and stop on failure; no migration/install is needed:

```powershell
cd C:\Dev\School\oak-sports-academy
.\node_modules\.bin\tsc.cmd --project packages/shared/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.json --noEmit
cd apps\api
..\..\node_modules\.bin\vitest.cmd run tests/middleware/require-auth.test.ts tests/security/permissions.test.ts tests/middleware/require-permission.test.ts tests/middleware/error-handler.test.ts
..\..\node_modules\.bin\tsx.cmd scripts/check-session-context.ts
```

Expected: both typechecks and all listed tests pass, then session-context rejection
check passes. The permission/ownership suite now has its missing middleware and uses
an isolated Express harness, not real database fixtures. The new auth HTTP tests mock
transaction settlement and audit calls; no test credentials or DB setup are needed.
The negative-context script uses the restricted development connection without records
being created; positive database guarantees remain T031. Stop and share redacted output
on failure; do not run the missing-fixture RLS/audit suites yet.

Protected route wiring uses requireAuth(required, async ({tx,user,req}) => safeJson,
options). Use only scoped tx, return data instead of sending responses, default session
lookup to background, and supply a real server-resolved owner for future resource routes.
Permission then ownership precede work; response follows commit. Denial audit is appended
in a separate background verified transaction only after protected rollback. Failure
stays closed. Actual session route registration/projection remains T030/T041.
After validation refresh the graph with `graphify update .` from the repository root.

## Audit checkpoint deferred; T030 application wiring

The owner deferred the security audit after both official validators failed closed on
Windows because OS no-follow/nonblocking input protection was unavailable. They were
not patched to weaken their safety requirements. Reports remain incomplete in ignored
output/security-audit/run-1; resume in a compatible isolated environment later. No audit
validator rerun or environment installation is requested now. New feature work is outside
that audit snapshot. T067 owner self-profile migration/regression checks passed.

T030 is written, pending owner validation. No migration/install is needed. Run separately:

```powershell
cd C:\Dev\School\oak-sports-academy\apps\api
..\..\node_modules\.bin\tsc.cmd --project tsconfig.json --noEmit
..\..\node_modules\.bin\vitest.cmd run tests/middleware/app.test.ts tests/middleware/error-handler.test.ts tests/security/rate-limit.test.ts
```

Expected: no TypeScript errors and 35 tests pass (6 app, 21 errors, 8 rate-limit).
Stop and share output if a step fails. No DB connection is required by these focused
app tests. Full suites remain gated by T031's isolated fixture.

Then manually start the API in one terminal:

```powershell
cd C:\Dev\School\oak-sports-academy\apps\api
..\..\node_modules\.bin\tsx.cmd src/server.ts
```

Expected: API listening on port 3000 (or your private PORT override). Startup warms
Argon2's dummy digest first, performs no migration or DB query, and binds 0.0.0.0.
In another terminal, use the port printed by the server:

```powershell
curl.exe -i http://localhost:3000/api/v1/health
```

Expected: 200, JSON status ok, Content-Security-Policy default-src none, no X-Powered-By
or Set-Cookie. Liveness does not prove database readiness. Press Ctrl+C in the server
terminal to stop it; cleanup releases the listener, store timers and Prisma resources.
On failure share only redacted output, never .env values. Login/session/logout endpoints
are still T041 work and currently return static JSON 404. T030 provides versioned router,
security middleware and startup, not completed login. Keep future protected work inside
T029 requireAuth with explicit server-selected activity/owner policy and safe projections.
After validation refresh graphify from the root using graphify update . (owner-run).

## T031 isolated database setup and validation (owner-run)

Completed owner validation 2026-11-05: local provisioning/seven migrations succeeded,
source/test typechecks passed, and all 182 tests across 15 files passed. Real DB suites
passed: RLS11, audit7 and session lifecycle/concurrency9. Commands below document that
checkpoint; do not repeat provisioning against an existing container. Deployment
acceptance and the deferred audit remain separate.

Test-typecheck compatibility: tsconfig.tests.json spans the repository root for shared
source imports and includes DOM types required by Vite's Worker declaration. It skips
dependency .d.ts checking for the installed Vite/Rollup exact-optional incompatibility;
all project source/test strict options remain enabled. No dependency upgrade is needed.

T030 passed owner typecheck,35 tests,startup and health check. Graphify update succeeded.
The next database tests MUST NOT use the Supabase development project. Docker Desktop's
CLI is already installed on this machine. Use one disposable local container; no npm
install or cloud project is needed. Docker may download the PostgreSQL image if uncached.

1. Start Docker Desktop yourself if it is not already running. From the repository root:

```powershell
cd C:\Dev\School\oak-sports-academy
docker version
docker run --name oak-auth-tests -e POSTGRES_DB=oak_auth_test -e POSTGRES_PASSWORD=oak_test_only_admin -p 127.0.0.1:55432:5432 -d postgres:16-alpine
docker exec oak-auth-tests pg_isready -U postgres -d oak_auth_test
```

Expected: Docker client AND server details; a container ID; PostgreSQL accepting
connections. If not ready yet, repeat only pg_isready after a few seconds. If Docker is
not running, start Desktop and retry; do not install anything. If the container name or
port is already used, STOP and share the error; do not remove a preexisting container.
The credentials above are synthetic local fixtures and must never be used for deployment.

2. Apply the existing migrations only to that fixed local target, then provision its
restricted test login and private marker. Run these once, separately:

```powershell
cd C:\Dev\School\oak-sports-academy\apps\api
..\..\node_modules\.bin\tsx.cmd scripts/migrate-test-db.ts
Get-Content -LiteralPath scripts/provision-test-db.sql | docker exec -i oak-auth-tests psql -v ON_ERROR_STOP=1 -U postgres -d oak_auth_test
```

Expected: all existing migrations applied to127.0.0.1:55432/oak_auth_test, then SQL
BEGIN/DO/CREATE ROLE/GRANT/CREATE SCHEMA/CREATE TABLE/INSERT/COMMIT without errors.
The helper explicitly overrides DATABASE_URL/DIRECT_URL for its child process; your
private Supabase .env remains unchanged. Do not replace its fixed URLs with cloud URLs.
If provisioning reports an existing role/schema, stop and share output; do not reset.

3. Create the ignored test environment file from its synthetic example:

```powershell
if (!(Test-Path -LiteralPath .env.test)) { Copy-Item -LiteralPath .env.test.example -Destination .env.test }
```

Expected: apps/api/.env.test contains only the local TEST_DATABASE_URL/TEST_DIRECT_URL
and explicit TEST_ALLOW_RESET opt-in. If it already exists, verify privately that it
matches the example; do not paste credentials. Vitest never loads the development .env.
A missing test URL makes database suites fail explicitly; unit suites still use a
nonconnecting dummy URL. Fixtures reject nonlocal targets, wrong db/port/logins, missing
marker/migrations, unsafe privileges and unexpected records before cleanup.

4. Validate new fixture types and all implemented tests (one command at a time):

```powershell
..\..\node_modules\.bin\tsc.cmd --project tsconfig.json --noEmit
..\..\node_modules\.bin\tsc.cmd --project tsconfig.tests.json --noEmit
..\..\node_modules\.bin\vitest.cmd run
```

Expected: both typechecks pass and every implemented test file passes, including real
RLS/audit/session DB suites. Tests run serially; only explicit concurrency cases use
multiple runtime connections. The tests create/delete synthetic fixture records only
inside this disposable database; no shared tables are truncated. If interrupted or
unexpected data exists, cleanup refuses rather than broadening deletion. Stop on ANY
failure and share redacted output; do not drop schemas, disable RLS, skip suites or edit
migrations to make tests pass. This task stays open until owner results are reviewed.

The real tests cover final Student/Admin roles, own profile edits/cross-user denial,
positive session issuance/revoke, background nonrenewal, capped interactive renewal,
at/past idle and absolute deadlines, current suspension, pooled scope cleanup, audit
chain/concurrency/rollback, denial audit committed after rejected-scope rollback and
controlled lock-wait renewal expiry/revocation. Exact instant equality is not simulated
by mocking JavaScript time; database-clock boundary behavior is used instead.

No server needs running for these tests. Keep the local container for reruns while
working on this feature; do not use it for real academy data. Refresh the graph after
code changes with graphify update . from the root; no LLM label refresh is required.

## T032 development seed accounts (Supabase; owner-run)

Completed 2026-11-05: owner seeded the development database successfully (4 created,
0 already present). The Prisma 6 package.json configuration warning is non-blocking;
no dependency upgrade is required. The instructions below remain for reference/reruns.

Implementation validation passed: source/test typechecks and all189 tests across16files,
including seven real local-DB seed tests. The owner authorized agent-run tests for T032;
no Supabase seed or database write was performed by the agent. Automated tests stay in
Docker; development seed accounts go in your existing Supabase development database.

From apps/api, create the ignored private file without overwriting an existing one:

```powershell
cd C:\Dev\School\oak-sports-academy\apps\api
if (!(Test-Path -LiteralPath .env.seed)) { Copy-Item -LiteralPath .env.seed.example -Destination .env.seed }
```

Edit .env.seed privately: set SEED_PASSWORD to a unique development-only password of
12–128 characters. Keep NODE_ENV=development and SEED_CONFIRM=DEVELOPMENT_FIXTURES_ONLY.
Do not share this password or reuse a real participant password. Existing DIRECT_URL in
.env selects the development Supabase database; do not replace runtime DATABASE_URL or
use production credentials. NODE_ENV=production/test/unspecified is refused; .env.seed
supplies development explicitly. Confirm the .env target is your development project.

Then run (no install/migration needed):

```powershell
..\..\node_modules\.bin\prisma.cmd db seed
```

Expected first run: Development seed complete:4created,0already present (with spacing
in actual console text). Rerun:0created,4already present. Counts only are printed;
passwords/hashes/URLs are never printed. If it fails, stop and share the static safe
message, not credentials/raw SQL. Prisma6 may print a package.json seed-config deprecation
notice; no package upgrade is needed for this task.

| Synthetic email | Account status | Email verified | Expected future native login |
| --- | --- | --- | --- |
| active.student@example.test | ACTIVE | Yes | Allowed with correct password |
| unverified.student@example.test | ACTIVE | No | Email verification required |
| suspended.student@example.test | SUSPENDED | Yes | Blocked |
| pending.student@example.test | PENDING_APPROVAL | Yes | Blocked until academy approval |

All four are STUDENT; no Administrator is created. These are reserved example.test
addresses for direct password-based manual checks, not deliverable email inboxes.
Login endpoints are still pending T040/T041. Each account receives an independent
Argon2id salt. No sessions, sign-in attempts, audit history or other accounts are seeded.
Existing matching seed accounts, passwords and manually changed statuses remain unchanged.
Changing SEED_PASSWORD does not reset an existing seed. Any reserved-ID/email/role
collision rolls back the transaction rather than overwriting an account. No automatic
cleanup is run; request an explicit targeted cleanup when these fixtures are no longer
needed. T032 stays open until the owner reports seed execution output.

## T033 shared auth types and error codes (complete)

packages/shared exports native LoginRequest/LoginResponse, token-free SessionResponse,
UserSummary, technical AuthAccountStatus and bodyless LogoutResponse. JSON expiry is
an ISO string for the absolute cap; idle expiry/revocation may end validity sooner.
Raw token/hash properties and raw Date values are rejected by compile-time examples.
Shared ERROR_CODES, ErrorCode, known validation fields and isErrorCode align the API
safe error catalog/response with the OpenAPI contract. No Node/Expo/DB imports were
added to shared. Types do not replace Zod/runtime validation or safe field projection.

Under explicit T033 test authorization, shared/API/test typechecks passed and all199
tests across17files passed with exit0. An initial worker exit did not reproduce in an
isolated rate-limit rerun and the subsequent full run. No tests were skipped, dependency
versions changed or failure suppression added. Tests used local loopback/Docker only;
Supabase was not contacted. No rerun is required without changes. Next task is T034.

Reproduction commands (only when needed):

```powershell
cd C:\Dev\School\oak-sports-academy
.\node_modules\.bin\tsc.cmd --project packages/shared/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.tests.json --noEmit
cd apps\api
..\..\node_modules\.bin\vitest.cmd run
```

## T034 mobile secure token helper (complete)

Use getSessionToken/setSessionToken/deleteSessionToken from apps/mobile/lib/token-store.ts.
Only Expo SecureStore holds the token. Await successful writes before signedIn; handle
TokenStorageError separately from a missing token, and offer retry for failed deletion.
Errors contain static safe copy without native causes or logging. Remote revocation and
server-validated restoration remain separate authentication tasks.

Under explicit T034 test authorization, mobile/API test typechecks and seven focused
mocked-native tests passed. No installs, setup, database access or UI changes were needed.
Actual device storage/persistence acceptance remains pending the integrated auth flows.
Reproduce only if needed; successful commands exit zero and Vitest reports seven passed:

```powershell
cd C:\Dev\School\oak-sports-academy
.\node_modules\.bin\tsc.cmd --project apps/mobile/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.tests.json --noEmit
cd apps\api
..\..\node_modules\.bin\vitest.cmd run tests/mobile/token-store.test.ts
```

If a check fails, stop and share its output without tokens or private environment files.

## T035-T044 native sign-in (acceptance passed)

Production login enforces the native header, validated JSON and three limiter tiers.
The restricted service admits only verified ACTIVE Students after credential verification.
Session lookup applies permissions, ownership and runtime RLS in one nonrenewing transaction,
returning only safe identity/expiry. No cookies or tokens/hashes appear in session output.
App construction defers environment/database dependency loading until auth requests.

The mobile form now submits real credentials, waits for SecureStore before signedIn,
blocks duplicate submissions, and exposes safe errors plus a Retry-After countdown.
Retries are explicit. Remember Me was removed under the owner's proper-UX condition:
persistence is automatic and the spec defines no checkbox choice. Wrong/unknown credentials
share a form-level error. Real auth context gates routes; startup confirms saved tokens,
preserves them offline with retry, and clears rejected tokens. Later T047–T052 added
request-associated invalidation and remote logout; full Home/navigation remains separate. The authenticated
landing is a placeholder and does not activate unpaid entitlements.

Owner configures ignored apps/mobile/.env from .env.example using the machine LAN address
and /api/v1 suffix in EXPO_PUBLIC_API_URL; release requires HTTPS. This URL is public,
never a place for secrets. No installs, setup, migrations or cloud changes were performed.

T044 acceptance passed on 2026-11-06. The unchanged suite passed 287 tests across
26 files using the installed Node 24.22.1 runtime (system Node 24.15.0 intermittently
exited HTTP workers). See the current T057 commands below and
[quickstart](../../specs/001-user-login/quickstart.md) for acceptance evidence. Mobile/test typechecks passed; earlier source/shared
checks remain recorded in the implementation evidence. No dependency upgrade was made.

Agent observed native ACTIVE Student landing and server-confirmed restoration after
reopening. Owner confirmed keyboard reachability and TalkBack labels/errors at 360 dp
with 1.3 text. Real malformed-input, generic credential failure, network recovery and
rate-limit countdown states were reviewed. Logout and functional US3 recovery subsequently
passed their recorded checks; Home/navigation and outstanding timing/deployment
acceptance remain separate. See the
[device evidence](../../specs/001-user-login/checklists/ui-states.md#t044-device-evidence-completed-2026-11-06).

Reproduce against the existing configured disposable local database:

```powershell
cd C:\Dev\School\oak-sports-academy
.\node_modules\.bin\tsc.cmd -p packages/shared/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd -p apps/api/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd -p apps/api/tsconfig.tests.json --noEmit
.\node_modules\.bin\tsc.cmd -p apps/mobile/tsconfig.json --noEmit
cd apps\api
..\..\node_modules\.bin\vitest.cmd run
```

Expected at that historical checkpoint: all typechecks exit 0 and 287 tests pass.
For the tested Node runtime command, use T057 below; the system-Node command can still expose worker instability.
On failure, share redacted output
before changing test environment configuration. For device review, start existing API/mobile
dev commands in separate root terminals as described in T057 below.

## T057 current acceptance commands

The latest recorded regression (T058 cleanup fix) is 344 tests in 29 files, exit 0 on
installed Node 24.22.1. T057 itself was documentation only. Use the
existing configured disposable local database; resume its container if stopped:

```powershell
cd C:\Dev\School\oak-sports-academy
docker start oak-auth-tests
```

Docker Desktop must already be running. If the named container is missing or preflight
fails, stop and report redacted output; do not recreate/reset/migrate it implicitly.
Run the four typechecks listed in T044 above, then the known passing runtime:

```powershell
cd C:\Dev\School\oak-sports-academy\apps\api
& C:\Users\ventura\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe ../../node_modules/vitest/vitest.mjs run
```

Expected: 29 files/344 tests pass with no unhandled errors and exit 0, unless later
approved additions increase the count. This path is the already installed runtime
on the reviewed workstation; do not install a replacement implicitly if unavailable.
Run device servers in separate root terminals, using existing private configuration:

```powershell
cd C:\Dev\School\oak-sports-academy
npm run dev -w apps/api
```

```powershell
cd C:\Dev\School\oak-sports-academy
npm run dev -w apps/mobile
```

Expected: API listens on configured port (reviewed 3000), Metro reports its connection;
press `a` for the existing Android emulator. If loading stalls, capture safe diagnostics.
The owner previously recovered by stopping Metro, running the following, and reopening
a fresh Expo process without clearing app data. This is recovery, not a startup pass:

```powershell
npm run dev -w apps/mobile -- --clear
```

After accessibility review, the owner can restore the emulator's original display:

```powershell
adb shell wm density reset
adb shell settings put system font_scale 1.0
```

Never run these restore commands while a 360 dp/font-scale-1.3 check is still underway.
Use the [quickstart acceptance matrix](../../specs/001-user-login/quickstart.md) for RLS,
audit, limits, storage and device steps. T053 startup/timing and T059 final deployment
performance remain open; existing functional passes do not complete them.

## T045-T046 logout API (validated)

Owner confirmed the red baseline, and production `POST /api/v1/auth/logout` now
revokes only the supplied Bearer session before returning empty 204. Missing,
malformed or duplicate headers return safe 401; unknown/already-revoked/expired
well-formed tokens return 204. Other devices/accounts remain signed in. Forged body
and query identity claims are stripped. No cookie is issued, idle activity is not
renewed, and DB failure returns safe 500 rather than a false success.

Validation on 2026-11-06: all 16 logout production HTTP/restricted-local-DB tests pass.
Full regression: **303 tests in 27 files**, exit 0 with no unhandled errors on the
installed Node 24.22.1 runtime. API source/test typechecks pass. No dependencies,
setup, migration or cloud configuration changed. Mobile sign-out is T047, with
native online/offline acceptance in T048.

From `C:\Dev\School\oak-sports-academy\apps\api`, with the existing disposable
local test database running:

```powershell
& C:\Users\ventura\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe ../../node_modules/vitest/vitest.mjs run tests/auth/logout.api.test.ts
& C:\Users\ventura\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe ../../node_modules/vitest/vitest.mjs run
```

Expected: 16 focused tests, then all 303 tests pass with exit 0 and no unhandled errors.
On unexpected failure, share redacted output before changing the test environment.

## T047-T048 mobile sign-out (acceptance passed)

The Student landing now has the approved neutral Sign out action. It hides identity
immediately, attempts remote revocation before deletion, and always cleans up locally
in finally. Duplicate requests coalesce; in-flight storage/restore work cannot revive
an old identity. Offline/timeout/server failure still permits local logout and produces
safe unconfirmed-server feedback. Failed secure deletion blocks login/protected content
behind Retry secure cleanup, rather than claiming success. That retry is local-only.

Validation: 312 tests across 28 files pass on installed Node 24.22.1; mobile/API-test
typechecks pass. T048 subsequently passed native online/API-unavailable sign-out
and relaunch at 360 dp with 1.3 text. Owner confirmed Sign out, progress and warning
TalkBack announcements and restarted the API. Native deletion fault injection is not
claimed; failure/retry branches have adapter tests. See
[quickstart](../../specs/001-user-login/quickstart.md) and the
[logout state review](../../specs/001-user-login/checklists/ui-states.md). No installs, setup,
schema or cloud changes were performed.
