# Implementation Plan: Student Registration and Assessment

**Branch:** `feat/student-registration` | **Date:** 2026-11-06 | **Spec:** [spec.md](spec.md)
**Status:** T001 rules approved/aligned on 2026-11-06; T002 Admin design approved; T003 owner setup pending.

## Summary

Reuse native six-step UI, Argon2id, safe Express errors, quotas, opaque sessions,
transaction-scoped RLS and guarded DB fixtures. Build credentials/OTP first, then
consent-gated final submission/private uploads, then a minimal Administrator browser
workflow. Do not rebuild login or weaken approved-account access. apps/web contains
only .gitkeep: browser foundation is real work, not an already available dependency.

## Technical context

- TypeScript; existing Node/Express/Zod/Prisma/PostgreSQL/Supabase; Expo Android.
- Approved web stack: Next.js/React/TypeScript/Tailwind. Owner initializes dependencies
  only after the reviewed package/design plan; no silent framework/package install.
- Resend HTTP API via server fetch; private Supabase Storage HTTP adapter. No new
  email/storage SDK required merely for convenience.
- Proposed necessary dependencies: Expo image picker and maintained bounded image
  decoder (e.g. sharp), subject to compatibility/security check before owner install.
  Do not write a new image decoder; do not trust signatures/dimensions alone.
- Tests: existing Vitest/Supertest + real restricted local DB, deterministic adapters,
  one manual phone/browser/provider checkpoint. No new testing framework.
- Scope: STUDENT applicants and ADMIN reviewer; no new guardian role/login.
- Performance: inherited 5-second registration/schedule request and 3-second page
  targets under agreed workload; distinguish external delivery latency. No unmeasured SLA.

## Existing infrastructure and gaps

`apps/mobile/features/registration/RegistrationWizard.tsx`, `VerificationSheet.tsx`,
`steps/*`, `types.ts` and `validation.ts` are local previews. They currently accept a
local emailVerified flag, mock 60-second OTP validity and placeholder upload names.
Separate resend cooldown from server expiry; submitting must await real finalize.

`withSession` requires verified ACTIVE identity; pending applicants cannot use it.
Add narrowly scoped registration authorization with a distinct 256-bit capability,
hash-only storage and short server expiry. It can verify/resend/stage/finalize only its
bound application, never grant Student/Admin sessions. Registration calls bypass
the login client's global 401 handler and do not overwrite native session storage.

Database bootstrap/grants and preapproval audit require explicit review: existing
`appendAudit`/`oak_audit_head` assume ACTIVE context. Do not grant broad audit insert or
pretend a pending applicant is ACTIVE to reuse them. Implement a narrow registration
audit append path sharing the same advisory-lock/hash/trigger protocol and a minimal
function-owner policy; keep Admin mutation auditing on the existing protected path.

## Constitution / instruction check

The constitution file is still a placeholder, not an adopted mandatory TDD policy.
Apply AGENTS.md and master requirements. User authorized plan/tasks creation and fewer
redundant tests, not weakened security or bypassed setup ownership. No setup-plan or
setup-tasks script run because they are owner-run setup under AGENTS.md. Artifacts are
authored directly; no extension hooks file exists. No existing specification or applied
migration is rewritten. Required master §16 alignment must be approved in T001.

## Boundaries and structure

```text
apps/api/src/modules/registration/  schemas, service, capability, OTP, routes, controller
apps/api/src/modules/documents/     bounded image validation + private storage orchestration
apps/api/src/modules/assessment/    Admin list/detail/schedule/decision service/routes
apps/api/src/modules/auth/          reuse credential verify; separate browser Admin issuance
apps/api/src/lib/email.ts           Resend delivery adapter, safe metadata only
apps/api/prisma/                    forward schema/migrations, minimal grants/RLS
apps/api/tests/registration/        three focused suites + guarded fixture extension
apps/mobile/features/registration/ existing UI integration, no visual redesign
apps/mobile/lib/registration-api.ts separate capability transport, bounded explicit requests
apps/web/                          minimal Admin login/shell/registrations/trials, Next.js
packages/shared/src/               registration schemas/types/errors as needed
specs/002-student-registration/     this plan, spec, research, data model, contract, tasks, guide
```

Server pipeline: credentials → OTP → verified applicant capability → local profile /
selected documents → final agreements recorded → validated private uploads → atomic
finalize/New → Admin schedule → assessment decision → approved account may log in.
Do not persist incomplete personal profiles automatically to speed implementation.
Server/Storage are not one transaction: use attempt IDs, pending/ready document state,
owned compensation and retryable finalize. Never claim an upload or email rolled back
with a DB transaction; never delete another applicant's data on cleanup failure.

Admin browser transport: same-origin Next.js BFF, server-held/HttpOnly cookie, strict
origin/CSRF checks and no bearer exposure to browser JS. Express retains restricted
runtime connections and current permission masks. Define any Admin cross-row read
policy in a reviewed forward migration; existing self-only user RLS will not list
applicants just because a request's role mask is ADMIN.

## Test budget and cadence

Three suites: registration/OTP/capability; document/submission/RLS; Admin/access/
assessment/audit. Aim 20–24 scenario groups with tables for malformed/expired/forged
inputs. Important races get real DB checks; adapters cover provider faults. Reuse the
344-test baseline; full regression once at final integration, not after every task.
Focused relevant checks after each backend slice; manual review once integrated.
No compulsory “confirm expected red failures” messages or screenshots per field.
Owner performs installs/configuration/provider setup; tests follow explicit session
authorization. Stop only for a real blocker, specification conflict or failed boundary.

## Project-wide deadline path (targets, not guarantees)

| Target | Deliverable |
| --- | --- |
| Nov 7–8 | Decisions/provider setup and US1 real OTP/account foundation |
| Nov 9–10 | US2 private documents and complete registration |
| Nov 11–13 | US3 thin Admin login/review/trial/decision; complete this feature |
| Nov 14–20 | Separate required enrollment/payment, package/training, schedule/attendance features and notification integration |
| Nov 21 | Whole-project integration/security/device review and corrections |
| Nov 22 | Whole-project feature freeze target |
| Nov 23 | Rehearsal, study, documentation/export and backup |
| Nov 24 | Entire-project submission |

This is a tight critical path, not a promise the remaining project fits. Escalate missing
Resend sender/bucket, absent Admin design approval, unresolved lifecycle settings or
blocked demo flow immediately. Daily vertical slices beat polished incomplete forms.
Optional analytics, redesign, extra frameworks and broad test duplication are excluded;
required behaviors are not silently dropped. Nov 14+ feature specs/tasks remain separate.
No implementation is claimed by this planning approval.
