# Tasks: Student Registration and Assessment

**Branch:** `feat/student-registration` | **Date:** 2026-11-06
**Inputs:** [spec](spec.md), [plan](plan.md), [research](research.md), [data model](data-model.md), [contract](contracts/registration.md), [validation](quickstart.md).
**Status:** planning draft. Tasks are not implementation results. No existing UI/auth
task is repeated just to recreate completed work. All-project deadline Nov 24; freeze
target Nov 22. Review business/design/architecture gates before affected implementation.

## Phase 1 — Decisions and reusable foundation

- [x] T001 Reconcile owner guardian direction with `specifications.md` §16 and record approved age/date, waiver version, ID/image rules, OTP/capability defaults, trial/timezone/capacity/deadline-display scope in `specs/002-student-registration/research.md`; update master only with explicit approval; keep destructive deletion excluded.
  Completed 2026-11-06: owner approved the complete ruleset; master §§4/7.1/15/16
  and feature spec/research/UI notes aligned. No code/schema/setup changes. Missing
  guardian-occupation validation and conflated OTP cooldown/expiry remain future code
  fixes. Enrollment countdown/deletion remains separately gated. Next: T002 designs.
- [x] T002 Inspect `docs/design/mobile/high-fidelity/registration.png` and sticker sheet before UI edits; prepare a compact Admin login/list/detail/trial design under `docs/design/web/` for owner review, preserving mandated menu order and honest unavailable modules; record approval/gaps in `specs/002-student-registration/checklists/ui-states.md`.
  Prepared 2026-11-06: mobile registration and web sticker sheet visually inspected;
  interactive five-screen Admin proposal and review notes added under `docs/design/web/`.
  Owner directed continuation after reviewing the proposal; design approved. Runtime acceptance remains T029.
- [x] T003 Review minimal package changes in `apps/mobile/package.json` and `apps/web/package.json` plus image-decoder choice in `apps/api/package.json`; owner performs required installs only; document Resend sender, private bucket, server-only secrets and synthetic Admin setup in `docs/development.md` without exposing credentials.
  T003 review prepared 2026-11-06: picker and Sharp selected; owner commands/provider/private-bucket/Admin setup gaps documented in docs/development.md. Owner confirmed successful installs: expo-image-picker ~58.0.10 and Sharp 0.35.5. Owner supplied audit: 19 findings (11 moderate, 6 high, 2 critical); targeted remediation remains open, no blanket fix. Owner created private bucket and saved Resend key, installed Resend skills. Restricted sender onboarding@resend.dev/account-owner recipient only; domain and real delivery acceptance remain pending. Web/Admin provisioning deferred to T019–T020.
- [x] T004 Extend `apps/api/prisma/schema.prisma` with registration/OTP/proof/profile/consent/document/trial/delivery records per data model; author reviewed forward SQL in `apps/api/prisma/migrations/`, least-privilege function-owner grants and Admin cross-row access, keeping existing ACTIVE session rules unchanged.
  Written 2026-11-07: eight Prisma models and additive 20261107090000_registration_foundation SQL; RLS, restricted Admin projection, constraints and indexes. Architecture notes in docs/architecture/registration.md. Owner Prisma validate passed and Graphify refreshed (1148 nodes, 2248 edges, 80 communities). No migration applied; SQL/RLS runtime validation remains T006. T004 complete.
- [x] T005 Implement narrow registration capability/context and preapproval audit boundary in `apps/api/src/modules/registration/capability.ts` and forward SQL; share audit lock/hash/insert validation without granting generic unauthenticated append or ordinary login identity.
  Written 2026-11-07: capability.ts and 20261107090100_registration_context SQL add separate proof checks, own-data RLS and fixed-target preapproval audit using existing hash/chain guard. Foundation adapter cases added to planned registration.api.test.ts. Owner confirmed API typecheck, focused registration/audit suites and graph refresh passed. T005 complete; no DB application or route wiring. Real RLS/rollback/concurrency checks remain T006.
- [x] T006 Extend guarded owned-record cleanup/preflight in `apps/api/tests/helpers/db.ts` and registration fixture support in `apps/api/tests/registration/helpers.ts`; owner applies/generates reviewed migrations only against explicitly selected environments, then one restricted-grant/RLS smoke check.

  Written 2026-11-07: shared fixture guards/owned cleanup extended for all registration records; marked-loopback migration preflight, pending-applicant helpers and seven restricted DB groups in submission.db.test.ts. Registration tests included in test typecheck. Owner confirmed local migration/generation, API/test typechecks and all three focused DB suites passed after explicit fixture string-ID typing fix. T006 complete; no Supabase application. Graph refresh for latest code edits remains owner-run.

## Phase 2 — US1: Credentials and real email verification

**Independent acceptance:** real six-digit email OTP verifies a pending account; no Student session issued.

- [x] T007 [US1] Define DTOs/schema/error codes and duplicate/lost-response behavior in `packages/shared/src/registration.ts`, `apps/api/src/modules/registration/registration.schemas.ts` and `specs/002-student-registration/contracts/registration.md`; never restore an existing account by email alone or overwrite its password.
  Written 2026-11-07: shared wire DTOs, strict bounded API schemas, safe registration error catalog and original-operation/mailbox retry contract; no email-only takeover or password overwrite. Contract/schema/error tests extended; capability rejection now REGISTRATION_EXPIRED. Owner confirmed all four typechecks/four focused suites passed with no errors and Graphify refreshed. T007 complete; no routes wired.
- [x] T008 [US1] Implement start/verification/resend service in `apps/api/src/modules/registration/registration.service.ts` and `otp.service.ts`: reuse Argon2id, keyed code digest, row-locked attempts/version/expiry, unique email, operation idempotency and registration-only proof.
  Written 2026-11-07: registration.service.ts/otp.service.ts and forward 20261107090200_registration_otp SQL implement closed start/recovery, account-bound HMAC, atomic attempts/single-use verify, resend rotation/cooldown/durable account issue quota and delivery metadata. Added durable no-account decoy state to close retry enumeration; start/resend uniformly delivery-unconfirmed. Restricted DB tests and fixture ownership/preflight extended. Owner confirmed schema validation, guarded local migration/client generation, all four typechecks/four focused suites and Graphify refresh passed without errors. T008 complete; T009 real sender and T010 HTTP quotas/routes not yet wired.
- [x] T009 [US1] Implement bounded Resend adapter in `apps/api/src/lib/email.ts`, safe delivery metadata and per-operation idempotency; OTP failure/restart uses explicit new-challenge resend, with no plaintext code queue/logs or false sent success.
  Written 2026-11-07: bounded fixed-endpoint Resend fetch adapter, plain-text OTP, challenge idempotency, 3s request/body deadline, 16KiB response cap and sanitized failures. Added independent private config parser/factory/check script; test-sender recipient allowlist rejects rather than reroutes mail. Adapter/config cases added to existing registration suite. Owner confirmed all requested checks passed without errors, including private configuration validation. T009 complete; no real email sent or routes mounted.
- [x] T010 [US1] Wire controllers/routes/quotas in `apps/api/src/modules/registration/registration.controller.ts`, `registration.routes.ts`, `apps/api/src/app.ts` and shared safe errors; retain global body/IP boundaries and isolate registration authorization from login session middleware.
  Written 2026-11-07: four real credential/progress routes/controllers, lazy configured service and explicit safe response projections; exact mobile/proof headers reject duplicates/Bearer mixing. Added independent shared issue-IP/start-email and verify-IP/proof quotas with Retry-After; global/login parser/proxy limits unchanged. HTTP cases added to registration suite. Owner confirmed all requested checks passed without errors. T010 complete; latest combined graph refresh included in T011 handoff. No uploads/finalize routes or Supabase migration yet.
- [x] T011 [US1] Connect `apps/mobile/lib/registration-api.ts`, `features/registration/RegistrationWizard.tsx` and `VerificationSheet.tsx` to server proof/expiry/cooldown; separate SecureStore key, clear password after acceptance, suppress stale replies, no auto-login or client-only verified success.
  Written 2026-11-07: independent mobile registration transport/response validation and separate secure recovery key; observable serialized/generation-guard lifecycle with server restore, original operation recovery, secure-write gating and password erasure. Wizard/modal connected to real operations, expiry/cooldown separated and preview final-submit disabled pending T017. Existing designs visually inspected; native keyboard/TalkBack evidence pending. Owner installed expo-crypto; validation resumed after explicit retryAfter narrowing and workspace-resolved Expo test mock fixes. Owner confirmed mobile suites passed without errors and Graphify refreshed; T011 complete. No live phone/Supabase migration yet; native/provider acceptance remains T012/T029.
- [x] T012 [US1] Add about eight behavioral groups to `apps/api/tests/registration/registration.api.test.ts` covering credential/OTP/proof races and provider failures using restricted DB/adapters; run this focused suite/typecheck and one real OTP receipt smoke check, not the full suite yet.

  T012 complete 2026-11-07: reused existing US1 groups; added real HTTP/restricted-DB
verification and competing same-email starts, plus development-target refusal cases.
Owner confirmed development project `ewycpsuzzfonoolvhyeu`; guarded read-only/explicit
  deployment checkpoint authored. Owner confirmed both API/typecheck projects and both
focused registration suites passed without errors. Owner then passed the read-only
development preflight (three pending migrations), applied all three with the guarded
helper, and passed registration table-security checks. Owner confirmed on the phone:
real email received, incorrect code rejected, and correct code reached Personal
Information. Native keyboard/TalkBack remains T029; final submission remains T017.
No migration or test was run by the agent.

## Phase 3 — US2: Complete private registration submission

**Independent acceptance:** complete profile, two validated private images and agreements create one New application; incomplete/repeated/foreign submissions cannot bypass validation.

- [ ] T013 [US2] Implement bounded image screening in `apps/api/src/modules/documents/image-validation.ts`: JPEG/PNG signature/MIME/extension, actual-byte bounds, safe complete decoding/dimension limits, checksum and random object names; no custom decoder or client URL fetch.
  T013 written 2026-11-07: production JPEG/PNG signature/MIME/extension/actual-byte
screening with bounded full Sharp decode, dimensions, checksum and random filename.
Added real-decoder table/geometry/snapshot tests and owner-run synthetic offline demo
(12 expected outcomes). Owner approved accurate bounded-memory complexity clarification;
master and indexed demo/architecture notes aligned. Tests/typechecks/demo not yet run;
T013 remains pending owner evidence. No upload route or storage integration claimed.

- [ ] T014 [US2] Implement private Storage adapter and staged attempt orchestration in `apps/api/src/modules/documents/storage.ts` and `registration-documents.service.ts`; verify registration ownership/current agreements, separate storage credential from restricted Prisma, compensate only owned orphan attempts and require Ready state.
- [ ] T015 [US2] Implement agreement recording, profile validation and atomic idempotent finalize in `apps/api/src/modules/registration/submission.service.ts`; compute age server-side using approved date rule, validate conditional guardian/all fields/two document associations, append scoped audit and keep account pending.
- [ ] T016 [US2] Wire consent/binary-upload/finalize/current-progress routes in `apps/api/src/modules/registration/registration.routes.ts` and controllers; binary-specific bounded parser must not weaken global JSON limits or accept arbitrary file slots/keys.
- [ ] T017 [US2] Connect local picker selections, ordered agreements→uploads→finalize progress and safe retry in `apps/mobile/features/registration/RegistrationWizard.tsx`, `steps/RequirementsStep.tsx`, `steps/TermsStep.tsx`, `RegistrationSuccess.tsx` and `types.ts`; preserve approved layout, remove preview copy only after real completion.
- [ ] T018 [US2] Add about seven table-driven document/submission/RLS/rollback/idempotency groups in `apps/api/tests/registration/submission.db.test.ts`; run the focused suite and mobile typecheck, using one real private-upload smoke check without native fault injection.

## Phase 4 — US3: Thin real Administrator demonstration path

**Independent acceptance:** Admin logs in, reviews application/private images, schedules and emails trial, approves/rejects with audit; only approved verified applicant can use existing Student login.

- [ ] T019 [US3] Review browser transport and implement Admin-only credential/session/logout endpoints in `apps/api/src/modules/auth/admin-auth.controller.ts`, `admin-auth.routes.ts` and service; reuse verification/session primitives without permitting Admin native login or returning browser bearer JSON.
- [ ] T020 [US3] Initialize the approved Next.js workspace through owner-run setup in `apps/web/package.json`; implement same-origin fixed-upstream proxy, HttpOnly cookie/CSRF-origin boundary, safe session guard and shared API helpers in `apps/web/src/app/api/` and `apps/web/src/lib/`; no localStorage token or new auth framework.
- [ ] T021 [US3] Implement bounded permission-protected list/detail/private-document lookup in `apps/api/src/modules/assessment/assessment.service.ts`, controller/routes and reviewed SQL access; current Admin mask alone must not bypass self-only user RLS.
- [ ] T022 [US3] Implement versioned trial scheduling/assessment transition in `apps/api/src/modules/assessment/assessment.service.ts`; validate dates/confirmation/state, atomically commit status/account/audit/delivery intent, allow approval only after scheduled assessment and never activate enrollment or deletion.
- [ ] T023 [US3] Implement trial/result send and explicit bounded retry in `apps/api/src/modules/assessment/notifications.service.ts` and routes using `apps/api/src/lib/email.ts`; record Sent/Failed/Pending truthfully and prevent duplicate decisions or stale notification resend.
- [ ] T024 [US3] Implement approved browser login/Home entry and shared left menu in `apps/web/src/app/login/page.tsx`, `src/app/(admin)/layout.tsx` and `src/app/(admin)/page.tsx`; preserve mandated order, no misleading links claiming unbuilt features work.
- [ ] T025 [US3] Implement registrations list/search/filter/detail with short-lived image viewing and trial/Approve/Reject confirmation screens in `apps/web/src/app/(admin)/registrations/` and `src/app/(admin)/free-trial/`; show safe loading/empty/error/forbidden/email-retry states and no deadline deletion claim.
- [ ] T026 [US3] Add about seven Admin/cookie/CSRF/permission/transition/audit/notification/idempotency groups in `apps/api/tests/registration/assessment.api.test.ts`; exercise approval→Student login and rejection denial, then focused checks and web typecheck.

## Phase 5 — Consolidated feature review and handoff

- [ ] T027 Verify required request/ownership/SQL/secret boundaries and JSDoc across `apps/api/src/modules/registration/`, `documents/`, `assessment/`, `apps/mobile/lib/registration-api.ts` and `apps/web/src/lib/`; resolve concrete findings without creating a second broad audit program.
- [ ] T028 Run one integration checkpoint from `specs/002-student-registration/quickstart.md`: four existing typechecks plus web typecheck and full existing+new regression; preserve auth baseline and stop on real failures. No full rerun after documentation-only edits.
- [ ] T029 Perform one owner-run phone→Admin browser→phone demo with actual email/private files, rejection/retry and keyboard/TalkBack/focus checks from `specs/002-student-registration/checklists/ui-states.md`; record only observed results and separate inherited T053/T059 issues.
- [ ] T030 Update `docs/architecture/registration.md`, `docs/development.md`, `docs/index.md` and feature evidence; run permitted graph refresh after code and store handoff in ICM. Keep README free of task logs and list follow-on whole-project features for Nov 14–20.

## Dependencies and delivery strategy

T001–T003 are short decision/design/setup gates, not repeated owner approvals per file.
T004→T005→T006 establishes the new restricted boundary. T007→T008→T009→T010→T011→T012
delivers US1. US2 depends on verified proof; T013/T014/T015 precede route/UI integration.
US3 browser access T019/T020 can be prepared once its reviewed auth contract is stable;
T021–T023 depend on schema/scoped access and T024/T025 on owner-approved Admin design.
Final integration/manual checkpoints happen once after complete vertical slices.

Potential parallel work by independent contributors: decoder vs email adapter; reviewed
Admin design vs OTP service; browser shell vs document screening. Do not spawn workers
or edit shared schema/routes/context concurrently merely because work is parallelizable.

**MVP:** US1 is the first usable increment, not the submission-ready demonstration.
The owner requires US2 and US3 too. This feature has 30 tasks: foundation 6, US1 6,
US2 6, US3 8, final review 4; three new focused suites, one full regression, one
integrated manual review. Test estimates are scenario groups, not enforced hard caps.

All-project schedule is in [plan.md](plan.md). If this slice slips beyond Nov 13,
review the remaining required project scope immediately; do not spend the remaining
days on optional polish or represent unimplemented modules as complete.
