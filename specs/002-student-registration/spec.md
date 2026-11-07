# Feature Specification: Student Registration and Assessment

**Branch:** `feat/student-registration` | **Created:** 2026-11-06
**Status:** planning draft; business/design gates listed below, no implementation authorized by a checked task.
**Sources:** [master requirements](../../specifications.md) §§4–7.1, 7.7, 12–16; existing registration UI.

## Delivery boundary

Connect the completed six-step Android registration UI to real account creation,
email OTP, private document collection and final submission. Deliver a minimal real
Administrator web path to review registrations, email a trial schedule and record an
assessment decision. This is not the entire Administrator product or a replacement
for enrollment/payments/training features. All-project submission is November 24;
project-wide freeze target November 22, study/rehearsal November 23.

Existing UI is reusable, not proof of API/email/upload completion. Current admin web
is an empty scaffold, and web high-fidelity assets are absent. New admin UI requires
owner review of a small concrete design before implementation.

## Owner direction and unresolved gates

- Confirmed: no separate guardian login and no additional guardianship-authority
  verification step. Keep the conditional guardian fields and existing final waiver,
  fitness and terms checkboxes. Do not describe guardian details alone as legal consent.
- Master §16 aligned after explicit owner approval on 2026-11-06.
  Approved implementation: keep personal details/selected files on-device until final
  terms acceptance; record accepted policy version before server uploads. No early
  consent screen. Explicitly explain that the credentials/email step already creates
  account data; do not claim no personal data exists before final submission.
- Owner approved under-18 Manila final-submission cutoff, current ID choices/demo
  waiver, JPEG/PNG 5 KiB–5 MiB/400×400 minimum, OTP/capability defaults and Admin-entered
  positive trial duration/capacity in T001. See research for exact values.
- Exact enrollment countdown/deletion and other scheduling rules remain gated.
  Provider setup and Admin design approval are still required. No automatic deletion.
- Do not implement a conflict or irreversible behavior to meet the deadline.

## User stories

### US1 — Create credentials and verify email (P1)

Applicant submits student type, email and password through the existing wizard,
receives a six-digit OTP, verifies it, and continues without being logged in.

Acceptance: new account is STUDENT/PENDING_APPROVAL with Argon2id digest; unknown
fields cannot assign authority; safe duplicate behavior never overwrites existing
credentials; OTP is account/challenge-bound, protected at rest, expiring, limited,
single-use and invalidated on resend. Provider failures have explicit retry, not a
false sent/verified result. Verified pending applicants cannot use Student login.

### US2 — Submit complete profile, documents and agreements (P1)

Applicant completes personal/contact information, conditional guardian fields,
selects photo and valid ID, accepts all required agreements and submits once.

Acceptance: server revalidates fields/age/required documents/agreements; applicant
capability is separate from a login session and accesses only that application.
Selected files stay local until final consent submission. Images must pass bounded
signature/MIME/extension/size/full-decode checks and enter a private bucket under
server-generated keys. Finalize associates both validated documents and profile
atomically and idempotently; missing/failed upload is not success. Account remains
PENDING_APPROVAL. Confirmation tells applicant to check email for the future trial
schedule; it does not claim a schedule was sent before an Admin assigns it.

### US3 — Administrator reviews and decides assessment (P1 for demonstration)

Verified ACTIVE Administrator signs in through browser-only cookie transport, reviews
New registrations, opens ordered details/private documents, sets and emails a trial
date/time, and records Approve/Reject after assessment with confirmation.

Acceptance: Student/anonymous access is denied; search/filter and lists are bounded;
private documents use short-lived authorized links; all important mutations and audit
events commit together; schedule/result email status is visible and retryable. Repeat
clicks/requests cannot duplicate decisions or reapply approval. Only approved verified
accounts become ACTIVE; rejected/pending accounts cannot log in. Registration status
is New/Free Trial Scheduled/Approved/Rejected/Enrolled (last reserved for enrollment).
Waiting for result is a trial-list category, not an invented registration state.

## Requirements

- R001: reuse approved native UI, branding and shared login infrastructure; replace
  preview callbacks/filenames only when real server operations succeed.
- R002: no session bypass for pending applicants. Never relax `withSession`/existing
  ACTIVE eligibility or reuse a browser/native login token for applicant registration.
- R003: secure random OTP and applicant capability; database stores protected values,
  not plaintext codes/passwords/bearers. No sensitive logs, URLs or client-visible secrets.
- R004: code verification/resend, email duplicate races, submission and Admin decisions
  are guarded atomically. No credential replacement or cross-applicant resume by email.
- R005: per-IP/email/capability quotas, bounded request bodies and safe error codes;
  distinguish retry feedback from enumeration or raw provider/database diagnostics.
- R006: all new records have explicit least-privilege grants/RLS; bootstrap functions
  are narrow, parameterized and fixed-search-path. Migration credentials stay out of API.
- R007: private Storage privileges are isolated to a server-only storage adapter. A
  Supabase service credential is not a replacement for restricted database identity.
- R008: agreement acceptance/version precedes uploads in the submission sequence;
  preserve guardian/profile ownership and approved field policy. Cleanup is limited
  to owned unreferenced temporary upload attempts, not accounts/audit records.
- R009: browser receives HttpOnly session cookie, never a JSON/localStorage bearer;
  same-origin proxy and CSRF/origin checks protect mutating Admin actions.
- R010: no plaintext OTP durable queue. OTP delivery failure/restart recovers through
  bounded new-challenge resend; delayed old email/code cannot regain authority.
- R011: trial/result delivery states Sent/Failed/Pending are distinct from business
  decision state; record provider identifiers/idempotency and provide explicit retry.
- R012: deadline deletion, enrollment/payment activation, full admin menus/features,
  guardian accounts, password recovery and configurable scheduling engine are outside
  this slice. Dependencies must remain visible in the project delivery plan.

## Deadline-aware validation

Use approximately 20–24 high-value behavioral scenarios grouped in three new suites,
not separate unit tests mirroring every function. Parameterized cases may increase
assertion/test count. Retain all existing auth tests. New SQL/RLS and atomicity cases
must use the guarded restricted local database; email/storage provider failures may
use adapters. No live-provider test per commit, no new mobile runner/Playwright stack.
Run focused tests for changed boundaries, four typechecks at integration, and one full
regression at feature exit (repeat on a real regression/shared-boundary change).
One consolidated student phone + Admin browser + real-email/private-upload review.
Deadline pressure reduces duplication and optional polish, not authority/consent gates.

## Success and release limits

Demonstrate real OTP receipt, complete registration, Admin scheduling email and
assessment approval, then Student login; also one rejection and safe retry. Report
provider restrictions and failures honestly. Measure request targets under agreed
conditions; inherited T053/T059 failures remain open, not silently waived.
