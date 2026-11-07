# Graph Report - oak-sports-academy  (2026-11-07)

## Corpus Check
- 192 files · ~137,617 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: (none) 13, .example 4, .toml 1)

## Summary
- 1336 nodes · 2797 edges · 94 communities (82 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e2e1b19d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- OAK SPORTS ACADEMY TRAINING REGISTRATION AND MANAGEMENT SYSTEM
- api/package.json
- dependencies
- Feature Specification: Student Registration and Assessment
- Tasks: User Login (Mobile)
- public.users
- prisma.ts
- Algorithm 3: Digital Document Collection & Automated Image Quality Screening
- Feature Specification: User Login (Mobile)
- compilerOptions
- compilerOptions
- Research: User Login (Mobile)
- compilerOptions
- expo
- shared/package.json
- app.ts
- package.json
- 4. AUTHENTICATION AND SECURITY LIBRARIES
- require-permission.ts
- Oak Sports Academy Training Registration and Management System
- How specifications are organized in this project
- audit.service.ts
- index.ts
- RegistrationWizard.tsx
- 20261107090200_registration_otp/migration.sql
- public.registration_applications
- mobile/package.json
- public.oak_registration_decoy_step
- Data Model: User Login
- Native Student authentication
- 2. FINAL TECHNOLOGY STACK
- 1. Information Assurance & Security (CIA Triad)
- 20261107090000_registration_foundation/migration.sql
- Registration Admin design review — T002
- Authentication data layer
- Deferred content WebView handoff
- metro.config.js
- login.tsx
- Implementation Plan: Student Registration and Assessment
- scripts
- development.md
- password.service.ts
- registration-env.ts
- check-registration-development.ts
- registration.test.ts
- registration.schemas.ts
- contracts/auth-types.ts
- ApiClientError
- capability.ts
- messages.ts
- ApiError
- Implementation Plan: User Login (Mobile)
- Owner validation
- auth-context.tsx
- development-seed.test.ts
- Tasks: Student Registration and Assessment
- Registration validation guide
- Login requirements alignment — 2026-11-05
- ref_node_fs
- Registration planning decisions
- T017 foundational security tests
- expo-image-picker@~58.0.10
- @oak/shared@*
- 7. INITIAL RELEASE FEATURES
- env.ts
- 3. WHAT THE TEAM WILL IMPLEMENT
- 5. AUTHENTICATION FLOW
- Login UI state review — T066, 2026-11-05
- Start here
- Specification Quality Checklist: User Login
- shared/tsconfig.json
- Quickstart: User Login (Mobile)
- Typography
- RegistrationWizard.tsx
- vitest
- tsconfig.tests.json
- PersonalStep.tsx
- provision-test-db.sql
- ADR-0001: Server-managed opaque sessions and database authorization
- native-check.mjs
- Algorithm 1: Cardinality-Constrained Weighted Interval Scheduling (CC-WIS)
- Authentication implementation checkpoints
- cleanup-readme-docs.mjs
- Development guide
- T058 authentication security review

## God Nodes (most connected - your core abstractions)
1. `ApiError` - 50 edges
2. `vitest` - 35 edges
3. `react` - 34 edges
4. `Authentication data layer` - 32 edges
5. `ApiClientError` - 28 edges
6. `react-native` - 27 edges
7. `Typography` - 25 edges
8. `Authentication implementation checkpoints` - 25 edges
9. `@prisma/client` - 24 edges
10. `Spacing` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Authorization and database trust` --references--> `withSession()`  [INFERRED]
  docs/architecture/auth.md → apps/api/src/lib/prisma.ts
- `T063 Student role alignment (owner validation pending)` --references--> `withSession()`  [INFERRED]
  docs/architecture/auth-data.md → apps/api/src/lib/prisma.ts
- `Database authorization` --references--> `withSession()`  [INFERRED]
  specs/002-student-registration/data-model.md → apps/api/src/lib/prisma.ts
- `Requirements` --references--> `withSession()`  [INFERRED]
  specs/002-student-registration/spec.md → apps/api/src/lib/prisma.ts
- `Existing infrastructure and gaps` --references--> `withSession()`  [INFERRED]
  specs/002-student-registration/plan.md → apps/api/src/lib/prisma.ts

## Import Cycles
- None detected.

## Communities (94 total, 12 thin omitted)

### Community 0 - "OAK SPORTS ACADEMY TRAINING REGISTRATION AND MANAGEMENT SYSTEM"
Cohesion: 0.15
Nodes (13): 10. GIT AND GITHUB WORKFLOW, 11. AGENTS.MD AND AI CODING RULES, 12. TESTING REQUIREMENTS, 13. IMPLEMENTATION PRIORITIES, 14. FINAL RULES FOR DEVELOPMENT, 16. REQUIRED CLARIFICATIONS AND DOWNSTREAM ALIGNMENT, 1. PROJECT OVERVIEW, 6. ROLES AND AUTHORIZATION (+5 more)

### Community 1 - "api/package.json"
Cohesion: 0.06
Nodes (43): dependencies, argon2@^0.41.0, express@^4.21.0, express-rate-limit@^7.4.0, helmet@^8.0.0, @prisma/client@^6.0.0, sharp@0.35.5, devDependencies (+35 more)

### Community 2 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, expo-constants@~58.0.14, expo-crypto@~58.0.7, expo-router@~58.0.29, expo-secure-store@~58.0.2, expo-splash-screen@~58.0.12, expo-status-bar@~58.0.4, @expo/vector-icons@^15.0.2 (+6 more)

### Community 3 - "Feature Specification: Student Registration and Assessment"
Cohesion: 0.20
Nodes (10): Deadline-aware validation, Delivery boundary, Feature Specification: Student Registration and Assessment, Owner direction and unresolved gates, Requirements, Success and release limits, US1 — Create credentials and verify email (P1), US2 — Submit complete profile, documents and agreements (P1) (+2 more)

### Community 4 - "Tasks: User Login (Mobile)"
Cohesion: 0.15
Nodes (13): Dependencies & Execution Order, Format: `[ID] [P?] [Story] Description`, Implementation Strategy, Parallel opportunities (after their prerequisites), Phase 0: Environment Prerequisites (You run these once), Phase 1: Monorepo Setup (Shared Infrastructure), Phase 3: Foundational Backend (Blocking Prerequisites), Phase 4: User Story 1 - Sign in on the app (Priority: P1) 🎯 MVP (+5 more)

### Community 5 - "public.users"
Cohesion: 0.10
Nodes (26): audit_logs_currentHash_key, audit_logs_previousHash_key, audit_logs_timestamp_idx, public.audit_logs, public.sessions, public.sign_in_attempts, public.users, sessions_expiresAt_idx (+18 more)

### Community 6 - "prisma.ts"
Cohesion: 0.13
Nodes (22): isSessionRejection(), prisma, runtimeGlobal, SessionIdentity, withSession(), SessionContextError, CreatedSession, createSession() (+14 more)

### Community 7 - "Algorithm 3: Digital Document Collection & Automated Image Quality Screening"
Cohesion: 0.25
Nodes (8): 15. ALGORITHM SPECIFICATIONS, Algorithm 2: Registration and Enrollment Lifecycle Tracking, Algorithm 3: Digital Document Collection & Automated Image Quality Screening, Algorithm Process, Expected Output, Inputs, Purpose, Rules and Constraints

### Community 8 - "Feature Specification: User Login (Mobile)"
Cohesion: 0.15
Nodes (13): Assumptions, Feature Specification: User Login (Mobile), Functional Requirements, Key Entities, Measurable Outcomes, Requirements *(mandatory)*, Revised source alignment — 2026-11-05, Scope note (+5 more)

### Community 9 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, declarationMap, exactOptionalPropertyTypes, lib, module, moduleResolution, noFallthroughCasesInSwitch (+8 more)

### Community 10 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, baseUrl, jsx, module, moduleResolution, noEmit, paths, skipLibCheck (+5 more)

### Community 11 - "Research: User Login (Mobile)"
Cohesion: 0.12
Nodes (16): Outstanding unknowns, R10 — Account status semantics, R11 — WebView session handoff (deferred design), R12 — Test database, R13 — Approved security alignment (2026-11-02), R1 — Session mechanism, R2 — Token transport for the mobile client, R3 — Password hashing (+8 more)

### Community 12 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, baseUrl, module, moduleResolution, outDir, paths, rootDir, exclude (+4 more)

### Community 13 - "expo"
Cohesion: 0.15
Nodes (12): package, expo, android, extra, name, orientation, platforms, plugins (+4 more)

### Community 14 - "shared/package.json"
Cohesion: 0.18
Nodes (11): devDependencies, typescript@^5.6.0, exports, typescript, main, name, private, scripts (+3 more)

### Community 15 - "app.ts"
Cohesion: 0.10
Nodes (29): zod@^3.23.0, AppOptions, ApiErrorCode, catalog, errorHandler(), normalizeError(), ValidationField, validationFields (+21 more)

### Community 16 - "package.json"
Cohesion: 0.20
Nodes (9): engines, node, name, private, scripts, dev, test, version (+1 more)

### Community 17 - "4. AUTHENTICATION AND SECURITY LIBRARIES"
Cohesion: 0.20
Nodes (10): 1. Confidentiality (Data Privacy & Access Control), 2. Integrity (Data Accuracy & Tamper Resistance), 3. Availability (Operational Resilience & Reliability), 4. AUTHENTICATION AND SECURITY LIBRARIES, Cryptographic Append-Only Event Logging (SHA-256 Hash Chain), Information Assurance & Security Architecture (The CIA Triad), OTP and Password Reset Security, Password Hashing Algorithm: Argon2id (+2 more)

### Community 18 - "require-permission.ts"
Cohesion: 0.12
Nodes (23): AuthRouteOptions, requireAuth(), runGate(), requireOwnership(), Express, PermissionDenial, PermissionGateOptions, PermissionIdentity (+15 more)

### Community 19 - "Oak Sports Academy Training Registration and Management System"
Cohesion: 0.25
Nodes (8): Development workflow, Implemented authentication modules, Initial team roles, Oak Sports Academy Training Registration and Management System, Planned technology stack, Project goals, Related project material, Repository layout

### Community 20 - "How specifications are organized in this project"
Cohesion: 0.33
Nodes (5): 1. `specifications.md` (repository root), 2. `specs/<NNN-feature>/` (this folder), Current features, How specifications are organized in this project, Where the tooling fits

### Community 21 - "audit.service.ts"
Cohesion: 0.11
Nodes (23): appendAudit(), AuditEvent, AuditVerificationResult, canonical(), eventSchema, genesis, recordHash(), sensitiveKey() (+15 more)

### Community 23 - "index.ts"
Cohesion: 0.10
Nodes (33): createRegistrationControllers(), handler(), oneHeader(), publicFlow(), readRegistrationToken(), requestBoundary(), credentials, elevated (+25 more)

### Community 24 - "RegistrationWizard.tsx"
Cohesion: 0.14
Nodes (27): OutlineButton(), CheckboxRow(), InlineNotice(), InlineNoticeProps, NoticeTone, styles, TONE, OptionCard() (+19 more)

### Community 25 - "20261107090200_registration_otp/migration.sql"
Cohesion: 0.18
Nodes (13): email_verification_challenges_applicationId_key, email_verification_challenges_issueOperationId_key, public.email_verification_challenges, public.registration_capabilities, registration_capabilities_applicationId_idx, registration_capabilities_expiresAt_idx, registration_capabilities_tokenHash_key, public.oak_registration_delivery_result() (+5 more)

### Community 26 - "public.registration_applications"
Cohesion: 0.24
Nodes (9): public.oak_registration_account(), public.registration_applications, registration_applications_stage_status_submittedAt_id_idx, registration_applications_startOperationId_key, registration_applications_submitOperationId_key, registration_applications_userId_key, public.oak_current_registration_id(), public.oak_registration_append_audit() (+1 more)

### Community 28 - "mobile/package.json"
Cohesion: 0.21
Nodes (11): devDependencies, @babel/core@^7.24.0, @types/react@~19.3.0, typescript@^5.6.0, typescript, main, name, private (+3 more)

### Community 29 - "public.oak_registration_decoy_step"
Cohesion: 0.18
Nodes (6): public.oak_audit_head(), public.oak_auth_lookup(), public.oak_set_session_context(), public.oak_registration_decoy_start(), public.oak_registration_decoy_step(), public.registration_decoy_flows

### Community 30 - "Data Model: User Login"
Cohesion: 0.25
Nodes (9): email(), AuditLog and database isolation (approved 2026-11-02), Data Model: User Login, Entity notes, Indexes and why, Migration notes, Prisma schema, State transitions (+1 more)

### Community 31 - "Native Student authentication"
Cohesion: 0.25
Nodes (8): Audit integrity, Authorization and database trust, Cold start and recovery, Expiry, concurrency and logout, Native Student authentication, Token and account flow, Transport and deployment constraints, Validation boundary

### Community 32 - "2. FINAL TECHNOLOGY STACK"
Cohesion: 0.20
Nodes (10): 2. FINAL TECHNOLOGY STACK, Backend, Database, Development Tools, Email Delivery, File Storage, Hosting and Deployment, Mobile Application (+2 more)

### Community 33 - "1. Information Assurance & Security (CIA Triad)"
Cohesion: 0.18
Nodes (10): 1.1 Confidentiality (Data Privacy & Access Control), 1.2 Integrity (Data Accuracy & Tamper Resistance), 1.3 Availability (Operational Resilience & Reliability), 1.4 Security Reference Standards, 1. Information Assurance & Security (CIA Triad), 2.1 Algorithm 1: Cardinality-Constrained Weighted Interval Scheduling (CC-WIS), 2.2 Algorithm 2: Trial Conversion & Student Churn Tracking (FSM), 2.3 Algorithm 3: Digital Document Collection & Automated Image Quality Screening (+2 more)

### Community 34 - "20261107090000_registration_foundation/migration.sql"
Cohesion: 0.15
Nodes (23): consent_evidence_applicationId_acceptedAt_idx, consent_evidence_applicationId_id_key, consent_evidence_operationId_key, email_deliveries_applicationId_kind_eventVersion_key, email_deliveries_idempotencyKey_key, email_deliveries_operationId_key, email_deliveries_state_createdAt_idx, public.consent_evidence (+15 more)

### Community 35 - "Registration Admin design review — T002"
Cohesion: 0.25
Nodes (6): Owner review, Proposed screens and behavior, References inspected, Registration Admin design review — T002, Registration UI integration review, T011 implementation review — native results pending

### Community 36 - "Authentication data layer"
Cohesion: 0.06
Nodes (32): Audit insertion protocol, Authentication data layer, Current policy override — Student self-profile editing (2026-11-05), Migration and runtime boundary, T021 environment module, T022 runtime client and scoped queries, T023 error boundary, T024 rate-limit boundary (+24 more)

### Community 37 - "Deferred content WebView handoff"
Cohesion: 0.40
Nodes (5): Decisions required before implementation, Deferred content WebView handoff, Future acceptance evidence, Proposed exchange sequence — not an available API, Scope and native boundary

### Community 38 - "metro.config.js"
Cohesion: 0.20
Nodes (6): config, { getDefaultConfig }, path, sharedSource, expo@~58.0.22, expo

### Community 39 - "login.tsx"
Cohesion: 0.16
Nodes (20): HomeScreen(), styles, LoginScreen(), styles, RegisterScreen(), PrimaryButton(), styles, TextField() (+12 more)

### Community 40 - "Implementation Plan: Student Registration and Assessment"
Cohesion: 0.29
Nodes (7): Boundaries and structure, Constitution / instruction check, Implementation Plan: Student Registration and Assessment, Project-wide deadline path (targets, not guarantees), Summary, Technical context, Test budget and cadence

### Community 41 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, android, build:android, dev, ios

### Community 42 - "development.md"
Cohesion: 0.14
Nodes (10): Administrator browser transport, Applicant routes, Authorized idempotency, Explicit retry and duplicate-start contract — T007, Registration and assessment API contract proposal, Start and lost initial response, Verification, resend and progress, Database authorization (+2 more)

### Community 43 - "password.service.ts"
Cohesion: 0.31
Nodes (9): checkPassword(), getDummyHash(), hashPassword(), initializePasswordService(), options, unavailable(), verifyDummyPassword(), verifyPassword() (+1 more)

### Community 44 - "registration-env.ts"
Cohesion: 0.33
Nodes (5): email, parseRegistrationEnv(), RegistrationEnv, schema, sender

### Community 45 - "check-registration-development.ts"
Cohesion: 0.18
Nodes (8): envFile, expected, migrations, registrationDevelopmentUrl(), preflight, require, result, schema

### Community 46 - "registration.test.ts"
Cohesion: 0.14
Nodes (20): flow, lifecycle(), native, rotated, saved, token, createRegistrationState(), failed() (+12 more)

### Community 48 - "registration.schemas.ts"
Cohesion: 0.10
Nodes (21): loginEmailSchema, calendarDate, guardian, mobile, operationId, registrationAgreementsSchema, registrationDocumentParamsSchema, registrationPasswordSchema (+13 more)

### Community 49 - "contracts/auth-types.ts"
Cohesion: 0.13
Nodes (16): error, legacyRole, passwordEcho, rawDate, request, response, roleClaim, session (+8 more)

### Community 50 - "ApiClientError"
Cohesion: 0.23
Nodes (18): api, ApiClientError, ApiClientOptions, ClientErrorCode, createApiClient(), request(), resolveApiUrl(), createRegistrationApi() (+10 more)

### Community 51 - "capability.ts"
Cohesion: 0.11
Nodes (28): createRegistrationEmailSender(), providerId(), RegistrationEmailOptions, ApiError, hashAuditPayload(), actions, appendRegistrationAudit(), createRegistrationCapability() (+20 more)

### Community 52 - "messages.ts"
Cohesion: 0.47
Nodes (7): intendedRoute(), loginMessage(), recoveryDestination(), retryDeadline(), SESSION_ENDED_MESSAGE, useLogin(), submit()

### Community 53 - "ApiError"
Cohesion: 0.11
Nodes (23): readBearerToken(), loginController(), logoutController(), sessionController, authParamsSchema, authQuerySchema, loginSchema, logoutSchema (+15 more)

### Community 54 - "Implementation Plan: User Login (Mobile)"
Cohesion: 0.18
Nodes (11): API design consequences of mobile-first, Client Architecture and the WebView Question, Constitution Check, Documentation (this feature), Implementation Plan: User Login (Mobile), Phase Plan, Project Structure, Risks (+3 more)

### Community 55 - "Owner validation"
Cohesion: 0.18
Nodes (11): Grants and RLS, Owner validation, Registration data boundary, T004 foundation — schema validated, database checks pending, T006 disposable foundation checks — owner validated, T007 DTOs and retry contract — owner validated, T008 account and OTP services — owner validated, T009 bounded email adapter — owner validated (+3 more)

### Community 56 - "auth-context.tsx"
Cohesion: 0.13
Nodes (21): fixture(), response, fixture(), response, native, RootLayout(), AuthContext, AuthContextValue (+13 more)

### Community 57 - "development-seed.test.ts"
Cohesion: 0.36
Nodes (6): parseSeedSettings(), SEED_ACCOUNTS, seedDevelopmentAccounts(), SeedSettings, fixture, ids

### Community 58 - "Tasks: Student Registration and Assessment"
Cohesion: 0.29
Nodes (7): Dependencies and delivery strategy, Phase 1 — Decisions and reusable foundation, Phase 2 — US1: Credentials and real email verification, Phase 3 — US2: Complete private registration submission, Phase 4 — US3: Thin real Administrator demonstration path, Phase 5 — Consolidated feature review and handoff, Tasks: Student Registration and Assessment

### Community 59 - "Registration validation guide"
Cohesion: 0.33
Nodes (6): Deadline reporting, Efficient validation cadence, Minimum automated scenario groups (target 20–24), One consolidated owner demo, Registration validation guide, T012 checkpoint

### Community 60 - "Login requirements alignment — 2026-11-05"
Cohesion: 0.40
Nodes (5): Access and status, Login requirements alignment — 2026-11-05, Master amendments — approved and applied 2026-11-05, Remaining boundaries, Session policy

### Community 61 - "ref_node_fs"
Cohesion: 0.22
Nodes (5): testFile, boundary, quickstart, readme, setup

### Community 62 - "Registration planning decisions"
Cohesion: 0.40
Nodes (4): Concrete T001 decision sheet — approved 2026-11-06, Owner-approved defaults — T001 complete, Provider and design gates, Registration planning decisions

### Community 63 - "T017 foundational security tests"
Cohesion: 0.50
Nodes (4): Coverage and validation, Implementation interfaces exercised by the tests, T017 foundational security tests, T031 database fixture contract

### Community 106 - "7. INITIAL RELEASE FEATURES"
Cohesion: 0.22
Nodes (9): 7.1 Student Registration and Assessment (FR R-01), 7.2 Login and Student Home (FR L-01, FR H-01), 7.3 Training Eligibility, Packages, and Modules (FR T-01), 7.4 Enrollment and Payment (FR T-01, FR AT-01, FR AP-01), 7.5 Schedule, Attendance, Renewal, and Make-Up Classes (FR S-01, FR AC-01, FR AA-01), 7.6 Student Notifications and Profile (FR N-01, FR P-01), 7.7 Administrator Screens (FR AL-01 through FR AN-01), 7.8 Non-Functional Requirements (source NFR 1–16) (+1 more)

### Community 107 - "env.ts"
Cohesion: 0.15
Nodes (10): client, databaseUrl, env, loadEnv(), parseEnv(), positiveInteger, postgresUrl(), RuntimeEnv (+2 more)

### Community 108 - "3. WHAT THE TEAM WILL IMPLEMENT"
Cohesion: 0.33
Nodes (6): 3. WHAT THE TEAM WILL IMPLEMENT, Academy Business Logic, Custom Authentication, Database and API, Managed Services, UI and Application Integration

### Community 109 - "5. AUTHENTICATION FLOW"
Cohesion: 0.33
Nodes (6): 5. AUTHENTICATION FLOW, Authenticated Requests, Login, Logout, Password Recovery, Registration

### Community 110 - "Login UI state review — T066, 2026-11-05"
Cohesion: 0.29
Nodes (7): Applicable states and owner review, Design gaps and implementation gates, Login UI state review — T066, 2026-11-05, T042-T043 implementation review (2026-11-05), T044 device evidence (completed 2026-11-06), T047 logout state review (2026-11-06; see completed T048 evidence below), T048 native sign-out evidence (completed 2026-11-06)

### Community 111 - "Start here"
Cohesion: 0.25
Nodes (8): Approved stack, Current status, For AI agents, Next up, Read in this order, Repository map, Start here, What this is

### Community 112 - "Specification Quality Checklist: User Login"
Cohesion: 0.33
Nodes (6): Content Quality, Feature Readiness, Notes, Requirement Completeness, Revised baseline review — 2026-11-05, Specification Quality Checklist: User Login

### Community 113 - "shared/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, noEmit, rootDir, extends, include, ../../tsconfig.base.json

### Community 114 - "Quickstart: User Login (Mobile)"
Cohesion: 0.15
Nodes (13): API acceptance after T031 and auth endpoint implementation, Current checkpoint — T057 documentation refresh, Device acceptance — owner-run after relevant stories, Final acceptance and evidence, Quickstart: User Login (Mobile), Runtime, audit and boundary acceptance, SecureStore failure acceptance, Session boundaries — T031 real database fixtures (+5 more)

### Community 117 - "Typography"
Cohesion: 0.10
Nodes (38): OutlineButtonProps, styles, PrimaryButtonProps, styles, BorderRadius, Colors, RegistrationColors, Spacing (+30 more)

### Community 118 - "RegistrationWizard.tsx"
Cohesion: 0.17
Nodes (20): computeAge(), formatDateOfBirth(), formatMobileNational(), isFutureDate(), isMinorRegistration(), meetsPasswordPolicy(), mobileDigits(), mobileError() (+12 more)

### Community 124 - "vitest"
Cohesion: 0.08
Nodes (21): AppRuntime, createApp(), AuthWorkContext, fresh(), payload, runtimes, service, success (+13 more)

### Community 125 - "tsconfig.tests.json"
Cohesion: 0.18
Nodes (10): compilerOptions, jsx, lib, noEmit, rootDir, skipLibCheck, exclude, extends (+2 more)

### Community 126 - "PersonalStep.tsx"
Cohesion: 0.15
Nodes (23): DateField(), FieldShell(), RegistrationTextField(), SelectField(), ContactStep(), PersonalStep(), styles, StepProps (+15 more)

### Community 128 - "ADR-0001: Server-managed opaque sessions and database authorization"
Cohesion: 0.40
Nodes (5): ADR-0001: Server-managed opaque sessions and database authorization, Alternatives considered, Consequences and limits, Context, Decision

### Community 129 - "native-check.mjs"
Cohesion: 0.40
Nodes (3): socket, target, targets

### Community 130 - "Algorithm 1: Cardinality-Constrained Weighted Interval Scheduling (CC-WIS)"
Cohesion: 0.29
Nodes (7): Algorithm 1: Cardinality-Constrained Weighted Interval Scheduling (CC-WIS), Algorithm Process, Benchmark Targets, Expected Output, Inputs, Purpose, Rules and Constraints

### Community 133 - "Authentication implementation checkpoints"
Cohesion: 0.08
Nodes (26): Audit checkpoint deferred; T030 application wiring, Authentication implementation checkpoints, Follow-up: remove unused STAFF (current checkpoint), Original rename checkpoint (completed owner validation), T017 security-test checkpoint, T018 Prisma schema validation, T019 migrations and T020 owner application, T021 runtime environment setup (owner-run) (+18 more)

### Community 140 - "cleanup-readme-docs.mjs"
Cohesion: 0.22
Nodes (8): boundary, history, historyPath, original, readmePath, root, summary, walk()

### Community 142 - "Development guide"
Cohesion: 0.20
Nodes (10): Configuration, Development and validation, Development guide, Device troubleshooting, Mobile verification dependency — T011, Provider preparation — owner only, Registration setup — T003, Registration T012 development checkpoint (+2 more)

### Community 143 - "T058 authentication security review"
Cohesion: 0.50
Nodes (4): Finding fixed: rejected-session cleanup could be bypassed locally, Reviewed boundaries, T058 authentication security review, Validation and remaining release gates

## Knowledge Gaps
- **4 isolated node(s):** `../../tsconfig.base.json`, `./tsconfig.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 636 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `withSession()` connect `prisma.ts` to `Feature Specification: Student Registration and Assessment`, `Authentication data layer`, `development.md`, `require-permission.ts`, `audit.service.ts`, `vitest`, `Native Student authentication`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **What connects `../../tsconfig.base.json`, `./tsconfig.json`, `../../tsconfig.base.json` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05708245243128964 - nodes in this community are weakly interconnected._
- **Why does `OAK SPORTS ACADEMY TRAINING REGISTRATION AND MANAGEMENT SYSTEM` connect `OAK SPORTS ACADEMY TRAINING REGISTRATION AND MANAGEMENT SYSTEM` to `2. FINAL TECHNOLOGY STACK`, `index.md`, `Algorithm 3: Digital Document Collection & Automated Image Quality Screening`, `7. INITIAL RELEASE FEATURES`, `3. WHAT THE TEAM WILL IMPLEMENT`, `5. AUTHENTICATION FLOW`, `4. AUTHENTICATION AND SECURITY LIBRARIES`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Why does `Tasks: User Login (Mobile)` connect `Tasks: User Login (Mobile)` to `index.md`, `login.tsx`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Should `public.users` be split into smaller, more focused modules?**
  _Cohesion score 0.09747899159663866 - nodes in this community are weakly interconnected._