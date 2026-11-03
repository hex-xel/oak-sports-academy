---
status: in-progress
owner: team
milestone: 1
---

# Authentication data layer

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
