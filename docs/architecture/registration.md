---
status: in-progress
owner: team
milestone: 1
---

# Registration data boundary

## T013 image screening — written, owner validation pending

`apps/api/src/modules/documents/image-validation.ts` exports
`validateRegistrationImage({ bytes, fileName, mimeType, declaredByteSize? })`.
It accepts actual buffers only, enforces 5120–5242880 bytes and matching declarations,
compares fixed PNG/JPEG signatures, and uses installed Sharp 0.35.5 for metadata and
complete original-resolution raw decoding. Limits: 400px minimum per side, 8192px
maximum per side, 16M pixels, four channels, five-second native processing timeout.
The timeout does not include worker queue waiting; T016 must bound requests/concurrency.

Return data contains an owned byte snapshot, canonical MIME, actual dimensions/size,
SHA-256 and independent UUID filename. A trusted T014 caller must preserve that snapshot,
construct an ownership-scoped private key, and never expose returned bytes in JSON.
The module has no storage, DB, filesystem or remote-fetch side effects. Errors use
UPLOAD_INVALID with a static internal category, discarding codec diagnostics.
It does not perform OCR, prove document authenticity or detect all malware/polyglots.

The owner approved correcting the proposal's complete-pipeline O(1) space claim:
signature matching is O(1), complete snapshot/hash/decode costs bounded O(n+p) work
and memory. JPEG APP marker examples are clarified as non-exhaustive; decoding must
validate the format. The focused real-decoder suite and offline production-code demo
are documented in the [algorithm demo guide](../milestone-1/algorithm-implementation-demo.md).
T013 remains unchecked until owner validation passes; upload integration is T014–T017.

## T012 integrated checkpoint — passed

Owner evidence 2026-11-07: both API typechecks and both focused registration suites
passed. Development preflight passed with three pending migrations; owner invoked
the guarded `--apply` command and reported migration/table-security checkpoint passed.
Connections now use TLS-required session pooling on port 5432; the privileged migration
connection remains separate from the restricted runtime. Owner confirmed real OTP
email received on the phone, wrong code rejected, and valid code reached Personal
Information. T012 is complete; this does not certify all cloud ACLs, final submission
or native keyboard/TalkBack acceptance (T029).

US1 coverage reuses the existing contract/provider and restricted-database groups.
Two additional database cases exercise the mounted HTTP routes through the real
restricted service and competing same-email starts with different passwords. Neither
uses a live sender or Supabase. Owner execution passed without errors.

The owner-only `apps/api/scripts/check-registration-development.ts` loads private
configuration only when invoked, pins the confirmed development project
`ewycpsuzzfonoolvhyeu`, separates `oak_api` runtime from `postgres` migration access,
and rejects unexpected or failed migration history. Default execution is read-only;
explicit `--apply` invokes Prisma deploy for the expected pending migrations and checks
registration-table RLS, ownership and grants. This is a checkpoint, not a complete
schema-drift/function-ACL audit. No database reset, seed or history repair is performed.
Pure URL guard cases and the script are included in owner-run test typechecking.

The [development guide](../development.md#registration-t012-development-checkpoint)
contains the command sequence; the [acceptance guide](../../specs/002-student-registration/quickstart.md#t012-checkpoint)
records the US1 matrix and owner OTP receipt evidence. T012 is complete.

## T004 foundation — schema validated, database checks pending

[Feature plan](../../specs/002-student-registration/plan.md) and
[logical model](../../specs/002-student-registration/data-model.md) define the flow.
`apps/api/prisma/schema.prisma` now represents eight registration records;
`20261107090000_registration_foundation/migration.sql` creates them additively.
Existing auth/session functions, account eligibility and applied migration files are
unchanged. No database migration has been applied by an agent.

Application/account identity is one-to-one. DRAFT/SUBMITTED stage is separate from
assessment status. ENROLLED is reserved; no enrollment/deletion is implemented.
Foreign-key deletes use RESTRICT to prevent account cascades into registration evidence.
New instants use timestamptz(3); dateOfBirth uses DATE. T015 must calculate age on the
Manila submission date under lock. SQL requires all minor guardian fields; the service
normalizes adult guardian fields to NULL. Details do not prove guardian authority.

Capabilities store only a token hash, challenge version and verification/expiry data,
with at most one-hour lifetime. One current challenge per application rotates ID,
version and keyed digest on resend. Ten-minute expiry and sixty-second cooldown are
separate constraints. Runtime/Admin cannot directly read proof/challenge tables.
T005/T008 still need closed bootstrap functions, proof validation and issue quotas.

Consent precedes document metadata through a same-application composite foreign key.
Document rows represent upload attempts with server keys, checksums and screened image
metadata. Decode must finish before a PENDING row is inserted; READY follows successful
Storage upload. A partial unique index limits ATTACHED documents to one per slot.
No file contents, URLs or bucket changes are included in this migration. Decoder
resource/pixel caps remain T013; SQL dimensions are not full image validation.

Email records store provider metadata only, never plaintext OTPs/tokens/message bodies.
Per-operation/per-event uniqueness supports idempotency. SENT requires provider receipt
metadata, not guaranteed inbox delivery. Payload comparison, version locking and
provider idempotency-key expiry handling remain service work. No worker is installed.

## Grants and RLS

- All eight tables are migration-role-owned with RLS enabled. PUBLIC and Supabase
  API grants are explicitly removed. Runtime receives no registration write grants.
- `oak_registration_owner` is NOLOGIN/non-owner/non-BYPASSRLS. Runtime gets no role
  membership. Initial grants only read applications and safe account projection
  columns; future closed functions must receive separately reviewed minimum grants.
- Admin SELECT policies validate the existing live session through
  `oak_registration_is_admin()`, then limit review data to submitted applications.
  Capabilities/challenges remain unreadable to runtime, including Admin.
- Existing self-only users policies are unchanged. The narrow
  `oak_registration_account(application UUID)` returns only id, email, displayName
  and emailVerifiedAt for an Admin reviewing a submitted application. No password
  hash, session issue or broad users runtime grant. Endpoint permissions/bounded
  queries remain T021.
- Functions use fixed search paths with PUBLIC/Supabase execution removed. Pending
  applicant access remains T005; Admin mutation/audit atomicity remains T022. CHECK
  constraints alone do not implement workflow transition authorization.
- The owner's verified `_prisma_migrations` RLS setting is recorded additively without
  editing migration history rows or enabling FORCE RLS.

## Owner validation

### T011 native credentials and verification — owner validated

Visually inspected the original mobile registration credentials/OTP and sticker-sheet
references through reduced crops (full source dimensions exceed the viewer limit).
Existing six-box modal, forest/gold actions, labels, borders and spacing remain.
New states use existing InlineNotice/PrimaryButton/OutlineButton components.

`apps/mobile/lib/registration-api.ts` is independent from the login transport's
unauthorized callback: no session-token read, Authorization Bearer, cookies or normal
login invalidation. It validates response DTOs and gives each explicit request one
bounded attempt including decoding. Decoded response text is size-checked; React Native
fetch is not claimed to provide a streaming download byte cap. Server JSON remains
bounded. Registration 401s affect only this registration.

`registration-store.ts` uses only `oak.registration.flow`. It stores original operation,
email/type and optional proof/timing in SecureStore, never password, OTP, personal/contact
profile or files. `registration-state.ts` follows the existing observable auth-factory
pattern: serialized I/O, generation checks, explicit retries and server-confirmed restore.
Cached flags never advance the wizard. A failed proof write hides verified advancement
and requires storage retry/reconfirmation; failed cleanup blocks replacement. A lost
request preserves the original operation for private password re-entry, never email-only
recovery. Unmount/reset invalidates old callbacks so late replies cannot restore proof.

The wizard saves operation metadata before start, clears password/confirmation after
accepted response, and advances to Personal Information only after server verification
and secure write. Accepted email/type are locked; explicit “Use another email” clears
local entries and this flow's secure context without deleting the remote account.
Credentials copy explains early account-data storage and local-only profile/files.

The OTP sheet uses server codeExpiresAt and resendAfter independently; sixty seconds
no longer means code expiry. It covers incorrect/expired/limited code, busy, network
uncertainty, server reconfirmation and secure-storage retry. Code clears on close/new
challenge. The card scrolls under keyboard/large text and progress/errors use existing
accessible controls. Actual native keyboard/TalkBack/visual acceptance is pending, not
proved by source or mocked tests. Text never claims a message was sent from a generic
202 acknowledgment. The old preview final-submit success is disabled until T017.

An additional Expo SDK module is necessary for secure operation UUIDs: `expo-crypto`
provides randomUUID and is included in Expo Go. No framework/test runner is added.
The owner installs it using Expo's SDK-compatible selector before validation:

```powershell
cd C:\Dev\School\oak-sports-academy\apps\mobile
npx expo install expo-crypto
```

Expected: SDK-compatible module added to mobile manifest/root lockfile. Stop and report
errors; do not upgrade Expo/React or force dependency fixes. Then run:

```powershell
cd C:\Dev\School\oak-sports-academy
.\node_modules\.bin\tsc.cmd --project apps/mobile/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.tests.json --noEmit
cd apps\api
& C:\Users\ventura\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe ../../node_modules/vitest/vitest.mjs run tests/mobile
```

Expected: both typechecks and mobile adapter/state suites pass. New cases cover separate
transport/storage, timeout, operation-before-dispatch, password/code exclusion, failed
secure write/delete, restored-proof confirmation and stale/double dispatch. They do not
replace device review. No DB/server restart or migration is needed for these checks.
Refresh `graphify update .` from root afterward (includes latest T010/T011 code).

Do not submit live registration on the phone until T012's reviewed Supabase development
migration/provider checkpoint. Its schema is still unchanged by local tests. Profile
submission/private files remain T017; no account activation/enrollment is claimed.

References: [Expo Crypto](https://docs.expo.dev/versions/latest/sdk/crypto/),
[SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

### T010 registration HTTP routes — owner validated

`registration.routes.ts` mounts only start, verify-email, resend-code and current
progress. The configured service is loaded once per app on the first valid request;
app construction/health/login do not read registration environment or connect to DB.
`AppOptions.registration` is a server-owned operation seam for tests, not request input.
Controller loading and configuration are lazy; validation precedes service invocation.

Every route requires exactly one X-Client-Platform: mobile. Proof routes require one
canonical X-Registration-Token; duplicate/combined/missing values reject. Any ordinary
Authorization header rejects, including mixed identities. Query/unknown claims reject,
POST uses application/json under the unchanged global 10 KiB parser, and no cookie or
Student session is issued. Response projections exclude internal service fields, file
keys and hashes; progress never echoes proof. Start/resend remain delivery-unconfirmed.
Uploads/agreements/finalize are not mounted until T016, with no misleading success stub.

Independent HTTP quota stores cover start+resend IP 10/15 min, normalized-start-email
5/15 min, verify IP 30/15 min and hashed proof 5/15 min. Successful/failed attempts count.
Existing global/login quotas and strict trusted-proxy behavior are unchanged. SQL still
owns actual account issue/challenge attempts across proof rotations. HTTP memory stores
reset on restart and are not distributed; they do not replace SQL authorization/quotas.

The pure `registration.errors.ts` keeps Retry-After handling independent of database/
environment imports. SQL cooldown/attempt errors become VERIFICATION_LIMITED with
bounded 1–900-second headers; middleware quotas return RATE_LIMITED with their reset
timing. The existing safe handler strips all raw server/provider diagnostics.

HTTP cases in the existing registration suite inject an operation backend and verify
status/projection, headers, parser bounds, quotas, forwarded-IP spoofing and lazy input
validation. They are wiring checks; T008's restricted service/DB cases remain separate.
One integrated actual provider/route/device check remains T012. No SQL changed in T010.

Owner commands (no migration, generation, real email or server restart needed):

```powershell
cd C:\Dev\School\oak-sports-academy
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.tests.json --noEmit
cd apps\api
& C:\Users\ventura\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe ../../node_modules/vitest/vitest.mjs run tests/registration/registration.api.test.ts tests/auth/login.api.test.ts tests/middleware/app.test.ts tests/security/rate-limit.test.ts
```

Expected: both typechecks/four suites pass. Stop and report safe failures. Refresh
Graphify from root after success. Before any live registration request, review/apply
the validated registration migrations to the explicitly selected Supabase development
database in the later provider/device checkpoint; local tests did not migrate Supabase.
Do not exercise real routes against its old schema or substitute migration credentials
for restricted runtime access. T011 native integration/T012 real delivery remain pending.

### T009 bounded email adapter — owner validated

`src/lib/email.ts` supplies a dependency-free Resend HTTP OTP sender: fixed HTTPS
endpoint, no redirects, one request per invocation, stable challenge-bound idempotency
key, plain text and a 3-second default deadline (including response consumption).
Responses are limited to 16 KiB of actual bytes and must contain a valid provider UUID.
No raw response/error/credential logs, custom callback URL, attachments or plaintext
queue. The adapter does not install an SDK or React Email dependency for plain text.

Resend idempotency keys last 24 hours; the existing flow deadline is one hour. The
adapter never automatically retries after uncertainty or generates a new key for an
old challenge. Explicit new challenge issuance remains the recovery path; its old code
is invalidated. T008 records acceptance/failure metadata while public unverified flow
responses remain delivery-unconfirmed. Provider acceptance does not prove inbox receipt.

`config/registration-env.ts` validates private sender/key/test-recipient settings,
separately from existing login configuration. The configured-service factory composes
the bounded sender with T008; it is not yet mounted to routes. No provider I/O occurs
at construction. Missing settings name only the affected variables, never their values.
The shared testing sender is forbidden in production; test mode rejects other recipients
instead of redirecting their codes. This prevents falsely verifying someone else's email.

Owner private setup/config-check steps are in [development guide](../development.md#resend-adapter-configuration--t009).
Focused adapter/config tests were added to the existing registration suite; they stub
fetch and never send email or read real secrets. No SQL migration/generation is needed.

```powershell
cd C:\Dev\School\oak-sports-academy
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.tests.json --noEmit
cd apps\api
& C:\Users\ventura\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe ../../node_modules/vitest/vitest.mjs run tests/registration/registration.api.test.ts
```

Expected: both typechecks and the focused suite pass. Then run the standalone private
config check and refresh Graphify from root. Stop on errors and share redacted output.
No DB restart or full regression required for this adapter-only change. Live receipt
remains T012. Sources: [Resend sending](https://resend.com/docs/api-reference/emails/send-email)
and [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

### T008 account and OTP services — owner validated

`registration.service.ts` constructs start/verify/resend/progress operations with a
restricted Prisma client, a private key and an explicit sender dependency. There is
no default fake sender and no route wiring. T009 supplies the real bounded adapter;
T008 tests inject an in-memory synthetic sender without contacting a provider.
`otp.service.ts` generates six secure random digits and computes HMAC-SHA-256 over
a domain label plus account/application/challenge/code. Key input must be 64 lowercase
hex characters encoding 32 cryptographically random bytes. No key/code enters SQL,
logs, error causes or a durable message payload.

The forward `20261107090200_registration_otp` migration exposes closed functions:
start-match/start, resend, verify and delivery metadata recording. The internal issuer
is not executable by runtime. Existing auth lookup/Argon2 verify is reused outside
transactions. New accounts are fixed STUDENT/PENDING_APPROVAL; no role/status input
or existing-password UPDATE grant exists. Original operation, email/type, eligibility
and password-hash snapshot are rechecked under locks before recovery. The API remains
trusted for Argon2 verification, as in the existing login boundary.

Start operation/email advisory locks serialize duplicate creation. App → user →
challenge/capability → shared audit lock ordering serializes OTP/resend/verification.
Five failed attempts are recorded atomically with audit and committed before the
service throws its safe code error. One verifier wins; successful verification rotates
proof, preserves the original one-hour deadline and leaves account status pending.
Resend rotates challenge ID/version/digest/proof, resets attempts, respects the separate
sixty-second cooldown, and counts all issue intents (including provider failures)
toward a durable five-per-account rolling fifteen-minute limit. T010 still needs
per-IP/email/capability HTTP quotas and Retry-After wiring.

A ninth table, `registration_decoy_flows`, makes unrelated duplicate flows durable
without associating them with an existing account. It stores only operation/challenge
UUIDs, a bearer hash, attempts, at most five issue timestamps and timing metadata.
It never verifies a code or authorizes PII. Matching expiry/cooldown/failed-code behavior
avoids a retry/restart account-enumeration oracle. Runtime has no direct table grants.
Owned fixture cleanup now tracks explicitly registered synthetic new accounts and
decoy operations; unknown records still cause refusal. No general deletion job exists.

Real/decoy start and resend acknowledgments always include delivery="unconfirmed".
Provider receipt/failure is private metadata: a provider-only error response before
mailbox proof would distinguish real/decoy flows. UI must not say “Email sent”; it must
explain to check email if registration can continue and offer explicit resend after
cooldown. This is truthful request acknowledgment, not false provider success. Sender
calls occur after SQL commits; failure marks FAILED without losing proof. Metadata
recording is bound to that intent's capability hash/version, even if verification has
since revoked it, and cannot restore account authority.

New tests in the existing submission DB suite cover start recovery/no password overwrite,
failed-attempt persistence, concurrent single-use consumption, resend rotation/quota,
durable duplicate behavior, provider failure and HMAC binding. No production provider
credentials are needed for these tests. Real receipt remains T012.

Owner sequence, one command at a time (stop on failure; use existing local container):

```powershell
cd C:\Dev\School\oak-sports-academy\apps\api
..\..\node_modules\.bin\prisma.cmd validate
..\..\node_modules\.bin\tsx.cmd scripts/migrate-test-db.ts
..\..\node_modules\.bin\prisma.cmd generate
cd ..\..
.\node_modules\.bin\tsc.cmd --project packages/shared/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.tests.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/mobile/tsconfig.json --noEmit
cd apps\api
& C:\Users\ventura\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe ../../node_modules/vitest/vitest.mjs run tests/registration/registration.api.test.ts tests/registration/submission.db.test.ts tests/security/rls.test.ts tests/security/audit.test.ts
```

Expected: schema valid, one new local migration applies, client generation and all
typechecks/four suites pass. New columns/functions must not be patched ad hoc to make
tests pass. Supabase remains untouched; don't run direct migrate deploy against the
development .env. Refresh `graphify update .` from root after successful checks.

### T007 DTOs and retry contract — owner validated

`packages/shared/src/registration.ts` defines environment-neutral wire types; API
schemas bound/normalize input while rejecting extra authority fields. Password content
is preserved, with existing five-rule registration complexity; login rules are unchanged.
OTP is six ASCII digits. Profile DOB must be a real calendar date; server-side Manila
age/minor checks remain T015. No schema alone authorizes account state changes.

The shared safe error catalog now includes registration-specific codes. Capability
rejection uses REGISTRATION_EXPIRED; ordinary session rejection remains UNAUTHENTICATED.
No route is wired. Error feedback does not include Zod custom text, SQL or provider
responses. Existing login field-error allowlist is unchanged.

The [retry contract](../../specs/002-student-registration/contracts/registration.md)
binds lost-start retries to original operation/email/type plus Argon2 verification;
fresh mailbox proof precedes renewed personal access. Unrelated duplicate starts use
the same outward decoy shape without valid authority. Never replace an existing
password or reset an account through email alone. Rotations retain the original flow
deadline; losing operation context or expiry requires generic guidance/contact rather
than an unimplemented recovery bypass. T008–T010 must implement these rules and quotas.

Owner check sequence for this change (no migration/generation/provider setup needed):

```powershell
cd C:\Dev\School\oak-sports-academy
.\node_modules\.bin\tsc.cmd --project packages/shared/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.tests.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/mobile/tsconfig.json --noEmit
cd apps\api
& C:\Users\ventura\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe ../../node_modules/vitest/vitest.mjs run tests/registration/registration.api.test.ts tests/registration/submission.db.test.ts tests/contracts/error-codes.test.ts tests/middleware/error-handler.test.ts
```

Expected: four typechecks and all four focused suites pass (existing disposable DB
must be running for submission.db). No full regression yet. Stop on an error and
report safe output. Refresh `graphify update .` from root after success.

### T006 disposable foundation checks — owner validated

The shared guarded fixture now requires both registration migrations and checks RLS,
runtime write denial, proof-table read denial and function-owner membership separation.
Cleanup checks ownership across all eight registration tables before deleting anything;
it deletes child rows first and restricts application/account cleanup to this fixture's
three UUIDs. Unknown records cause refusal, not truncation. This also applies to existing
auth suites using the shared fixture. Runtime test clients never inherit migration roles.

`tests/registration/helpers.ts` adds pending Alice/Bob applications using those same
owned actors. Its privileged mailbox-verification helper is fixture state preparation,
not a production OTP verifier. Existing `asUser` still uses the real ACTIVE session guard.

`submission.db.test.ts` adds seven foundation groups: proof isolation, verified PII and
Admin projection, invalidated proofs, grant/function ACL denial, SQL constraints, audit
rollback and concurrent chain integrity. Later T018 adds document/finalization cases;
these seven groups do not claim the whole submission workflow is built. Test typecheck
now includes registration fixtures/suites. No provider request or Supabase test target.

Owner sequence (stop on failure; keep private test settings unchanged):

1. If needed, start Docker Desktop and the existing `oak-auth-tests` container with
   `docker start oak-auth-tests`. Do not recreate/reset it.
2. From `apps/api`, run the guarded fixed-loopback migration helper, then generate
   Prisma Client. The helper verifies database/role/marker before `migrate deploy`,
   forces both URLs to the known disposable loopback target and does not reset data.
3. Run API/test typechecks and the focused database suites. No full regression yet.

```powershell
cd C:\Dev\School\oak-sports-academy\apps\api
..\..\node_modules\.bin\tsx.cmd scripts/migrate-test-db.ts
..\..\node_modules\.bin\prisma.cmd generate
cd ..\..
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.tests.json --noEmit
cd apps\api
& C:\Users\ventura\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe ../../node_modules/vitest/vitest.mjs run tests/registration/submission.db.test.ts tests/security/rls.test.ts tests/security/audit.test.ts
```

Expected: two new migrations apply, Prisma generation succeeds, both typechecks exit 0
and all three suites pass. No skipped DB cases count as passed. On preflight/permission/
constraint failures, report safe output and stop; do not reset, use another target or
alter role grants to force a pass. Generation updates local client code only; it does
not apply migrations to Supabase. Refresh `graphify update .` from root after success.
Owner confirmed the sequence passed on 2026-11-07 after the fixture ID array received an explicit string[] annotation (TS2345). T006 is complete. Supabase migration is deferred; graph refresh for latest edits remains owner-run.

### T005 registration context — focused checks passed

`modules/registration/capability.ts` generates 32-byte canonical base64url proof,
hashes before SQL and provides `withRegistration`. The callback is a restricted
database-only transaction, without lifetime renewal or automatic replay. It returns
technical registration identity, never an auth/session identity. Generic 401 mapping
will receive registration-specific UI codes in T007; no route is wired yet.

`20261107090100_registration_context` adds hash-checked transaction-local registration
context. It clears ordinary session context and checks pending STUDENT eligibility,
current challenge version, revocation and capability expiry. Verified access also
requires consumed challenge and verified account email. OTP expiry does not invalidate
already verified one-hour registration proof. Invalidating or rotating a challenge
version invalidates old capabilities; later services must rotate/rebind deliberately.
Unverified proof can read only its technical application; verified proof may also read
its profile, consents and document metadata. Trial/delivery reads remain Admin-only.
No applicant generic write grants or account activation are added here.

`appendRegistrationAudit` reuses `hashAuditPayload`. SQL independently allows only
seven registration event names, derives actor/target from current proof and requires
verified context for verified/profile/document/submission events. It takes the same
advisory lock (1935764577,1), computes the approved hash formula and inserts through
the existing guard trigger. No generic unauthenticated audit writer is exposed.
Services must acquire application/challenge locks before appending audit, and roll
back related mutations on append failure. Actual bootstrap/OTP mutations remain T008.

The planned registration suite now contains foundation adapter cases; these do not
prove SQL/RLS or real rollback behavior. Owner focused commands (no DB migration needed):

```powershell
cd C:\Dev\School\oak-sports-academy
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.json --noEmit
cd apps\api
& C:\Users\ventura\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe ../../node_modules/vitest/vitest.mjs run tests/registration/registration.api.test.ts tests/audit/audit.service.test.ts
```

Expected: typecheck exits 0 and both focused suites pass. Stop on failure and report
safe output. No full regression or provider calls needed for this foundation change.
Refresh `graphify update .` from repository root afterward. No DB application until T006.

Validate the schema without applying migrations or generating clients:

```powershell
cd C:\Dev\School\oak-sports-academy\apps\api
..\..\node_modules\.bin\prisma.cmd validate
```

Expected: schema is valid. On failure, stop and report the redacted error. No reset,
`migrate dev`, `db push` or `migrate deploy` now. T005/T006 must finish the boundary and
guarded fixture cleanup before applying to the selected disposable database. Actual
RLS/constraints/grants/concurrency remain unverified until those owner-run checks.

The owner also refreshes the code graph after edits:

```powershell
cd C:\Dev\School\oak-sports-academy
graphify update .
```

Expected: refresh succeeds. If it fails, report the error without reinstalling tools.
AST refresh does not validate SQL/Prisma and may not extract SQL relationships.

Owner evidence 2026-11-07: Prisma schema validation passed; graph refresh completed with 1148 nodes, 2248 edges and 80 communities. Prisma package.json config deprecation is informational; no Prisma upgrade/config migration performed. SQL objects and RLS behavior remain unapplied/unverified until T006.

Owner evidence 2026-11-07: T005 API typecheck and focused registration/audit suites passed; Graphify refresh succeeded. SQL has not been applied and real capability/RLS/rollback/concurrency checks remain T006.

Owner evidence 2026-11-07: T007 four typechecks and four focused suites passed with no errors; Graphify refreshed. No new migration, provider call or registration route was introduced by T007.

Owner evidence 2026-11-07: T008 requested schema validation, guarded local migration/generation, four typechecks and four focused suites passed without errors; Graphify refreshed. Sender coverage is synthetic; real Resend delivery and HTTP routes remain pending. Supabase schema was not changed.

Owner evidence 2026-11-07: T009 requested typechecks, focused adapter/config suite and standalone private configuration check passed without errors. Real email delivery remains untested until T012; T010 routes remain unwired.

Owner evidence 2026-11-07: Expo Crypto installed; typecheck narrowing and Expo mock-resolution errors corrected, then mobile test rerun passed without errors and Graphify refreshed. Native phone/provider/keyboard/TalkBack evidence remains T012/T029. No Supabase registration migration applied yet.
