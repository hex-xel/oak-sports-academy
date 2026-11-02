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

Planning and research. The repository structure and documentation exist; **no
application code has been written**, so `graphify` has no code graph yet and there is
nothing to run. Client order: the **customer mobile app (Expo) comes first**, the
staff/admin web app comes later this semester, and the customer web app next semester.
The first feature, `specs/001-user-login/` (customer sign-in and sign-out on mobile), is
specified and planned with tasks drafted; implementation has not started. Update this
section whenever the status changes.

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
- Proceed to **Phase 3: Foundational Backend** (Prisma schema, database migration, Argon2id, session service, rate limiter, and security middleware, T016–T032).
- Milestone 1 supporting material in `docs/milestone-1/`.

_Last updated: 2026-11-02_
