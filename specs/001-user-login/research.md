# Research: User Login (Mobile)

Owner override 2026-11-05: Student personal/contact self-editing needs no Administrator
approval. Earlier Admin-only correction decisions are superseded; preserve ownership,
field allowlisting and protected account/academic/financial boundaries. T067 tracks the
forward migration; full profile UI remains a separate feature.

**Feature**: `001-user-login` | **Date**: 2026-10-31

Decisions that resolve the open choices in the plan. Requirements fixed by
`specifications.md` are recorded as constraints, not options.

## R1 — Session mechanism

**Decision**: Opaque 256-bit random token; only its SHA-256 hash is stored server-side.

**Rationale**: §4 mandates server-managed opaque sessions, not JWT. Hashing at rest means a
database leak yields no usable token.

**Alternatives considered**: JWT (rejected by §4); raw token storage (leak risk);
encryption (unnecessary, the token is never read back).

## R2 — Token transport for the mobile client

**Decision**: Return the token in the login response body and send it as
`Authorization: Bearer <token>`. No cookie, no CSRF token in this feature.

**Rationale**: Native apps cannot use HttpOnly cookies conveniently; §4 specifies the
mobile authorization header. With no browser client there is no CSRF surface, so adding
CSRF machinery now would be dead code.

**Guard**: the login request must declare `X-Client-Platform: mobile`; without it the API
returns `400 UNSUPPORTED_CLIENT` instead of handing a token to an unknown client. When the
web client arrives it will use a cookie transport and be exempt from this header.

**Alternatives considered**: cookie in the WebView (rejected — conflicts with §4 and with
SecureStore); token in a custom header (no benefit over standard Bearer).

## R3 — Password hashing

**Decision**: Argon2id, memory 19 MiB, iterations 2, parallelism 1, library salt.

**Rationale**: Fixed by §4; parameters must be re-tuned against the deployed host.

## R4 — Rate limiting

**Decision**: `express-rate-limit` in memory — 10 attempts / 15 min per client address,
5 attempts / 15 min per normalized submitted email, plus a global IP baseline of
100 requests / 15 min. Return Retry-After; bound in-memory key retention and trust
forwarded IP headers only from configured proxies.

**Rationale**: Satisfies §12 without new infrastructure. Two counters cover both password
spraying across accounts and repeated attempts on one account.

**Known limitation**: resets on restart, per instance. Documented for the deployment phase.

## R5 — Account enumeration

**Decision**: Identical status/message for unknown email and wrong password, and a dummy
Argon2id verify when no account exists so timing does not differ.

**Rationale**: §5 requires non-revealing responses; timing is the leak that survives
message-level fixes.

## R6 — Session lifetime and concurrency

**Decision**: 8 hours absolute, no sliding renewal, multiple sessions per account, logout
revokes only the current token.

**Rationale**: Simple and testable; matches "revoke the current session" in §5.

## R7 — Session restore on app launch

**Decision (approved 2026-11-02)**: Read SecureStore and stay in `restoring` while
`GET /auth/session` confirms identity on cold launch. Memory-only claims cannot survive
force-close. A 401 clears the token and routes to login once; offline/timeout preserves
the token and offers retry without granting access to protected data. During a warm
resume, existing in-memory identity may support local navigation while server requests
still validate authorization.

**Rationale**: §4 requires a valid session check. Blocking the splash screen on a cold API
start would make the app feel broken on free hosting; optimistic restore plus background
validation is suitable only when identity is already in memory. The approved 2-second
cold-launch target covers entry to the restoring state, not network confirmation.

**Alternatives considered**: no local claims, always call the API first (slow, fails
offline); trust the token until it fails (no revocation check until first action — partly
kept, see above).

## R8 — Device networking

**Decision**: API base URL comes from Expo config (`extra.apiUrl`) with
`EXPO_PUBLIC_API_URL` as the development override; the default in `.env.example` is the
machine's LAN address, never `localhost`.

**Rationale**: `localhost` on a phone is the phone. This is the most common first-run
failure for Expo projects on Windows.

## R9 — Error copy mapping

**Decision**: A single `messages.ts` maps API error codes to user copy; the login screen
never displays raw server text.

**Rationale**: Keeps enumeration-safe wording in one place and prevents leaking new server
messages into the UI.

## R10 — Account status semantics

**Decision (owner-approved 2026-11-02)**: Only verified `ACTIVE` accounts may sign in.
Unapproved accounts remain `PENDING_APPROVAL` and receive `403 ACCOUNT_PENDING_APPROVAL`
only after correct password verification. Academy approval transitions the account to
`ACTIVE`; this feature reads status and does not implement the approval workflow.
`SUSPENDED` accounts cannot sign in; protected session checks also enforce current status.

**Rationale**: The owner explicitly requires academy approval before login. Email
verification and academy approval remain separate conditions.

## R11 — WebView session handoff (deferred design)

**Decision**: Not implemented now. When a WebView page needs the session, the app requests
a single-use handoff code (`POST /auth/webview-handoff`, 60-second expiry, bound to the
user) and opens the page with `?code=…`; the server exchanges it for a cookie and redirects
to the clean URL. The bearer token never enters a URL.

**Rationale**: Meets §4's SecureStore rule while enabling later reuse of responsive pages.
Any use of WebView for the *login* screen itself would require a §4 amendment; this feature
does not do that.

## R12 — Test database

**Decision**: Vitest + Supertest against a dedicated PostgreSQL database (Supabase dev
project or local Docker), migrations applied before the run, per-file truncation of owned
tables.

**Rationale**: Security tests must exercise real Prisma queries; mocking them would test
the mock.

## R13 — Approved security alignment (2026-11-02)

- Validate required fields and strip unexpected properties; never pass raw body objects
  to Prisma. Unknown properties cannot grant roles, status, or permissions.
- Logout requires a syntactically valid Bearer header: missing/malformed is 401; a
  well-formed expired/unknown/revoked token is 204. Other protected routes remain 401.
- Use §6 permission mapping, unsigned 32-bit normalization for ADMIN-all, and all-bit
  matching; follow permission gates with ownership checks.
- Runtime DB role owns no tables and has no BYPASSRLS. Use transaction-local verified
  identity; pooled connections must not retain it. Restrict pre-auth lookup and session
  bootstrap to narrow database functions with fixed search_path, minimal output,
  explicit grants, and no arbitrary query interface. Their owner has only the needed
  access. Migration credentials never enter request processing. RLS protects against
  omitted filters, not a fully compromised trusted API identity-setting process.
- Serialize audit appends using one transaction-scoped advisory lock shared by every
  writer. Read the chain head after locking, hash fields in the exact §4 order, and
  insert with a unique previousHash constraint. Hash a deterministic encoding of a
  redacted payload; specify exact UTF-8 field encoding and UTC timestamp precision.
  Administrative state change and append share the transaction; a denial event commits
  separately from the rejected operation. No passwords/tokens/OTPs in audit material.
- Hash-chain verification checks links and recomputed hashes from the zero genesis.
  It cannot prove authenticity against a privileged full rewrite or detect tail deletion
  without a separately trusted head checkpoint. Document this boundary without claiming
  digital-signature non-repudiation or implementing an unapproved external service.

## Outstanding unknowns

- Session policy is now 30 minutes idle plus the retained eight-hour absolute cap;
  owner delegated technical policy on 2026-11-05. No absolute sliding renewal.
- Whether staff and admin will share the student API's login endpoint is deferred to the
  web-client feature; the service layer is transport-agnostic so either answer is cheap.

## Revised decisions — 2026-11-05 (supersede earlier role/expiry assumptions)

Verified assessment-approved Students have the same screens/navigation before and
after enrollment. Authentication approval, registration state, payment and package
entitlements stay separate. CUSTOMER becomes STUDENT through a forward migration;
STAFF requires inventory and must not receive automatic role conversion or access.
Administrator-only profile corrections require revoking the old runtime self-write grant.

Choose 30-minute server-authoritative idle expiry, retaining the eight-hour absolute
cap. This project choice balances usability with session exposure and is informed by
[OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html);
OWASP does not mandate this exact number. Successful authenticated user-initiated
protected operations renew only idle validity, atomically and capped by absolute expiry.
Polling/restore checks/failures do not renew it; client clocks and role claims are not
authority. At either exact deadline reject, including under concurrent requests.
T063–T065 implement these changes; T031 verifies database behavior.

Full Home/navigation, email-link password reset and browser delivery belong to dependent
features. Automatic deletion remains gated by retention and pending-payment decisions.
