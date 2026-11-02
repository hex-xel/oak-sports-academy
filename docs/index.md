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
| `apps/api/` | Express API (empty scaffold) |
| `apps/mobile/` | Expo app (empty scaffold) |
| `apps/web/` | Next.js site and admin dashboard (empty scaffold) |
| `packages/shared/` | Shared TypeScript types and utilities |
| `prototype/schedule-selection/` | Scheduling algorithm prototype and benchmarks |
| `docs/` | This vault: architecture, decisions, milestone material |
| `docs/design/` | Design system: high-fidelity mockups, sticker sheets, official logo |
| `specs/` | Per-feature spec, plan, tasks — see `specs/001-user-login/` |
| `specifications.md` | Approved project requirements — the source of truth |
| `scripts/` | Development and validation scripts |

## Current status

Phase 3 of `specs/001-user-login/` is in progress. The mobile login UI is complete
and approved. T016 aligned the feature artifacts; T017 security tests are written but
cannot collect until their backend modules and T031 harness exist. T018 adds the Prisma
auth/audit schema; owner Prisma validation passed. T019 SQL migrations are written
and owner-applied; Prisma Client generation and T020 metadata review are complete.
Runtime security tests remain pending T031. Client order remains customer mobile first, staff/admin web later
this semester, and customer web next semester.

See [[architecture/auth-data|Authentication data layer]] for schema boundaries and
[the task list](../specs/001-user-login/tasks.md) for current implementation status.

## Read in this order

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

- **Phase 2 (Login UI, T008-UI–T015-UI)** is complete and approved against high-fidelity designs.
- **T020 complete.** Next is **T021 (validated environment configuration and runtime-role connection setup)**. Runtime security tests remain scheduled for T031.
- Milestone 1 supporting material in `docs/milestone-1/`.

_Last updated: 2026-11-02_
