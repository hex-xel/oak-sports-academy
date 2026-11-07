# Registration UI integration review

Design review only; not passed acceptance. On 2026-11-06, visually inspected reduced
copies of the registration mockup and web sticker sheet after full-size decoding
failed. Existing six-step mobile design and sticker tokens are retained. The new
[Admin proposal](../../../docs/design/web/high-fidelity/registration-admin-proposal.html)
and [review notes](../../../docs/design/web/registration-admin-review.md) are ready for
owner review. No production UI has been changed. Owner approved continuation on 2026-11-06; design accepted. Runtime acceptance remains pending.

| Trigger | Visible response / recovery |
| --- | --- |
| Empty/focused/invalid fields | Existing persistent labels, approved focus/error styling, correction retains safe local data |
| Start/send pending | One request, busy state; no local-only verification or untruthful sent result |
| Invalid/expired/limited OTP | Safe announced error, server-driven expiry/cooldown, bounded resend |
| Network/provider failure | Explicit retry; no request replay, raw diagnostics or token display |
| Unverified start/resend acknowledgment | T008 real and decoy flows both report delivery unconfirmed; say to check email if registration can continue, offer resend after cooldown, never claim sent based only on 202 |
| Email edit/stale reply | Clear obsolete proof/challenge safely; old response cannot verify new address |
| Minor data | All conditional guardian fields including occupation; no extra login/authority verification; final agreements retained; approved under-18 Manila submission-date cutoff |
| Local image selection/cancel/invalid image | Safe local preview or correction; no public upload before final agreement |
| Final submit/progress/partial upload | Agreements recorded first, bounded upload/finalize progress, duplicate submit blocked, retry cannot attach foreign/failed document |
| Success/pending approval | Real receipt and instruction to await trial email; no automatic login or claim email already scheduled |
| Admin signed out/loading/forbidden | Cookie-backed guard, safe retry/login once, no protected-detail flash |
| Admin list/detail empty/error | Search/filter state, truthful no results, safe document-read failure |
| Admin trial/decision pending | Clear confirmation, disabled duplicate action, current timezone/status, version conflict recovery |
| Email pending/failed/sent | Honest delivery metadata and explicit retry; provider acceptance not guaranteed inbox delivery |

One integrated review: small Android/large text/keyboard/TalkBack; browser keyboard
focus and responsive readable forms. No snapshot test per field or repeated manual
review after unchanged backend-only edits. Record design conflicts before implementation.

## T011 implementation review — native results pending

Original credentials/OTP and sticker references visually inspected on 2026-11-07.
Existing layout/tokens are retained; additional notices/progress/recovery use existing
components. Source coverage: initial secure/server restore; start/verify/resend busy;
invalid/expired/limited code; independent cooldown; network uncertainty with explicit
progress lookup; secure write/delete retry; stale replies; accepted credential lock and
explicit local account switch. Password/OTP are not persisted, ordinary login unaffected.
Six-digit input alone cannot advance. Profile/files remain local; final submit is disabled
instead of reporting preview success before T017.

Owner device evidence remains pending: verify/resend/Cancel reachable with keyboard at
360 dp/large text; TalkBack announces errors/progress/expiry; no premature advance on
bad code or failed secure write; back/close/reopen retains only safe recovery context;
new challenge clears old code; one-hour expiry never grants access. Combine actual OTP
receipt/invalid code/resend with T012, then full integrated accessibility with T029.
No test result is inferred from existing login accessibility confirmations.
