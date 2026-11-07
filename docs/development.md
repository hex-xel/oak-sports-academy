---
status: active
owner: team
milestone: 1
---

# Development guide

## Registration setup — T003

### Mobile verification dependency — T011

The native registration lifecycle needs secure operation UUIDs via Expo Crypto. Owner:
from `apps/mobile`, run `npx expo install expo-crypto`; success adds an SDK-compatible
package and updates the root lockfile. No Expo/React upgrade or new UI framework.
On failure stop and share the redacted error. [Expo Crypto documentation](https://docs.expo.dev/versions/latest/sdk/crypto/).
Then follow [native registration validation](architecture/registration.md#owner-validation).
Do not run live phone registration until the later reviewed development-database
migration/provider checkpoint; local tests have not migrated Supabase.

### Resend adapter configuration — T009

T010 now mounts the four registration credential/progress routes lazily. The development
Supabase database still needs the reviewed registration migrations before real device
registration; local-only migration checks did not update it. Follow the later explicit
provider/device checkpoint, not an ad-hoc production/shared database command.

The owner already saved RESEND_API_KEY and REGISTRATION_EMAIL_FROM in the ignored
`apps/api/.env`. Preserve them. No real domain is configured yet; use the test sender
only with the email address belonging to the owner's Resend account. Do not paste
keys, OTPs or private email addresses into chat.

Add these two settings privately, replacing the descriptions with actual values:

```dotenv
REGISTRATION_TEST_RECIPIENT=YOUR_RESEND_ACCOUNT_EMAIL
REGISTRATION_OTP_HMAC_KEY=YOUR_INDEPENDENT_64_CHARACTER_LOWERCASE_HEX_SECRET
```

If the OTP key is not already configured, the owner generates it once in their private
terminal (keep its output private), then copies it into the .env value:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Do not regenerate an existing key during a verification flow or reuse the Resend API
key/seed password as the HMAC key. These settings have no EXPO_PUBLIC_/NEXT_PUBLIC_
equivalent. A missing/invalid key fails configuration rather than bypassing verification.

From `C:\Dev\School\oak-sports-academy\apps\api`, run:

```powershell
..\..\node_modules\.bin\tsx.cmd scripts/check-registration-env.ts
```

Expected: “Registration email configuration is valid. No email was sent.” The script
checks shape/configuration only, not real API-key validity, DNS or delivery. On failure,
report variable names/error text only, never values. No restart is needed for this
standalone check. T010 will wire the configured service; T012 checks actual receipt.

`onboarding@resend.dev` is rejected in production and requires an explicit development
test recipient. The adapter **rejects** other recipients; it never redirects a code
for someone else's address to the owner's mailbox. To send to other students later,
verify an owned domain, configure its sender, and review/remove the development
recipient restriction deliberately. No domain purchase or DNS change is performed here.

See [Resend errors/test restrictions](https://resend.com/docs/api-reference/errors),
[send-email API](https://resend.com/docs/api-reference/emails/send-email) and
[idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).

For T006's guarded local migration, generated-client and restricted-database checks,
follow [registration data validation](architecture/registration.md#owner-validation).
Use its fixed-loopback helper, not a direct `prisma migrate deploy` using development
settings. Do not apply the new registration migrations to Supabase yet.

The owner approved the [Admin proposal](design/web/high-fidelity/registration-admin-proposal.html)
by directing work to continue. This is design approval, not production acceptance.
Two packages are needed now: Expo ImagePicker for local image selection, and Sharp for
bounded full server decoding. No email/Storage SDK or new test framework is needed.

Owner: run these commands in PowerShell, one block at a time:

```powershell
cd C:\Dev\School\oak-sports-academy\apps\mobile
npx expo install expo-image-picker
```

Success: SDK-compatible picker is added to the mobile manifest and root lockfile;
command exits without error. It is included in Expo Go. Do not upgrade Expo/React or
use `--fix` to resolve a warning automatically. If it fails, stop and report the
redacted error. T017 will configure selection of existing images, without camera/audio.

```powershell
cd C:\Dev\School\oak-sports-academy
npm install sharp@0.35.5 -w apps/api --save-exact
```

Success: Sharp 0.35.5 is recorded in the API manifest/root lockfile, install exits 0.
Retain the validated Node 24 runtime (Sharp needs Node-API v9). On native binary errors,
stop and report rather than installing compilers globally or forcing resolution.
T013 must restrict formats, bytes, dimensions and decode resources; reading image
metadata alone is insufficient validation.

The web folder has no package manifest. Defer its installation to T020, when the
Next.js/React/React DOM and TypeScript/Tailwind versions are reviewed together. Do not
run create-next-app over this repository or change mobile React to initialize web.

### Provider preparation — owner only

1. **Resend:** prepare a verified academy-controlled sender/domain and a private test
   recipient; check account restrictions in the dashboard. Keep the API key private.
   A testing sender may restrict recipients; actual receipt is checked in T012.
2. **Supabase development Storage:** create `registration-documents` as a **private**
   bucket. Allow only `image/jpeg` and `image/png`; maximum 5 MiB (5,242,880 bytes).
   Leave Public disabled and add no anonymous upload/read policies. Preserve other
   buckets/data. Server validation will also enforce the minimum image bounds.
3. Prepare these server-only settings privately for the upcoming adapters:
   `RESEND_API_KEY`, `REGISTRATION_EMAIL_FROM`, `REGISTRATION_OTP_HMAC_KEY` (independent
   cryptographically random secret, at least 32 bytes), `SUPABASE_URL`,
   `SUPABASE_STORAGE_KEY`, `REGISTRATION_STORAGE_BUCKET=registration-documents`.
   Current API env validation does not consume these settings yet. No keys in
   EXPO_PUBLIC_/NEXT_PUBLIC_ variables, chat or screenshots. Storage privileges belong
   only in the server storage adapter, never Prisma. Preserve restricted DATABASE_URL.
4. **Synthetic Admin:** the existing seed only creates Students. A guarded insert-only
   verified ACTIVE Admin seed and explicit owner command must be supplied before
   T019–T020 browser acceptance. Do not promote an existing Student, substitute a
   Supabase Auth account or run ad-hoc SQL. No Admin seed is ready to run yet.

Report installation results and whether sender/bucket preparation is complete or
blocked, without keys or private settings. No database reset/migration, seed or server
restart is needed now. Live provider and Admin acceptance remain pending.

Sources: [Expo picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/),
[Sharp installation](https://sharp.pixelplumbing.com/install/),
[Sharp decoder limits](https://sharp.pixelplumbing.com/api-constructor/),
[Supabase buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets),
[Resend API](https://resend.com/docs/api-reference/emails/send-email),
[Next.js installation](https://nextjs.org/docs/app/getting-started/installation).

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

## Registration T012 development checkpoint

The owner confirmed project `ewycpsuzzfonoolvhyeu` is development/testing. Do not
change private URLs to another target to bypass the checkpoint. Connection options
follow [Supabase's Prisma connection guidance](https://supabase.com/docs/guides/database/prisma);
this project retains its restricted `oak_api` runtime role and separate migration login.

First run the new focused checks, with the existing guarded disposable database
available. Stop on the first failure and report redacted output:

```powershell
cd C:\Dev\School\oak-sports-academy
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.tests.json --noEmit
cd apps/api
& C:\Users\ventura\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe ../../node_modules/vitest/vitest.mjs run tests/registration/registration.api.test.ts tests/registration/submission.db.test.ts
```

Expected: both typechecks and both focused suites pass. No full regression is required
at this checkpoint. Existing T011 mobile suite evidence is retained.

After those pass, the owner runs this **read-only** development check from `apps/api`:

```powershell
node --import tsx scripts/check-registration-development.ts
```

It privately loads `.env`, requires explicit `NODE_ENV=development`, validates both
connection targets/TLS/roles, checks restricted runtime access and migration history,
and prints a pending count. It never prints URLs or raw Prisma diagnostics. Expected
first run: three pending registration migrations, no changes. Report this result
before proceeding. Unexpected history, role or target is a stop condition.

Once reviewed, this separate owner command applies the existing additive migrations:

```powershell
node --import tsx scripts/check-registration-development.ts --apply
```

Expected: zero pending migrations and the registration table-security checkpoint passes.
The helper captures migration output privately and never resets, seeds or repairs history.
On failure, stop: some migrations may already have applied; report its safe stage message.
Do not rerun with a different target or use `migrate dev`, `db push` or `migrate reset`.
It does not test the provider, all function ACLs or native UI; local restricted-DB suites
and the real receipt check remain necessary. The owner restarts the API afterward to
load current registration configuration, then performs the [T012 phone checkpoint](../specs/002-student-registration/quickstart.md#t012-checkpoint).
Finally run `graphify update .` from the repository root. No agent executes these steps.

## T013 algorithm demo

The [algorithm implementation demo guide](milestone-1/algorithm-implementation-demo.md)
contains the focused typechecks, real-decoder suite, offline runner and professor
walkthrough. It requires no environment configuration, database, Expo or real document.
No new dependency is needed; Sharp was installed at T003. Owner validation is pending.

## Validation limits

Functional native login, logout, expiry, TalkBack, offline retry and concurrent-401
recovery have recorded passes. A fresh-API phone run reached restoring in three seconds
against a two-second target; that issue is deferred, not waived. No deployed API host
has been identified for final password/full-login performance. Local results do not
certify release readiness. See the [acceptance guide](../specs/001-user-login/quickstart.md)
and [current tasks](../specs/001-user-login/tasks.md) for remaining work.
