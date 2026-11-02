# Graph Report - oak-sports-academy  (2026-11-02)

## Corpus Check
- 37 files · ~25,066 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: (none) 13, .example 2, .prisma 1)

## Summary
- 417 nodes · 493 edges · 28 communities (26 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1e2002df`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- OAK SPORTS ACADEMY TRAINING REGISTRATION AND MANAGEMENT SYSTEM
- api/package.json
- mobile/package.json
- LoginForm.tsx
- Tasks: User Login (Mobile)
- dependencies
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
- permissions.test.ts
- rate-limit.test.ts
- Start here
- Data Model: User Login

## God Nodes (most connected - your core abstractions)
1. `OAK SPORTS ACADEMY TRAINING REGISTRATION AND MANAGEMENT SYSTEM` - 17 edges
2. `Research: User Login (Mobile)` - 15 edges
3. `compilerOptions` - 14 edges
4. `Tasks: User Login (Mobile)` - 12 edges
5. `expo` - 10 edges
6. `2. FINAL TECHNOLOGY STACK` - 10 edges
7. `Implementation Plan: User Login (Mobile)` - 10 edges
8. `scripts` - 9 edges
9. `Oak Sports Academy Training Registration and Management System` - 9 edges
10. `Quickstart: User Login (Mobile)` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Phase 2: UI Design — Login Screen (Mobile)` --references--> `PrimaryButton()`  [INFERRED]
  specs/001-user-login/tasks.md → apps/mobile/components/PrimaryButton.tsx
- `Phase 2: UI Design — Login Screen (Mobile)` --references--> `TextField()`  [INFERRED]
  specs/001-user-login/tasks.md → apps/mobile/components/TextField.tsx
- `Phase 2: UI Design — Login Screen (Mobile)` --references--> `LoginForm()`  [INFERRED]
  specs/001-user-login/tasks.md → apps/mobile/features/auth/LoginForm.tsx
- `HomeScreen()` --calls--> `PrimaryButton()`  [EXTRACTED]
  apps/mobile/app/index.tsx → apps/mobile/components/PrimaryButton.tsx
- `LoginScreen()` --calls--> `LoginForm()`  [EXTRACTED]
  apps/mobile/app/login.tsx → apps/mobile/features/auth/LoginForm.tsx

## Import Cycles
- None detected.

## Communities (28 total, 2 thin omitted)

### Community 0 - "OAK SPORTS ACADEMY TRAINING REGISTRATION AND MANAGEMENT SYSTEM"
Cohesion: 0.04
Nodes (46): 10. GIT AND GITHUB WORKFLOW, 11. AGENTS.MD AND AI CODING RULES, 12. TESTING REQUIREMENTS, 13. IMPLEMENTATION PRIORITIES, 14. FINAL RULES FOR DEVELOPMENT, 1. PROJECT OVERVIEW, 2. FINAL TECHNOLOGY STACK, 3. WHAT THE TEAM WILL IMPLEMENT (+38 more)

### Community 1 - "api/package.json"
Cohesion: 0.14
Nodes (19): devDependencies, @oak/shared@*, prisma@^6.0.0, tsx@^4.19.0, @types/express@^5.0.0, @types/node@^22.0.0, @types/supertest@^6.0.0, typescript@^5.6.0 (+11 more)

### Community 2 - "mobile/package.json"
Cohesion: 0.07
Nodes (33): dependencies, expo@~58.0.22, expo-constants@~58.0.14, expo-router@~58.0.29, expo-secure-store@~58.0.2, expo-splash-screen@~58.0.12, expo-status-bar@~58.0.4, @expo/vector-icons@^15.0.2 (+25 more)

### Community 3 - "LoginForm.tsx"
Cohesion: 0.18
Nodes (23): HomeScreen(), styles, LoginScreen(), styles, PrimaryButton(), PrimaryButtonProps, styles, styles (+15 more)

### Community 4 - "Tasks: User Login (Mobile)"
Cohesion: 0.17
Nodes (12): Dependencies & Execution Order, Format: `[ID] [P?] [Story] Description`, Implementation Strategy, Parallel opportunities (after their prerequisites), Phase 0: Environment Prerequisites (You run these once), Phase 1: Monorepo Setup (Shared Infrastructure), Phase 3: Foundational Backend (Blocking Prerequisites), Phase 4: User Story 1 - Sign in on the app (Priority: P1) 🎯 MVP (+4 more)

### Community 5 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, argon2@^0.41.0, express-rate-limit@^7.4.0, helmet@^8.0.0, @prisma/client@^6.0.0, zod@^3.23.0, argon2, express-rate-limit (+3 more)

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
Cohesion: 0.07
Nodes (23): Coverage and validation, Implementation interfaces exercised by the tests, T017 foundational security tests, T031 database fixture contract, Authentication data layer, Development workflow, Initial team roles, Oak Sports Academy Training Registration and Management System (+15 more)

### Community 20 - "How specifications are organized in this project"
Cohesion: 0.33
Nodes (5): 1. `specifications.md` (repository root), 2. `specs/<NNN-feature>/` (this folder), Current features, How specifications are organized in this project, Where the tooling fits

### Community 23 - "audit.test.ts"
Cohesion: 0.18
Nodes (6): append(), event(), fixture, genesis, payload, fixture

### Community 24 - "permissions.test.ts"
Cohesion: 0.20
Nodes (5): vitest@^2.1.0, capabilities, Identity, roles, vitest

### Community 25 - "rate-limit.test.ts"
Cohesion: 0.25
Nodes (4): express@^4.21.0, supertest@^7.0.0, express, supertest

### Community 26 - "Start here"
Cohesion: 0.25
Nodes (8): Approved stack, Current status, For AI agents, Next up, Read in this order, Repository map, Start here, What this is

### Community 27 - "Data Model: User Login"
Cohesion: 0.25
Nodes (8): AuditLog and database isolation (approved 2026-11-02), Data Model: User Login, Entity notes, Indexes and why, Migration notes, Prisma schema, State transitions, Validation rules

## Knowledge Gaps
- **2 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 264 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Tasks: User Login (Mobile)` connect `Tasks: User Login (Mobile)` to `LoginForm.tsx`, `Oak Sports Academy Training Registration and Management System`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `OAK SPORTS ACADEMY TRAINING REGISTRATION AND MANAGEMENT SYSTEM` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Why does `Phase 2: UI Design — Login Screen (Mobile)` connect `LoginForm.tsx` to `Tasks: User Login (Mobile)`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Should `api/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._
- **Should `mobile/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06984126984126984 - nodes in this community are weakly interconnected._
- **Should `Algorithm 1: Cardinality-Constrained Weighted Interval Scheduling (CC-WIS)` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._