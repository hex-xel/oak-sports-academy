# Feature Specification: User Login (Mobile)

**Feature Branch**: `feat/user-login`

**Created**: 2026-10-31

**Status**: Revised — T016 baseline and owner decisions of 2026-11-05; implementation corrections pending T063–T066

**Input**: "Login for users on the mobile app first. The web app for admins and staff comes
later this semester; the student web app next semester."

**Source requirements**: `specifications.md` §2 (mobile app, Expo, SecureStore), §4
(authentication and session rules), §5 (login flow), §6 (roles), §7 (student accounts),
§12 (testing). Implements **student sign-in and sign-out in the Android app** only.

## Scope note

This feature is the student mobile login. Deliberately excluded:

- Staff and admin web login — the API is designed to accept a cookie-based web client
  later, but no web client is built here.
- Registration, email verification, and password recovery — separate features; this one
  depends on them and therefore uses seeded accounts.
- WebView-hosted screens — see "Deferred: WebView" in `plan.md`. The login screen itself
  stays native so the mobile session is stored per §4.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in on the app (Priority: P1)

A student opens the Oak Sports Academy app, enters their email and password on the
native login screen, and lands on their home screen with a session that survives app
restarts until it expires.

**Why this priority**: Every student screen sits behind this. Without it, no other
mobile feature can be demonstrated or tested on a device.

**Independent Test**: Install the app on a device or emulator with a seeded verified
account, sign in, force-close the app, reopen it, and confirm the home screen loads
without asking for credentials again.

**Acceptance Scenarios**:

1. **Given** a verified, active account, **When** the user submits the correct email and
   password, **Then** a session is created, the token is stored in secure device storage,
   and the user lands on the home screen.
2. **Given** a wrong password, **When** the user submits it, **Then** the screen shows
   "Email or password is incorrect", no session is stored, and the form remains usable.
3. **Given** an email that is not registered, **When** the user submits it, **Then** the
   message and the perceived response time are indistinguishable from scenario 2.
4. **Given** a correct password on an unverified account, **When** the user submits it,
   **Then** no session is stored and the screen explains that the email must be verified.
5. **Given** a suspended account with correct credentials, **When** the user submits them,
   **Then** no session is stored and a neutral "this account cannot sign in" message is
   shown.
6. **Given** the login screen, **When** the email is empty or malformed, or the password is
   empty, **Then** inline validation appears and no request is sent.
7. **Given** repeated failed attempts, **When** the limit is exceeded, **Then** further
   attempts are refused with a retry message stating how long to wait.
8. **Given** the device has no connection, **When** the user submits, **Then** a clear
   offline message appears and the button becomes usable again.
9. **Given** a signed-in user, **When** they force-close and reopen the app, **Then** they
   restore the session after API validation without entering credentials again. While
   offline or the API is starting, a restoring/retry state appears without a login flash.
10. **Given** a verified account still in `PENDING_APPROVAL`, **When** correct credentials
    are submitted, **Then** no session is issued and `403 ACCOUNT_PENDING_APPROVAL` is
    returned. Once academy approval changes the status to `ACTIVE`, login is permitted.

---

### User Story 2 - Sign out (Priority: P2)

A signed-in student taps "Sign out" and is returned to the login screen. The session is
revoked on the server, and the stored token is deleted from the device.

**Why this priority**: Shared phones and second-hand devices are common. Removing the
token locally without revoking it leaves a valid session usable from a copied token.

**Independent Test**: Sign in, copy the stored token, sign out, then call a protected
endpoint with the copied token and confirm it is rejected.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they tap "Sign out", **Then** the session is
   revoked on the server, the token is deleted from secure storage, and the login screen
   appears.
2. **Given** a revoked token, **When** it is replayed, **Then** the request is rejected as
   unauthenticated.
3. **Given** sign-out when the network is unavailable, **When** the request fails,
   **Then** the token is still removed locally and the app returns to the login screen,
   with the server-side session left to expire.
4. **Given** a user signed in on a second device, **When** they sign out on the first,
   **Then** the second device's session remains valid.

---

### User Story 3 - Session expiry and recovery (Priority: P3)

When a session expires or is revoked elsewhere, the app returns the user to login without
crashing, losing navigation history, or showing raw error text.

**Why this priority**: Sessions expire after 30 idle minutes or eight hours absolute. Without predictable handling, the
app fails mid-action in a way that looks like a bug to a participant.

**Independent Test**: Corrupt or expire the stored token, reopen the app, and confirm it
shows the login screen with a "session ended" message rather than an error screen.

**Acceptance Scenarios**:

1. **Given** an expired token, **When** the app makes any authenticated request,
   **Then** the token is cleared and the login screen appears with an explanation.
2. **Given** a request rejected as unauthenticated, **When** it happens during a screen
   load, **Then** the user is redirected to login exactly once, with no error stack shown.
3. **Given** the login screen after an expiry, **When** the user signs in again,
   **Then** they return to the screen they were on, not the app's first screen.
4. **Given** a valid session, **When** the app is reopened before expiry, **Then** no
   login prompt appears.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST authenticate students with email and password against the
  API.
- **FR-002**: The API MUST validate every sign-in request and reject malformed input
  without revealing internal details. Validate bodies, route parameters, and query
  parameters with Zod; strip unexpected object properties before use.
- **FR-003**: The API MUST rate-limit sign-in attempts by client address and by submitted
  email, and MUST report a retry delay when the limit is exceeded.
- **FR-004**: Unknown email and wrong password MUST return the same status and message,
  and MUST NOT differ measurably in response time.
- **FR-005**: Only active accounts with verified email may sign in; a "verify your email"
  outcome is returned only after the password has been verified. Academy approval is
  represented by transition from `PENDING_APPROVAL` to `ACTIVE`; pending and suspended
  accounts cannot sign in. Email verification alone never grants approval.
- **FR-006**: A successful sign-in MUST create a server-managed session with an
  unpredictable token of which only a protected form is stored.
- **FR-007**: The mobile app MUST store the token using Expo SecureStore; it MUST NOT be
  written to AsyncStorage, logs, crash reports, or screenshots.
- **FR-008**: Authenticated requests MUST send `Authorization: Bearer <token>`; the token
  MUST never appear in a URL or query string.
- **FR-009**: Sessions MUST expire server-side after 30 minutes of inactivity or eight
  hours from creation, whichever comes first. At the exact deadline they are expired.
  Successful authenticated user-initiated protected operations may renew only the idle
  deadline, capped by absolute expiry. Restore checks, background polling, failed
  requests and client timestamps MUST NOT extend validity. Concurrent requests cannot
  revive an expired or revoked session. Expired, revoked and unknown tokens are rejected
  identically; client timers never authorize access.
- **FR-010**: Signing out MUST revoke the current session server-side and clear the token
  from secure storage; other devices MUST keep their sessions. Missing or malformed
  Bearer headers return 401; well-formed expired, unknown, or revoked tokens return 204
  from logout. All other protected endpoints reject these tokens with 401.
- **FR-011**: The API MUST return the session token in the response body only to clients
  that identify themselves as native; a browser client MUST NOT receive it in a
  client-readable form. The web path is added with the web client feature.
- **FR-012**: The API MUST record successful and failed sign-in attempts for security
  review, without storing passwords or tokens.
- **FR-013**: Responses MUST NOT include password hashes, token hashes, or internal error
  details.
- **FR-014**: The login screen MUST be usable one-handed on a 360 dp wide screen, with
  labelled fields, visible focus, keyboard avoidance, and screen-reader announcements for
  errors.
- **FR-015**: On launch the app MUST attempt to restore a session from secure storage and
  MUST NOT show the login screen while that check is in progress.

- **FR-016**: Protected routes MUST use centralized permissions from §6 followed by
  ownership checks. Current account status and identity are loaded server-side.
- **FR-017**: Sensitive auth tables MUST enforce RLS under a non-owner, non-BYPASSRLS
  runtime role, with verified transaction-local identity and a narrowly scoped
  authentication bootstrap path. Missing identity fails closed.
- **FR-018**: Administrative mutations and their SHA-256 audit entry MUST commit
  atomically; concurrent appends MUST not fork the chain. Permission denials emit
  redacted security events. Audit runtime access is INSERT/SELECT only.
- **FR-019**: A global IP limiter (100/15 minutes baseline) MUST complement login
  limits (10/15 minutes/IP and 5/15 minutes/email), with Retry-After on 429. JSON bodies
  are capped at 10 kB; mobile requests provide bounded timeout and explicit retry.

- **FR-020**: Verified assessment-approved STUDENT accounts MUST have the same student
  screens and navigation before and after enrollment. Registration/payment/package
  status is separate from account approval; navigation does not activate unpaid
  entitlements. Unapproved accounts remain blocked and expired packages do not revoke
  assessment approval. Administrator capabilities are never granted by enrollment.
- **FR-021**: Students MAY edit their own personal/contact profile without Administrator
  approval (owner override 2026-11-05). Allowlist fields and validate ownership/server-side
  input; role, status, verification, credentials, progress and financial records remain
  protected. The auth schema currently permits only displayName and its update timestamp;
  full profile editing/photo upload belongs to a separate feature.
  CUSTOMER migrates to STUDENT without data loss. Legacy STAFF is not a supported
  business role and MUST NOT be silently converted or given new access.

### Key Entities

- **Account**: A student who can sign in. Unique email, password hash, role, email
  verification timestamp, account status, last sign-in time.
- **Session**: One signed-in instance. Protected token reference, owning account, expiry,
  revocation time, optional device label.
- **Sign-in attempt**: One try — email, client address, outcome, time — used for rate
  limiting and review.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A returning student signs in from app launch in under 30 seconds on a
  typical mobile connection.
- **SC-002**: At least 95% of sign-in attempts with valid credentials succeed on the first
  try during acceptance testing.
- **SC-003**: No screen or API response reveals whether an email is registered.
- **SC-004**: After sign-out, a replayed token fails on the very next request.
- **SC-005**: On cold launch, read secure storage and show the restoring state within
  2 seconds without flashing login. Enter authenticated screens after `/auth/session`
  confirms identity. Measure network-dependent restore separately; offline/cold API
  states offer retry. Memory-only user claims do not survive force-close.

## Assumptions

- Accounts are created by a separate registration feature; seeded accounts provide one
  verified active student, one unverified student, one suspended student, and one
  verified pending-approval student for testing.
- Roles stay in the data model, but only the student role is exercised here; staff and
  admin authenticate through the later web client.
- Sessions have a 30-minute idle limit and eight-hour absolute cap; several devices
  per account are allowed. Activity policy is server-controlled, not a client heartbeat.
- The API is reachable from a physical device over the local network in development.
- The login screen is native. Content pages that later become WebView pages are out of
  scope and do not affect the session design, because the token handoff for those pages is
  a separate decision.
- No social login, MFA, biometric unlock, or "remember me" — none are in the approved
  baseline.

## Revised source alignment — 2026-11-05

The owner's access and role answers resolve the relevant section 16 questions;
technical timeout policy was delegated. See
[decision record](../../docs/architecture/login-requirements-alignment.md).
The owner explicitly approved the master amendments on 2026-11-05; sections 4, 6,
7.2 and 16 now record these decisions. Implementation corrections remain pending.

| Source | Feature coverage / boundary |
| --- | --- |
| FR L-01; NFR 5/6 | FR-005/009/016/017/020/021: verified approval, Student/Admin, idle expiry, ownership |
| FR H-01 | Same `/` landing route for approved and enrolled students; complete Home content/navigation belongs to the Home feature |
| FR P-01 | Owned personal/contact self-editing without approval; full profile UI deferred |
| NFR 1 | Add SC-006 below; existing 30-second human journey does not replace server/request targets |
| NFR 9 | Native Android slice retained; responsive Student web/browser coverage is a dependency requiring delivery-scope confirmation |
| FR AF-01 | Deadline/deletion safeguards remain gated; no deletion implementation in login |

- **SC-006**: Under documented normal-network and workload conditions, pages load
  within three seconds and login requests complete within five seconds. Record device,
  build, API/database warm or cold state, network latency and workload with acceptance
  results; agree these conditions with the owner before claiming a pass. Browser-page
  measurements belong to the dependent web feature, not this native-only slice.

Additional acceptance: a verified ACTIVE approved-but-unenrolled Student reaches the
same landing/navigation as an enrolled Student, without receiving unpaid entitlements.
Idle checks cover just before and exactly at 30 minutes, successful foreground activity,
background/restore failures not extending time, eight-hour capping and concurrent
expiry/revocation. T031 supplies positive database fixtures; T063–T065 are still pending.

Email-link password recovery, full Home/navigation, consent and destructive enrollment
cleanup belong to dependent features. Existing OTP-reset, Remember Me and password-length
UI discrepancies require design reconciliation before implementation; no UI is changed
by this artifact update. Guardian data does not introduce a separate guardian login.
