# Research: User Login (Mobile)

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
5 attempts / 15 min per submitted email.

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

**Decision**: On launch, read the token from SecureStore, load cached user claims from
memory only, and validate against `GET /auth/session` in the background. A `401` clears
the token and routes to login; a network error keeps the user signed in optimistically and
retries on the next request.

**Rationale**: §4 requires a valid session check. Blocking the splash screen on a cold API
start would make the app feel broken on free hosting; optimistic restore plus background
validation gives the 2-second target while still catching revoked tokens.

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

**Decision**: `ACTIVE` and `PENDING_APPROVAL` may sign in; `SUSPENDED` may not.
`PENDING_APPROVAL` users see a restricted home screen.

**Rationale**: §5 separates verification from approval; §12 says unapproved accounts cannot
perform restricted actions, which implies they can authenticate.

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

## Outstanding unknowns

- Session lifetime (8 h) awaits client confirmation.
- Whether staff and admin will share the customer API's login endpoint is deferred to the
  web-client feature; the service layer is transport-agnostic so either answer is cheap.
