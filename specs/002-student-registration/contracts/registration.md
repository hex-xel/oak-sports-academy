# Registration and assessment API contract proposal

Base `/api/v1`; registration JSON bodies are strict: unknown fields, including
authority claims, are rejected. Existing login behavior is unchanged. Wire types:
`packages/shared/src/registration.ts`; API validators:
`apps/api/src/modules/registration/registration.schemas.ts`.
Use existing safe error envelope; add typed registration codes to shared catalog.
All responses no-store. Never put email OTP/capability/bearer in a URL or log.

## Applicant routes

Registration authorization is a separate header (`X-Registration-Token`), not an
ordinary Authorization Bearer. Store it under a separate SecureStore key; don't let
registration 401s clear a logged-in native session. Reject duplicate/ambiguous headers.

T010 mounts start/verify-email/resend-code/current only. Each requires exactly one
`X-Client-Platform: mobile` (a transport discriminator, not authority). Proof routes
require exactly one canonical registration header; Authorization headers are rejected,
including mixed Bearer/registration identities. POST uses application/json under the
existing 10 KiB parser. Queries/unknown body fields are rejected. No cookies or Student
session are issued. Agreements/documents/finalize remain T016, not success stubs.

HTTP admission: shared start+resend IP limit 10/15 minutes, start email 5/15 minutes,
verify IP 30/15 minutes and verify proof 5/15 minutes. Proof keys are hashed, and email
keys are normalized/hashed. Resend also has the durable application/account issue quota
in SQL, so rotating proof does not reset real email issuance limits. All HTTP attempts
count; successful operations are not exempt. Invalid fields still consume IP quota.
Process-local stores reset on restart and are not shared across API instances; SQL
state and quotas retain their documented guarantees. Global/login limits are unchanged.
Middleware quotas return RATE_LIMITED with Retry-After; SQL cooldown/attempt quotas
return VERIFICATION_LIMITED with bounded Retry-After (1–900 seconds). No auto-replay.

| Method/path | Input | Safe output / effect |
| --- | --- | --- |
| POST `/registrations/start` | studentType, normalized email, password; operationId | Generic 202 with opaque flow identifier/capability and challenge metadata where applicable; no account-existence disclosure, credentials never overwritten |
| POST `/registrations/verify-email` | flow proof, challengeId, six-digit code | 200 safe verification result and renewed registration-only proof, or safe invalid/expired/limited response; no login session |
| POST `/registrations/resend-code` | flow proof, challengeId, operationId | 202 only with honest delivery state/cooldown; rotate challenge/version atomically and return server expiry/resend timing |
| GET `/registrations/current` | registration proof | Bounded technical progress/receipt and required actions for its owner only; never password/code/hash or arbitrary profile lookup by email |
| POST `/registrations/agreements` | verified proof, operationId, policyVersion, waiver/fitness/terms true | 200 consent evidence reference required for uploads; no incomplete personal profile is persisted |
| PUT `/registrations/documents/:slot` | verified proof + current consent, JPEG/PNG bytes, validated slot/type/MIME/extension metadata, operationId | 201 safe document ID/slot/validation state; never client-selected storage key or public URL |
| POST `/registrations/submit` | verified proof, operationId, complete profile/contact/guardian, consent reference, two document IDs | 200/201 stable submission receipt/status New; pending approval, no Student session; duplicate same request returns original result |

OTP verify/resend use account/challenge-associated proof; application UUID alone is
not authorization. Generic duplicate/start response must not hand a valid existing
account capability to a stranger. Existing-account handling becomes explicit only
after mailbox proof; no silent password reset. Reject conflicts safely and provide
usable sign-in/contact guidance. Need one consistent lost-response/resume contract in T007.

JSON endpoints retain existing bounded parser. Binary route has an explicit body limit,
allowed slots/MIME, declared versus actual size checks and no JSON/base64 bypass.
Server validates complete decoding and dimensions before Storage. Failed uploads cannot
be referenced by finalize. No documents endpoint accepts an arbitrary remote URL.

Suggested errors: `INVALID_VERIFICATION_CODE`, `VERIFICATION_EXPIRED`, `VERIFICATION_LIMITED`,
`REGISTRATION_EXPIRED`, `REGISTRATION_CONFLICT`, `UPLOAD_INVALID`, `DELIVERY_UNAVAILABLE`.
Use 400/401/409/413/429/503 consistently; Retry-After for rate limits. Map to safe UI copy,
not provider responses or a statement that an email is registered before proof.

## Explicit retry and duplicate-start contract — T007

The public DTOs use existing wizard student types (`newly-white-belt`, `experienced`),
normalized email and an unchanged 8–128 character password satisfying all five existing
wizard rules. confirmPassword is client validation only, never stored/transmitted.
All operation IDs are UUIDs. Profile DOB is a real ISO calendar date; client age,
authority, verification, timestamps and object keys are rejected. Finalize computes
age/conditional guardian requirements server-side; syntactic DTO success is not approval.

### Start and lost initial response

- The client creates and retains start operationId before sending. An operation ID is
  an idempotency identifier, never authorization. No automatic retry is performed.
- New email: create one pending Student and one application. Return the common 202
  shape: registrationToken, challengeId, codeExpiresAt, resendAfter,
  registrationExpiresAt, next=`verify-email`. No user/application/account-existence
  field is returned. Only hash-bound proof becomes usable server-side.
- Existing email with unrelated operationId, mismatched password/type, or an ineligible
  account: same outward start shape with independent random decoy proof/challenge.
  Never overwrite credentials, create a valid existing-account capability or reveal
  existing profile/status. Code attempts for decoy flows fail generically; real delivery
  and decoy behavior must not falsely claim a message was sent. Apply issue quotas to
  both paths and comparable credential work; do not claim constant network timing.
- Lost response: user may explicitly retry the original operationId/email/type/password.
  Under a row lock, only matching original operation/account plus Argon2 verification
  may reissue credentials-stage proof. Revoke superseded proof; never return stored raw
  tokens (only hashes exist). No personal fields may be returned until fresh mailbox
  proof. Preserve an unconsumed current code where usable; expired/consumed challenges
  need an explicit new issue respecting cooldown/quotas, invalidating old versions.
- New proof never silently extends the original flow deadline (application.createdAt
  plus one hour). Normal verify/resend rotation uses the remaining lifetime. If the
  operation is lost, expired, or cannot be matched, do not recover by email alone:
  generic guidance is to use the original flow, sign in after approval, or contact
  the academy. A broader abandoned-registration recovery feature is not implemented.
- Changed credentials under a reused operation ID must not replace the first request's
  account/password/type. Before mailbox proof, use generic start behavior; safe 409
  conflicts are reserved for already authorized operations.

### Verification, resend and progress

- Proof uses exactly one X-Registration-Token header; no Bearer reuse or query/body
  token. Missing/invalid/expired/revoked/ineligible real proof maps to the same
  REGISTRATION_EXPIRED 401. Duplicate/combined headers are rejected at T010.
- Verify accepts challengeId and six ASCII digits as a string (leading zeroes retained).
  Single-use consumption returns verified=true, rotated registrationToken,
  registrationExpiresAt and next=`complete-profile`. No Student login token/identity.
- Lost successful verify response does not replay a consumed OTP or return stored
  bearer material. Retry start through the original-operation/mailbox-proof path.
- Resend accepts operationId/challengeId. A successful issue request returns
  the common flow shape with rotated proof/challenge metadata. Old replies/codes must
  not regain authority. No automatic replay after timeout or provider uncertainty.
- GET current returns only the discriminated progress union: verify-email,
  complete-profile, or await-assessment plus stable New receipt. Unverified proof
  cannot discover profile, existing-account status or email. Submitted/approved account
  handling must not relax the foundation's pending-only proof rule.
- Retry-After accompanies quota/cooldown 429s; code expiry is independent of resend
  availability. T008 closes a retry-enumeration gap with durable non-authorizing decoy
  flows (no email/account/OTP stored). Start and resend always include
  `delivery="unconfirmed"`, whether real, decoy, provider-accepted or provider-failed.
  A 202 acknowledges a request, not inbox delivery; UI copy must say to check email if
  registration can continue and offer explicit resend after cooldown. Provider outcomes
  are recorded privately. A provider-only 503 on these unverified routes would disclose
  real versus decoy flows, so DELIVERY_UNAVAILABLE is reserved for already-authorized
  delivery operations. Invalid-code attempts persist even when the HTTP result is an
  error. These privacy mechanics do not change Student approval or password policy.

### Authorized idempotency

Agreements accept exactly the version and three literal true booleans; return consentId
and acceptedAt. Upload returns documentId, slot and Ready only after real screening/
Storage success. Submit requires profile, consentId and both document IDs; return a
stable receiptId/status New/submittedAt. Same operation and identical validated input
returns its original safe result. Changed input, wrong ownership or stale version must
not replay a mutation; reject safely. Server canonicalizes payload fingerprints without
storing secrets. These definitions precede service/route implementation, not passed API
evidence. Browser endpoints below remain a separate transport/authorization boundary.

## Administrator browser transport

Same-origin Next.js proxy calls only fixed configured API origin/paths. Browser login
sets HttpOnly/Secure/SameSite cookie through proxy; login JSON never contains bearer.
Cookie-token parsing/forwarding is server-only, credentials omit logs, and mutations
require strict Origin/CSRF validation. Production requires HTTPS. Do not expose the
native Student login token transport as an Admin browser shortcut.

| Method/path | Required authority / input | Effect |
| --- | --- | --- |
| POST `/auth/admin/login` | email/password, web-only reviewed contract | Safe Admin identity + HttpOnly session cookie, never token JSON |
| GET `/auth/admin/session`; POST `/auth/admin/logout` | browser cookie translated by server boundary | Restore current Admin identity; revoke only current session and clear cookie |
| GET `/admin/registrations` | STUDENTS_MANAGE; validated search/status/cursor/limit | Minimal bounded ordered list; submitted applications only |
| GET `/admin/registrations/:id` | Admin gate + actual target application | Registration-order detail, guardian only when applicable, agreement metadata |
| GET `/admin/registrations/:id/documents/:documentId` | Admin gate + application/document association | Short-lived signed read URL, never public bucket/key chosen by client |
| POST `/admin/registrations/:id/trial` | schedule/date/time/timezone, operationId, version, explicit confirmation | Atomic scheduled state/audit/delivery intent; actual email outside transaction |
| POST `/admin/registrations/:id/decision` | approve/reject, operationId, version, confirmation, safe reason if required | Atomic state/account/audit/delivery intent; no enrollment/payment activation |
| POST `/admin/registrations/:id/emails/:deliveryId/retry` | Admin + matching failed/pending delivery/version | Explicit idempotent retry; no duplicate decision or OTP replay |

Browser 403 retains usable permitted navigation; 401 redirects once, cookie cleanup
is explicit, and no raw API diagnostics are shown. Display truthful email state and
timezone. Repeated/conflicting schedule/decision transitions return stable result or409.
No public Admin signup, all-device logout, password-recovery endpoint or broad profile
edit is implied. Owner provisions one synthetic verified ACTIVE Admin privately.
