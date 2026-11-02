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
