# Registration planning decisions

2026-11-06; T001 rules explicitly approved by owner. Provider/design gates remain.

| Decision | Rationale / alternatives |
| --- | --- |
| Reuse six-step native UI and existing auth/security modules | Fastest complete slice; avoid rebuilding validated login infrastructure |
| Distinct registration capability, not ACTIVE session | Existing SQL/auth intentionally rejects pending applicants; relaxing it would bypass approval |
| No guardian login/extra authority verification | Owner confirmed; conditional guardian fields and final agreements remain |
| Personal details/files stay local until final submit | Preserves six-step ordering and avoids adding an early screen; credentials/email already create account data and require honest privacy wording |
| Admin web minimal slice included | Owner requires Administrator demonstration; apps/web is empty and web design refs absent |
| Native fetch for supported email/Storage APIs | Approved stack supports this; avoid SDKs without clear value |
| Three risk-focused suites, one final full regression/manual checkpoint | Owner deadline; retains authority/race/upload checks while removing test/process duplication |

## Owner-approved defaults — T001 complete

### Concrete T001 decision sheet — approved 2026-11-06

Owner answered “Approve the proposed rules” to the complete decision sheet after
inspection of the wizard/master requirements. Master §§4/7.1/15/16 now reflect this
approval. No code, schema, environment or dependency changes made.

| Item | Approved implementation rule |
| --- | --- |
| Minor classification | Under 18 on final submission date in Asia/Manila; compute from dateOfBirth server-side; exactly 18 is adult |
| Guardian behavior | Existing conditional name/relationship/occupation/contact fields; all required for minors as master §7.1 states; no separate login or extra authority verification (already owner-confirmed) |
| Agreement/storage order | Keep six steps and current three agreement checkboxes; profile and selected files stay local until final agreement acceptance; record agreement before upload. Credentials/email are already stored at step 2 and must be disclosed honestly |
| Agreement content | Use current TermsStep text/checklist as version registration-2026-11-06 for the demonstration, subject to academy content review; no claim of legal adequacy or extra authority attestation |
| Valid ID choices | Preserve current PhilID/ePhilID, passport, driver's license, school ID, other government ID choices; do not add new categories |
| Image screening | JPEG/PNG only, actual file 5 KiB–5 MiB, minimum 400×400 pixels, complete bounded decode; private bucket and generated filenames. Exact limits clarify the master examples before enforcement |
| Verification | Six-digit OTP, 10-minute expiry, five failed attempts/challenge, separate 60-second resend cooldown; old code invalid on resend; proposed per-email/IP issue quotas retained below |
| Registration authority | One-hour hash-only registration capability, never an ordinary login session; account-level quotas cannot reset with a new capability |
| Trial scheduling | Admin explicitly supplies date/time, positive duration and positive capacity for each trial in Asia/Manila; no invented fixed default, automatic age-band scheduling or rescheduling/no-show policy |
| Approval/deadline | Verified approval changes account to ACTIVE and records approvedAt; no enrollment/payment activation, automatic account deletion or unapproved deadline boundary. Precise enrollment countdown/deletion remains separately gated |

Code inspection: validateContactDetails currently omits guardian occupation from
required validation; align server and client with master §7.1. VerificationSheet uses
RESEND_SECONDS to infer expired state; replace with distinct server expiry/cooldown.
Neither issue requires rebuilding the approved registration layout.

OTP six digits (master); 10-minute validity; 60-second resend cooldown (UI convention,
not code expiry); five failures per challenge; five issues/resends per normalized email
and ten per IP per 15 minutes, with an additional per-capability verify quota. Use
atomic DB challenge counters/version and application-level IP quotas; process-memory
limiter limitations remain documented. HMAC-SHA-256 includes challenge/account/code
using a server-only verification key; plain SHA-256 of six digits is insufficient
against offline guessing. New registration capability: random 256-bit, hash-only,
one-hour absolute lifetime; no general session authority or automatic mutation replay.
Do not reset account-level quotas by issuing another capability.

Under-18 Manila final-submission cutoff, current ID list, image bounds and demonstration
waiver version are approved. No guardian login/extra authority verification; final
waiver/fitness/terms remain required. Disclose early account-data creation and keep
incomplete profile/files local until final agreement acceptance.

Trial timezone Asia/Manila is approved; store UTC timestamps and render clearly.
Admin supplies positive duration/capacity per trial; no fixed default/no-show rule.
Approval records its timestamp, but do not enable one-week deletion or promise
deadline display semantics until the existing master clarification is resolved.

## Provider and design gates

T011 implementation dependency review: Expo Crypto is needed for native secure UUID
generation (`Crypto.randomUUID`) instead of weak random operation IDs or a new UUID
library. Owner installs through `npx expo install expo-crypto`; module is included in
Expo Go. No agent install/setup is performed. See official
[Expo Crypto reference](https://docs.expo.dev/versions/latest/sdk/crypto/).

Resend sender/domain and test-recipient constraints must be owner-verified before claiming
real delivery. Use a per-operation provider idempotency key and safe Sent/Failed/Pending
metadata. Provider acceptance is not inbox delivery. No plaintext OTP durable job queue;
restart/failure uses bounded new-challenge resend. Scheduling/results can use persisted
versioned email jobs with explicit retry, not a new background-worker framework.

Supabase bucket private; server-only storage credential never enters Expo/Next public
env or Prisma datasource. Validate ownership and image before uploading; refuse public
URLs and arbitrary client keys. Standardize decoder/picker choice at dependency review.

Official references consulted (2026-11-06):
- [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email).
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

These sources inform integration mechanics, not the academy's consent/trial policy.
Admin high-fidelity and sticker-sheet directories currently contain only .gitkeep.
Produce a compact design from approved brand tokens for explicit owner review; do not
describe it as an existing approved Admin screen. Mobile registration image could not
be decoded by this session's visual tool; re-inspection before UI edits remains required.
