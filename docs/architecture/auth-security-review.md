---
status: completed-with-release-checks-open
owner: team
milestone: 1
---

# T058 authentication security review

Reviewed 2026-11-06 against the current working tree, including uncommitted auth
implementation. Scope: all source under `apps/api/src/`, `apps/mobile/lib/`, and
the ordered SQL migrations under `apps/api/prisma/migrations/`. Related route gates,
existing tests and [approved architecture](auth.md) provided context. This is a scoped
code review, not a penetration test, dependency audit or certification of deployed
Supabase metadata. No cloud query, advisor run, migration or environment change occurred.

## Finding fixed: rejected-session cleanup could be bypassed locally

An automatic 401 hid identity but a failed SecureStore deletion left only storageError
on signedOut state. The login route therefore remained available without the blocking
cleanup retry used by explicit logout. The rejected bearer did not become valid on the
server; this was a local cleanup/recovery gap, not a demonstrated backend auth bypass.

The context now uses the existing cleanup-failure gate after invalidation deletion
failure, blocks new sign-in/restore during invalidation, and retries deletion locally
without remote logout. Session-ended copy survives that cleanup retry. No new UI,
dependency or database policy was introduced. A regression checks blocked login/restore,
no identity restoration, local-only retry, and successful later sign-in. Native storage
failure remains adapter-tested rather than injected on a physical device.

See [auth context](../../apps/mobile/lib/auth-context.tsx) and
[regression coverage](../../apps/api/tests/mobile/auth-context.test.ts).

## Reviewed boundaries

| Area | Review result |
| --- | --- |
| Secret exposure | No hard-coded credential/private-key/JWT matches found in scoped source/migrations; reviewed response projections, disabled Prisma query logs, safe errors and seed configuration. Raw token is intentionally returned once in native login, never session output. Private env files/history were not scanned or printed. |
| Authentication | Password verification precedes eligibility messages; dummy verification for unknown email; native role/status checks and issuance recheck under account lock. Native header is a transport discriminator, not authentication. |
| Permissions/ownership | Server-derived role masks, all-bit permission matching, ownership after permission, scoped database callbacks and response after commit. No request userId/role context assignment found. |
| SQL execution | Runtime raw statements use tagged parameter binding; no queryRawUnsafe/executeRawUnsafe calls found. Migration dynamic SQL formats trusted role identifiers/signatures, not request data. |
| Runtime/bootstrap trust | Migrations enforce non-owner/non-superuser/non-BYPASSRLS runtime/function roles, separate migration credentials, fixed function search paths, explicit execution grants and transaction-local verified hash context. Narrow pre-auth functions remain a trusted API capability, not protection against a fully compromised backend. |
| RLS/grants | Reviewed migration order through Student-role cleanup, idle expiry, revoked old self-profile grants and restored owner-approved allowlisted self editing. Final profile grant is displayName/updatedAt only; roles/status/credentials/verification/deadlines remain protected. |
| Session concurrency | Current database state enforces idle/absolute expiry, renewal locks before clock/recheck, commit/rollback coupling, and current-session idempotent logout. No client timestamp/heartbeat authority found. |
| Audit | Shared transaction lock/head protocol, independent insert validation, unique links, actor-bound insert, no runtime UPDATE/DELETE/TRUNCATE grants. Denials append separately after rejected work rolls back. Redaction and whole-chain-verification limitations remain explicit. |
| Mobile transport | Release HTTPS URL validation, header-only bearer, omitted cookies, bounded fetch/body decoding, no automatic replay, generation-bound 401 invalidation and stale-result suppression. SecureStore has no insecure fallback. |
| API boundary | Global quota before bounded JSON parsing, sensitive login quotas, exact Bearer/header parsing, no-store, reviewed safe error catalog, explicit proxy policy. |
| Export documentation | Scoped exports have documentation blocks; expanded short route/controller, header-validation, response-parser and provider comments with inputs/results/failures/side effects. Workaround comments cite source or the existing task contract. |

No additional confirmed exploitable defect was identified in this scope. Pattern scans
alone do not establish absence of secrets or vulnerabilities. Unrelated registration
changes and private/generated material were not modified by the review.

## Validation and remaining release gates

After the fix, 344 tests in 29 files passed on installed Node 24.22.1, exit 0 with no
unhandled errors (24.97 seconds). Includes restricted disposable-database RLS, session
and audit tests. API source, API-test and mobile typechecks passed; graph AST refresh
and diff checks passed. No production/shared database was used.

T053's fresh-API phone run reached restoring in 3 seconds against a two-second target;
the owner explicitly deferred that timing issue. T059 retains final/deployment-host
password/login performance and full release acceptance. Current in-memory limiters
are per process/reset on restart; ingress TLS, proxy trust and deployed database role
metadata need owner deployment validation. Audit chains cannot defeat privileged full
rewrites or prove tail integrity without a trusted checkpoint. These are documented
limits, not newly implemented infrastructure or waived requirements.

See [acceptance guide](../../specs/001-user-login/quickstart.md),
[task evidence](../../specs/001-user-login/tasks.md) and
[ADR-0001](../decisions/ADR-0001-opaque-sessions.md).
