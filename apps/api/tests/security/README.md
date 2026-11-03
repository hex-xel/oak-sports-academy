---
status: awaiting-implementation
owner: team
milestone: 1
---

# T017 foundational security tests

These are executable acceptance tests written before the implementation. They are not
passing tests yet. Missing production modules and `tests/helpers/db.ts` are intentional
until T019–T031. Do not replace them with local implementations, mock Prisma, or skip
suites to make a run green. No participant/enrollment production tables are introduced.

## Implementation interfaces exercised by the tests

These names are test-first integration seams, not already implemented exports. Keep
behavior assertions if later implementation needs mechanical signature adjustments.

- `packages/shared/src/permissions.ts`: `ROLE_PERMISSIONS` with CUSTOMER=15, STAFF=127,
  ADMIN=4294967295. Production permission definitions come from specifications.md §6.
- `requirePermission(required, { audit })`: Express middleware reads server-populated
  `req.auth = { userId, permissions }`. Missing identity is 401; missing any required
  flag is 403 FORBIDDEN and emits an awaited redacted PERMISSION_DENIED audit event.
  Tests inject identity only into their own isolated Express app, never via HTTP input.
- `requireOwnership(resolveOwnerId)`: compare the resolved owner with server identity;
  mismatches are 403 FORBIDDEN. A matching permission never overrides this check.
- `createRateLimiters()`: fresh in-memory stores returning `globalIp`, `loginIp`, and
  `loginEmail` middleware with approved fixed-window limits and normalized-email keys.
  Reject with JSON `{ code: "RATE_LIMITED", ... }` and integer Retry-After seconds.
- `appendAudit(tx, event)`: append in the supplied real transaction and return the
  persisted Prisma AuditLog row. Event includes actor, action, target, and redacted
  JSON payload. Canonical JSON recursively sorts object keys; hashes use UTF-8 and
  UTC millisecond ISO timestamps in the specification's exact concatenation order.
- `verifyAuditChain(rows)`: pure chain verification over records ordered by hash links;
  returns `{ valid: boolean }`. It detects altered records/broken links, without
  falsely claiming that an unanchored chain can detect tail truncation.

## T031 database fixture contract

`tests/helpers/db.ts` must export `createSecurityDatabase()`. Its factory performs no
I/O. Returned members are typed Prisma clients/functions, not mock adapters:

- `connect()` checks NODE_ENV=test, requires an explicit destructive-test opt-in, and
  verifies runtime and fixture connections address the same dedicated, disposable test
  database before permitting writes. Refuse development/shared/production targets.
  Never echo connection strings in errors. Fixture connection is privileged; runtime
  connection is non-owner/non-superuser/non-BYPASSRLS. Missing config fails explicitly.
- `reset()` uses only privileged fixture access to clean that isolated database and
  seed two verified ACTIVE customers (`alice`, `bob`), an ACTIVE ADMIN (`actor`), an
  unrevoked session per customer, and at least one sign-in attempt. All data are
  synthetic; use example.test emails and generated UUIDs. Audit chain starts empty.
  Expose `alice`/`bob` with id and displayName, `actor.id`, and `bobSession.id`.
- `runtime` and `admin` are real PrismaClient instances for their respective roles.
  The audit fixture must not silently wrap runtime queries in privileged operations.
- `asUser(userId, callback)` resolves one of the fixture's valid sessions to a verified
  identity and calls the production transaction-context helper on the runtime client.
  Do not use request-supplied identity, a privileged client, fake query results, or a
  separate imitation of the RLS helper. Scope identity to the transaction only. Call
  `withSession(sessionHash, async (tx) => callback(tx), runtime)` from the production
  `src/lib/prisma.ts` helper; discard safe identity only when the test does not need it.
- `close()` cleans only that dedicated test database and disconnects both clients.
  Runtime audit UPDATE/DELETE/TRUNCATE stay forbidden even during fixture cleanup.

Run DB test files serially with isolated state (T031); within the audit concurrency
case allow at least eight live transaction slots with sufficient lock/transaction
waiting time. For pool-leak tests use a single-connection runtime pool so reuse is
forced, while concurrent callbacks queue correctly. Use a separate multi-connection
fixture configuration for audit concurrency so the database lock is actually exercised.
Do not run these against a shared schema. RLS tests intentionally omit application
filters and query PostgreSQL role/table metadata so privileged test connections cannot
silently invalidate the isolation checks. All fixture members require JSDoc per AGENTS.

## Coverage and validation

- Permission matrix: every role/capability, combined masks, unsigned ADMIN-all,
  authentication failure, denial audit emission, and cross-account ownership denial.
- RLS: real runtime role, enabled policies, unfiltered and explicit cross-user reads,
  writes, sessions, attempts, commit/rollback identity cleanup, concurrent scopes.
- Audit: independent SHA-256 expected value, linkage, modification/injection/deletion,
  canonical payloads, concurrent appends, atomic rollback, and runtime mutation denial.
- Rate limits: exact 100/10/5 boundaries, normalized emails, independent email quota,
  forged forwarded headers, Retry-After, and window expiration.

Owner-run commands and failure handling are in the root README's T017 section. No
security passing status can be claimed until T031 supplies the fixture and the owner
runs the suites. Later service/API suites cover account status and credential behavior.
