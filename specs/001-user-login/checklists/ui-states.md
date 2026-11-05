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

Empty/no-results and refresh lists are not login states; cover them in Home/data features.
Web hover and browser-page states belong to the separate web slice. Link-based reset,
full Home navigation and real package activation cannot be accepted from this login
placeholder. T027 focused validation passed; T031 real DB checks remain pending.
