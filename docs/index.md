---
title: Oak Sports Academy — project index
status: active
owner: team
milestone: 1
---

# Start here

One-page orientation for humans and AI agents. Read this before opening source files
or the full specification — it is deliberately short.

## What this is

A web and Android training registration and management system for the Oak Sports
Academy Taguig branch. It replaces Google Forms plus manual staff processes with
account registration, participant and guardian profiles, trial and regular enrollment,
capacity tracking, document verification, payment-status monitoring, and admin content
management. Users: participants, parents/guardians, staff, administrators, and public
site visitors.

## Approved stack

| Area | Technology |
| --- | --- |
| Mobile | React Native, Expo, TypeScript |
| Web + admin | Next.js, React, TypeScript, Tailwind CSS |
| API | Node.js, Express.js, TypeScript, REST |
| Database | PostgreSQL on Supabase, via Prisma |
| Storage | Private Supabase Storage buckets |
| Testing | Vitest, Supertest, Playwright if time allows |

## Repository map

| Path | Contents |
| --- | --- |
| `apps/api/` | Express native auth/session/logout API, permission/RLS/audit infrastructure and guarded test harness |
| `apps/mobile/` | Expo native login, secure session recovery and sign-out; full Home is separate |
| `apps/web/` | Next.js site and admin dashboard (empty scaffold) |
| `packages/shared/` | Shared TypeScript types and utilities |
| `prototype/schedule-selection/` | Scheduling algorithm prototype and benchmarks |
| `docs/` | This vault: architecture, decisions, milestone material |
| `docs/design/` | Design system: high-fidelity mockups, sticker sheets, official logo |
| `specs/` | Per-feature spec, plan, tasks — see `specs/001-user-login/` |
| `specifications.md` | Approved project requirements — the source of truth |
| `scripts/` | Development and validation scripts |

## Current status

[Registration data boundary](architecture/registration.md) records registration
credentials/OTP through T012: owner checks and real phone verification passed, with
development migrations applied. T013 image screening is written with validation
pending; its [algorithm demo guide](milestone-1/algorithm-implementation-demo.md)
provides the professor walkthrough and GitHub source links.

[Registration Admin design proposal](design/web/high-fidelity/registration-admin-proposal.html)
and [review notes](design/web/registration-admin-review.md) are ready for owner review
(T002). This is a synthetic local preview, not an implemented Administrator app.

**Current branch:** `feat/student-registration`. The new
[registration and assessment plan](../specs/002-student-registration/plan.md) and
[30-task implementation list](../specs/002-student-registration/tasks.md) are drafted.
They reuse the native registration UI, include a thin Administrator demo path, and
use focused risk-based checks plus one final regression/manual checkpoint. Whole-
project freeze target is November 22, rehearsal November 23, submission November 24.
Business/design gates remain explicit before affected implementation. Profile/upload
submission and the production Administrator flow remain in development.

As of 2026-11-06, native Student login, server-confirmed startup restoration, current-
session logout and concurrent-401 recovery are implemented. The API enforces current
eligibility, centralized permissions/ownership and transaction-local RLS; audit writes
use serialized hash chaining. T031's restricted disposable database harness is complete.

The latest T059 local rerun passed **344 tests in 29 files** and all four typechecks
on installed Node 24.22.1. T058's scoped security review fixed automatic-invalidation
cleanup gating. Owner confirmed native login/logout, expiry, recovery and TalkBack
checks. Native storage-failure coverage is adapter-based, not device fault injection.

**Open acceptance:** T053's fresh-API phone run showed restoring in 3 seconds against
a 2-second target; owner deferred that timing failure. T059 remains incomplete: local
Argon2 verification is about 19 ms median, but no API deployment host has been identified
for password/full-login performance. Supabase setup alone is not API deployment.

**Graph checkpoint:** T061 completed, code graph refreshed and queried successfully.
**Next up:** Resolve deferred startup timing and complete
deployment-host/final acceptance when the owner authorizes the required environment.
Full Home/navigation, working registration, password recovery, Student web and WebView
handoff remain separate feature work; no unpaid entitlement activation is implied.

See [the task list](../specs/001-user-login/tasks.md) and
[acceptance guide](../specs/001-user-login/quickstart.md) for evidence and boundaries.

## Read in this order

Authentication decisions: [[decisions/ADR-0001-opaque-sessions|ADR-0001 — Opaque
sessions, RLS and audit integrity]].

Future content reuse: [[architecture/webview-strategy|Deferred WebView handoff]];
native authentication remains the implemented flow.

Review evidence: [[architecture/auth-security-review|T058 authentication security review]].

Earlier implementation logs: [[architecture/auth-checkpoint-history|Authentication checkpoint archive]].
Routine commands: [[development|Development guide]]. Task history stays outside README.

The current authentication flow is documented in [[architecture/auth|Native Student
authentication]], with implementation evidence in [[architecture/auth-data]].

1. This file.
2. `specifications.md` — approved requirements. Section 7 lists release features,
   section 13 gives implementation priorities, section 14 lists final development rules.
3. `docs/decisions/` — architecture decision records (ADR-0001 onward).
4. `docs/architecture/` — system notes, including [[algorithms-and-security]] (Algorithms: CC-WIS, FSM Churn Tracker, Magic Byte Upload Screening; Information Assurance CIA Triad).
5. `README.md` — project overview and team roles.

## For AI agents

- Start with `icm.exe recall "<task>"` and treat returned memories as prior decisions.
- Do not run installs, environment setup, or test suites; give the owner the commands
  instead (see `AGENTS.md`, Execution Boundary).
- Once `graphify-out/graph.json` exists, run `graphify query "<question>"` before your
  first grep or file read, and use `graphify path` / `graphify explain` for structure.
- Do not modify `specifications.md` without explicit approval.
- If a spec-kit `tasks.md` exists for the current feature, work from it in order.
- For all UI implementations (mobile or web), always inspect and strictly match the high-fidelity mockups and sticker sheets in `docs/design/`.
- Store durable decisions back to ICM with `icm.exe store -t decisions-oak-sports-academy`.

## Next up

- **T033 complete:** shared auth wire types/error codes and API alignment; shared/API/test
  typechecks and all 199 tests across 17 files passed. Next: T034 SecureStore token helper.

- **T032 complete:** owner development seed succeeded (4 created, 0 already present).
  Source/test typechecks and 189 tests passed. Next: T033 shared auth types/error codes.

- **T032 written:** four safe synthetic development seed accounts; typechecks and seven
  isolated seed tests passed under the owner's task-specific test authorization. Owner
  Supabase seed execution remains pending README T032. Automated DB tests stay local.

- **T031 complete:** owner source/test typechecks and all 182 tests across 15 files
  passed, including isolated real database RLS/audit/session checks. Next: T032 seed.
  Deployment acceptance and the deferred security audit are separate checkpoints.

- **T030 complete; T031 in progress.** Owner typecheck/35 tests/startup/health passed.
  Graphify refresh succeeded (1100 nodes). T031 local disposable Docker database harness
  is written; owner setup/typechecks/full tests await README T031. Shared Supabase is excluded.

- **T030 written:** app/server boundary and six focused tests await owner validation
  under README T030. T067 self-profile policy validation passed. Security audit is
  deferred by owner after Windows validator platform failures; it has no completion claim.

- **T029 owner checks passed.** Owner override now allows direct Student personal/contact
  self-editing. A new forward profile migration and revised checks await owner validation;
  prior T065 restriction is superseded. T030 follows this policy checkpoint.

- **T029 written:** scoped authentication/ownership wrapper and denial-audit boundary
  await owner typechecks and focused HTTP tests under README T029. T030/T041 endpoint
  wiring and T031 real DB guarantees remain pending.

- **T028 complete:** owner shared/API typechecks and 62 focused tests passed. Next:
  T029 authentication and ownership middleware; real database validation remains T031.

- **T028 written:** shared two-role permissions and awaited denial gate await owner
  typechecks/focused tests under README T028. Ownership/auth and real audit wiring
  remain T029/T030; database persistence checks remain T031.

- **T065 and T066 complete.** Owner validated profile migration, typecheck, 39 tests
  and three scripts. Downstream tasks/manual checks are reconciled; next is T028.
  [Login UI state review](../specs/001-user-login/checklists/ui-states.md) records
  visually reviewed states and unresolved design conflicts before affected UI edits.
  T031 positive database guarantees and device acceptance remain pending.

- **T065 written:** profile grant/policy removal and revised RLS/rollback fixtures await
  owner migration and checks under README T065. T031 scoped DB tests remain pending.

- **T064 complete:** owner migration/generation/typecheck, 24 focused tests and all
  three scripts passed. Next: T065, removing Student self-profile update privileges.
  Positive database expiry/concurrency checks remain pending T031.

- **T063 complete; T064 written.** Owner validated both role migrations and confirmed
  only STUDENT/ADMIN. Idle-expiry migration and focused checks now await owner execution
  under README T064; real positive/concurrent database validation remains T031.

- Approved revised login decisions and pending corrections are tracked in
  [[architecture/login-requirements-alignment|Login requirements alignment]] and
  T062–T066. T027 validation passed; T062 amendments are approved and applied. Next: T063.

- **Phase 2 (Login UI, T008-UI–T015-UI)** is complete and approved against high-fidelity designs.
- **T027 and T062 complete.** Owner typecheck and all 15 focused audit tests passed; revised feature/master alignment is approved and applied. T063 Student role migration is next. Full database security tests remain pending T031.
- **T063 implementation written:** forward role migration and runtime role checks await
  owner inventory, deploy, Prisma generation and focused validation; see README T063.
  Original rename validation passed; zero-STAFF inventory permits a follow-up migration
  removing the unused enum value. That cleanup awaits owner validation before T064.
- Milestone 1 supporting material in `docs/milestone-1/`.

_Last updated: 2026-11-02_
