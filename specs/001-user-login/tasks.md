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

- [ ] T008-UI [P] Review high-fidelity designs in `docs/design/mobile/high-fidelity/`
  and note the exact colours, typography, spacing, and copy for the login screen and
  home screen before writing any component code.

- [ ] T009-UI [P] Create the `TextField` primitive with label, value, onChangeText,
  error string, secureTextEntry, and accessibilityLabel props in
  `apps/mobile/components/TextField.tsx`.
  - Show an inline error message below the field when `error` is set.
  - Match the design spec from `docs/design/mobile/sticker-sheet/`.

- [ ] T010-UI [P] Create the `PrimaryButton` primitive with label, onPress, loading
  (shows a spinner and disables the button), and disabled states in
  `apps/mobile/components/PrimaryButton.tsx`.
  - Match the design spec from `docs/design/mobile/sticker-sheet/`.

- [ ] T011-UI Create the login route with keyboard avoidance and scroll handling in
  `apps/mobile/app/login.tsx`. Use a static mock `onSubmit` for now (console.log).

- [ ] T012-UI Build `LoginForm` using `TextField` and `PrimaryButton`: labelled email
  and password inputs, inline validation (empty check only for now), disabled-while-
  submitting state, and 360 dp minimum width layout in
  `apps/mobile/features/auth/LoginForm.tsx`.

- [ ] T013-UI Create the protected home screen (placeholder) showing a hard-coded
  "Signed in" message and a "Sign out" button stub in `apps/mobile/app/index.tsx`.

- [ ] T014-UI Create the root layout with a route guard that redirects unauthenticated
  users to `/login` (use a simple boolean flag for now, not a real auth context) in
  `apps/mobile/app/_layout.tsx`.

- [ ] T015-UI Manual design review: run the app on the device or emulator, navigate to
  the login screen, compare every element against the high-fidelity mockup in
  `docs/design/mobile/high-fidelity/`. Fix any visual gap before continuing.

**Checkpoint**: The login screen and home screen are visible on a device and match the
high-fidelity design. No real authentication yet — the form submits to a console.log.

---

## Phase 3: Foundational Backend (Blocking Prerequisites)

**Purpose**: Database, security primitives, token storage, and app shell.

**⚠️ CRITICAL**: No real authentication can work until this phase is complete.
The UI screens from Phase 2 are wired up in Phase 4 after this.

- [ ] T016 Create the Prisma schema with `Role`, `AccountStatus`, `User`, `Session`,
  and `SignInAttempt` per `data-model.md` in `apps/api/prisma/schema.prisma`

- [ ] T017 Apply the initial migration and generate the Prisma client:
  ```powershell
  npx prisma migrate dev --name init_auth
  npx prisma generate
  ```
  Run from `apps/api/`. Confirm the `oak_user`, `oak_session`, and `oak_sign_in_attempt`
  tables appear in the Supabase dashboard.

- [ ] T018 [P] Create the Prisma client singleton in `apps/api/src/lib/prisma.ts`

- [ ] T019 [P] Create Zod-validated environment loading that fails fast on missing
  `DATABASE_URL` in `apps/api/src/config/env.ts`

- [ ] T020 Create error classes and the Express error handler returning
  `{code, message, details?}` with no stack traces in
  `apps/api/src/middleware/error-handler.ts`

- [ ] T021 [P] Create per-address (10/15 min) and per-email (5/15 min) rate limiters
  with `Retry-After` in `apps/api/src/middleware/rate-limit.ts`

- [ ] T022 Create the Argon2id password service (hash, verify, constant dummy verify)
  with §4 parameters in `apps/api/src/modules/auth/password.service.ts`

- [ ] T023 Create the session service with 256-bit token generation, SHA-256 hashing,
  create/verify/revoke, and 8-hour expiry in
  `apps/api/src/modules/auth/session.service.ts`

- [ ] T024 [P] Create the SecureStore wrapper (get/set/delete, key constant) in
  `apps/mobile/lib/token-store.ts`

- [ ] T025 [P] Create `requireAuth` rejecting missing, expired, revoked, and unknown
  tokens with `401 UNAUTHENTICATED` in `apps/api/src/middleware/require-auth.ts`

- [ ] T026 [P] Create `requireRole(...roles)` returning `403 FORBIDDEN` when the role
  is not allowed in `apps/api/src/middleware/require-role.ts`

- [ ] T027 Wire Helmet, a 10 kB JSON body limit, `/api/v1` routing, `0.0.0.0` binding,
  and error handling in `apps/api/src/app.ts` and `apps/api/src/server.ts`

- [ ] T028 Create the shared auth types (`UserSummary`, `LoginResponse`, `ApiError`)
  and the error-code union in `packages/shared/src/auth-types.ts` and
  `packages/shared/src/error-codes.ts`

- [ ] T029 Create the seed script with verified, unverified, and suspended customer
  accounts, refusing to run when `NODE_ENV=production`, in
  `apps/api/prisma/seed.ts`. Then run it:
  ```powershell
  npx prisma db seed
  ```

- [ ] T030 Configure Vitest + Supertest with a `.env.test` database URL and a
  table-truncation helper in `apps/api/vitest.config.ts` and
  `apps/api/tests/helpers/db.ts`

- [ ] T031 [P] Create the mobile API client: base URL from `expo-constants`, JSON
  headers, bearer injection, and a typed `ApiError` in `apps/mobile/lib/api.ts`

- [ ] T032 Create the auth context exposing `user`, `status`
  (`restoring|signedOut|signedIn`), `signIn`, `signOut` in
  `apps/mobile/lib/auth-context.tsx`

**Checkpoint**: Schema migrated, seed data exists, services are unit-testable, the API
client and auth context are ready to wire into the UI screens from Phase 2.

---

## Phase 4: User Story 1 - Sign in on the app (Priority: P1) 🎯 MVP

**Goal**: Wire the Phase 2 UI screens to the Phase 3 backend. A seeded customer signs
in on the device and reaches the home screen.

**Independent Test**: Launch the app with the seeded verified account, sign in, confirm
the home screen; then confirm wrong credentials and an unverified account behave as
specified.

### Tests for User Story 1 ⚠️

> Write these first; confirm they fail before implementing T036–T038.

- [ ] T033 [P] [US1] Service tests for valid login, wrong password, unknown email
  (parity), unverified, and suspended accounts in
  `apps/api/tests/auth/login.service.test.ts`

- [ ] T034 [P] [US1] API tests for the `X-Client-Platform` guard, 200 token shape with
  no `Set-Cookie`, 400 validation, 401 parity, 403 unverified, and 429 in
  `apps/api/tests/auth/login.api.test.ts`

### Implementation for User Story 1

- [ ] T035 [P] [US1] Create the strict Zod login schema plus the client-platform check
  in `apps/api/src/modules/auth/auth.schemas.ts`

- [ ] T036 [US1] Implement the login service: lookup, dummy-hash verify, status checks,
  attempt recording, session creation in `apps/api/src/modules/auth/auth.service.ts`

- [ ] T037 [US1] Implement `POST /auth/login` and `GET /auth/session` returning the
  bearer token and `expiresAt` in `apps/api/src/modules/auth/auth.controller.ts` and
  `apps/api/src/modules/auth/auth.routes.ts`

- [ ] T038 [US1] Register the auth router under `/api/v1` with the login rate limiters
  in `apps/api/src/app.ts`

- [ ] T039 [US1] Replace the mock `onSubmit` in `LoginForm` with `useLogin`: calls the
  API, stores the token in SecureStore, updates auth context, and routes to `/` in
  `apps/mobile/features/auth/useLogin.ts` and `apps/mobile/features/auth/LoginForm.tsx`

- [ ] T040 [P] [US1] Map API error codes to enumeration-safe user-facing copy in
  `apps/mobile/features/auth/messages.ts`

- [ ] T041 [US1] Update the root layout to use the real auth context (replace the
  placeholder boolean flag from T014-UI) in `apps/mobile/app/_layout.tsx`

- [ ] T042 [US1] Update the home screen to show the real signed-in email and role from
  the auth context in `apps/mobile/app/index.tsx`

- [ ] T043 [US1] Add retry and offline states to the form, with the button re-enabled
  after failure, in `apps/mobile/features/auth/LoginForm.tsx`

- [ ] T044 [US1] Run the device acceptance pass in `quickstart.md` §5
  (sign-in and failure rows)

**Checkpoint**: MVP works end to end on a device.

---

## Phase 5: User Story 2 - Sign out (Priority: P2)

**Goal**: Sign-out revokes the server session and deletes the device token.

**Independent Test**: Copy the stored token, sign out, replay it against
`/auth/session` → 401.

### Tests for User Story 2 ⚠️

- [ ] T045 [P] [US2] API tests for revocation, idempotent logout, and rejection of a
  replayed token in `apps/api/tests/auth/logout.api.test.ts`

### Implementation for User Story 2

- [ ] T046 [US2] Add `revokeSession` for the current token and expired sessions in
  `apps/api/src/modules/auth/session.service.ts`

- [ ] T047 [US2] Implement `POST /auth/logout` returning 204 and tolerating a missing
  session in `apps/api/src/modules/auth/auth.controller.ts` and
  `apps/api/src/modules/auth/auth.routes.ts`

- [ ] T048 [US2] Add sign-out to the auth context: revoke remotely, delete from
  SecureStore, reset state in `apps/mobile/lib/auth-context.tsx`

- [ ] T049 [US2] Wire the sign-out button on the home screen to the auth context
  sign-out function in `apps/mobile/app/index.tsx`

- [ ] T050 [US2] Verify offline sign-out still clears the local token and returns to
  login

---

## Phase 6: User Story 3 - Session expiry and recovery (Priority: P3)

**Goal**: An expired or revoked session returns the user to login without crashing.

**Independent Test**: Invalidate the token in the database, reopen the app, confirm
the login screen with a "session ended" note and no error screen.

### Tests for User Story 3 ⚠️

- [ ] T051 [P] [US3] API tests proving expired, revoked, and fabricated tokens all
  return identical 401 in `apps/api/tests/auth/session.api.test.ts`

### Implementation for User Story 3

- [ ] T052 [US3] Implement launch restore: read the token, set `signedIn`
  optimistically, validate in the background, clear on 401 in
  `apps/mobile/lib/auth-context.tsx`

- [ ] T053 [US3] Add a single 401 handler in the API client that clears the token and
  redirects to login once, without loops in `apps/mobile/lib/api.ts`

- [ ] T054 [US3] Preserve the intended route and return to it after re-login via a
  `next` parameter in `apps/mobile/app/login.tsx`

- [ ] T055 [US3] Show a "session ended" notice after an expiry redirect in
  `apps/mobile/features/auth/messages.ts`

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T056 [P] Write the authentication architecture note (sequence, token storage,
  expiry, rate limits, limitations) in `docs/architecture/auth.md`

- [ ] T057 [P] Write `ADR-0001` recording opaque bearer sessions over JWT, with
  alternatives, in `docs/decisions/ADR-0001-opaque-sessions.md`

- [ ] T058 Review responses, logs, and the app for token, hash, and internal-detail
  leakage in `apps/api/src/modules/auth/` and `apps/mobile/lib/`

- [ ] T059 Document the WebView handoff decision and its §4 constraint in
  `docs/architecture/webview-strategy.md`

- [ ] T060 Update `docs/index.md` status and next-up after the feature is merged

- [ ] T061 Run `graphify extract . --code-only` followed by `graphify update .`
  once all code is in place

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (Prerequisites)**: no dependencies — do this first, once only
- **Phase 1 (Monorepo Setup)**: depends on Phase 0
- **Phase 2 (UI Design)**: depends on Phase 1 — can start before Phase 3
- **Phase 3 (Backend)**: depends on Phase 1 — can run in parallel with Phase 2
- **Phase 4 (US1 — Sign in)**: depends on Phase 2 AND Phase 3
- **Phase 5 (US2 — Sign out)**: depends on Phase 4 (needs a session to revoke)
- **Phase 6 (US3 — Session expiry)**: depends on Phase 4
- **Phase 7 (Polish)**: after all user stories are accepted

### Within Phase 4 (US1)

Tests (T033, T034) → schema (T035) → service (T036) → routes (T037, T038) →
wire UI (T039, T040, T041, T042) → resilience (T043) → device pass (T044).

### Parallel Opportunities

- T003, T004, T005, T006 (Phase 1) create separate packages or files
- T009-UI, T010-UI (Phase 2) are independent component files
- T018, T019, T021, T024, T025, T026 (Phase 3) are independent files
- T031 (API client) and T032 (auth context) are independent
- T033 and T034 (test files) are independent
- T056, T057, T059 (Phase 7 docs) are separate documents

---

## Implementation Strategy

### Recommended path

```
Phase 0  → confirm environment is ready
Phase 1  → monorepo boots
Phase 2  → login UI visible on device, reviewed against designs
Phase 3  → backend services, schema migrated, seeded
Phase 4  → end-to-end sign-in works (MVP checkpoint)
Phase 5  → sign-out
Phase 6  → session expiry
Phase 7  → docs, ADR, graph rebuild
```

### Why UI before backend?

The design can be reviewed and iterated on a device without a database.
Catching a layout or copy issue in Phase 2 is cheaper than catching it after
the API is wired. Phase 2 is also the right point to compare the running app
against `docs/design/mobile/high-fidelity/`.

## Notes

- File conflicts: `auth.service.ts` only in Phase 4 (US1); `auth.controller.ts` and
  `auth.routes.ts` in Phases 4 and 5; `auth-context.tsx` in Phases 5 and 6;
  `LoginForm.tsx` in Phase 2 and updated in Phase 4. Those tasks are sequential,
  never parallel.
- Never log passwords, tokens, or full request bodies.
- Do not import `expo-secure-store` from `packages/shared` or any web-targeted code.
- Per the project Execution Boundary: the agent writes files and gives you the exact
  commands to run; you run them and report the output.
