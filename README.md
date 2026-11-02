# Oak Sports Academy Training Registration and Management System

Oak Sports Academy is a proposed web and Android application system for the
Oak Sports Academy Taguig Branch. It will centralize the registration and
training-management activities that are currently handled through Google Forms
and manual staff processes.

> **Project status:** Mobile login UI is complete; foundational authentication backend
> work is in progress. Security tests and the Prisma schema are written; database
> migration, backend implementation, and owner-run validation remain pending. See
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

These choices are the approved project baseline. Dependencies and application
code will be added only as development begins.

## Repository layout

```text
apps/                       Future client and API applications
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

## Development workflow

1. Review `requirements.md` and the applicable specification before making changes.
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

## T017 security-test checkpoint

Foundational tests are written in `apps/api/tests/security/`; the test-first module
interfaces and isolated database fixture requirements are documented in
[the security test guide](apps/api/tests/security/README.md).

Run these only after T019–T031 provide the implementation, reviewed development
migrations, and dedicated test database harness. The owner performs setup and execution.

1. Open PowerShell in `C:\Dev\School\oak-sports-academy`.
2. At T031, configure the ignored `apps/api/.env.test` using that task's documented
   runtime/fixture credentials and explicit disposable-database opt-in. Never point it
   at a shared, development, or production database. Apply reviewed migrations using
   T020's owner-run steps against the dedicated test database.
3. Run the security suites:
   ```powershell
   npm test -w apps/api -- tests/security
   ```
   Success means all four suites execute with no skipped cases, and all assertions
   pass under the runtime database role where required. Collection errors for missing
   modules before T031 are expected prerequisites, not a successful test result.
4. If any step fails, stop and share redacted output. Do not install new packages,
   weaken assertions, swap in privileged runtime credentials, or reset another database
   to make tests pass. Wait for fixes before continuing dependent work.

## T018 Prisma schema validation

The schema is in `apps/api/prisma/schema.prisma`. Its approved model is linked from
[the authentication data-layer note](docs/architecture/auth-data.md).

The owner runs validation with the already installed Prisma executable:

```powershell
cd C:\Dev\School\oak-sports-academy\apps\api
..\..\node_modules\.bin\prisma.cmd validate --schema prisma/schema.prisma
```

Expected: Prisma reports that `prisma/schema.prisma` is valid. This command does not
apply migrations or generate the client. It reads DATABASE_URL and DIRECT_URL from
the existing ignored `apps/api/.env`; never paste their values into chat. If either
variable is absent, provide the existing development connection settings privately
before retrying. If the executable is missing or validation fails, stop and share
redacted output; do not install/upgrade packages or apply migrations to work around it.
Wait for review before T019. Runtime role/grant changes are handled by T019/T021.
