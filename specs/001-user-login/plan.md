# Implementation Plan: User Login (Mobile)

**Branch**: `feat/user-login` | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-user-login/spec.md`

## Summary

Add customer authentication to the monorepo's first client: an Expo (React Native) app
with a native login screen, SecureStore token persistence, and an auth context that
restores the session on launch. The Express API gains an auth module backed by Prisma
(User, Session, SignInAttempt) using Argon2id and opaque bearer tokens. No web client is
built in this feature; the API is shaped so a cookie-based web login can be added later
without changing the service layer.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 LTS, Expo SDK (current stable), npm
workspaces

**Primary Dependencies**: Express 4, Zod, argon2, express-rate-limit, Helmet, Prisma 6,
Expo Router, `expo-secure-store`, React Native core components. No dependency beyond the
approved baseline in `specifications.md` §2.

**Storage**: PostgreSQL (Supabase free plan) through Prisma migrations; device token in
Expo SecureStore

**Testing**: Vitest (services), Supertest (API). Mobile unit tests are not added in this
feature because the approved testing baseline does not include a React Native test
runner; the app is verified on a device/emulator against the acceptance scenarios.

**Target Platform**: Android (Expo dev build or Expo Go for early checks); API on Node

**Project Type**: Mobile app + REST API monorepo

**Performance Goals**: Sign-in API p95 under 700 ms server time excluding network; session
restore on launch under 2 s without a network call to the login screen.

**Constraints**: Bearer token only for this client (no cookie, no CSRF surface yet);
Argon2id parameters from §4; physical device must reach the API over the LAN, so the base
URL is configuration, not `localhost`; free-tier API cold starts may take 30–60 s and must
surface as a retry state.

**Scale/Scope**: Under 1,000 accounts, roughly 50 concurrent users; one login screen, four
endpoints, two tables plus an attempt log.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unedited template, so it defines no gates.
The governing rules remain `specifications.md` §11 and §14 plus the security constraints
in §4–§6:

| Gate | Status |
| --- | --- |
| Native app, not a WebView wrapper (§2) | Pass — login is native; WebView use is deferred and bounded |
| Mobile session in Expo SecureStore (§4) | Pass — FR-007, T016 |
| Server-managed opaque sessions, no JWT | Pass — §4 |
| Argon2id password hashing | Pass — §4 |
| Backend-enforced authorization | Pass at the API level; role screens are later features |
| Tests for authentication and rate limiting | Pass — §12, Phases 2–5 |
| No secrets in client code or logs | Pass — FR-007, FR-013 |

**Post-design re-check**: unchanged; no violations.

## Client Architecture and the WebView Question

The customer web app arrives next semester, so the temptation is to build everything in
WebView now and reuse it. That conflicts with two approved rules:

1. §2 says the mobile app must be a genuine native app, not a WebView-only wrapper.
2. §4 says the mobile token lives in Expo SecureStore and travels in an authorization
   header — a WebView page would instead rely on cookies inside the WebView.

**Decision for this feature**: the login screen is native. WebView reuse is a later,
separate decision with these constraints recorded now:

- Only content-heavy, low-interaction screens (schedules, announcements, program pages)
  are candidates for WebView. Auth and account actions stay native.
- A WebView page that needs the session must receive a **short-lived, single-use handoff
  code** exchanged server-side for a cookie; never the bearer token in a URL.
- Anything built for WebView must be responsive from 360 dp and share no browser-only
  APIs, so the same routes can be exposed as the customer website later.
- Adopting WebView for any *auth* screen requires an amendment to `specifications.md` §4;
  it must not be slipped in during implementation.

## Project Structure

### Documentation (this feature)

```text
specs/001-user-login/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/auth.openapi.yaml
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/api/
├── prisma/
│   ├── schema.prisma            # User, Session, SignInAttempt
│   ├── migrations/
│   └── seed.ts                  # accounts for customer scenarios
├── src/
│   ├── config/env.ts
│   ├── lib/prisma.ts
│   ├── middleware/
│   │   ├── error-handler.ts
│   │   ├── require-auth.ts
│   │   ├── require-role.ts
│   │   └── rate-limit.ts
│   ├── modules/auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.schemas.ts
│   │   ├── password.service.ts
│   │   └── session.service.ts
│   ├── app.ts
│   └── server.ts
└── tests/auth/

apps/mobile/
├── app/
│   ├── _layout.tsx              # providers + auth gate
│   ├── login.tsx
│   ├── index.tsx                # customer home (protected)
│   └── forbidden.tsx
├── components/
│   ├── TextField.tsx
│   └── PrimaryButton.tsx
├── features/auth/
│   ├── LoginForm.tsx
│   ├── useLogin.ts
│   └── messages.ts              # error-code to copy mapping
├── lib/
│   ├── api.ts                   # fetch wrapper, base URL, 401 handling
│   ├── token-store.ts           # SecureStore read/write/delete
│   └── auth-context.tsx         # restore, signIn, signOut, user state
└── app.json / app.config.ts     # API base URL via extra

packages/shared/
└── src/
    ├── auth-types.ts            # request/response types
    └── error-codes.ts           # shared error-code union
```

**Structure Decision**: Matches `specifications.md` §9 for `apps/api` and `apps/mobile`
(`app/`, `components/`, `features/`, `lib/`). `apps/web` stays empty until the staff/admin
web client feature; nothing in this feature should assume a browser exists.

## API design consequences of mobile-first

- `POST /auth/login` returns `{ user, landingPath, sessionToken }` for native clients and
  sets no cookie.
- All authenticated requests use `Authorization: Bearer <token>`.
- There is no CSRF surface yet. When the web client is added, it will use an HttpOnly
  cookie and an origin check; the controller gains a second transport without changing the
  auth service.
- `POST /auth/logout` requires a valid bearer token and is idempotent.

## Phase Plan

- **Phase 0 (research)**: [research.md](./research.md) — token transport, SecureStore,
  session restore, rate limiting, device networking, WebView handoff.
- **Phase 1 (design)**: [data-model.md](./data-model.md),
  [contracts/auth.openapi.yaml](./contracts/auth.openapi.yaml),
  [quickstart.md](./quickstart.md).
- **Phase 2 (tasks)**: [tasks.md](./tasks.md).

## Risks

- **Physical-device networking** is the most common first-day blocker: `localhost` on a
  phone points at the phone. Use the machine's LAN address and allow the port through the
  firewall.
- **SecureStore does not exist on web**, so the token-store module must be mobile-only and
  never imported by shared code.
- **Rate limiting in memory** resets on restart and is per instance — acceptable for one
  instance, revisit before deployment.
- **Cold starts** on free hosting require a retry state on the login screen.
- **WebView pressure**: later features may want to reuse web pages for auth. The handoff
  code and the §4 amendment requirement are written down so that decision is deliberate.
