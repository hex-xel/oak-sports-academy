# Oak Sports Academy Training Registration and Management System

Oak Sports Academy is a proposed web and Android application system for the
Oak Sports Academy, McKinley Taguig. It will centralize the registration and
training-management activities that are currently handled through Google Forms
and manual staff processes.

> **Project status (2026-11-06):** Native Student login, secure session recovery and
> sign-out are implemented. Latest local validation: 344 tests in 29 files and all four
> typechecks pass. Startup timing and deployment/final acceptance remain open;
> no deployed API host has been identified. See
> [the project index](docs/index.md) and [login tasks](specs/001-user-login/tasks.md).

## Project goals

The planned system will support:

- Account registration, email verification, and role-based access.
- Participant profiles and parent/guardian management for minor participants.
- Free-trial registration, capacity tracking, and regular training enrollment.
- Training programs, packages, rates, schedules, and enrollment-status
  management.
- Document collection and verification workflows.
- Payment-status monitoring.
- Administrative management of academy information, schedules, announcements,
  events, and related content.

The proposed users are participants, parents/guardians, academy staff, and
administrators. A public website will provide approved academy information to
visitors.

## Planned technology stack

| Area | Planned technology |
| --- | --- |
| Mobile app | React Native, Expo, TypeScript |
| Website and admin dashboard | Next.js, React, TypeScript, Tailwind CSS |
| API | Node.js, Express.js, TypeScript, REST |
| Database | PostgreSQL on Supabase, accessed through Prisma |
| File storage | Private Supabase Storage buckets |
| Testing | Vitest, Supertest, and, if time permits, Playwright |

These choices are the approved project baseline. The API/mobile authentication slice
is implemented; the remaining product features follow their own specifications.

## Repository layout

```text
apps/                       Client and API applications
  api/                      Express API
  mobile/                   React Native and Expo app
  web/                      Next.js public website and admin dashboard
docs/                       Project documentation and design artifacts
  architecture/             Diagrams and architecture records
  decisions/                Architecture decision records
  milestone-1/              PBL Milestone 1 supporting materials
packages/
  shared/                   Shared TypeScript types and utilities
prototype/
  schedule-selection/       Future algorithm prototype and benchmark assets
    benchmarks/
    fixtures/
scripts/                    Development and validation scripts
specs/                      Approved project requirements
```

Folders marked as future are intentionally empty scaffolds. They do not imply
that the corresponding feature, design, or benchmark has been completed.

## Implemented authentication modules

| Module | Purpose and usage |
| --- | --- |
| [API auth](apps/api/src/modules/auth/auth.routes.ts) | Native POST `/api/v1/auth/login`, GET `/api/v1/auth/session`, POST `/api/v1/auth/logout`; validate/project requests and responses before service calls |
| [Protected transactions](apps/api/src/middleware/require-auth.ts) | Configure server permission bits, ownership and activity classification; use only the supplied scoped transaction inside protected work |
| [Session database context](apps/api/src/lib/prisma.ts) | Restricted runtime Prisma client and verified transaction-local identity; migration credentials never enter request processing |
| [Audit service](apps/api/src/modules/audit/audit.service.ts) | Append safe server events atomically with authorized mutations; verify complete link-ordered chain snapshots |
| [Mobile transport](apps/mobile/lib/api.ts) | Explicit bounded requests, header bearer, no mutation replay and provider-owned 401 handling |
| [Mobile lifecycle](apps/mobile/lib/auth-context.tsx) | Secure write before sign-in, unknown-identity restore/retry, generation-safe invalidation and remote logout with local cleanup |
| [Secure storage](apps/mobile/lib/token-store.ts) | Token-only Expo SecureStore adapters; propagate safe failures without insecure fallback |
| [Shared contracts](packages/shared/src/index.ts) | Safe auth DTOs, error codes and centralized role permissions |

Login requires verified ACTIVE Student credentials and the exact native transport
header. Session/logout use one Bearer header; browser cookie authentication is not
implemented. The native header is not an identity credential. See the
[architecture guide](docs/architecture/auth.md), [ADR-0001](docs/decisions/ADR-0001-opaque-sessions.md),
[scoped security review](docs/architecture/auth-security-review.md) and
[deferred WebView design](docs/architecture/webview-strategy.md).

Use the [development guide](docs/development.md) for commands. Review scenarios are in the
[acceptance guide](specs/001-user-login/quickstart.md); task progress and historical
evidence belong in the [task list](specs/001-user-login/tasks.md) and
[checkpoint archive](docs/architecture/auth-checkpoint-history.md).

## Development workflow

1. Review `specifications.md` and the applicable feature specification before making changes.
2. Create focused work on a feature branch; do not push unreviewed work
   directly to `main`.
3. Keep credentials and real client data out of the repository.
4. Add relevant tests as features are implemented and report the checks run.

## Initial team roles

- Nathaniel Babalcon — Project Manager, Tester, and Quality Assurance
- Rommel Villanueva — UI/UX Lead Designer and Programmer
- Hexel John Ventura — Lead Programmer
- Jurie Aplaca — UI/UX Designer and Researcher
- Aaron Abiera — Business Analyst and Researcher

## Related project material

- `oak-sports.md` — approved technical baseline, repository guidance, and
  development rules.
- `specs/requirements.md` — requirements specification placeholder; changes
  require approval.
