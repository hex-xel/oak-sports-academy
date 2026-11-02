---
description: "Task list for 001-user-login (mobile-first)"
---

# Tasks: User Login (Mobile)

**Input**: Design documents from `/specs/001-user-login/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth.openapi.yaml

**Tests**: Included for the API — `specifications.md` §12 requires authentication,
session, and rate-limit tests. The mobile screen is verified manually against the
acceptance scenarios (no React Native test runner in the approved baseline).

**Organization**: Grouped by phase; each phase is a testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1, US2, US3 from `spec.md`
- Every task names its exact file path

---

## Phase 0: Environment Prerequisites (You run these once)

**Purpose**: One-time machine setup before any code is written. These are commands
you run yourself; the agent does not run them. Confirm each step succeeds before
moving on.

> All commands below run in PowerShell from `c:\Dev\School\oak-sports-academy`.

- [x] T000-A Install **Node.js 22 LTS** — download from https://nodejs.org, confirm
  with `node -v` (must show `v22.x.x`) and `npm -v`.

- [x] T000-B Install **Expo CLI** globally:
  ```powershell
  npm install -g expo-cli eas-cli
  ```
  Confirm with `expo --version`.

- [x] T000-C Install **Prisma CLI** globally (optional — can use npx):
  ```powershell
  npm install -g prisma
  ```
  Or just use `npx prisma` in later tasks — either works.

- [x] T000-D Create a **Supabase project** (free tier):
  1. Go to https://supabase.com and sign in.
  2. Click **New project** → name it `oak-sports-academy`.
  3. Choose a strong database password and save it in your password manager.
  4. After the project is ready, go to **Settings → Database** and copy
     the `DATABASE_URL` (connection string with `?pgbouncer=true` for transactions).
  5. Also copy the **direct connection URL** (without PgBouncer) — Prisma migrations
     need this.
  6. Save both URLs — they go in `.env` files in T006.

- [x] T000-E Confirm **Git** is configured:
  ```powershell
  git config user.name
  git config user.email
  ```
  Both must return your name/email. If not: `git config --global user.name "Your Name"`.

- [x] T000-F Create the feature branch:
  ```powershell
  git checkout -b feat/user-login
  ```
  Confirm with `git branch` — `feat/user-login` must be the active branch.

**Checkpoint**: `node -v` shows 22.x, `expo --version` works, Supabase project exists
with both DATABASE_URLs saved, feature branch is active.

---

## Phase 1: Monorepo Setup (Shared Infrastructure)

**Purpose**: npm workspace configuration and a bootable Expo app with all packages wired.

> You run all install commands; the agent writes the config files.

- [x] T001 Create root npm workspace configuration with `private`, `workspaces` for
  `apps/*` and `packages/*`, and `dev`/`test` scripts in `package.json`

- [x] T002 [P] Create shared TypeScript base config with `strict`, `noUncheckedIndexedAccess`,
  and `@shared/*` path alias in `tsconfig.base.json`

- [x] T003 [P] Scaffold the Express API package with TypeScript and Vitest config in
  `apps/api/package.json` and `apps/api/tsconfig.json`

- [x] T004 [P] Scaffold the Expo app with Expo Router, TypeScript, and `app/` entry in
  `apps/mobile/package.json`, `apps/mobile/app.json`, and `apps/mobile/tsconfig.json`

- [x] T005 [P] Create the shared package exporting auth types and error codes in
  `packages/shared/package.json` and `packages/shared/src/index.ts`

- [x] T006 [P] Create `.env.example` files with `DATABASE_URL`, `DIRECT_URL`, `PORT`,
  `SESSION_TTL_HOURS`, `NODE_ENV` and `EXPO_PUBLIC_API_URL` in `apps/api/.env.example`
  and `apps/mobile/.env.example`. Then create real `.env` files (git-ignored) with the
  Supabase URLs from T000-D.

- [x] T007 Run the installs and verify both apps boot:
  ```powershell
  npm install
  npm run dev -w apps/api      # should start Express on the configured port
  npm run dev -w apps/mobile   # should show the Expo QR code
  ```

**Checkpoint**: Both processes boot; no feature behavior yet.

---

## Phase 2: UI Design — Login Screen (Mobile)

**Purpose**: Build all mobile UI components and screens for the login feature **before**
wiring any real API calls. Use placeholder/mock data so the screens can be reviewed
against the high-fidelity designs at `docs/design/mobile/high-fidelity/` before the
backend is involved.

> **Why UI first**: Design can be reviewed on a device/emulator immediately. API
> integration (Phase 4) is added after the screens are approved.

- [x] T008-UI [P] Review high-fidelity designs in `docs/design/mobile/high-fidelity/`
  and note the exact colours, typography, spacing, and copy for the login screen and
  home screen before writing any component code.

- [x] T009-UI [P] Create the `TextField` primitive with label, value, onChangeText,
  error string, secureTextEntry, and accessibilityLabel props in
  `apps/mobile/components/TextField.tsx`.
  - Show an inline error message below the field when `error` is set.
  - Match the design spec from `docs/design/mobile/sticker-sheet/`.

- [x] T010-UI [P] Create the `PrimaryButton` primitive with label, onPress, loading
  (shows a spinner and disables the button), and disabled states in
  `apps/mobile/components/PrimaryButton.tsx`.
  - Match the design spec from `docs/design/mobile/sticker-sheet/`.

- [x] T011-UI Create the login route with keyboard avoidance and scroll handling in
  `apps/mobile/app/login.tsx`. Use a static mock `onSubmit` for now (console.log).

- [x] T012-UI Build `LoginForm` using `TextField` and `PrimaryButton`: labelled email
  and password inputs, inline validation (empty check only for now), disabled-while-
  submitting state, and 360 dp minimum width layout in
  `apps/mobile/features/auth/LoginForm.tsx`.

- [x] T013-UI Create the protected home screen (placeholder) showing a hard-coded
  "Signed in" message and a "Sign out" button stub in `apps/mobile/app/index.tsx`.

- [x] T014-UI Create the root layout with a route guard that redirects unauthenticated
  users to `/login` (use a simple boolean flag for now, not a real auth context) in
  `apps/mobile/app/_layout.tsx`.

- [x] T015-UI Manual design review: run the app on the device or emulator, navigate to
  the login screen, compare every element against the high-fidelity mockup in
  `docs/design/mobile/high-fidelity/`. Fix any visual gap before continuing.

**Checkpoint**: The login screen and home screen are visible on a device and match the
high-fidelity design. No real authentication yet — the form submits to a console.log.

---

## Phase 3: Foundational Backend (Blocking Prerequisites)

**Purpose**: Align the login slice with the updated `specifications.md` §§4–6,
then build database isolation, security primitives, token storage, and the app shell.
Phases 0–2 above remain completed and unchanged.

**T016 approved and aligned (2026-11-02)**: Only verified ACTIVE accounts may sign in;
PENDING_APPROVAL is denied until approval transitions the account to ACTIVE. Unknown
input properties are stripped. Logout header/idempotence behavior, standalone attempts,
runtime-role RLS, permission gates, audit serialization, and cold-launch restore
semantics are recorded in the feature artifacts. `specifications.md` remains unchanged.

**Scope**: Customer mobile login/logout/session recovery only. Scheduling (CC-WIS),
participant lifecycle FSM, document screening/uploads, guardian consent workflows,
registration/OTP/reset flows, and web cookie/CSRF integration belong to their features.
Carry forward their security boundaries without implementing their business workflows.

- [x] T016 Review and propose alignment of `spec.md`, `plan.md`, `research.md`,
  `data-model.md`, and `contracts/auth.openapi.yaml` in `specs/001-user-login/` with
  `specifications.md` §§4–6. Resolve the conflicts above with the owner; modify those
  artifacts only after explicit approval. Record the approved RLS trust boundary,
  audit serialization strategy, role/permission mapping, and account eligibility.

- [x] T017 Write foundational security tests in `apps/api/tests/security/` for the
  approved permission matrix (including combined flags and `0xFFFFFFFF`), ownership
  denial, cross-account RLS isolation under the runtime database role, audit-chain
  verification/tampering, and global/sensitive rate limits. Add fixtures only, not
  production participant/enrollment tables. Owner runs these after T031 setup.
  Written 2026-11-02; not executed. Deferred module/fixture interfaces and coverage are
  documented in `apps/api/tests/security/README.md`; owner-run command is in `README.md`.

- [x] T018 Create `apps/api/prisma/schema.prisma` with `Role`, `AccountStatus`, `User`,
  `Session`, `SignInAttempt`, and the approved `AuditLog` model. Preserve unique normalized
  email, UUID identifiers, nullable verification/revocation timestamps, session expiry
  and attempt-window indexes. `tokenHash`: 64 lowercase hex characters (SHA-256);
  `userAgent`: 255 characters maximum; `ipAddress`: 45 characters maximum (IPv6),
  truncate rather than reject. Attempts must support unknown emails without a user FK.
  Audit fields are those in §4, including actor, target, payloadHash, previousHash,
  currentHash, and UTC timestamp; do not conflate attempts with administrative audit logs.
  Schema written and owner Prisma validation passed 2026-11-02. No migration/client generation run.

- [x] T019 Create reviewed SQL migrations in `apps/api/prisma/migrations/` for the
  schema, RLS on sensitive auth tables, and audit INSERT/SELECT-only runtime privileges.
  Separate privileged migrations from the non-owner, non-BYPASSRLS runtime connection.
  Establish transaction-local identity from a verified session, never client claims;
  specify a narrowly scoped pre-auth lookup/session-bootstrap path that does not bypass
  tenant isolation for general queries. Fail closed on missing identity and avoid
  leaking context through pooled connections. Do not create future-feature tables.
  Two ordered SQL migrations written and owner-applied 2026-11-02; metadata reviewed
  at T020. Runtime behavior validation remains scheduled for T031. See `docs/architecture/auth-data.md` for the reviewed function/grant boundary.

- [x] T020 Owner applies the reviewed development migration and generates the client
  from `C:\Dev\School\oak-sports-academy\apps\api`:
  ```powershell
  ..\..\node_modules\.bin\prisma.cmd migrate deploy --schema prisma/schema.prisma
  ..\..\node_modules\.bin\prisma.cmd generate --schema prisma/schema.prisma
  ```
  Expected: migration succeeds and `users`, `sessions`, `sign_in_attempts`, plus the
  approved audit table exist with the reviewed policies/grants. Run the read-only
  `scripts/inspect-auth-security.sql` inspection as documented in `README.md`. Apply
  the authored migrations; do not generate a replacement/shadow migration. On failure, stop and
  share redacted output; do not reset a shared database or continue dependent tasks.

  Owner confirmed both migrations applied and Prisma Client generated. Reviewed role
  attributes/memberships, four RLS-enabled postgres-owned tables, 13 policy definitions,
  eight function owners/search paths, no PUBLIC/API execution grants, no runtime audit
  UPDATE/DELETE/TRUNCATE privileges, and enabled audit trigger. Runtime tests await T031.

- [ ] T021 Create `apps/api/src/config/env.ts` and update `apps/api/.env.example` with
  Zod-validated runtime/migration URLs, PORT, NODE_ENV, and SESSION_TTL_HOURS (8).
  Validate required values at startup without logging secrets. Document the runtime
  role and trusted proxy configuration; do not assume Supabase service credentials
  or a privileged connection provide RLS isolation.

- [ ] T022 Create `apps/api/src/lib/prisma.ts` with a Prisma singleton and the approved
  transaction-scoped database identity helper from T019; keep privileged lookup access
  confined to authentication bootstrap. Use parameterized queries only.

- [ ] T023 [P] Create safe API errors and Express handling in
  `apps/api/src/middleware/error-handler.ts`: `{code, message, details?}`, field-only
  validation details, stable payload-too-large and internal-error handling, no stack,
  database details, credentials, or tokens in responses/logs.

- [ ] T024 [P] Create global IP and sensitive endpoint rate limiters in
  `apps/api/src/middleware/rate-limit.ts`: global baseline 100 requests/15 minutes;
  login 10/15 minutes/IP and 5/15 minutes/normalized email, standardized `Retry-After`.
  Do not trust arbitrary forwarded headers. Bound in-memory key retention and document
  restart/per-instance limitations. Verification endpoints reuse this later.

- [ ] T025 [P] Create `apps/api/src/modules/auth/password.service.ts` with library
  Argon2id hash/verify: 19 MiB (19456 KiB), iterations 2, parallelism 1, automatic salt,
  and a reusable dummy hash verification for unknown accounts. Owner benchmarks on the
  deployment host before tuning; never implement cryptography manually.

- [ ] T026 Create `apps/api/src/modules/auth/session.service.ts`: crypto-generated
  256-bit opaque token, SHA-256 hash stored server-side, 8-hour absolute expiry,
  create/verify/current-session revoke and revoke-all helper for future security events.
  Check current account restrictions on protected requests; never return DB session
  records or raw tokens beyond successful login. Other device sessions survive logout.

- [ ] T027 Create `apps/api/src/modules/audit/audit.service.ts` with append and verify
  operations using Node crypto SHA-256, the exact §4 field order, canonical payload
  hashing, and genesis previousHash of 64 zeros. Serialize concurrent appends within
  the database transaction so the chain cannot fork; administrative mutations and their
  audit entry must commit atomically. Gate denials emit a redacted security audit event.
  No administrative CRUD endpoints are introduced in this login feature.

- [ ] T028 Create centralized permissions in `packages/shared/src/permissions.ts` and
  `apps/api/src/middleware/require-permission.ts`, using the approved §6 constants and
  role mapping. Require all requested bits with `(actual & required) === required`,
  handle the unsigned ADMIN-all mask consistently, return `403 FORBIDDEN` on denial,
  and audit it. Role membership alone never grants access to another customer's data.

- [ ] T029 Create `apps/api/src/middleware/require-auth.ts` and
  `apps/api/src/middleware/require-ownership.ts`: identical `401 UNAUTHENTICATED` for
  missing/expired/revoked/unknown tokens, server-loaded permissions, permission gate
  followed by resource ownership checks and scoped DB access. In this slice enforce
  self-access for `/auth/session`; linked minors/program scopes await their models.

- [ ] T030 Wire Helmet (including an explicit API-appropriate CSP), the global limiter,
  10 kB JSON limit, `/api/v1` routing, and final error handling in `apps/api/src/app.ts`
  and `apps/api/src/server.ts`; bind development API to `0.0.0.0`. Validate bodies,
  route parameters, and query parameters on exposed routes using Zod, stripping
  unexpected properties per approved T016 alignment. Mobile bearer routes issue no cookies.

- [ ] T031 Configure Vitest/Supertest in `apps/api/vitest.config.ts` and
  `apps/api/tests/helpers/db.ts`: dedicated test DB, migration precondition, isolated
  runtime-role RLS fixtures and privileged fixture cleanup, deterministic clocks and
  limiter resets. Never truncate production/shared data; runtime audit permissions
  remain INSERT/SELECT-only. Owner runs `npm test -w apps/api` from the repository root
  after preparing `.env.test`; expected all implemented foundational tests pass.
  On failure stop, share redacted output, and fix before proceeding.

- [ ] T032 Create `apps/api/prisma/seed.ts` and seed configuration in
  `apps/api/package.json` for verified active, unverified, suspended, and approved
  pending-approval denial scenarios. Read development passwords from ignored environment
  configuration, hash with Argon2id, refuse production, print no secrets. Owner runs
  `npx prisma db seed` from `apps/api`; expected fixture accounts exist. On failure
  stop and report redacted output; do not alter shared data manually.

- [ ] T033 Create shared request/response types and error codes in
  `packages/shared/src/auth-types.ts`, `packages/shared/src/error-codes.ts`, and export
  through `packages/shared/src/index.ts`; follow the reconciled contract, including
  `FORBIDDEN`, safe validation/rate-limit errors, and token-free session responses.

- [ ] T034 [P] Create `apps/mobile/lib/token-store.ts`: SecureStore get/set/delete,
  one key constant, handled storage failures, no AsyncStorage/log/crash-report fallback.

- [ ] T035 Create `apps/mobile/lib/api.ts`: configured LAN/API URL via Expo config and
  development override, JSON headers, `X-Client-Platform: mobile` on login, bearer
  injection, typed errors, bounded timeout and explicit retry for cold starts. Preserve
  Retry-After; do not automatically replay login/logout or log sensitive request data.

- [ ] T036 Create `apps/mobile/lib/auth-context.tsx` exposing user, status
  (`restoring|signedOut|signedIn`), signIn/signOut, and session invalidation. Keep the
  startup guard in restoring until secure storage is read; restoration is completed
  in US3. Never treat client state or cached claims as API authorization.

**Checkpoint**: Owner confirms migration, security tests, and seed results. Permission
checks, runtime RLS, and audit-chain guarantees are exercised with the real database.

---

## Phase 4: User Story 1 - Sign in on the app (Priority: P1) 🎯 MVP

**Goal**: Wire the approved native UI to real customer authentication.
**Independent Test**: Verified eligible account signs in; failures remain safe and
usable; force-close/reopen acceptance finishes with US3.

- [ ] T037 [P] [US1] Write service tests in `apps/api/tests/auth/login.service.test.ts`
  for valid login, normalized email, wrong/unknown credentials with dummy verification,
  unverified/suspended/pending status under the approved eligibility rule, attempt
  recording, session hash-only storage, and no sensitive response fields.

- [ ] T038 [P] [US1] Write API tests in `apps/api/tests/auth/login.api.test.ts` for
  mobile-header enforcement, no Set-Cookie, 200 response contract, validation and unknown
  property stripping, identical credential errors, verification after password check,
  both sensitive limiter thresholds plus global limiting/Retry-After, 10 kB rejection,
  and safe internal errors. Owner confirms expected failures before implementation.

- [ ] T039 [US1] Create `apps/api/src/modules/auth/auth.schemas.ts`: JSON object body,
  email trimmed/lowercased (3–254 characters, single @ and dotted domain), password
  1–128 characters without trimming; validate client header and strip unexpected fields
  under T016 approval. Add matching client-side malformed-email/empty-field validation
  in `apps/mobile/features/auth/LoginForm.tsx` so invalid input sends no request.

- [ ] T040 [US1] Implement `apps/api/src/modules/auth/auth.service.ts`: lookup through
  approved pre-auth path, real/dummy verification, account restrictions after credential
  verification, successful/failed attempt recording, lastSignInAt, session creation.

- [ ] T041 [US1] Implement controllers/routes in
  `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/auth/auth.routes.ts`,
  and register in `apps/api/src/app.ts`. Only `POST /auth/login` returns sessionToken
  and expiresAt; `GET /auth/session` uses auth, permission, ownership, and scoped DB
  access and returns safe user/expiry data with no token or hashes. Attach login limiters.

- [ ] T042 [US1] Map safe API/offline/timeout/rate-limit copy in
  `apps/mobile/features/auth/messages.ts`, then implement
  `apps/mobile/features/auth/useLogin.ts` and wire `LoginForm.tsx`: API call, successful
  SecureStore write before entering signedIn, disabled submit while pending, recoverable
  failure, Retry-After countdown, and explicit retry after cold-start timeout.

- [ ] T043 [US1] Replace mock guard/home state in `apps/mobile/app/_layout.tsx` and
  `apps/mobile/app/index.tsx` using real auth context and approved account restrictions.
  Inspect the mobile high-fidelity mockups/sticker sheet before any UI edit, retain the
  official crest, 360 dp usability, keyboard avoidance, and accessible error announcements.

- [ ] T044 [US1] Owner runs `npm test -w apps/api` from the repository root and the
  sign-in/failure/device checks in `specs/001-user-login/quickstart.md` §5 (start with
  `npm run dev -w apps/api` and `npm run dev -w apps/mobile` in separate root terminals).
  Expected: tests pass and UI matches approved designs. On failure stop and share
  redacted output/screenshots; agent fixes before proceeding.

**Checkpoint**: Sign-in works on-device with the new security controls. Persistent
relaunch behavior is accepted after Phase 6, not claimed complete here.

---

## Phase 5: User Story 2 - Sign out (Priority: P2)

**Goal**: Revoke the current session remotely and clear SecureStore locally.
**Independent Test**: Online logout rejects a replayed token immediately; another
session remains valid; offline logout clears local state and leaves remote expiry.

- [ ] T045 [US2] Write `apps/api/tests/auth/logout.api.test.ts` for current-token
  revocation, repeated logout, other-device independence, and missing/malformed header
  behavior approved in T016. Owner confirms expected failures before implementation.

- [ ] T046 [US2] Wire current-session revocation into
  `apps/api/src/modules/auth/auth.controller.ts` and
  `apps/api/src/modules/auth/auth.routes.ts`: `POST /auth/logout` returns 204 for an
  already-revoked supplied token; follow the reconciled contract for malformed headers.

- [ ] T047 [US2] Implement remote logout with local cleanup in finally in
  `apps/mobile/lib/auth-context.tsx`, then wire `apps/mobile/app/index.tsx`. Handle
  SecureStore deletion errors explicitly rather than claiming a successful local logout.

- [ ] T048 [US2] Owner reruns `npm test -w apps/api` from the repository root and the
  online/offline sign-out cases in `specs/001-user-login/quickstart.md`. Expected:
  local token removed, login visible, copied online-revoked token gets 401, second
  device remains signed in. On failure stop and report redacted evidence.

---

## Phase 6: User Story 3 - Session expiry and recovery (Priority: P3)

**Goal**: Restore valid sessions and recover safely from invalid sessions.
**Independent Test**: Force-close/reopen restores a valid session; expired/revoked/
fabricated tokens cause one login redirect with a session-ended notice.

- [ ] T049 [US3] Write `apps/api/tests/auth/session.api.test.ts` for identical missing,
  expired, revoked, and unknown-token 401s; current account restrictions, safe response
  fields, permission denials, and cross-user isolation. Owner confirms expected failures.

- [ ] T050 [US3] Complete startup restore in `apps/mobile/lib/auth-context.tsx`: read
  SecureStore, avoid login-screen flicker, validate `/auth/session` in the background,
  clear invalid sessions, and handle offline/cold-start retries. Do not invent cached
  user claims on a cold launch; show a restoring/offline state when identity is unknown.
  Optimistic local navigation never authorizes protected data requests.

- [ ] T051 [US3] Add one authenticated-request 401 invalidation handler in
  `apps/mobile/lib/api.ts` connected to `apps/mobile/lib/auth-context.tsx`; distinguish
  failed login credentials from expired sessions and prevent redirect loops/races.

- [ ] T052 [US3] Preserve and validate an internal intended route in
  `apps/mobile/app/login.tsx` and add accessible session-ended copy in
  `apps/mobile/features/auth/messages.ts`; reject external/unrecognized destinations,
  never put tokens in navigation URLs, and inspect approved designs before UI changes.

- [ ] T053 [US3] Owner runs `npm test -w apps/api` from the repository root and expiry,
  offline restore, concurrent-401, re-login route-return, and force-close/reopen checks
  in `specs/001-user-login/quickstart.md`. Expected: safe recovery, no loops, valid
  entry to restoring within 2 seconds; measure network confirmation and warm/cold API
  cases separately.
  Stop on failures or unmet targets and report evidence rather than marking complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T054 [P] Write/update `docs/architecture/auth.md` with token flow, account
  eligibility, permission gates/ownership, RLS runtime/bootstrap trust boundary,
  transaction-local pooled identity, audit append/verify protocol, concurrency,
  rate-limit limitations, TLS deployment requirements, and cold-start recovery.

- [ ] T055 [P] Inspect existing ADR numbering in `docs/decisions/` before creating or
  updating an opaque-session decision note there; document approved RLS/audit decisions
  without overwriting unrelated ADRs. New notes require status/owner/milestone frontmatter.

- [ ] T056 [P] Document deferred content-only WebView handoff in
  `docs/architecture/webview-strategy.md`: single-use exchange code, no bearer token
  in URLs, native auth preserved; do not implement the handoff in this feature.

- [ ] T057 Update `specs/001-user-login/quickstart.md` after owner approval with
  runtime-role RLS tests, audit privilege/integrity/concurrency checks, limiter/body
  boundaries, permission denials, SecureStore failures, and warm/cold session recovery.
  Keep actual setup commands in `README.md` and link rather than duplicate them.

- [ ] T058 Review `apps/api/src/`, `apps/mobile/lib/`, and
  `apps/api/prisma/migrations/` for leaked secrets/hashes, bypassable authorization,
  unsafe raw SQL, privileged runtime roles, forged identity context, and audit mutation
  privileges. Verify exported APIs have required JSDoc and workaround sources.

- [ ] T059 Owner runs final `npm test -w apps/api` from the repository root and all
  acceptance scenarios in `specs/001-user-login/quickstart.md`; include Argon2id/login
  performance on the deployment host. Expected: suites/scenarios pass, no secret leakage,
  and targets met. Stop on failure; record limitations before demonstration/deployment.

- [ ] T060 Update `docs/index.md` status/next-up and link new architecture/decision
  notes; update `README.md` for the implemented public modules and owner-run commands.
  Keep documentation status consistent with actual owner-confirmed validation.

- [ ] T061 Refresh `graphify-out/graph.json` after implementation using
  `graphify update .` from the repository root; no installs/bootstrap. Expected: graph
  update succeeds and reflects changed code. If unavailable/failing, stop and give the
  owner the exact command and error without installing tools.

---

## Dependencies & Execution Order

- Completed Phases 0–2 are preserved. New IDs T016–T061 replace the previous unfinished
  Phase 3+ list; use these descriptions rather than older ID references.
- T016 approval/alignment is complete. T017 defines foundational
  checks; T018–T020 establish schema/migrations. T021–T030 implement the approved core.
  Owner validation uses T031; T032 seed and T033–T036 mobile infrastructure finish Phase 3.
- Phase 4 requires Phase 3 and the approved Phase 2 UI. T037/T038 tests precede
  T039–T043 implementation and T044 owner acceptance.
- Phase 5 requires sign-in; Phase 6 requires sign-in and is completed before final
  persistent-login acceptance. Shared auth context/client files are edited sequentially.
- Phase 7 follows all stories. T059 final acceptance precedes completion/status claims.

### Parallel opportunities (after their prerequisites)

- T023–T025 affect independent files after T016 decisions and environment/schema setup.
- T037/T038 test files can be authored independently after the test harness exists.
- T054–T056 documentation can be drafted independently after security behavior is settled.
- No parallel edits to auth context, controllers/routes, schema/migrations, or LoginForm.

## Implementation Strategy

Complete the security foundation, then sign-in, sign-out, session recovery, and final
acceptance. The MVP is customer sign-in plus validated persistent-session recovery;
registration and other academy workflows stay out of scope. Audit infrastructure supports
later administrative mutations without adding those endpoints now.

For every command or manual acceptance step, the owner runs it and reports the result;
the agent stops at that checkpoint. Never run installers, package managers, setup scripts,
or test suites on the owner's behalf. Do not change `specifications.md` or other feature
specifications without explicit approval. All UI edits must first inspect and strictly
follow `docs/design/mobile/high-fidelity/` and `docs/design/mobile/sticker-sheet/`, using
`docs/design/mobile/sticker-sheet/oak-sports-academy-logo.png` as the official crest.
