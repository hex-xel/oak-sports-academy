---
status: reviewed-gaps-pending
owner: team
milestone: 1
---

# Login UI state review — T066, 2026-11-05

Visually inspected `docs/design/mobile/high-fidelity/login.png` and
`docs/design/mobile/sticker-sheet/sticker-sheet.png`. No UI code or image changed.
Preserve the official crest, Poppins hierarchy, green header/white form, navy/gold
sign-in action, input borders/radii and spacing from those references. Use semantic
error feedback with text/icons; do not replace branding or invent a competing layout.

## Design gaps and implementation gates

| Existing reference/scaffold | Required resolution | Task / approval boundary |
| --- | --- | --- |
| Remember Me checked in login mockups/scaffold | Feature spec excludes Remember Me; SecureStore persistence remains within idle/absolute limits | Propose removal of checkbox or approve a specified behavior before T042 UI change; do not silently add a session extension |
| Separate incorrect-email and incorrect-password feedback in mockups | Wrong password and unknown email need the same credential error; malformed email can still get local format guidance | T042 propose generic form-level copy using existing error styling; approve conflicting visual/copy revision before applying |
| Login scaffold rejects passwords under eight characters | Login accepts 1–128 unchanged; complexity is for creation/reset | T039 correct client rule; test whitespace/short input without exposing it |
| Forgot-password sheet uses six-digit OTP | Revised source requires expiring email reset link | Dependent recovery feature must revise the design before implementation; no OTP endpoint in login |
| Sticker sheet contains guardian/Staff menus, old enrollment fees and edit-profile actions | Student/Admin only; Students may directly edit owned personal/contact fields; use revised source menu/entitlement rules | Home/profile/enrollment dependencies; do not copy unrelated legacy content into login |

## T042-T043 implementation review (2026-11-05)

Re-inspected both reference images. Owner requested controls consistent with proper UI/UX.
Removed Remember Me because persistence is automatic and the spec defines no choice.
Generic form-level credential feedback says "Email or password is incorrect" using the
existing accessible error styling. These resolve the first two historical gates above;
source images remain historical and need designer synchronization. No OTP recovery added.

Real submission covers pending/disabled, immediate repeated-tap lock, safe account/network/
timeout/storage errors, explicit retry and Retry-After countdown. Email survives failure.
Removed minimum-width overflow within 360 dp padding. Real context guards the landing;
startup confirmation is bounded and offers storage/network retry without trusting token
presence. Landing uses the official crest and safe identity; full Home/menu and remote
logout remain separate. All owner device rows below remain pending: review repeated taps,
countdown, 360 dp with keyboard/large text/screen reader and native SecureStore behavior.

## T044 device evidence (completed 2026-11-06)

Environment: Android API 36.1 x86_64, Expo Go 58.0.5 / SDK 58.0.22, 1080 px width,
owner-set density 480 (360 dp) and font scale 1.3. Earlier default-density checks were
approximately 411 dp; do not confuse them with the later 360 dp owner review.

| Check | Evidence / result |
| --- | --- |
| Empty/default, focus, password masking and official branding | Agent observed disabled empty submit, labelled/focused fields, masked dummy password, crest and eye icon |
| Malformed input / correction | Agent observed inline malformed-email guidance and clearing on edit; no password complexity requirement at login |
| Keyboard reachability | Agent scrolled to submit with keyboard open; owner confirmed reachability at 360 dp / 1.3 text |
| Screen reader | Owner explicitly confirmed keyboard and TalkBack passed, including labels/error announcements; no agent audio measurement claimed |
| Recoverable network failure | Agent observed safe connection error, preserved email and usable explicit retry |
| Unknown account | Real API returned the generic form-level credential error; email remained available for correction |
| Rate limit | Controlled example.test attempts reached the real email quota; agent observed wait copy, Retry-After countdown and disabled submit; no automatic replay |
| Valid sign-in | Owner entered private seed credentials and confirmed success; agent observed authenticated ACTIVE Student landing at 360 dp / large text |
| Native persistence and confirmation | Agent force-closed/reopened Expo, then observed authenticated identity with server-returned displayName; saved token also survived emulator restart |
| Restore while unavailable / old session | Agent observed retry state while API was down and login after retry with yesterday's session; expiry interpretation is consistent with its age, not a measured deadline test |

T044 sign-in acceptance is complete. Later logout, request-associated/concurrent 401
invalidation, return-route handling, permission-denied navigation and full restore
acceptance remain owned by US2/US3. SecureStore failure branches and bounded timeout
have automated adapter/transport tests; no device fault injection is claimed. No
performance or full Home/navigation acceptance is implied.

One Expo native EventEmitter startup failure followed display changes; clean reopening
recovered and later login/restore passed. Android asset failures were resolved by opening
`exp://10.0.2.2:8081`; the owner set emulator API URL to `http://10.0.2.2:3000/api/v1`.
The Metro source-resolution fix was verified by a real successful Android bundle.

The tables below retain the broader lifecycle checklist; use the evidence above for
T044 status rather than interpreting historical pending notes as a new sign-in failure.

## T047 logout state review (2026-11-06; see completed T048 evidence below)

Visually re-inspected login.png and the sticker sheet before edits. The sheet defines
neutral logout; reused its existing gray/navy tokens in PrimaryButton. The landing
remains the existing placeholder, with its crest/spacing/layout preserved. Pending and
failed-cleanup states reuse SessionGate, official crest and existing typography/colors;
no competing full Home design or session extension is introduced.

| Trigger | Feedback / recovery | Verification |
| --- | --- | --- |
| Sign out / repeated taps | Hide protected identity immediately; show Signing out progress; coalesce remote request and cleanup | Lifecycle tests and native repeated-tap T048 review pass |
| Online 204 and successful delete | Login becomes usable only after secure cleanup | Ordering tests and native online/relaunch T048 checks pass |
| Offline, timeout or server failure | Delete locally in finally; login explains unconfirmed server sign-out, without raw errors | Remote-failure tests and native API-unavailable T048 check pass |
| Native secure deletion fails | Cleanup warning and Retry secure cleanup; no false logout success or protected/login entry | Failure and sign-in/restore-block tests pass; native fault injection not claimed |
| Retry cleanup | Pending feedback, one local delete, no repeated remote logout; preserve remote warning if needed | Coalescing and dual-failure adapter tests pass; native deletion fault not injected |
| Pending write or restore completes late | Old identity cannot reappear after logout | Race tests pass; full request-associated invalidation is later US3 work |

Owner T048 steps: with the existing API/Metro/emulator running, sign in using the private
synthetic seed password, tap Sign out repeatedly, confirm progress then login, and reopen
to confirm it stays signed out. Repeat with the API unavailable; confirm local logout
and unconfirmed-server copy, then reopen. Use only isolated API fixtures for replay and
second-device assertions; never extract a real bearer into shared logs/screenshots.
At 360 dp/large text/TalkBack, check neutral button focus/name, busy announcement, warning
and retry copy, readable wrapping and reachable actions. A cleanup failure must keep
showing the retry gate until deletion succeeds; do not certify native faults from mocks.

## T048 native sign-out evidence (completed 2026-11-06)

Android API 36.1 x86_64, Expo Go 58.0.5 / SDK 58.0.22, density 480 on 1080 px
(360 dp), font scale 1.3. Owner entered private synthetic seed credentials; agent
never extracted or logged credentials/tokens. Android-only screen captures avoided
disrupting other desktop apps and remain ignored local `output/t048` artifacts.

| Check | Observed result |
| --- | --- |
| Online Sign out / repeated taps | Neutral button was visible; protected content changed to crest/progress, then clean login |
| Online relaunch | After force-close and reopening the Expo experience, login remained visible |
| API-unavailable Sign out | Owner stopped API only; port 3000 had no listener. App showed progress then login with accurate unconfirmed-server warning |
| API-unavailable relaunch | With API still stopped, reopening reached clean login rather than restore/retry, confirming native token removal |
| Replay and second-session isolation | Real restricted-local-DB production HTTP tests passed immediate 401 replay and preserved other same-user/device and cross-account sessions; no second physical device claim |
| 360 dp / large text | Button/progress/login and wrapping warning observed at 360 dp / 1.3; login remains scrollable |
| TalkBack for new logout feedback | Owner subsequently performed the requested review and confirmed Sign out, progress and unconfirmed-server warning were all announced; API restarted |
| Native deletion fault | No device fault injection performed; deletion failure/retry/races are covered by adapter tests, not a native fault-injection claim |

Full regression passed 312 tests across 28 files, exit 0/no unhandled errors on
installed Node 24.22.1; API test typecheck passed. One initial idle-expiry fixture
used host Date.now while the server checks PostgreSQL time and unexpectedly returned
200. Both relevant test fixtures now use database-clock deadlines/relative intervals;
all assertions remain and production expiry code is unchanged. Owner restored API
after the unavailable-server check. T048 is complete with direct agent observations
and the subsequent explicit owner TalkBack confirmation. No agent audio measurement
or native secure-deletion fault injection is claimed.

## Applicable states and owner review

T039 implementation update (2026-11-05): re-inspected both approved reference images.
Kept branding/layout/tokens and existing focus/filled/password visibility treatment.
Local validation now normalizes email, accepts untrimmed 1–128 character login passwords,
rejects overlong fields before onSubmit, and uses existing inline error styling with
screen-reader announcements. Removed preview credential logs/echo. Pure parity tests pass;
no emulator/device review was performed. After integration, manually enter a malformed
email, empty/129-character password, then a short/space-containing password with a valid
email: invalid cases must not submit, corrected valid cases submit the password unchanged,
and errors must be announced and clear when edited. Confirm keyboard/small-screen layout
and official crest remain intact. Remember Me and generic credential-error visual gates
above remain for T042; T036 adds state logic only, without a new rendered screen.

All rows below are pending owner device acceptance after implementation. Reuse the
existing default/focus/filled/password visibility, error and disabled designs. Missing
states derive from approved tokens and follow conflict approval gates above.

| Trigger / state | Visible feedback and available action | Expected recovery / owning task |
| --- | --- | --- |
| Empty, focused, filled, hidden/visible password | Persistent labels, visible focus; toggle announces its state; submit readiness reflects validation | Edit either field; T039/T042 |
| Malformed email or empty/overlong password | Inline local guidance announced accessibly; no request | Correct field; retain safe email; T039 |
| Pressed/submitting; repeated tap | Existing pressed/disabled action, visible progress and busy announcement | Exactly one submission; restore action after failure; T042 |
| Correct password / approved ACTIVE Student | Brief progress, then authenticated `/` only after SecureStore succeeds | Same entry before/after enrollment; unpaid entitlements stay inactive; T040–T043 |
| Wrong password or unknown email | Same generic credential error, no account-disclosing field attribution | Retry without duplicated requests; T042 |
| Unverified, pending approval or suspended | Safe account restriction copy only after password check; no token saved | Return to usable login; do not fabricate approval/resend workflow; T040/T042 |
| Rate limit | Retry-After wait shown accessibly; attempts disabled for that interval | Retry once allowed, no automatic request replay; T042 |
| Offline, timeout or cold API | Safe network/retry guidance, no indefinite spinner | Keep safe email, explicit retry; never log credentials; T035/T042 |
| SecureStore write failure | Safe storage error; no authenticated navigation | Retry with visible action; no insecure storage fallback; T034/T042 |
| Cold restore / unknown identity | Restoring indicator; offline/retry state on network failure; no login flash | Server confirmation before protected data; no idle renewal; T050 |
| Idle/absolute expiry, revoked token or concurrent 401s | One session-ended explanation and login transition | Clear invalid token, validate internal return route after re-login; no mutation replay; T049–T053 |
| Permission denied | Safe denial, retain usable permitted navigation | No role escalation or forced login loop; T028/T051 |
| Logout online/offline or storage deletion failure | Clear progress/result; distinguish failed local cleanup | Remote revoke when online; explicit local failure if token cannot be removed; T047 |

For each owner review: use a supported 360 dp Android device/emulator, keyboard open,
large text and screen reader. Check focus/announcements, visible actions and recovery;
never rely only on color. Force-close/reopen for restoration and send concurrent rejected
requests for single invalidation. Use T031 isolated fixtures for expired/role states;
never alter shared database timestamps or paste real bearer tokens into screenshots/logs.

T052 review notes (2026-11-06): inspected approved login/sticker sheets. The missing
session-ended state reuses the login form's existing notice typography, spacing and
text color, with alert semantics and a polite live region. A confirmed restore or
authenticated-request 401 shows “Your session has ended. Please log in again to
continue.” Successful re-login or explicit sign-out clears it. Idle/absolute expiry
share this message because the API intentionally does not disclose rejection cause.
The login return destination accepts only `/`, the sole implemented protected route;
queries, arrays, unknown paths and external URLs are discarded. Current confirmed
ACTIVE Student identity is rechecked before redirect; API authorization remains
server-side. Native keyboard/large-text/TalkBack review of this new notice is pending
T053. Reproduce with an isolated expired session, re-login, and verify one notice,
one return to Home, no replay of the failed action, and no stale notice after logout.

Empty/no-results and refresh lists are not login states; cover them in Home/data features.
Web hover and browser-page states belong to the separate web slice. Link-based reset,
full Home navigation and real package activation cannot be accepted from this login
placeholder. T027 focused validation passed; T031 real DB checks remain pending.
