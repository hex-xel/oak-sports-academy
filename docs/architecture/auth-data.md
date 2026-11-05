---
status: in-progress
owner: team
milestone: 1
---

# Authentication data layer

## T035–T040 client foundations and native login service

The mobile api client uses app.config.ts public EXPO_PUBLIC_API_URL/extra.apiUrl,
including /api/v1. Development supports a LAN HTTP override; release requires HTTPS.
URLs cannot contain credentials, queries or fragments. Requests use JSON headers,
mobile platform identification for login, and bearer headers for authenticated calls.
Login projects only email/password and never reads/sends a previous saved token.
No cookies, logging or automatic retries are added. A 10-second abort/deadline bounds
fetch and body decoding; every retry is a fresh explicit call. ApiClientError exposes
reviewed codes/status/Retry-After but discards server/native diagnostic text. Decoded
success JSON remains unknown until parseLoginResponse/parseSessionResponse projects it.

AuthProvider/useAuth expose a per-provider local lifecycle. It starts restoring;
missing-token reads can sign out, existing tokens remain restoring pending T050 server
confirmation, and read failures expose a retry state without deleting tokens. signIn
awaits secure persistence before publishing a safe active Student identity. Serialized
storage operations and generation checks prevent an in-flight write from reviving
state after local invalidation; concurrent invalidations share cleanup. Storage failures
remain explicit. signOut is local cleanup only: T047 must arrange remote revocation.
The provider is not mounted into the scaffold guard until T043. No cached user grants
API authorization. Full restoration and request-associated 401 handling remain US3/US4.

auth.schemas validates object bodies, exact mobile header, empty params/query schemas,
normalized 3–254 character single-@/dotted-domain email and untrimmed 1–128 character
passwords. Unknown body properties are stripped. The limiter shares the email schema.
The visually reviewed form uses matching pure validation before its callback, no longer
applies creation/reset complexity at login, and has accessible inline announcements.
Credential-bearing preview output was removed. Remember Me/generic credential styling
and real API form wiring remain the documented T042 design/integration gates.

login(input, metadata, client) validates before database work and uses only the existing
oak_auth_lookup/oak_create_session/oak_record_sign_in_attempt functions under the
restricted runtime client. One real/dummy Argon2 verification precedes all role/status/
verification disclosures. Only verified ACTIVE STUDENT can receive native login JSON.
Session creation, lastSignInAt and the successful attempt share one transaction. The
account lock held by oak_create_session permits a second lookup to reject concurrent
role/password changes before commit. Failed attempts are separate writes after rollback;
unknown emails need no User relation. Missing observed IP is explicitly stored as unknown.
Malformed bodies are rejected before credential work; perimeter limiters still count them.
Infrastructure/attempt failures fail closed at the safe HTTP boundary. No privileged
fallback, migration, enrollment/payment lookup or entitlement activation is introduced.

Validation: shared/API/API-test/mobile typechecks passed. The focused run passed 58 tests,
including six real Docker database checks (session hash storage, last login/attempts,
unknown-email recording, restrictions, atomic rollback and concurrent role change).
T038's 23 production HTTP tests are intentionally red pending T041 route registration:
three perimeter checks pass and 20 receive 404. The final full run reports 260 passed,
20 expected T041-dependent failures, exit 1 and no unhandled errors. An earlier intermittent
rate-limit worker exit did not recur in its isolated and final full reruns. No skipped,
expected-failure markers or suppression were added. Device UI/native persistence checks
remain manual; these results do not claim a working end-to-end login screen yet.

## T034 mobile secure token storage

apps/mobile/lib/token-store.ts exposes getSessionToken, setSessionToken and
deleteSessionToken over Expo SecureStore using one private key. A read returns null
only when SecureStore reports no entry. Callers must distinguish TokenStorageError
from a missing token, await writes before signedIn, and handle deletion failures
explicitly instead of claiming successful local logout. Native diagnostics are
discarded; the helper has no logging, crash reporting or alternative storage path.
It stores only an opaque token and does not validate identity or revoke sessions.

iOS accessibility is WHEN_UNLOCKED_THIS_DEVICE_ONLY: foreground access without
cross-device keychain migration. No biometric requirement is introduced. Android
uses Expo's native secure storage. Installed Expo declarations document these
options in node_modules/expo-secure-store/build/SecureStore.d.ts.

Seven tests run through the existing API Vitest harness with the native module mocked;
they cover round-trip/deletion, pending writes, read/write/delete rejection sanitization,
synchronous bridge errors and empty input. Mobile and test typechecks passed. These
tests do not certify native encryption or device persistence. Once T036/T042/T051
connect the helper, device review must check saved-token cold launch, successful logout
followed by relaunch, and recoverable storage failures without false signedIn/logout.
No UI is added here; state feedback belongs to those integrated flows.

## T033 shared authentication contracts

packages/shared exports LoginRequest/LoginResponse/SessionResponse/LogoutResponse,
UserSummary and AuthAccountStatus, plus ERROR_CODES/ErrorCode, ValidationField,
ApiErrorResponse and isErrorCode. The package remains platform-independent: no Prisma,
Node, Expo, environment or database imports. Shared role types retain Student/Admin;
technical account approval does not represent enrollment/payment status.

JSON expiry is an ISO string for the absolute cap; idle expiry/revocation can end a
session earlier. Only login has sessionToken; token-free session/user types explicitly
reject token/hash properties, and credential bodies contain no role claims. Logout has
no body (204). Compile-time checks cover these boundaries; TypeScript does not validate
decoded network values, sanitize messages, enforce ISO formatting or remove unknown
properties. T039/T041 and the future client must still validate/project at runtime.

The API keeps safe statuses/messages on the server, checks catalog completeness against
the shared code union and types the outgoing error body. Eleven codes and known feedback
fields stay consistent without exposing raw errors; local network/storage errors remain
distinct from server codes. Shared/API/test typechecks and all 199 tests across 17 files
passed. An initial worker exit did not reproduce in isolated and full reruns; no tests
were skipped and no failures were suppressed. No Supabase or UI changes were made.

## T032 development seed accounts

Owner runs prisma/seed.ts against the existing Supabase development database, separate
from Docker-only automated tests. The CLI validates explicit NODE_ENV=development,
SEED_CONFIRM=DEVELOPMENT_FIXTURES_ONLY and private 12–128 character SEED_PASSWORD before
connecting via existing DIRECT_URL. It never changes the restricted runtime URL/role.
Secrets come from ignored .env/.env.seed; CLI output is counts/static errors only.

Four reserved UUID/example.test accounts cover verified ACTIVE, unverified ACTIVE,
verified SUSPENDED and verified PENDING_APPROVAL. All are STUDENT; none are Administrator.
Each password gets an independent Argon2id salt. No sessions/attempts/audits are created.
The operation is atomic and insert-only: existing matching reserved identities, including
passwords/statuses, remain unchanged. An ID/email/role collision refuses the transaction.
Changing SEED_PASSWORD later does not reset existing seed passwords. Removal is not
automatic; an explicit owned-account cleanup can be supplied when the owner needs it.

## T031 disposable database harness (owner validation passed)

On 2026-11-05 the owner provisioned the local container and restricted test role,
applied seven migrations, passed source/test typechecks, and ran all 182 tests across
15 files successfully. This includes 11 real RLS, seven real audit and nine real session
lifecycle/concurrency cases. Earlier pending notes describe the implementation stage;
these local results do not certify deployment configuration or the deferred full audit.

Docker CLI is already installed locally; the owner chose minimum setup effort. The
owner-run local container exposes PostgreSQL only on 127.0.0.1:55432 with database
oak_auth_test and synthetic credentials. No agent starts it or touches Supabase. A
fixed-target migration helper cannot inherit cloud URLs. The owner provisions the
restricted test login and a private test marker after migrations.

Vitest loads only .env.test, sets NODE_ENV=test and overrides DATABASE_URL from
TEST_DATABASE_URL, never development .env. Files run serially. The fixture refuses
non-loopback URLs, wrong port/database/users/query overrides, missing reset opt-in,
missing marker/latest migration, unsafe runtime roles or unexpected existing records.
Cleanup deletes only this fixture's random UUID actors/sessions/audits and synthetic
emails, never truncates. An interrupted/stale fixture causes refusal rather than a
broader reset. RLS uses a single runtime connection; audit concurrency explicitly uses
eight. All protected callbacks use real withSession on the restricted client.

Existing RLS/audit tests now have real fixtures, and session-db tests add issuance,
revoke/replay, current suspension, nonrenewing restore, capped interactive renewal,
idle/absolute expiration and rollback if final renewal sees revocation. These are
written tests, not execution results. Controlled concurrent
lock-wait expiry and end-to-end denial-audit persistence are written tests awaiting owner execution.
No full security certification or audit resumption is implied by this harness.

## T030 application wiring (owner validation pending)

createApp has no environment/database import or listener side effect. It disables
X-Powered-By, sets explicit proxy trust before limiting, uses simple query parsing,
Helmet with API CSP default-src/base-uri/frame-ancestors/form-action/object-src none,
no-store, global quota then strict JSON parsing capped at 10 KiB. HSTS is production-only
so local HTTP development remains usable. The versioned router currently exposes only
GET /api/v1/health (liveness, not database readiness), validating/stripping unused
params/query with Zod. Unknown routes receive static JSON 404; final errors use T023.

server.ts validates env, warms the dummy password hash before binding 0.0.0.0:PORT,
and releases limiter timers/Prisma on startup failure or signal shutdown. No migrations
or database queries run at startup. Import does not automatically listen. T041 must
register auth routes on the returned router with explicit input schemas, safe projections,
sensitive quotas and T029 protected transaction/activity classification. Public health
does not establish identity or renew idle time. Six app-boundary tests await owner
execution; endpoint auth and real DB acceptance remain later tasks.

## Current policy override — Student self-profile editing (2026-11-05)

Owner superseded T065: Students may directly edit owned personal/contact information
without Administrator approval. Validate/allowlist fields and enforce ownership. The
auth schema currently contains only displayName; full profile models/UI are separate.
New forward migration `20261105090400_student_self_profile` restores displayName and
updatedAt column grants and self UPDATE policy. No table-wide update or protected
role/status/credential/verification grants are added. SELF_PROFILE_EDIT is bit 2, with
PHOTO_UPLOAD retained as an alias; Student mask stays 15. Progress and financial records
remain academy-managed. Old Administrator-only descriptions below are historical.

Owner migration/regression/metadata validation is pending T067. Revised RLS tests cover
own edits, unqualified update isolation, explicit cross-user denial and role/status
mutation denial; actual execution still awaits T031. T029 owner checks passed, with
real transaction isolation/persistence still awaiting T031.

## T029 authenticated route boundary (owner validation pending)

`requireAuth(required, work, options)` is a terminal JSON route handler, not a middleware
that authenticates in one transaction and calls detached downstream work. `work` receives
the scoped tx, verified user and request, and returns safe JSON data. No Response object
is supplied; the wrapper sends 200 only after withSession commits. All database work
must use tx and be awaited, without network calls or detached tasks. Throw on business
failure so interactive activity does not renew. Session lookup uses background mode.

It accepts exactly one well-formed Bearer Authorization header, hashes locally, and
sets req.auth only from current database identity with shared role permissions. It
discards preexisting identity and clears request context afterward. It checks permission
before resolving ownership; default self-ownership is intended only for `/auth/session`.
Future resource routes must explicitly resolve the actual owner from scoped data, not
client claims. requireOwnership compares owner without an Administrator bypass.

Permission/ownership denial buffers minimal metadata, throws to roll back protected
work, then opens a separate nonrenewing withSession transaction to append/commit the
audit. No live parallel transaction is opened while the rejected scope holds locks.
Failure to persist the denial returns safe 500 and never runs protected work. If the
session has become invalid meanwhile, persistence fails closed; no privileged fallback
or fabricated actor is used. Ordinary business errors do not fabricate denial audits.

Standalone requirePermission still requires its trusted awaited audit adapter; the
wrapper's internal adapter only buffers metadata until the rejected scope settles.
Standalone requireOwnership has no audit side effect; protected routes should use the
wrapper for the complete boundary. T030/T041 will register the session endpoint with
an explicit safe identity/absolute-expiry projection. Tests mock transaction settlement;
T031 must prove rollback followed by denial-audit commit and session/RLS isolation.

## T028 permission gate (owner validation passed)

Owner shared/API typechecks and all 62 focused tests passed on 2026-11-05.
This validates the focused gate/pure helpers, not the pending T029/T030 wiring or
T031 real database persistence/ownership isolation.

Shared `permissions.ts` exports named bits, frozen Student=15/Admin=4294967295 masks,
an exact role resolver returning zero for unsupported roles, and unsigned all-bits
comparison. Student bits are SELF_READ=1, PHOTO_UPLOAD=2, TRAINING_SELF=4 and
SESSION_REVOKE=8. Management bits cover Students=16, packages=32, payments=64,
attendance=128, evaluations=256 and settings=512. These are implementation names for
the revised two-role model, not extra endpoints or a grant to correct personal details.
Ownership, approval, paid entitlements and database grants apply independently.

`requirePermission(required, { audit })` reads only trusted req.auth userId/permissions.
Invalid route masks (including zero/signed/out-of-range) fail at construction. Missing
identity gives safe 401; all requested bits must pass, including the unsigned high bit.
Denial awaits a minimal PERMISSION_DENIED event (actor, required mask and static target)
and then returns safe 403. Audit rejection/throw stays closed with safe 500, no raw error.
No request headers/body/query/URL or credentials are copied into audit material.

T029 must populate identity from a verified live session, never client role claims.
T029/T030 must supply an audit adapter committing independently of the rejected business
transaction; there is intentionally no default no-op writer or privileged DB fallback.
An allowed permission does not bypass subsequent ownership. T031 verifies real audit
persistence and transaction boundaries. The focused middleware suite does not use a
database; existing security/permissions.test.ts still awaits T029 ownership middleware.

## T065 profile correction boundary (owner validation passed)

Owner schema/deploy/typecheck, all 39 focused regression tests and profile/context/idle
scripts passed 2026-11-05. Scoped Student denial and actual rollback remain T031 work.

`20261105090300_admin_profile_corrections` removes runtime users UPDATE, explicit
displayName/updatedAt column grants, and users_self_profile. Self-read stays scoped;
the auth owner's narrow lastSignInAt/updatedAt grant remains. Runtime Prisma cannot
perform generic profile updates even with an Administrator identity: the future
Administrator workflow needs explicit permission checks, a constrained write interface
and atomic audit. This task adds neither that workflow nor photo uploads.

RLS tests assert self/unqualified update denial and unchanged fields. Audit rollback
now revokes a second owned session before appending and throwing; both writes must
roll back. T031 must provide aliceOtherSession distinct from Alice's context session,
with valid idle/absolute deadlines. These tests await the real harness.
`scripts/check-profile-permissions.ts` checks metadata and unscoped fail-closed behavior
without changing account data; it does not prove scoped denial or actual rollback.

## T064 idle expiry (owner validation passed)

Owner validated schema/deploy/generation/typecheck, all 24 focused tests and the
environment/session-context/idle smoke checks on 2026-11-05. Positive real database
expiry/concurrency checks remain pending T031; route classification wiring is T029/T030.

`20261105090200_session_idle_expiry` adds lastActivityAt and idleExpiresAt, backfilling
from creation without extending existing sessions. Both absolute and idle deadlines
are enforced by oak_current_user_id. Creation assigns eight hours absolute and 30 minutes
idle using database time. The new no-argument oak_touch_session_activity locks the
context session before reading current time and refuses expired/revoked/ineligible or
unscoped sessions. Its definer alone can update the new fields; runtime has EXECUTE,
not direct UPDATE. The function uses fixed search_path and denies PUBLIC/API roles.

`withSession(hash, work, client, "interactive")` renews only after successful awaited
work, within the same transaction. A false renewal aborts the transaction. Default
`"background"` never renews; verifySession/restore/revoke paths keep that default.
T029/T030 must classify operations on the server, never from a request header or clock.
The helper cannot infer whether a callback returning normally represented business
success: callers must throw on rejected operations and defer HTTP responses until commit.
Seven mocked tests exercise orchestration; they do not prove real SQL concurrency.
T031 must cover positive idle/absolute boundaries, capped renewal, concurrent revocation,
rollback and role isolation. Configuration defaults to literal 30 minutes and eight
hours to match SQL policy; changing either requires a coordinated reviewed migration.

T063 owner validation is complete, including final STUDENT/ADMIN enum confirmation.

## T063 Student role alignment (owner validation pending)

Follow-up: the owner validated the rename, Client generation, typecheck, 17 focused
tests and negative-session checks, and confirmed zero accounts/STAFF sessions. The new
`20261105090100_remove_legacy_staff` migration now removes STAFF from the enum,
guarded by a locked zero-STAFF check. It rebuilds Role, the audit-read policy and both
Role-returning bootstrap functions atomically, restoring hardened owners and ACLs;
unknown dependencies fail without CASCADE. The current Prisma target has only STUDENT
and ADMIN. This follow-up is pending owner deploy/regression validation. The original
legacy-preservation explanation below documents the earlier rename checkpoint.

The new `20261105090000_student_role` migration renames the existing enum value
CUSTOMER to STUDENT, preserving account IDs, relationships and enum-backed defaults.
STAFF remains legacy storage only. Updated `oak_create_session` and
`oak_current_user_id` reject STAFF at creation and every identity check without deleting
or converting its records. STUDENT and ADMIN remain supported backend identities;
future native login must admit STUDENT only, with Administrator web transport separate.
`withSession` also rejects unsupported roles before protected callbacks.

The two existing functions retain their signatures, security-definer setting, fixed
search path, owners and grants through CREATE OR REPLACE. Applied migrations remain
unchanged. Owner inventories role/session counts with `scripts/inspect-student-role.sql`
before and after deploy; this agent has not queried account data. Five focused tests
check helper role rejection, not actual SQL/RLS execution. T031 must cover real STAFF
creation/replay denial and unchanged Student/Admin eligibility. Idle expiry and profile
grant removal remain separate pending T064/T065 changes.

The login feature's Prisma schema lives at
[apps/api/prisma/schema.prisma](../../apps/api/prisma/schema.prisma).
The approved fields and behavior remain defined in
[the feature data model](../../specs/001-user-login/data-model.md) and
[the implementation tasks](../../specs/001-user-login/tasks.md).

T018 adds User, Session, SignInAttempt, AuditLog, and the Role/AccountStatus enums.
Prisma generates the client used by the Express API; mobile and web clients must not
connect directly to this database. DATABASE_URL is the runtime connection and DIRECT_URL
is reserved for migration tooling. See the root README for owner-run validation.

User defaults to PENDING_APPROVAL. Login later requires ACTIVE plus email verification;
changing the status is part of the separate approval workflow. Session retains only a
SHA-256 token hash. SignInAttempt has no required user relation so unknown-email
attempts can be retained. Audit actor/target identifiers are historical values without
cascading relations; unique previousHash disallows a fork at a shared predecessor.

## Migration and runtime boundary

T019 supplies two ordered migrations under `apps/api/prisma/migrations/`: the model
baseline, followed by auth security policies, grants, bootstrap functions, and the
audit insert guard. Both are transactional. The baseline already enables RLS and
removes public/Supabase API grants, so a failure applying the second migration does
not leave these new tables readable by anonymous clients.

`oak_runtime` and `oak_auth_owner` are NOLOGIN, non-owner, non-superuser, non-BYPASSRLS
roles with no outbound role memberships. An owner-created API login later inherits
only `oak_runtime`. Never give that login `oak_auth_owner` membership. The migration
principal retains membership in `oak_auth_owner` solely to install function ownership;
its credentials are kept out of the runtime process. Existing unsafe Oak roles cause
the migration to stop instead of silently changing another role's configuration.

The function owner has explicit RLS policies and minimum table/column grants; it does
not bypass RLS. All functions fix search_path to pg_catalog, pg_temp and qualify
application objects. PUBLIC and Supabase API roles receive no function execution grant.
[PostgreSQL's SECURITY DEFINER guidance](https://www.postgresql.org/docs/16/sql-createfunction.html)
explains these search-path and execution-grant boundaries.

| Function | Runtime use |
| --- | --- |
| `oak_auth_lookup(email)` | Retrieve minimum credential/status fields for Argon2id verification; never expose directly to clients. |
| `oak_create_session(userId, hash, ip, agent)` | After backend password verification, recheck ACTIVE/verified under row lock, create an 8-hour session and update last login. |
| `oak_set_session_context(hash)` | Inside the protected-query transaction, establish identity using a live eligible session and return safe user fields. |
| `oak_current_user_id()` | Resolve transaction-local session hash to a currently verified ACTIVE identity, or NULL. |
| `oak_revoke_session(hash)` | Idempotently revoke only the session corresponding to the supplied bearer hash. |
| `oak_record_sign_in_attempt(email, ip, succeeded)` | Record validated login outcomes, including unknown-email attempts. |
| `oak_audit_head()` | Take the audit transaction lock and return only the current chain hash. |

The API hashes raw tokens using Node crypto before database calls. `oak.session_hash`
is set locally to the transaction, not as a session-level pooled connection setting.
Use an explicit Prisma transaction: context setup in an autocommit statement expires
before the next query and intentionally grants no subsequent access. No userId/role
from a request is used to establish context. Missing context reads no ordinary user,
session, or attempt rows. Identity is rechecked against database session/account status.

The trusted backend still verifies Argon2id and applies rate limits before credential
lookup/session creation. These functions are an authentication bootstrap capability,
not a database replacement for password verification: a compromised API runtime with
credential-function access is outside the omitted-filter protection RLS provides.
Runtime SELECT can retrieve its own credential/hash columns for Prisma compatibility;
controllers must explicitly select safe fields and never serialize full model records.

Runtime updates are limited to own displayName/updatedAt and own session revokedAt.
It cannot change role, approval status, password, expiry, ownership, or verification.
Sign-in attempts are writable only through the narrow recording function and have no
ordinary runtime read policy. No participant/enrollment schemas are introduced here.

## Audit insertion protocol

T027 calls `oak_audit_head()` in the same transaction as a protected administrative
mutation, creates the canonical redacted payload hash using Node crypto, and inserts
the record with the exact approved field order. Every writer uses advisory lock
`(1935764577, 1)` before reading the head. A BEFORE INSERT trigger takes the same lock,
checks the true predecessor and SHA-256 record hash, and rejects inconsistent inserts.
PostgreSQL's [built-in SHA-256](https://www.postgresql.org/docs/16/functions-binarystring.html)
provides independent verification without an extension. UTC millisecond ISO timestamps
match JavaScript toISOString. The trigger never alters caller-provided hashed fields.

Runtime SELECT exposes only the actor's audit entries, or all entries for an eligible
ADMIN. INSERT requires the current actor; UPDATE/DELETE/TRUNCATE grants are absent.
Unique previousHash/currentHash indexes further prevent forks. Direct SQL insert
requires an explicit UUID (Prisma supplies UUIDs for ordinary model creates).

Fixture/migration access remains privileged and separate; test cleanup does not use
the runtime connection. A hash chain cannot detect tail truncation without a separately
trusted checkpoint or defeat a fully privileged rewrite. No such external service is
introduced. Denial events commit separately from a rejected business transaction.

## Validation status

The owner successfully validated T018, applied both migrations, and generated Prisma
Client on 2026-11-02. T020 metadata inspection confirmed safe Oak role attributes and
no outbound memberships, four RLS-enabled postgres-owned tables, all 13 expected policy
definitions, eight function owners/security modes/search paths, no explicit PUBLIC/API
execution grants, absent runtime audit mutation privileges, and the enabled insert guard.
No runtime security test assertions have run. RLS isolation, pooled identity cleanup,
trigger concurrency, and service behavior remain pending the T031 integration harness.

## T021 environment module

`apps/api/src/config/env.ts` exports parseEnv, loadEnv, env, and RuntimeEnv. parseEnv
validates a process-style environment object without I/O; loadEnv reads the API-local
development file when appropriate. The singleton fails on import before server startup;
T030 will import it from the app/server. Node 22 provides the loader, so no dotenv or
Supabase client dependency is added. Test/production never implicitly read development
credentials. See the root README for complete owner provisioning/check commands.

Validation requires a PostgreSQL runtime URL for oak_api, a valid port, a recognized
NODE_ENV, and the approved eight-hour session lifetime. Optional DIRECT_URL is checked
but omitted from RuntimeEnv. Errors contain only variable names, not values or Zod
input details. Proxy trust defaults to false; an explicit list of verified upstream IPs
is exposed for T030 to apply before limiting. Do not log RuntimeEnv or spread it into
responses. URL validation alone cannot prove DB grants: the owner-run read-only
check-runtime-db.ts connects with the actual runtime URL to inspect role privileges.
T022 must use env.DATABASE_URL explicitly; never choose DIRECT_URL for API queries.
T021 owner provisioning, environment validation, TypeScript --noEmit, and read-only
runtime connection verification passed on 2026-11-03. The owner retained transaction
pooling on port 6543 with pgbouncer=true for runtime and session pooling on 5432 for
migrations. The runtime check confirmed the restricted login, only oak_runtime
membership, no owned tables, no audit mutation privileges, and no users visible without
session context. This does not replace T031 behavior tests. No private environment files or live database settings were changed by the
agent, and no startup, configuration check, or test suite was executed by the agent.

## T022 runtime client and scoped queries

`apps/api/src/lib/prisma.ts` uses the validated runtime URL explicitly; it contains
no migration/fixture connection. Its lazily connecting singleton is cached across
non-production module reloads to avoid additional pools. T030 will register shutdown
cleanup; requests must not disconnect the shared client. No query/event logs are enabled.

`withSession<T>(hash, work, client = prisma)` opens a ReadCommitted interactive Prisma
transaction, calls oak_set_session_context with tagged parameterized SQL, then invokes
`work(tx, identity)` using that same connection. Identity contains only id, email,
displayName, role, and status. Only one ACTIVE identity is accepted. Malformed hashes
and the database's SQLSTATE 28000 session rejections map to a generic 401
SessionContextError/UNAUTHENTICATED without the original SQL error attached. Other DB
and callback errors retain their type for T023's safe error handler; never log or expose
them directly. T026 later hashes the raw bearer token before invoking this helper.

Protected callbacks use tx exclusively and must finish before returning. Successful
callbacks commit and failures roll back, ending the local session context in both cases.
No network calls, detached work, retained transaction objects, or automatic callback
retries. Limits are 5 seconds acquisition/10 seconds execution; integration fixtures
must account for these limits rather than introducing artificial sleeps or long work.
The optional client parameter is for trusted internal runtime/test callers only; the
T031 fixture must supply its restricted runtime client, never its admin fixture client.

Pre-login lookup and session creation remain confined to the planned auth service's
narrow oak_auth_lookup/oak_create_session interfaces under this runtime role. They do
not require a privileged Prisma client, and are not a generic bypass for protected
queries. Do not establish identity from an account ID or set a session-wide user setting.

Owner rejection-path validation is documented in README. Positive-session isolation,
commit/rollback cleanup and concurrency await the T031 real-database fixture. The helper
passed owner TypeScript --noEmit and the rejection-path check on 2026-11-03. Malformed
and unknown sessions returned safe 401 errors, protected callbacks were not invoked,
and unscoped access remained closed. These results do not validate positive sessions
or pool reuse under concurrent authenticated requests.

## T023 error boundary

`src/middleware/error-handler.ts` defines ApiError and SessionContextError and the final
Express errorHandler. It imports no environment or Prisma modules, allowing the focused
middleware suite to run without credentials or a database. prisma.ts imports/re-exports
the same SessionContextError class, preserving instanceof behavior and prior rejection
checks without a circular dependency. T033 will centralize shared contract types.

The handler serializes only a reviewed code/status/message. ApiError takes a code and
optional known validation fields, not raw exception text. Even a modified ApiError is
reconstructed from the catalog. Zod feedback exposes generic messages for email/password
only; root errors omit details, unknown paths/custom messages/input values are discarded.
Other feature fields need explicit reviewed additions when their feature is implemented.
Unknown exceptions and arbitrary error-shaped objects become generic INTERNAL_ERROR.
No stack, cause, database metadata, body, credential header, or query parameters are
logged or returned. Retry-After is preserved when supplied by the limiter.

Parser type/status pairs entity.parse.failed/400 and entity.too.large/413 map to safe
contract codes. The handler must be registered last at T030. Once headers are sent it
delegates a new sanitized INTERNAL_ERROR rather than the original failure, so the default
handler does not receive sensitive exception content. Express 4 route handlers must
catch asynchronous rejections and forward them; no new wrapper/dependency is introduced.

The focused Vitest/Supertest suite covers all contract codes, session-error compatibility,
field filtering, unknown/root errors, mutated error instances, actual malformed/oversized
JSON, Retry-After preservation, absent console logging, and headers-sent delegation.
Owner validation passed on 2026-11-03: TypeScript --noEmit, all 21 focused middleware
tests, and the T022 session-context rejection regression check. Full backend wiring
awaits T030; comprehensive runtime security tests remain scheduled for T031.

## T024 rate-limit boundary

`src/middleware/rate-limit.ts` uses installed express-rate-limit 7.5.1 with an independent
MemoryStore for each tier. The createRateLimiters factory returns globalIp, loginIp,
loginEmail, and shutdown. Create once per API app. T030 wires global protection before
parsing/routes and login-specific limits before credential verification, with bounded
JSON parsing before normalized-email limiting. No database/privileged client is involved.

The approved 100/10/5 per 15-minute quotas count every outcome and emit reviewed safe
429 JSON and Retry-After. Standard draft-6 headers are enabled; legacy headers disabled.
Field keys are parsed safely with existing Zod, normalized, and hashed before storage.
Skipping invalid email only avoids a shared malformed-email bucket; global/login IP
quotas still apply. Per-tier request metadata names/stores are distinct.

Express's configured proxy policy resolves the IP; false and explicit literal proxy IPs
are supported. Blanket trust/hop counts fail closed. Mere presence of an untrusted
forwarded header is ignored; v7's xForwardedForHeader warning alone is disabled and
other validations remain enabled. Rate limiting cannot identify a true source if a
trusted proxy forwards unsanitized spoofed headers; deployment must verify that boundary.

MemoryStore rotates inactive keys out within two 15-minute intervals. This bounds key
retention time, not peak key cardinality. State resets on restart and is not shared
between processes, an explicit single-instance limitation. Shutdown releases cleanup
timers. A future multi-instance deployment needs a reviewed shared-store decision.
Tests cover exact thresholds, normalization/different-IP email quota, malformed emails,
proxy spoofing/blanket trust rejection, Retry-After, expiry, and teardown. Owner
TypeScript --noEmit and all 8 rate-limit/21 error-handler tests passed on 2026-11-03
(29 total). T030 server integration is not yet implemented.

## T025 password service boundary

`src/modules/auth/password.service.ts` delegates hashing/verification to installed
node-argon2 0.41.1. Fixed Argon2id work factors match specifications.md §4: 19456 KiB,
two iterations, parallelism one. Salt generation stays with the library. No trimming,
Unicode normalization, reversibly encrypted password, custom crypto, or persistence.
Login bounds are 1–128 characters; registration adds its own complexity rules later.

One cached promise prepares a random-input dummy hash per process, using identical
parameters to new account hashes. Both known and unknown verification await this promise
and invoke native verify exactly once. Unknown accounts always return false, even if
native verify returned true. Concurrent initialization shares work; failure yields a
sanitized operational error and permits a later explicit retry. T030 must await warmup
before listening, avoiding first-request initialization differences. T040 will use null
for unknown accounts. Invalid length rejects before hashing on both account paths.

Native failure/corrupt stored digest is not silently treated as a wrong password and
never authenticates; callers receive a generic error without original cause or data.
The safe T023 handler returns generic INTERNAL_ERROR. Stored digests may encode work
factors of their own, so comparable native work is not a claim of exact whole-request
or network timing equality. Keep lookup, status checks, response parity, and timing
review in later login tests. No automatic work-factor migration is added here.

README has owner typecheck/test instructions and an optional host benchmark printing
only timings. Real-library tests verify behavior; native mocks separately verify work
reuse/counts. Owner TypeScript --noEmit and all 11 focused password tests passed on
2026-11-03. Actual hosting performance measurement remains pending before deployment
or work-factor tuning. No passwords/hashes are logged.

## T026 opaque session service boundary

`src/modules/auth/session.service.ts` exposes creation, verification, current-token
revocation, and self-account revoke-all helpers on the restricted runtime client. Raw
tokens are Node crypto randomBytes(32) encoded as hex; the service hashes them before
SQL. Creation calls oak_create_session only after the later caller verifies passwords;
the DB rechecks eligibility under lock and provides the 8-hour expiry. No client clock
constructs/renews expiry, no SQL receives the raw bearer token, and the create result
contains only token/expiry for login delivery. Metadata is truncated, not trusted as identity.

Verification obtains current eligible identity via withSession and selects only expiry
from the matching scoped session row. Its result explicitly projects safe user fields,
not entire session/user records. Missing/malformed/unknown/expired/revoked/ineligible
sessions produce safe 401 rejections through the existing helper/RLS. No sliding renewal.
Creation races where the account is no longer eligible yield safe FORBIDDEN, while
other DB failures reach the T023 safe error boundary without being logged here.

Current-token logout calls oak_revoke_session by hash using executeRaw, avoiding decoding
its PostgreSQL void return. It works without a still-valid context, is idempotent, and
leaves other sessions intact. Revoke-all requires active verified context, updates only
that identity's other unrevoked sessions under RLS, and revokes the caller last via the
narrow function before commit. No count of newly revoked rows is promised in the face
of concurrent revocation. This is a self-account helper, not a password-reset authorization
bypass or a new endpoint. Reset/recovery events need their separate verified challenge.

No SQL functions or applied migrations changed. Unit tests mock only the runtime access
boundary and exercise real cryptographic token generation/hashing; owner smoke checks
exercise unknown-session rejection/idempotent revoke on the real DB. Owner TypeScript
--noEmit, all 12 orchestration tests, and that DB check passed on 2026-11-03.
Positive sessions, expiry, current-account changes and concurrency/revoke-all
RLS behavior require the isolated T031 fixtures before integration can be claimed complete.

## T027 audit append/verification service

`src/modules/audit/audit.service.ts` uses Node SHA-256 and the applied T019 SQL interfaces.
appendAudit requires an existing authorized transaction, explicitly rejecting an outer
PrismaClient whose separate autocommit queries would release the lock too soon. It calls
oak_audit_head (transaction advisory lock 1935764577,1), checks the current actor, obtains
the timestamp after locking, computes the exact approved concatenation, and inserts via
the same transaction. No nested transactions, privileged fallback, or applied SQL edits.
A failure must abort the associated administrative mutation. T028 denial reporting uses
a separate authorized transaction because the business operation itself is rejected.

Canonical payload serialization uses lexical object-key order, original array order,
JSON number/string encoding, and UTF-8. Matching password/token/OTP/authorization/cookie/
secret/API-key property names are redacted recursively before hashing. No toJSON/getter
hooks execute; non-JSON inputs, cycles, sparse arrays, symbols and depth over 32 reject
with safe INTERNAL_ERROR. Callers supply intentionally safe metadata: key redaction
cannot identify arbitrary secrets placed in ordinary string values or target identifiers.
Only payloadHash is stored, never the original payload. UTC millisecond timestamp and
UUID actor normalization match the DB trigger's encoding.

The pure verifier recomputes hashes in genesis-to-head link order, rejects malformed
fields, duplicate IDs/links, altered content, and missing/reordered middle records.
It returns no raw event data. Its inputs must be a complete authorized snapshot;
actor-filtered RLS results cannot be assumed complete. Tail deletion needs a separately
trusted checkpoint, and full privileged rewrites are outside hash-chain authenticity.
The approved formula omits record id, so changing a unique valid id alone is not
cryptographically detected. No stronger non-repudiation claim or external service is added.

Fifteen focused tests cover hashing, canonicalization/redaction, unsafe payloads, outer
client rejection, actor/head checks, insertion failure propagation, and pure verification.
Owner typecheck and all 15 focused tests passed 2026-11-05; real database concurrency, trigger agreement,
RLS and atomic rollback stay scheduled for T031's existing security audit suite.
