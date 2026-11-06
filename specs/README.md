# How specifications are organized in this project

Two layers, deliberately different in size:

## 1. `specifications.md` (repository root)

The **project baseline** — approved requirements, stack, security rules, repository
structure, and development rules. It covers the whole system and changes rarely. It is the
source of truth for "what this project is"; do not edit it without approval.

## 2. `specs/<NNN-feature>/` (this folder)

**One feature at a time**, in spec-kit's format:

| File | Answers | Written by |
| --- | --- | --- |
| `spec.md` | What the feature does and why, in user terms | `/speckit.specify` |
| `plan.md` | How it will be built: stack, structure, constraints | `/speckit.plan` |
| `research.md` | Decisions and alternatives for the open questions | `/speckit.plan` Phase 0 |
| `data-model.md` | Entities, fields, indexes | `/speckit.plan` Phase 1 |
| `contracts/` | API shapes the feature exposes | `/speckit.plan` Phase 1 |
| `quickstart.md` | How to run and verify it | `/speckit.plan` Phase 1 |
| `tasks.md` | Ordered, file-level tasks to execute | `/speckit.tasks` |
| `checklists/` | Quality gates for the spec | `/speckit.specify` |

**Rule of thumb:** if it applies to the whole project and will still be true next year, it
belongs in `specifications.md`. If it describes one shippable slice, it belongs in
`specs/<feature>/`. Feature specs must never contradict the baseline; a conflict means the
baseline needs an approved amendment first.

## Current features

| Number | Feature | Status |
| --- | --- | --- |
| 001 | `001-user-login` — customer sign-in and sign-out in the mobile app | Spec, plan, tasks drafted; implementation not started |

## Where the tooling fits

- `specs/` is committed and read by agents (kept small per feature).
- `.specify/feature.json` points the spec-kit scripts at the active feature.
- `docs/index.md` stays the one-page orientation; it should link the active feature.
