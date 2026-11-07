# Registration validation guide

US1 credential/OTP transport, restricted database functions and native integration are
implemented through T012. Focused checks and real phone OTP receipt/verification passed;
profile submission and Admin assessment are not implemented yet. Setup commands are
in the [development guide](../../docs/development.md). Owner
runs installs, Resend sender/domain, private bucket and environment setup. No secrets
belong in artifacts, tools, screenshots or client public environment variables.

## T012 checkpoint

Reuse existing US1 groups rather than repeating the login regression:

| US1 behavior | Evidence source |
| --- | --- |
| Strict credential/authority/header boundaries and safe response projection | `registration.api.test.ts` |
| Pending hashed account, no login session, real HTTP/mailbox-proof integration | `submission.db.test.ts` |
| Duplicate/concurrent email, same-operation recovery, single-use verification | `submission.db.test.ts` |
| Wrong/expired codes, five failures, cooldown, stale proof/code and durable quota | `submission.db.test.ts` |
| Bounded provider failures, honest unconfirmed delivery, configuration | Both API registration suites |
| Independent native transport/storage, stale replies and safe recovery | `tests/mobile/registration.test.ts` |

The owner confirmed Supabase project `ewycpsuzzfonoolvhyeu` is development/testing.
The development checkpoint refuses other projects, privileged runtime connections,
transaction pooling and unexpected/failed migration history. Default mode is read-only;
`--apply` explicitly deploys the expected pending registration migrations. It never
resets, seeds or repairs history. Post-deployment table-security checks supplement
the disposable database RLS/race tests. See the development guide for owner commands.

After cloud deployment passes and the owner restarts the API, use only the private
Resend account mailbox allowed by `REGISTRATION_TEST_RECIPIENT`. Receive a real code,
check one invalid code is rejected, then verify to Personal Information. Keep codes
and passwords private; do not transmit profile/documents. Record actual receipt and
screen result; final submission remains disabled until T017. Native keyboard/TalkBack
review can be consolidated with T029. T012 stays open until focused checks and this
real-provider checkpoint pass.

Owner evidence 2026-11-07: both API typechecks and both focused registration suites
passed; development migrations/table-security checkpoint passed. Phone check passed:
email received, wrong code rejected, correct code reached Personal Information. T012
is complete. Keyboard/TalkBack and final submission are not covered by this result.

## Efficient validation cadence

1. After foundation/US1: relevant OTP/capability/restricted-DB suite, source/shared
   typecheck, one real email receipt smoke check once sender configuration works.
2. After US2: relevant documents/submission suite, mobile typecheck. No repeated full
   login matrix or field-by-field screenshots; do not retest unchanged login manually.
3. After US3: relevant Admin/assessment suite + browser typecheck; use one manual
   student → Admin → Student demonstration to cover integrated UI/provider behavior.
4. Feature exit: all relevant typechecks and the full existing+new API regression once.
   Repeat broad checks only for shared-boundary changes, regression or failed assertions.

No new E2E runner, load-test framework, obligatory red-phase approval or live-email test
per commit. A few high-value test files may contain multiple parameterized cases;
test count is a guide, not permission to omit an identified risk.

## Minimum automated scenario groups (target 20–24)

| Group | Required evidence |
| --- | --- |
| Registration/OTP (about 8) | pending hashed account/no session; forged authority; duplicate/concurrent email no overwrite; correct single-use proof; wrong/expired/replayed code; attempt/cooldown/resend limits; stale-code race; honest delivery failure/resume |
| Documents/finalize/RLS (about 7) | capability scope/expiry/cross-user denial; consent-before-upload; table-driven spoofed/truncated/oversize/SVG/undecodable images; private key/slot ownership; missing document/guardian/agreement rejection; rollback; duplicate/concurrent finalize once |
| Admin/browser/assessment (about 7) | cookie-only auth + CSRF/Student denial; bounded permitted list/detail; scoped signed documents; valid schedule plus email status; invalid/out-of-order transition; approve/reject/idempotency plus atomic audit; pending/rejected cannot log in, approved can |

Critical database constraints/RLS/races use the existing guarded disposable database.
Extend its owned-record cleanup for new registration fixtures; never reset Supabase.
Adapters cover Resend/Storage faults without depending on real delivery in every test.
Real providers and binary decoder get one integrated smoke/fixture check. Existing auth
suite is retained; inherited T053/T059 limits are not cleared by registration success.

## One consolidated owner demo

- Use synthetic adult + minor data only, private real test mailbox and configured
  sender. Do not fabricate OTP delivery or silently mark verified from UI input length.
- Receive OTP, exercise one invalid code/resend/expiry path, then verify successfully.
- Complete wizard with approved guardian policy and local document selection. Submit
  agreements, private uploads and profile; show safe network/provider retry and real receipt.
- Confirm pending applicant cannot sign in. Login as synthetic Admin privately; inspect
  application fields and private images; verify unauthorized browser access is denied.
- Set trial date/time, receive schedule email; record assessment with confirmation.
  Verify one approved and one rejected result, email status and explicit failed-mail retry.
- Approved applicant signs in with existing native flow; pending/rejected cannot. No
  enrollment/package activation or destructive deadline deletion is claimed.
- Check keyboard reachability, labels/errors/progress, large text and TalkBack once
  on integrated Android; keyboard navigation/focus and readable layout once in browser.

## Deadline reporting

Report changed behavior, focused result and next blocker in one update per vertical
slice. Record setup/provider/design gaps promptly; do not exchange repeated “ready”
messages for source-only work. Freeze whole-project features by Nov 22 if feasible,
rehearse Nov 23, submit Nov 24. All dates concern the entire project, not just registration.
