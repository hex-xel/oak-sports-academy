# Graph Report - oak-sports-academy  (2026-11-02)

## Corpus Check
- 121 files · ~49,510 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: (none) 13, .example 2, .toml 1)

## Summary
- 755 nodes · 771 edges · 104 communities (37 shown, 67 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6082a8d3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- OAK SPORTS ACADEMY TRAINING REGISTRATION AND MANAGEMENT SYSTEM
- api/package.json
- mobile/package.json
- Changelog
- Tasks: User Login (Mobile)
- 20261102090000_init_auth/migration.sql
- Start here
- Algorithm 1: Cardinality-Constrained Weighted Interval Scheduling (CC-WIS)
- Feature Specification: User Login (Mobile)
- compilerOptions
- compilerOptions
- Research: User Login (Mobile)
- compilerOptions
- expo
- shared/package.json
- Implementation Plan: User Login (Mobile)
- package.json
- 4. AUTHENTICATION AND SECURITY LIBRARIES
- scripts
- Oak Sports Academy Training Registration and Management System
- How specifications are organized in this project
- index.ts
- audit.test.ts
- Changelog
- Supabase
- Supabase
- Changelog
- Changelog
- Writing Guidelines for Postgres References
- Writing Guidelines for Postgres References
- dependencies
- permissions.test.ts
- Section Definitions
- Section Definitions
- Oak Sports Academy Training Registration and Management System
- rate-limit.test.ts
- Supabase Postgres Best Practices
- Supabase Postgres Best Practices
- Use tsvector for Full-Text Search
- Index JSONB Columns for Efficient Querying
- Configure Idle Connection Timeouts
- Set Appropriate Connection Limits
- Use Connection Pooling for All Applications
- Use Prepared Statements Correctly with Pooling
- Batch INSERT Statements for Bulk Data
- Eliminate N+1 Queries with Batch Loading
- Use Cursor-Based Pagination Instead of OFFSET
- Use UPSERT for Insert-or-Update Operations
- Use Advisory Locks for Application-Level Locking
- Prevent Deadlocks with Consistent Lock Ordering
- Keep Transactions Short to Reduce Lock Contention
- Use SKIP LOCKED for Non-Blocking Queue Processing
- Use EXPLAIN ANALYZE to Diagnose Slow Queries
- Enable pg_stat_statements for Query Analysis
- Maintain Table Statistics with VACUUM and ANALYZE
- Create Composite Indexes for Multi-Column Queries
- Use Covering Indexes to Avoid Table Lookups
- Choose the Right Index Type for Your Data
- Add Indexes on WHERE and JOIN Columns
- Use Partial Indexes for Filtered Queries
- Add Constraints Safely in Migrations
- Choose Appropriate Data Types
- Index Foreign Key Columns
- Use Lowercase Identifiers for Compatibility
- Partition Large Tables for Better Performance
- Select Optimal Primary Key Strategy
- Apply Principle of Least Privilege
- Enable Row Level Security for Multi-Tenant Data
- Optimize RLS Policies for Performance
- [Rule Title]
- .qwen/skills/supabase-postgres-best-practices/references/advanced-full-text-search.md
- .qwen/skills/supabase-postgres-best-practices/references/advanced-jsonb-indexing.md
- .qwen/skills/supabase-postgres-best-practices/references/conn-idle-timeout.md
- .qwen/skills/supabase-postgres-best-practices/references/conn-limits.md
- .qwen/skills/supabase-postgres-best-practices/references/conn-pooling.md
- .qwen/skills/supabase-postgres-best-practices/references/conn-prepared-statements.md
- .qwen/skills/supabase-postgres-best-practices/references/data-batch-inserts.md
- .qwen/skills/supabase-postgres-best-practices/references/data-n-plus-one.md
- .qwen/skills/supabase-postgres-best-practices/references/data-pagination.md
- .qwen/skills/supabase-postgres-best-practices/references/data-upsert.md
- .qwen/skills/supabase-postgres-best-practices/references/lock-advisory.md
- .qwen/skills/supabase-postgres-best-practices/references/lock-deadlock-prevention.md
- .qwen/skills/supabase-postgres-best-practices/references/lock-short-transactions.md
- .qwen/skills/supabase-postgres-best-practices/references/lock-skip-locked.md
- .qwen/skills/supabase-postgres-best-practices/references/monitor-explain-analyze.md
- .qwen/skills/supabase-postgres-best-practices/references/monitor-pg-stat-statements.md
- .qwen/skills/supabase-postgres-best-practices/references/monitor-vacuum-analyze.md
- .qwen/skills/supabase-postgres-best-practices/references/query-composite-indexes.md
- .qwen/skills/supabase-postgres-best-practices/references/query-covering-indexes.md
- .qwen/skills/supabase-postgres-best-practices/references/query-index-types.md
- .qwen/skills/supabase-postgres-best-practices/references/query-missing-indexes.md
- .qwen/skills/supabase-postgres-best-practices/references/query-partial-indexes.md
- .qwen/skills/supabase-postgres-best-practices/references/schema-constraints.md
- .qwen/skills/supabase-postgres-best-practices/references/schema-data-types.md
- .qwen/skills/supabase-postgres-best-practices/references/schema-foreign-key-indexes.md
- .qwen/skills/supabase-postgres-best-practices/references/schema-lowercase-identifiers.md
- .qwen/skills/supabase-postgres-best-practices/references/schema-partitioning.md
- .qwen/skills/supabase-postgres-best-practices/references/schema-primary-keys.md
- .qwen/skills/supabase-postgres-best-practices/references/security-privileges.md
- .qwen/skills/supabase-postgres-best-practices/references/security-rls-basics.md
- .qwen/skills/supabase-postgres-best-practices/references/security-rls-performance.md
- .qwen/skills/supabase-postgres-best-practices/references/_template.md

## God Nodes (most connected - your core abstractions)
1. `OAK SPORTS ACADEMY TRAINING REGISTRATION AND MANAGEMENT SYSTEM` - 17 edges
2. `Research: User Login (Mobile)` - 15 edges
3. `compilerOptions` - 14 edges
4. `Tasks: User Login (Mobile)` - 12 edges
5. `expo` - 10 edges
6. `Oak Sports Academy Training Registration and Management System` - 10 edges
7. `2. FINAL TECHNOLOGY STACK` - 10 edges
8. `Implementation Plan: User Login (Mobile)` - 10 edges
9. `scripts` - 9 edges
10. `Section Definitions` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Phase 2: UI Design — Login Screen (Mobile)` --references--> `PrimaryButton()`  [INFERRED]
  specs/001-user-login/tasks.md → apps/mobile/components/PrimaryButton.tsx
- `Phase 2: UI Design — Login Screen (Mobile)` --references--> `TextField()`  [INFERRED]
  specs/001-user-login/tasks.md → apps/mobile/components/TextField.tsx
- `Phase 2: UI Design — Login Screen (Mobile)` --references--> `LoginForm()`  [INFERRED]
  specs/001-user-login/tasks.md → apps/mobile/features/auth/LoginForm.tsx
- `public.oak_auth_lookup()` --reads_from--> `public.users`  [EXTRACTED]
  apps/api/prisma/migrations/20261102090100_auth_security/migration.sql → apps/api/prisma/migrations/20261102090000_init_auth/migration.sql
- `public.oak_create_session()` --reads_from--> `public.users`  [EXTRACTED]
  apps/api/prisma/migrations/20261102090100_auth_security/migration.sql → apps/api/prisma/migrations/20261102090000_init_auth/migration.sql

## Import Cycles
- None detected.

## Communities (104 total, 67 thin omitted)

### Community 0 - "OAK SPORTS ACADEMY TRAINING REGISTRATION AND MANAGEMENT SYSTEM"
Cohesion: 0.04
Nodes (46): 10. GIT AND GITHUB WORKFLOW, 11. AGENTS.MD AND AI CODING RULES, 12. TESTING REQUIREMENTS, 13. IMPLEMENTATION PRIORITIES, 14. FINAL RULES FOR DEVELOPMENT, 1. PROJECT OVERVIEW, 2. FINAL TECHNOLOGY STACK, 3. WHAT THE TEAM WILL IMPLEMENT (+38 more)

### Community 1 - "api/package.json"
Cohesion: 0.14
Nodes (19): devDependencies, @oak/shared@*, prisma@^6.0.0, tsx@^4.19.0, @types/express@^5.0.0, @types/node@^22.0.0, @types/supertest@^6.0.0, typescript@^5.6.0 (+11 more)

### Community 2 - "mobile/package.json"
Cohesion: 0.06
Nodes (56): HomeScreen(), styles, LoginScreen(), styles, PrimaryButton(), PrimaryButtonProps, styles, styles (+48 more)

### Community 3 - "Changelog"
Cohesion: 0.10
Nodes (20): [0.1.3](https://github.com/supabase/agent-skills/compare/v0.1.2...v0.1.3) (2026-06-02), [0.1.4](https://github.com/supabase/agent-skills/compare/v0.1.3...v0.1.4) (2026-06-05), [0.1.5](https://github.com/supabase/agent-skills/compare/v0.1.4...v0.1.5) (2026-07-10), [0.1.6](https://github.com/supabase/agent-skills/compare/v0.1.5...supabase-v0.1.6) (2026-07-30), [0.1.7](https://github.com/supabase/agent-skills/compare/v0.1.6...supabase-v0.1.7) (2026-08-12), [0.1.8](https://github.com/supabase/agent-skills/compare/v0.1.7...supabase-v0.1.8) (2026-09-24), [0.1.9](https://github.com/supabase/agent-skills/compare/v0.1.8...supabase-v0.1.9) (2026-09-28), Bug Fixes (+12 more)

### Community 4 - "Tasks: User Login (Mobile)"
Cohesion: 0.17
Nodes (12): Dependencies & Execution Order, Format: `[ID] [P?] [Story] Description`, Implementation Strategy, Parallel opportunities (after their prerequisites), Phase 0: Environment Prerequisites (You run these once), Phase 1: Monorepo Setup (Shared Infrastructure), Phase 3: Foundational Backend (Blocking Prerequisites), Phase 4: User Story 1 - Sign in on the app (Priority: P1) 🎯 MVP (+4 more)

### Community 5 - "20261102090000_init_auth/migration.sql"
Cohesion: 0.11
Nodes (21): audit_logs_currentHash_key, audit_logs_previousHash_key, audit_logs_timestamp_idx, public.audit_logs, public.sessions, public.sign_in_attempts, public.users, sessions_expiresAt_idx (+13 more)

### Community 6 - "Start here"
Cohesion: 0.18
Nodes (10): 1.1 Confidentiality (Data Privacy & Access Control), 1.2 Integrity (Data Accuracy & Tamper Resistance), 1.3 Availability (Operational Resilience & Reliability), 1.4 Security Reference Standards, 1. Information Assurance & Security (CIA Triad), 2.1 Algorithm 1: Cardinality-Constrained Weighted Interval Scheduling (CC-WIS), 2.2 Algorithm 2: Trial Conversion & Student Churn Tracking (FSM), 2.3 Algorithm 3: Digital Document Collection & Automated Image Quality Screening (+2 more)

### Community 7 - "Algorithm 1: Cardinality-Constrained Weighted Interval Scheduling (CC-WIS)"
Cohesion: 0.10
Nodes (20): 15. ALGORITHM SPECIFICATIONS, Algorithm 1: Cardinality-Constrained Weighted Interval Scheduling (CC-WIS), Algorithm 2: Trial Conversion & Student Churn Tracking, Algorithm 3: Digital Document Collection & Automated Image Quality Screening, Algorithm Process, Algorithm Process, Benchmark Targets, Expected Output (+12 more)

### Community 8 - "Feature Specification: User Login (Mobile)"
Cohesion: 0.11
Nodes (17): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: User Login, Assumptions, Feature Specification: User Login (Mobile), Functional Requirements (+9 more)

### Community 9 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, declarationMap, exactOptionalPropertyTypes, lib, module, moduleResolution, noFallthroughCasesInSwitch (+8 more)

### Community 10 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, baseUrl, jsx, module, moduleResolution, noEmit, paths, skipLibCheck (+5 more)

### Community 11 - "Research: User Login (Mobile)"
Cohesion: 0.13
Nodes (15): Outstanding unknowns, R10 — Account status semantics, R11 — WebView session handoff (deferred design), R12 — Test database, R13 — Approved security alignment (2026-11-02), R1 — Session mechanism, R2 — Token transport for the mobile client, R3 — Password hashing (+7 more)

### Community 12 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, baseUrl, module, moduleResolution, outDir, paths, rootDir, exclude (+4 more)

### Community 13 - "expo"
Cohesion: 0.15
Nodes (12): package, expo, android, extra, name, orientation, platforms, plugins (+4 more)

### Community 14 - "shared/package.json"
Cohesion: 0.18
Nodes (11): devDependencies, typescript@^5.6.0, exports, typescript, main, name, private, scripts (+3 more)

### Community 15 - "Implementation Plan: User Login (Mobile)"
Cohesion: 0.17
Nodes (12): API design consequences of mobile-first, Approved T016 alignment — 2026-11-02, Client Architecture and the WebView Question, Constitution Check, Documentation (this feature), Implementation Plan: User Login (Mobile), Phase Plan, Project Structure (+4 more)

### Community 16 - "package.json"
Cohesion: 0.20
Nodes (9): engines, node, name, private, scripts, dev, test, version (+1 more)

### Community 17 - "4. AUTHENTICATION AND SECURITY LIBRARIES"
Cohesion: 0.20
Nodes (10): 1. Confidentiality (Data Privacy & Access Control), 2. Integrity (Data Accuracy & Tamper Resistance), 3. Availability (Operational Resilience & Reliability), 4. AUTHENTICATION AND SECURITY LIBRARIES, Cryptographic Append-Only Event Logging (SHA-256 Hash Chain), Information Assurance & Security Architecture (The CIA Triad), OTP and Password Reset Security, Password Hashing Algorithm: Argon2id (+2 more)

### Community 18 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, db:generate, db:migrate, db:seed, dev, start, test (+1 more)

### Community 19 - "Oak Sports Academy Training Registration and Management System"
Cohesion: 0.05
Nodes (33): Coverage and validation, Implementation interfaces exercised by the tests, T017 foundational security tests, T031 database fixture contract, Audit insertion protocol, Authentication data layer, Migration and runtime boundary, Validation status (+25 more)

### Community 20 - "How specifications are organized in this project"
Cohesion: 0.33
Nodes (5): 1. `specifications.md` (repository root), 2. `specs/<NNN-feature>/` (this folder), Current features, How specifications are organized in this project, Where the tooling fits

### Community 23 - "audit.test.ts"
Cohesion: 0.18
Nodes (6): append(), event(), fixture, genesis, payload, fixture

### Community 24 - "Changelog"
Cohesion: 0.10
Nodes (20): [0.1.3](https://github.com/supabase/agent-skills/compare/v0.1.2...v0.1.3) (2026-06-02), [0.1.4](https://github.com/supabase/agent-skills/compare/v0.1.3...v0.1.4) (2026-06-05), [0.1.5](https://github.com/supabase/agent-skills/compare/v0.1.4...v0.1.5) (2026-07-10), [0.1.6](https://github.com/supabase/agent-skills/compare/v0.1.5...supabase-v0.1.6) (2026-07-30), [0.1.7](https://github.com/supabase/agent-skills/compare/v0.1.6...supabase-v0.1.7) (2026-08-12), [0.1.8](https://github.com/supabase/agent-skills/compare/v0.1.7...supabase-v0.1.8) (2026-09-24), [0.1.9](https://github.com/supabase/agent-skills/compare/v0.1.8...supabase-v0.1.9) (2026-09-28), Bug Fixes (+12 more)

### Community 25 - "Supabase"
Cohesion: 0.11
Nodes (15): Fix suggestion, Source, What happened, Skill Feedback, Steps, Core Principles, Debugging, Making and Committing Schema Changes (+7 more)

### Community 26 - "Supabase"
Cohesion: 0.11
Nodes (15): Fix suggestion, Source, What happened, Skill Feedback, Steps, Core Principles, Debugging, Making and Committing Schema Changes (+7 more)

### Community 28 - "Changelog"
Cohesion: 0.12
Nodes (16): [1.2.0](https://github.com/supabase/agent-skills/compare/v1.1.1...v1.2.0) (2026-06-02), [1.3.0](https://github.com/supabase/agent-skills/compare/v1.2.0...v1.3.0) (2026-06-05), [1.4.0](https://github.com/supabase/agent-skills/compare/v1.3.0...v1.4.0) (2026-07-10), [1.5.0](https://github.com/supabase/agent-skills/compare/supabase-postgres-best-practices-v1.4.0...supabase-postgres-best-practices-v1.5.0) (2026-07-30), [1.6.0](https://github.com/supabase/agent-skills/compare/supabase-postgres-best-practices-v1.5.0...supabase-postgres-best-practices-v1.6.0) (2026-07-30), Bug Fixes, Bug Fixes, Bug Fixes (+8 more)

### Community 29 - "Changelog"
Cohesion: 0.12
Nodes (16): [1.2.0](https://github.com/supabase/agent-skills/compare/v1.1.1...v1.2.0) (2026-06-02), [1.3.0](https://github.com/supabase/agent-skills/compare/v1.2.0...v1.3.0) (2026-06-05), [1.4.0](https://github.com/supabase/agent-skills/compare/v1.3.0...v1.4.0) (2026-07-10), [1.5.0](https://github.com/supabase/agent-skills/compare/supabase-postgres-best-practices-v1.4.0...supabase-postgres-best-practices-v1.5.0) (2026-07-30), [1.6.0](https://github.com/supabase/agent-skills/compare/supabase-postgres-best-practices-v1.5.0...supabase-postgres-best-practices-v1.6.0) (2026-07-30), Bug Fixes, Bug Fixes, Bug Fixes (+8 more)

### Community 30 - "Writing Guidelines for Postgres References"
Cohesion: 0.12
Nodes (15): 1. Concrete Transformation Patterns, 2. Error-First Structure, 3. Quantified Impact, 4. Self-Contained Examples, 5. Semantic Naming, Code Example Standards, Comments, Impact Level Guidelines (+7 more)

### Community 31 - "Writing Guidelines for Postgres References"
Cohesion: 0.12
Nodes (15): 1. Concrete Transformation Patterns, 2. Error-First Structure, 3. Quantified Impact, 4. Self-Contained Examples, 5. Semantic Naming, Code Example Standards, Comments, Impact Level Guidelines (+7 more)

### Community 32 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, argon2@^0.41.0, express-rate-limit@^7.4.0, helmet@^8.0.0, @prisma/client@^6.0.0, zod@^3.23.0, argon2, express-rate-limit (+3 more)

### Community 33 - "permissions.test.ts"
Cohesion: 0.20
Nodes (5): vitest@^2.1.0, capabilities, Identity, roles, vitest

### Community 34 - "Section Definitions"
Cohesion: 0.20
Nodes (9): 1. Query Performance (query), 2. Connection Management (conn), 3. Security & RLS (security), 4. Schema Design (schema), 5. Concurrency & Locking (lock), 6. Data Access Patterns (data), 7. Monitoring & Diagnostics (monitor), 8. Advanced Features (advanced) (+1 more)

### Community 35 - "Section Definitions"
Cohesion: 0.20
Nodes (9): 1. Query Performance (query), 2. Connection Management (conn), 3. Security & RLS (security), 4. Schema Design (schema), 5. Concurrency & Locking (lock), 6. Data Access Patterns (data), 7. Monitoring & Diagnostics (monitor), 8. Advanced Features (advanced) (+1 more)

### Community 36 - "Oak Sports Academy Training Registration and Management System"
Cohesion: 0.20
Nodes (10): Development workflow, Initial team roles, Oak Sports Academy Training Registration and Management System, Planned technology stack, Project goals, Related project material, Repository layout, T017 security-test checkpoint (+2 more)

### Community 37 - "rate-limit.test.ts"
Cohesion: 0.25
Nodes (4): express@^4.21.0, supertest@^7.0.0, express, supertest

### Community 38 - "Supabase Postgres Best Practices"
Cohesion: 0.33
Nodes (5): How to Use, References, Rule Categories by Priority, Supabase Postgres Best Practices, When to Apply

### Community 39 - "Supabase Postgres Best Practices"
Cohesion: 0.33
Nodes (5): How to Use, References, Rule Categories by Priority, Supabase Postgres Best Practices, When to Apply

## Knowledge Gaps
- **2 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 528 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **67 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Tasks: User Login (Mobile)` connect `Tasks: User Login (Mobile)` to `mobile/package.json`, `Oak Sports Academy Training Registration and Management System`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `OAK SPORTS ACADEMY TRAINING REGISTRATION AND MANAGEMENT SYSTEM` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Why does `Phase 2: UI Design — Login Screen (Mobile)` connect `mobile/package.json` to `Tasks: User Login (Mobile)`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `api/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._
- **Should `mobile/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06057692307692308 - nodes in this community are weakly interconnected._
- **Should `Changelog` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._