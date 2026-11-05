# Quickstart: User Login (Mobile)

**Feature**: `001-user-login` | **Updated**: 2026-11-05

This is the owner-run acceptance guide, not a claim that the complete login flow is
implemented. T027 and T062–T065 checkpoints passed; T031 real database coverage and
mobile end-to-end acceptance remain pending. T066 is the document/design-gap review.

## Setup and execution boundary

Use [README setup and task checkpoints](../../README.md) as the single source for
working directories, migration/generation, environment checks and exact commands.
Do not recreate init_auth, reset a database, repeat installs or seed a shared database.
T031 first supplies a dedicated isolated test database; T032 supplies safe synthetic
seed accounts. No completed setup needs repeating without a new change or failure.

For device networking use the development machine's LAN address, not phone localhost,
and the API PORT configured in your private environment. Match the mobile API base URL
to that port and `/api/v1`; never copy a database URL into the mobile environment.
The current default API port is 3000; use 4000 only if explicitly configured. Start the
API/mobile clients using README instructions after their wiring tasks are implemented.
Agents provide instructions; the owner runs all setup and test commands.

## API acceptance after T031 and auth endpoint implementation

Use dedicated synthetic fixtures and keep tokens/passwords out of shared output.

| Check | Expected |
| --- | --- |
| Correct native header, verified ACTIVE STUDENT, correct password | 200 with safe user, sessionToken, absolute expiresAt and landingPath `/`; no Set-Cookie |
| Missing/incorrect X-Client-Platform | Safe 400 UNSUPPORTED_CLIENT; no session |
| Wrong password versus unknown email | Identical 401 INVALID_CREDENTIALS and comparable verification work |
| Unverified, PENDING_APPROVAL, SUSPENDED with correct password | Safe restriction after verification; no session |
| Native Administrator login or forged STAFF/role field | No Student session; stripped client role cannot override database identity |
| Verified approved-unenrolled versus enrolled Student | Equal `/` entry/navigation, independent from purchased entitlements |
| Session lookup | Safe identity/absolute expiry; no token/hash; no idle renewal |
| Missing, malformed, idle/absolute-expired, revoked or unknown bearer on protected endpoint | Identical safe 401 UNAUTHENTICATED |
| Logout, well-formed already-invalid token | 204; missing/malformed header is 401 |
| Copied token after online logout | Next protected request rejected; another device's session stays valid |
| Limit boundaries | Sixth normalized-email attempt, eleventh IP attempt, or 101st global IP request per 15 minutes is limited in independently isolated fixtures; Retry-After present |
| Oversize/malformed request | Safe 413/400, no raw parser details; unknown body fields stripped |
| Student updates owned allowlisted profile versus another user | Own profile edits allowed without approval; cross-user/protected fields denied; full profile endpoint remains a separate feature |

Enrollment/package entities belong to a dependent feature. Until available, verify
that auth code adds no payment/enrollment requirement; do not simulate completion of
paid entitlement rules with a fake registration field or UI placeholder.

## Session boundaries — T031 real database fixtures

| Check | Expected |
| --- | --- |
| Just before versus exactly at idle deadline | Valid before; expired at deadline, safe 401 |
| Successful authenticated user-initiated protected work | Idle renews up to 30 minutes, capped by eight-hour absolute expiry |
| Restore checks, background polling, failed operations | Stored activity/deadline unchanged |
| Concurrent renewal/expiry/revocation | Expired/revoked session cannot be revived |
| Renewal fails after business work | Business changes roll back with renewal failure |
| Old session backfill | Deadline derived from original creation, no migration-time extension |
| Runtime direct deadline write or unscoped renewal | Denied / false with no cross-account access |
| Session revocation plus audit append then thrown error | Both roll back; use a second owned session so context remains live |

Use controlled isolated fixtures and compare stored activity; a client countdown or
mocked query response cannot prove server enforcement. Do not change production/shared
clocks or session timestamps. HTTP responses must follow transaction commit.

## Device acceptance — owner-run after relevant stories

Review every applicable row in [UI state checklist](checklists/ui-states.md), including
triggers, feedback, recovery and accessibility. Visually compare approved references
again before UI edits. The checklist records design conflicts that require resolution;
T066 does not approve changing the supplied images.

| Steps | Expected |
| --- | --- |
| Sign in; force-close; reopen before idle/absolute expiry | Restore with no login flash; session lookup confirms identity |
| Reopen offline / cold API | Restoring/retry feedback; no invented cached identity or indefinite spinner |
| Enter malformed email or empty password; toggle password visibility | Accessible local feedback, no invalid request, visible keyboard focus |
| Submit; tap repeatedly; simulate timeout | One request; busy feedback then usable explicit retry; retain safe email |
| Use valid synthetic passwords under eight characters | Login does not impose registration complexity; no trimming |
| Exceed email limiter | Wait interval shown, no automated retry loop |
| Fail secure storage write/deletion | No insecure fallback or false successful sign-in/logout |
| Expire/revoke session; send concurrent protected requests | One invalidation/login transition; safe session-ended copy |
| Re-login after expiry | Validate an allowed internal destination; no external redirect or mutation replay |
| Sign out online/offline | Online session revoked; local cleanup attempted either way; storage failure explicit |
| Approved-unenrolled versus enrolled login | Same Student entry; no Admin/guardian menus or unpaid package activation |
| Small screen, large text, keyboard open, screen reader | Usable at 360 dp; labels/focus/error announcements; submit action reachable |

Full Home content and Home/Training/Schedule/Notification/Profile navigation belong to
the dependent Home feature. Login can establish entry, not certify that feature complete.
Password reset is a separate expiring-email-link feature; do not implement the old OTP
recovery sheet in this slice. Remember Me and credential-error visual conflicts must
be resolved before T042 changes; see the checklist.

## Final acceptance and evidence

After T031 and all implemented prerequisites, the owner runs the relevant README test
commands at T044/T048/T053/T059. Expected: implemented suites and scenarios pass; on
failure stop and share redacted output. Do not run missing-harness suites early or mark
UI/device checks passed based only on mocked service tests.

Record device/build, normal-network latency/workload and warm/cold API/database state.
Agree measurement conditions before asserting NFR 1: three-second page loads and
five-second login requests, measured separately from the 30-second human sign-in journey.
Native Android is this slice; responsive Student web/browser compatibility remains a
separate delivery-scope dependency. Never upgrade hosting/packages to meet it implicitly.

Done means all applicable spec scenarios pass, the UI conflicts are resolved, no sensitive
values leak and security guarantees have appropriate real database evidence. T031 is
still pending; existing focused tests do not certify positive RLS, expiry or concurrency.