---
status: accepted
owner: team
milestone: 1
---

# ADR-0001: Server-managed opaque sessions and database authorization

Recorded: 2026-11-06. This records the approved authentication requirements and
security alignment; it introduces no new policy or infrastructure. Acceptance of
this decision does not mean all device/performance acceptance checks have passed.

## Context

The Android Student app needs persistent sign-in, immediate server-side rejection of
revoked sessions, current account restrictions and protection against cross-account
queries. Transaction-pooled PostgreSQL connections cannot carry identity between
requests. Administrative audit records need serialized, tamper-evident append behavior
without granting the API unrestricted database or audit-mutation privileges.

Sources are the [master requirements](../../specifications.md),
[feature requirements](../../specs/001-user-login/spec.md), and approved decisions
R1/R2/R7/R13 plus the later idle-expiry and Student-role overrides in
[research](../../specs/001-user-login/research.md). Later approved requirements take
precedence over historical research text, including its former absolute-only expiry
and Administrator-only profile correction assumptions.

## Decision

- Use a cryptographically random 256-bit opaque bearer. Store only its SHA-256 hash
  in PostgreSQL; return the raw token once through the native login contract. Await
  Expo SecureStore persistence before authenticated navigation. Do not persist user
  claims as authorization, use insecure storage fallbacks, or place bearers in URLs.
- Validate credentials server-side with Argon2id, including dummy verification for
  unknown email, before disclosing account restrictions. Native issuance requires
  verified ACTIVE STUDENT identity. Enrollment/payment entitlements remain separate.
- Enforce 30-minute idle expiry and an eight-hour absolute cap using database state.
  Successful server-classified interactive work renews idle activity atomically with
  business work, never beyond the absolute cap. Restore, polling, failed operations
  and client timestamps cannot renew validity; exact deadlines are expired.
- Permit multiple sessions per account. Logout revokes only the supplied current
  bearer, preserving other devices. Missing/malformed headers reject; a well-formed
  unknown/expired/revoked bearer receives idempotent empty 204 from logout. Ordinary
  protected routes reject invalid sessions uniformly with 401.
- Establish transaction-local identity from a verified session hash inside the same
  explicit transaction as every protected query. Apply centralized server-role
  permission masks, then ownership, then scoped work. Never establish identity from
  client user IDs, role claims or direct session settings that outlive the transaction.
- Use a non-owner, non-superuser, non-BYPASSRLS runtime login. Keep migration
  credentials separate. Constrain pre-authentication lookup/session bootstrap to
  narrowly granted functions with fixed search paths and minimal capabilities.
  RLS protects against omitted filters; it does not neutralize a compromised trusted
  API with authentication-bootstrap capabilities. Protected personal/contact edits
  remain owner-scoped and field-allowlisted; account, academic and financial fields
  do not become client-writable.
- Serialize audit appends with the shared transaction-scoped advisory lock before
  reading the head. Canonically hash safe/redacted metadata and chain records using
  the approved field order. Enforce links/hashes independently on insert, uniqueness
  against forks, and no runtime UPDATE/DELETE/TRUNCATE privileges. Related mutations
  and append commit together; denials roll back business work and append separately
  in a fresh verified nonrenewing transaction.
- Verify complete audit snapshots in hash-link order from genesis. Hash chaining
  does not establish digital-signature non-repudiation, detect tail deletion without
  a trusted external head checkpoint, or defeat a privileged full-chain rewrite.
  No external checkpoint service is authorized by this decision.

## Alternatives considered

| Alternative | Reason not selected |
| --- | --- |
| Self-contained JWT authorization | Conflicts with the approved opaque-session requirement; current revocation/account state must remain authoritative. |
| Store raw bearer tokens in the database | A session-table disclosure would yield directly usable credentials. |
| Trust token presence or persisted user claims on cold launch | Does not establish current identity, eligibility or revocation state. |
| Native cookie/WebView session persistence | Conflicts with the native SecureStore/Bearer boundary; browser transport is a separate feature. |
| Privileged database runtime or pooled session-level identity | Weakens RLS and risks identity leaking between requests/connections. |
| Read audit head without transaction serialization | Concurrent writers could race, fork or lose append consistency. |

## Consequences and limits

Protected requests require database availability and bounded transactions. A cold or
unreachable API leaves unknown identity in a restoring/retry state; it does not grant
offline data access. Confirmed 401s clear the local session once, while generation
checks prevent stale responses from clearing a newer sign-in. Re-login returns only
to an allowlisted route after current identity checks; mutations are never replayed.

The API must still explicitly project safe response fields, classify interactive work,
redact logs, use HTTPS in release, and trust only verified ingress proxies. Current
in-memory rate limits reset on restart and are per instance; multi-instance abuse
protection requires separate review. Password timing/performance claims require
deployment-host measurement, not merely identical errors or a dummy verification.

The [architecture guide](../architecture/auth.md) documents implementation and links
to source. [Database boundary notes](../architecture/auth-data.md) document grants
and audit protocol details. [Tasks and evidence](../../specs/001-user-login/tasks.md)
track validation: functional expiry/recovery and native concurrent-401 checks passed;
T053 startup/timing acceptance and T059 final deployment acceptance remain open.
Setup commands remain in the [README](../../README.md).
