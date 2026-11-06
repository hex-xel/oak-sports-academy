---
status: implemented-with-acceptance-pending
owner: team
milestone: 1
---

# Native Student authentication

This guide describes the implemented Android authentication boundary as of
2026-11-06. Requirements remain in the [feature specification](../../specs/001-user-login/spec.md)
and [master requirements](../../specifications.md). Setup and execution commands
remain in the [README](../../README.md); detailed implementation history and SQL
privileges are in [auth-data](auth-data.md). This document does not certify deployment.
The accepted rationale is recorded in [ADR-0001](../decisions/ADR-0001-opaque-sessions.md).
Content-only [WebView handoff](webview-strategy.md) remains deferred and unimplemented.

## Token and account flow

1. Native login sends bounded, validated email/password JSON to
   `POST /api/v1/auth/login`, with exactly one `X-Client-Platform: mobile` header.
   This header selects the native transport contract; it is not proof of identity.
2. The restricted backend credential lookup supplies the real password digest or
   a dummy verification path. Unknown email and wrong password share the credential
   error. Account restrictions are checked after password verification. Native login
   requires a verified, ACTIVE STUDENT; pending approval, suspended, Admin and legacy
   roles do not receive a native session. Enrollment does not grant role privileges.
3. Session creation rechecks eligibility under an account row lock. A second credential
   lookup under that lock rejects a concurrent password/account change. Creation,
   successful attempt recording and last-sign-in update commit before the response.
   Failed attempts are recorded without password/token values.
4. Node generates 32 random bytes, encoded as 64 hex characters. Only the SHA-256
   token hash reaches session storage in PostgreSQL. The raw bearer is returned once
   in safe native login JSON; controllers project fields rather than serialize models.
5. The app validates the response and awaits Expo SecureStore before publishing
   signed-in identity. User claims stay in memory. No AsyncStorage fallback, token
   URL, credential logging or cookie-based native authentication is used.

See [login service](../../apps/api/src/modules/auth/auth.service.ts),
[session service](../../apps/api/src/modules/auth/session.service.ts),
[controllers](../../apps/api/src/modules/auth/auth.controller.ts) and
[secure storage](../../apps/mobile/lib/token-store.ts).

## Authorization and database trust

Every protected operation parses one unambiguous Bearer header, hashes it on the
server and establishes verified session identity inside an explicit Prisma transaction.
The order is current session/account validation, centralized server-role permission
mask, ownership, then scoped work. Request body/query user IDs, roles and timestamps
cannot establish identity. Native route guards only control navigation; they cannot
authorize data. The session endpoint requires SELF_READ and self-ownership.

Runtime `DATABASE_URL` uses a restricted login inheriting `oak_runtime`. Migration
`DIRECT_URL` and `oak_auth_owner` capabilities stay out of the runtime process.
Runtime must not be a table owner, superuser or BYPASSRLS role. Narrow bootstrap
functions permit credential lookup, session issuance/revocation and attempt recording
before ordinary RLS context exists. They have fixed search paths, qualified objects,
restricted execution grants and a separate constrained function owner. The backend
must still verify passwords and rate-limit issuance: RLS is not protection against
a fully compromised backend holding these bootstrap capabilities.

`withSession` sets transaction-local session-hash context via
`oak_set_session_context`. All protected database work uses its `tx` client. Do not
use the outer client, detach work, make network calls in the callback, or retain `tx`.
Context expires on commit/rollback, so transaction-pooled connections cannot retain
another request's identity. Missing/forged context fails closed. Send success only
after commit; never automatically retry a callback that may mutate data.

See [requireAuth](../../apps/api/src/middleware/require-auth.ts),
[transaction helper](../../apps/api/src/lib/prisma.ts), and the
[SQL trust-boundary details](auth-data.md#migration-and-runtime-boundary).

## Expiry, concurrency and logout

PostgreSQL enforces 30-minute idle and eight-hour absolute deadlines; equality with
either deadline is expired. Only a successful server-classified interactive protected
operation renews idle activity, capped by absolute expiry, in the business transaction.
Failed work, background checks, restore, polling and merely foregrounding the app
do not renew it. Database locking and renewal rechecks prevent a competing request
from reviving an expired/revoked session; renewal failure rolls back business work.
Client clocks and countdowns never authorize access.

`POST /auth/logout` revokes the hash identified by its bearer only. Missing/malformed
headers return 401; well-formed unknown, expired or already revoked bearers receive
empty 204. An active-session gate would break this idempotent contract. Other-device
sessions remain live. Other protected endpoints return identical safe 401s for missing,
unknown, revoked and expired sessions.

The app hides identity immediately on sign-out, attempts bounded remote revocation,
and deletes SecureStore in finally. API failure still permits local cleanup but shows
that server logout was unconfirmed. Failed local deletion exposes a blocking cleanup
retry. Storage operations serialize behind in-flight writes; generation checks suppress
stale login/restore results. No mutation is replayed after reauthentication.

## Audit integrity

Protected writers call `appendAudit(tx, event)` with server-defined actor/target and
safe metadata. Canonical payload hashing sorts object keys and redacts sensitive
keys; callers must still exclude secrets hidden under ordinary keys. Only payloadHash
is stored. Record hashes chain the approved predecessor/timestamp/actor/action/target/
payloadHash fields. `oak_audit_head` takes advisory lock `(1935764577, 1)` before
reading the head, held through commit. An insert trigger independently checks chain
links/hashes; uniqueness prevents forks. Related business work and audit append commit
or roll back together. Permission/ownership denials first roll back business work,
then append in a fresh verified nonrenewing transaction before returning 403.

Runtime has no audit UPDATE/DELETE/TRUNCATE privileges. Verification must use a complete
genesis-to-head snapshot in link order, not an actor-filtered subset. Verification
detects broken links/records but cannot authenticate a privileged whole-chain rewrite
or tail deletion without a separately trusted checkpoint. The approved record formula
does not hash the row ID and cannot reconstruct the original payload.
See [audit implementation](../../apps/api/src/modules/audit/audit.service.ts).

## Transport and deployment constraints

The API applies no-store responses, Helmet, a 10 KiB JSON limit and safe errors.
Per 15 minutes, limits are 100 requests per client IP globally, 10 login requests per
IP and 5 per normalized email. Successful and failed requests both count. Email keys
are hashed; invalid email input still consumes IP quotas. MemoryStore is per-process:
restart resets quotas, and multiple instances do not share them. Horizontal deployment
requires an explicitly reviewed shared-limiter design; these limits alone do not
establish production abuse resistance.

Release mobile configuration requires HTTPS. HTTP overrides are development-only.
Terminate public TLS at the deployment ingress and protect its upstream connection;
do not expose bearer traffic over public HTTP. Express does not itself install TLS.
Production Helmet enables HSTS for one year with subdomains, so validate HTTPS for
the affected domains before rollout. Trust proxy is false or an explicit verified
upstream IP allowlist, never arbitrary forwarded headers or a blanket trust setting.
Exclude Authorization, passwords, raw tokens and hashes from ingress logs/telemetry.
Database connectivity and privileged migration credentials follow the existing owner
deployment setup; this guide adds no infrastructure or secret configuration.
See [application boundary](../../apps/api/src/app.ts),
[limiter implementation](../../apps/api/src/middleware/rate-limit.ts) and
[mobile transport](../../apps/mobile/lib/api.ts).

## Cold start and recovery

Startup begins restoring with unknown identity. SecureStore absence leads to login;
token presence requires the nonrenewing `GET /auth/session` before Home. A bounded
request failure preserves the token and exposes explicit retry, including cold API
and offline cases. Concurrent restores share one operation. Authenticated-request
401s capture the starting session generation: concurrent rejections cause one local
cleanup, while late responses cannot clear a newer sign-in. Login credential failures
do not trigger session invalidation; 403, network and server failures retain it.
Transport triggers cleanup without awaiting its queue, avoiding a deadlock when
restoration is awaiting that same request. Secure cleanup failures stay visible.

Expired/revoked sessions show the same accessible session-ended notice. Login accepts
only `/`, currently the sole protected destination, and rechecks confirmed ACTIVE
Student identity before returning. External/unknown/query-bearing and array return
values are discarded. Future routes require explicit allowlist/authorization updates.
See [auth context](../../apps/mobile/lib/auth-context.tsx) and
[recovery messages](../../apps/mobile/features/auth/messages.ts).

## Validation boundary

The latest automated checkpoint (T058) passed 344 tests in 29 files on installed Node
24.22.1, including real restricted disposable-database RLS/expiry/concurrency cases;
mobile and API-test typechecks pass. Owner confirmed 31-minute native expiry via
Metro reload, session-ended TalkBack, re-login to Home with cleared notice, and
API-unavailable retry/TalkBack returning Home without credentials at 360 dp/font 1.3.
This reload is not a force-close test. Owner subsequently ran the native DevTools
check: session confirmation 2680 ms and three concurrent real 401s following current-
session revocation, with one stable login transition and the session-ended notice.
Force-close eventually restored Home after Metro cache clear and a fresh Expo process.
T053 retains repeatable no-login-flash startup and classified warm/cold timing evidence. Expo Go
development bundle loading and an initial-launch anomaly prevent a two-second
startup claim. Deployment Argon2/login performance and final acceptance remain T059.
Later owner phone recordings on realme C51/RMX3830, Android 15, Expo Go 58.0.5/SDK 58,
same Wi-Fi: with API already running, restoring appeared in 2 seconds, then Home in
3 seconds, with no login flash. After restarting only API, owner reported restoring
3 seconds and Home 4 seconds, no login flash/error. The latter restoring time misses
the two-second requirement, so T053 remains open despite functional recovery passes.
These observations do not isolate HTTP latency or establish hosted cold-start performance.
The [T058 scoped review](auth-security-review.md) fixed the automatic-invalidation
secure-cleanup gate and records validation and remaining release limitations.
Track evidence in [tasks](../../specs/001-user-login/tasks.md) and
[device acceptance](../../specs/001-user-login/quickstart.md#device-acceptance--owner-run-after-relevant-stories).
