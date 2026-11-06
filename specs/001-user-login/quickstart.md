# Quickstart: User Login (Mobile)

**Feature**: `001-user-login` | **Updated**: 2026-11-06

This is the acceptance guide for `001-user-login`. Owner approved this T057 refresh
by requesting implementation. Setup commands remain in the README. T044 sign-in passed on
2026-11-06: 287 automated tests with the runtime below, native ACTIVE Student entry,
real failure/rate-limit feedback, and owner-confirmed keyboard/TalkBack at 360 dp with
large text. Later logout/session results and remaining acceptance are summarized below.
See [recorded device evidence](checklists/ui-states.md#t044-device-evidence-completed-2026-11-06).

## Current checkpoint — T057 documentation refresh

| Evidence | Recorded result |
| --- | --- |
| Latest automated regression (T058 fix) | 344 tests in 29 files passed, Node 24.22.1, exit 0; API source/API-test/mobile typechecks passed |
| T059 local rerun | Same 344 tests/29 files pass (21.77 s), all four typechecks pass; not final release acceptance |
| Real isolated database coverage | Restricted runtime RLS, pooled identity, session deadlines/concurrency and audit integrity/privileges exercised; T031 is complete |
| Native sign-out | T048 online/API-unavailable sign-out/relaunch and owner TalkBack passed |
| Native session recovery | 31-minute idle expiry via Metro reload; session-ended TalkBack; re-login to Home with notice cleared; API-unavailable retry without password passed |
| Native concurrent rejection | Owner DevTools run returned three real 401s after current-session revocation; one stable login transition and session-ended notice confirmed |
| Session confirmation sample | 2680 ms for one native request; API/database warm state not established; not a startup measurement |
| Force-close recovery | Home eventually restored after owner Metro cache clear and fresh Expo process; no saved-session deletion or auth code change |
| Physical phone recovery | Owner realme C51/RMX3830, Android 15, Expo Go 58.0.5/SDK 58, same Wi-Fi: after force-stop/reopen instructions, reported restoring in no more than 3 seconds then Home, no login flash; <=2-second target and separate Home/network timing not established |
| Refined phone recording | Owner measured project open to restoring = 2 seconds, restoring to Home = 3 seconds, no login flash; cold app with API already running. Entry target met in this sample; confirmation/render interval is not pure HTTP time. Fresh API-process timing remains pending |
| Fresh API-process phone run | Owner restarted only API, then reopened: reported restoring 3 seconds, Home 4 seconds, no login flash/error. Restoring entry exceeds the two-second target; T053 timing fails this run. Database not restarted; not a hosted cold-start or pure HTTP benchmark |
| T053 still open | Repeatable no-login-flash restoring entry within two seconds and separately classified warm/cold confirmation timing |
| T059 still open | Final acceptance and deployment-host password/login performance |

These are recorded results, not a new test run for T057. Historical checkpoints below
retain their original counts. Expo Go loading/updater failures are not passing app
startup evidence. See [task evidence](tasks.md) and [architecture](../../docs/architecture/auth.md).

## T047-T048 sign-out acceptance (passed 2026-11-06)

Mobile sign-out is implemented: neutral Sign out on the Student landing, remote revoke
followed by local cleanup in finally, safe offline/server warning, and an explicit secure
cleanup retry gate on deletion failure. That checkpoint passed 312 tests in 28 files
using installed Node 24.22.1. Mobile/API-test typechecks pass. The earlier 303/287 counts
below record prior checkpoints. T048 native online/API-unavailable sign-out and
relaunch passed at 360 dp with 1.3 text. Owner subsequently confirmed all three
TalkBack announcements (button, progress, unconfirmed-server warning) and API restart.
See the completed T048 evidence in the UI state review. Storage-failure tests remain
adapter-based; no native fault injection or full US3 acceptance is implied.

Use the existing owner-run dev commands in the device section, then follow the T047
logout rows in [UI state review](checklists/ui-states.md). Online sign-out should show
progress then login and stay signed out after reopening. Offline sign-out should still
reach login after local deletion, with unconfirmed-server feedback. Deletion failure
must show Retry secure cleanup instead of a success claim; retry only local cleanup.
No automatic mutation replay, token logging or insecure storage fallback is added.

## T046 API logout validation (2026-11-06)

Following owner confirmation of T045's expected 404 baseline, the 16 logout contract
tests now pass against production routes and the guarded restricted local DB. Full
regression is 303/303 tests across 27 files, exit 0 and no unhandled errors, using the
same installed Node 24.22.1 executable shown below. API source/test typechecks pass.
The previous T044 287-test count is historical. T047/T048 subsequently passed as
recorded above; API success alone does not certify the UI.

## T044 tested runtime and emulator

The unchanged 26-file suite passed all 287 tests, exit 0 with no unhandled errors,
using the already installed Node 24.22.1 runtime. System Node 24.15.0 showed intermittent
HTTP worker exits. Fork pool, assertions and isolation remain unchanged; no dependency
upgrade, disabled test or worker-error suppression was used. Use the
[Test runtime commands](../../docs/development.md#development-and-validation).
Expected at the current checkpoint: 29 files and 344 tests pass, no unhandled errors,
exit 0; later approved test additions may increase the count. Keep the existing
Docker test database running. A preflight refusal is a failure, not a skipped DB pass.

For this emulator, the owner configured `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api/v1`
in private `apps/mobile/.env` and restarted Metro. Opening `exp://10.0.2.2:8081` fixed
LAN asset access. Physical devices still need the actual reachable LAN address.
Owner-set density 480 on the 1080 px emulator gives 360 dp; font scale 1.3 tests larger
text. Owner display restoration and runtime commands remain in the
[Native review instructions](../../docs/development.md#development-and-validation).

## Setup and execution boundary

Use [Development configuration and validation](../../docs/development.md#configuration) as the entry point for
working directories, migration/generation, environment checks and exact commands.
Do not recreate init_auth, reset a database, repeat installs or seed a shared database.
The completed T031 harness supplies a dedicated isolated test database; T032 supplies safe synthetic
seed accounts. No completed setup needs repeating without a new change or failure.

For device networking use the development machine's LAN address, not phone localhost,
and the API PORT configured in your private environment. Match the mobile API base URL
to that port and `/api/v1`; never copy a database URL into the mobile environment.
The current default API port is 3000; use 4000 only if explicitly configured. Start the
API/mobile clients using README instructions after their wiring tasks are implemented.
The owner runs setup/dev-server commands and explicitly authorized agent tests in this
task sequence; test authorization does not authorize installs or environment changes.

Use [isolated DB setup](../../docs/architecture/auth-checkpoint-history.md#t031-isolated-database-setup-and-validation-owner-run),
[synthetic accounts](../../docs/architecture/auth-checkpoint-history.md#t032-development-seed-accounts-supabase-owner-run),
and [native dev-server/review commands](../../docs/development.md#development-and-validation).
If a preflight refuses the database, stop. Resume the existing disposable environment;
do not bypass the guard, point tests at shared data or recreate/migrate anything implicitly.

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

## Runtime, audit and boundary acceptance

Run the existing README validation commands against the guarded disposable database.
Use [security harness details](../../apps/api/tests/security/README.md) to identify
fixtures; never run these destructive fixture preparations against a shared database.

| Reproducible check | Expected boundary/evidence |
| --- | --- |
| Connect as restricted runtime without context; attempt ordinary user/session reads and direct protected writes | No foreign rows or write access; runtime owns no tables and has no superuser/BYPASSRLS or function-owner membership |
| Establish context from unknown hash; try forged user/role settings; reuse connection after commit/rollback | No forged identity, no callback for rejected session, no retained identity on pooled reuse |
| Student requests an Admin permission through a test-only gated route; try foreign ownership | Safe 403, no protected callback, no activity renewal, denial audit commits independently |
| Change current eligibility/role after token issuance in isolated fixture | Subsequent requests use current server state, not token/client role claims |
| Attempt runtime audit UPDATE/DELETE/TRUNCATE and cross-actor insert | Privileges/policies deny mutation or forged actor; production has no audit-mutation endpoint |
| Append concurrent audit events under restricted transactions | One consistent chain, no forks/lost appends; shared advisory lock held through commit |
| Throw after protected mutation plus audit append | Both roll back; rejected operations cannot leave partial business writes |
| Verify complete chain, then alter/reorder/duplicate an in-memory snapshot | Broken links/recomputed hashes rejected; filtered subsets are not full-chain evidence |
| Exercise audit payload validation/redaction | No secrets in stored payload material; invalid/cyclic inputs fail safely; privileged rewrite/tail-deletion limitations remain documented |
| Independently test global/IP/email limit boundaries and malformed email | 429 and Retry-After at configured boundary; invalid emails still consume IP quotas; no request replay |
| Send malformed/over-10-KiB JSON and untrusted forwarded headers | Safe 400/413, no parser diagnostics; only configured proxies influence client IP |

Relevant suites include `security/rls`, `security/session-db`, `security/audit`,
`audit/audit.service`, `security/rate-limit`, `middleware/require-auth`, and production
`auth/session.api`/`auth/logout.api` under `apps/api/tests/`. Test-only gated routes
exercise the production wrapper without adding public Admin/foreign-owner APIs.
See [audit commands](../../docs/architecture/auth-checkpoint-history.md#t027-audit-appendverification-owner-validation)
and [auth boundary commands](../../docs/architecture/auth-checkpoint-history.md#t029-authentication-and-ownership-owner-validation).

## SecureStore failure acceptance

Use the existing adapter-based `mobile/token-store`, `mobile/auth-context`, and
`mobile/logout` suites for deterministic native failures; do not delete emulator data
or weaken device security to manufacture them. Read failure must retain an unknown-
identity retry state. Write failure must prevent signed-in navigation. Logout deletion
failure must show explicit cleanup retry and block normal login/restoration until
cleanup succeeds. A network failure must not silently delete a valid token during
restore; explicit offline logout must still attempt local deletion and accurately
report unconfirmed server revocation. Native fault injection remains unperformed and
must be reported separately from adapter evidence.

## Device acceptance — owner-run after relevant stories

Follow the working directory and separate API/mobile terminal commands in the
[Native development commands](../../docs/development.md#development-and-validation).

Use the existing configured Android device/emulator and synthetic development account.
Expected: API starts on configured PORT and Expo displays its development connection.
If startup fails, stop and share redacted output; do not reinstall or reset the database.
Check the rows below, starting with valid login, wrong/unknown credentials, repeated taps,
timeout/offline retry, and the rate-limit wait. Compare the supplied images at 360 dp with
the keyboard open, large text and screen reader. Record device/build and pass/fail for
applicable rows. Logout and request-associated 401 flows are implemented; recorded
passes do not waive remaining startup/timing acceptance.


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
recovery sheet in this slice. T042 resolved the Remember Me and generic credential-error gates under the owner UX
condition; see the checklist for implementation decisions and pending device review.

## Final acceptance and evidence

T059 local checkpoint (2026-11-06): installed Node 24.22.1; 344 tests in 29 files
pass with exit 0/no unhandled errors. Shared/API/API-test/mobile typechecks pass.
After tests finished, the existing synthetic password diagnostic reported known
verification median/max 19.1/20.1 ms and unknown median/max 19.0/19.4 ms, ten
sequential samples each on the local workstation. It performs no database/network
calls and does not benchmark full login, timing equivalence or deployment performance.
The earlier run overlapped regression work; the post-suite sample is reported here.
Use the existing [Password benchmark command](../../docs/development.md#development-and-validation)
on the actual deployment host before approval or tuning.

Owner reports Supabase setup only; no deployed API host was identified. Final
deployment-host login/password performance, agreed workload/network evidence and
the deferred T053 startup target remain open. Supabase database availability alone
does not establish API deployment or a passing release checkpoint.

### Warm/cold recovery and timing procedure

1. Record device/Android version, Expo Go or packaged build/version, screen density,
   font scale, API/database location and process state, network path/latency, and
   concurrent workload. Identify whether the app process, API process and database
   connection are warm or cold separately. Agree conditions before a performance pass.
2. Sign in privately using the synthetic ACTIVE Student. Actually force-stop and reopen
   the app without clearing app data. Metro `r` reload and background/foreground are
   separate cases and cannot substitute for process death. Check for a login flash.
3. Measure entry to the visible restoring state against the two-second target. Record
   Expo host/bundle-loading time separately from application initialization and API
   confirmation; Android activity-start timing alone is not either measurement.
   Keep earlier failed/unmet launch results in the evidence instead of discarding them.
4. Measure the session lookup separately through response decoding. Report each sample
   and its API/database state, not a warm/cold label inferred from elapsed time. The
   recorded 2680 ms request is one unclassified sample; it does not prove startup or
   five-second login-request performance. Device clocks do not authorize the session.
5. For API-unavailable recovery, owner stops only API, leaves Metro running and reopens.
   Expect unknown identity and bounded retry guidance, then owner restarts API and
   activates Try again. Valid tokens restore Home without credentials. This exercises
   unavailable/restarted API recovery, not a measured hosted cold-start latency.
6. Leave the session idle 31 minutes without protected operations, then reopen/reload
   and record which was used. Expect one session-ended login notice; verify TalkBack.
   Sign in privately and verify the allowlisted Home return and cleared notice, without
   replaying a failed mutation. Exact idle/absolute boundaries remain real DB fixtures.
7. For concurrent native rejection, with a valid synthetic session, use the authorized
   native DevTools client to revoke only that current session and immediately send
   three session lookups concurrently. Do not extract or print the bearer. Record three
   401s, one stable login transition, notice announcement and no loop. The completed
   owner check returned `[401,401,401]`; repeat only when a change warrants it.

Record actual observations, screenshot/video timing where available, action/response
start points, and whether evidence is owner-confirmed or agent-observed. If Expo stays
on its loader, stop that timing run as failed/unmet and diagnose the environment. Do
not relabel eventual Home or development-cache recovery as a passing cold-launch target.

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
values leak and security guarantees have appropriate real database evidence. T031 has
real restricted-database evidence; T053 startup/timing and T059 deployment acceptance
remain open. Do not treat a historical count, eventual Home, or a Metro reload as proof
of a two-second actual cold launch.
