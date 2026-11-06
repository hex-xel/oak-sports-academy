---
status: active
owner: team
milestone: 1
---

# Development guide

## Configuration

The owner performs installs, environment setup, database provisioning and server
startup. Reuse the existing configured environment; do not repeat migrations, seeding
or database resets just to run a check. Private environment files are ignored.

- API: restricted runtime DATABASE_URL in apps/api/.env; privileged DIRECT_URL is
  reserved for migration tooling. Never use migration credentials in request handling.
- Mobile: EXPO_PUBLIC_API_URL in apps/mobile/.env includes /api/v1. Physical phones
  use the computer's reachable LAN address on the same Wi-Fi; Android emulators may
  use 10.0.2.2. Release requires HTTPS. Only this public API URL belongs on the client.
- Tests: apps/api/.env.test targets the guarded disposable local database, never the
  shared Supabase database. Stop if preflight refuses the configuration.
- Synthetic seed accounts use the owner's private seed settings. Enter passwords
  privately; never paste credentials, tokens or database URLs into reports.

Initial provisioning details are preserved in the [checkpoint archive](../docs/architecture/auth-checkpoint-history.md).
They include historical decisions; review them against the current schema before
using them for a new environment. Do not install or reset anything implicitly.

## Development and validation

From the repository root, run API and Metro in separate terminals:

```powershell
cd C:\Dev\School\oak-sports-academy
npm run dev -w apps/api
```

```powershell
cd C:\Dev\School\oak-sports-academy
npm run dev -w apps/mobile
```

Expected: API listens on its configured port (default 3000), and Metro reports its
connection. Press a for the existing Android emulator, or scan the QR code on a phone.
A phone browser should reach the configured API's /api/v1/health before sign-in.
If startup fails, stop and report redacted output; do not change security settings.

For tests, first open Docker Desktop and resume the existing disposable container:

```powershell
docker start oak-auth-tests
```

If the named container is missing, stop rather than recreate it. Run typechecks:

```powershell
.\node_modules\.bin\tsc.cmd -p packages/shared/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd -p apps/api/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd -p apps/api/tsconfig.tests.json --noEmit
.\node_modules\.bin\tsc.cmd -p apps/mobile/tsconfig.json --noEmit
```

Then run the regression suite using the installed runtime validated on this workstation:

```powershell
cd C:\Dev\School\oak-sports-academy\apps\api
& C:\Users\ventura\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe ../../node_modules/vitest/vitest.mjs run
```

Expected: all four typechecks exit 0, then 344 tests in 29 files pass with no unhandled
errors (later approved additions may increase the count). System Node 24.15.0 previously
showed intermittent HTTP worker exits; the validated runtime is Node 24.22.1. If that
installed path is unavailable, report it instead of installing a replacement implicitly.

For the synthetic password-only diagnostic, from apps/api:

```powershell
..\..\node_modules\.bin\tsx.cmd scripts/benchmark-password.ts
```

It prints ten-sample median/max durations only; it does not measure full login or
constant-time responses. Repeat on the actual deployment host before performance approval.

## Device troubleshooting

If Expo stalls loading, preserve safe diagnostics. The owner previously recovered by
stopping Metro, clearing its cache and reopening a fresh Expo process without deleting
app data. From the repository root:

```powershell
npm run dev -w apps/mobile -- --clear
```

Eventual recovery does not establish the startup timing target. After completing
360 dp/large-text accessibility review, the owner can restore emulator display settings:

```powershell
adb shell wm density reset
adb shell settings put system font_scale 1.0
```

## Validation limits

Functional native login, logout, expiry, TalkBack, offline retry and concurrent-401
recovery have recorded passes. A fresh-API phone run reached restoring in three seconds
against a two-second target; that issue is deferred, not waived. No deployed API host
has been identified for final password/full-login performance. Local results do not
certify release readiness. See the [acceptance guide](../specs/001-user-login/quickstart.md)
and [current tasks](../specs/001-user-login/tasks.md) for remaining work.
