# Oak Sports Academy Training Registration and Management System

Oak Sports Academy is a proposed web and Android application system for the
Oak Sports Academy Taguig Branch. It will centralize the registration and
training-management activities that are currently handled through Google Forms
and manual staff processes.

> **Project status:** Planning and research. The repository structure and this
> overview are in place; application features, architecture artifacts, and
> prototype benchmark code have not yet been implemented.

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
