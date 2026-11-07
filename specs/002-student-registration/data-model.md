# Proposed registration data model

Planning only: forward Prisma/SQL migrations must be reviewed before owner application.
Do not modify applied migrations or use privileged database clients at runtime.

| Entity | Key fields / relationships / boundaries |
| --- | --- |
| User (existing) | Existing normalized unique email, Argon2id passwordHash, STUDENT/PENDING_APPROVAL, nullable emailVerifiedAt; never accept role/status/verification from client |
| RegistrationApplication | UUID, unique userId, studentType, DRAFT/SUBMITTED internal stage, published status New/Free Trial Scheduled/Approved/Rejected/Enrolled, version, submittedAt, approvedAt, rejectedAt; Enrolled owned by future payment feature |
| RegistrationCapability | Hash-only random token, applicationId, expiry, revokedAt, proof stage, challenge binding; credentials-stage token may verify/resend only, verified token may consent/upload/finalize; no general login |
| EmailVerificationChallenge | UUID, user/application binding, keyed OTP digest, version, expiry, attempts, consumedAt, resend metadata; database clock and row locking; no plaintext OTP |
| StudentProfile | Unique application/user relationship; names, gender, dateOfBirth as date, mobile/address, conditional guardian fields and validIdType; server-computed age at submission, not authoritative client age; protected account fields separate |
| ConsentEvidence | Application, approved policy version, three required agreement booleans, acceptedAt, source operationId; guardian details do not claim verified legal authority |
| RegistrationDocument | UUID, application, slot PHOTO_2X2/VALID_ID, random private object key, exact byte checksum/MIME/size/dimensions, upload-attempt ID, Pending/Ready/Attached state; unique current slot association; no public URL |
| TrialAssessment | Application, scheduled start/end UTC, displayed timezone, version, scheduledBy, resultPending/completed metadata; public list categories derived without new registration-status enum |
| EmailDelivery | Operation/application, kind OTP/TRIAL/RESULT, challenge/event version, provider idempotency key/id, Pending/Sent/Failed, safe reason code, attempt count; no bearer/OTP/credential payload |
| RegistrationDecoyFlow | T008 non-authorizing duplicate-flow metadata: hash-only token, challenge/operation UUIDs, bounded attempts, at most five recent issue timestamps, one-hour deadline; no email/account/profile/OTP. Durable state prevents restart/retry behavior from exposing account existence |

This table is logical, not a requirement for nine new independent abstractions.
Combine one-to-one records if it simplifies implementation without widening grants.
Index normalized email, capability digest, application status/submission pagination,
document(application,slot), and operation idempotency uniqueness; bound list queries.

## State and atomicity

Account creation is idempotent per request and unique email; duplicates never update
an existing password/account or create a capability granting its data by email alone.
For an existing pending account, renewed registration authority requires mailbox proof;
ACTIVE/rejected accounts cannot be silently reset. Safe outward responses must not leak
account existence. Explicit retry after a lost initial capability is handled by the
documented proof flow, not an email-only draft lookup.

One valid OTP consumer wins. Resend rotates challenge version and invalidates old code;
delayed mail delivery cannot restore an old version. Verified email still PENDING_APPROVAL.
Consent version must be recorded before upload. Finalize locks application and verifies
current proof, complete profile, agreement and two Ready documents; attaches/saves once.
Second identical finalize returns current receipt, conflicting mutation returns safe409.

New → Free Trial Scheduled → Approved or Rejected; allow decision only with scheduled
assessment and correct version/confirmation. No arbitrary state jumping or client status
assignments. Approved + verified changes User to ACTIVE atomically with decision/audit;
Rejected stays non-ACTIVE. Trial rescheduling/results and notification retry are versioned.
Approval must not enroll the applicant, activate packages or delete overdue accounts.

## Database authorization

Keep existing `oak_set_session_context` and `withSession` unchanged for ACTIVE accounts.
Pending registration uses a narrow hash-verified transaction-local context and minimal
function-owner grants/RLS for registration-only operations. Unknown/expired/forged
capability cannot read any profile/documents or establish ordinary user context.

Existing user RLS is self-only even for Admin. Admin applicant-list/detail and scoped
decision functions need explicit server permission checks plus reviewed cross-row
policies/functions; never assume an ADMIN bitmask bypasses RLS. No table-wide user
UPDATE grant. Database/email/storage credentials and role memberships stay separate.

Audit preapproval events require a narrowly authorized function path using the same
chain lock/hash/insert-trigger protocol; current appendAudit assumes ACTIVE context.
Review minimal function-owner INSERT/policy changes; do not expose a generic unauthenticated
audit writer. Admin decision + audit + delivery intent commit together. Actual email
and Storage I/O occur outside DB transactions, with owned cleanup and retry on failure.
