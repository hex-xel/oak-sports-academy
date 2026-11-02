# Data Model: User Login

**Feature**: `001-user-login` | **Date**: 2026-10-31

Only the tables this feature needs. Registration and verification tables come with their
own features; the fields here are the minimum for sign-in, session handling, and attempt
logging.

## Prisma schema

```prisma
enum Role {
  CUSTOMER
  STAFF
  ADMIN
}

enum AccountStatus {
  ACTIVE
  PENDING_APPROVAL
  SUSPENDED
}

model User {
  id              String        @id @default(uuid()) @db.Uuid
  email           String        @unique
  passwordHash    String
  displayName     String?
  role            Role          @default(CUSTOMER)
  status          AccountStatus @default(PENDING_APPROVAL)
  emailVerifiedAt DateTime?
  lastSignInAt    DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  sessions        Session[]

  @@index([role])
  @@map("users")
}

model Session {
  id         String    @id @default(uuid()) @db.Uuid
  tokenHash  String    @unique @db.Char(64)
  userId     String    @db.Uuid
  expiresAt  DateTime
  revokedAt  DateTime?
  ipAddress  String?   @db.VarChar(45)
  userAgent  String?   @db.VarChar(255)
  createdAt  DateTime  @default(now())

  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("sessions")
}

model SignInAttempt {
  id         String   @id @default(uuid()) @db.Uuid
  email      String
  ipAddress  String   @db.VarChar(45)
  succeeded  Boolean
  createdAt  DateTime @default(now())

  @@index([email, createdAt])
  @@index([ipAddress, createdAt])
  @@map("sign_in_attempts")
}

model AuditLog {
  id           String   @id @default(uuid()) @db.Uuid
  timestamp    DateTime @default(now()) @db.Timestamptz(3)
  userId       String   @db.Uuid
  action       String
  targetEntity String
  targetId     String
  payloadHash  String   @db.Char(64)
  previousHash String   @unique @db.Char(64)
  currentHash  String   @unique @db.Char(64)

  @@index([timestamp])
  @@map("audit_logs")
}

```

## AuditLog and database isolation (approved 2026-11-02)

Add an `AuditLog` model mapped to `audit_logs` with UUID id, UTC timestamp, actor userId
(UUID), action, targetEntity, targetId, and 64-character lowercase SHA-256 payloadHash,
previousHash, and currentHash. Keep actor/target identifiers as historical values; do
not cascade-delete audit entries. previousHash and currentHash are unique. The genesis
previousHash is 64 zeros. Chain traversal follows hashes rather than timestamp sorting.
Canonical UTF-8 encoding, UTC millisecond timestamp representation, and deterministic
redacted payload serialization are shared by append and verification, using the exact
§4 concatenation order. IDs are not added to that mandated hash formula.

Every append takes the same transaction advisory lock before reading the head. An
administrative mutation and its entry commit together. Runtime audit access is only
INSERT/SELECT, with append access narrowed to the approved writer; no UPDATE, DELETE,
or TRUNCATE. Privileged maintenance remains a separately controlled trust boundary.
A hash chain alone cannot detect tail truncation without a trusted external checkpoint.

Use RLS on sensitive auth tables and scoped transaction-local verified identity under
a non-owner, non-BYPASSRLS runtime role. Own-account policies constrain user/session
access; sign-in attempts are accessible only through the narrow auth/audit paths.
Pre-auth credential lookup and session bootstrap use narrowly granted database functions,
fixed search_path, minimal return values, and no arbitrary SQL interface. No runtime
request uses migration credentials. See research.md R13 for the trust boundary.
Policies/functions/grants require SQL migrations alongside the Prisma models.

## Entity notes

**User** — one row per account holder. `email` is stored lowercase and trimmed; the unique
index is the authority for "this email is taken". `passwordHash` holds the Argon2id
encoded string (algorithm, parameters, salt, hash) and is never selected by any endpoint
that returns data. `emailVerifiedAt` is null until the verification feature sets it.
`status` gates sign-in: only verified `ACTIVE` accounts may sign in. Accounts awaiting
approval remain `PENDING_APPROVAL`; academy approval changes status to `ACTIVE`.
`PENDING_APPROVAL` and `SUSPENDED` cannot sign in. Defaults never grant approval.
The unmatched User.signInAttempts relation is removed; attempts remain standalone so
unknown-email attempts are recorded without a mandatory user relationship.

**Session** — one row per signed-in instance. `tokenHash` is the SHA-256 of the random
token; the raw token is returned once to the app at sign-in and stored in Expo SecureStore.
It never exists in the database, in logs, or in any response after login. `expiresAt` is
creation + 8 hours. `revokedAt` is set on logout; a session is valid only when `revokedAt`
is null and `expiresAt` is in the future. Cascade delete removes sessions with their user.

**SignInAttempt** — append-only audit trail used by the per-email rate limiter and for
security review. No passwords, tokens, or request bodies are stored. Rows older than 30
days are pruned by a later maintenance job; until then the table is trimmed manually in
development.

## Validation rules

| Field | Rule |
| --- | --- |
| `email` | Trim, lowercase, at least 3 chars, at most 254, single `@` with a dot in the domain. Rejected with a validation error before any lookup. |
| password | 1–128 characters, never trimmed, never logged. Minimum length and complexity are enforced by registration, not by login. |
| request body | JSON object only; validate required fields and strip unknown keys with Zod before use. |
| `tokenHash` | 64 lowercase hex characters (SHA-256). |
| `ipAddress` | 45 characters maximum (IPv6). Truncate rather than reject. |

## Indexes and why

- `users.email` unique — one account per email and the sign-in lookup path.
- `sessions.token_hash` unique — constant-time-ish lookup by hashed token.
- `sessions.user_id` — revoke-all and future "active sessions" screens.
- `sessions.expires_at` — cleanup job and expired-session queries.
- `sign_in_attempts (email, created_at)` and `(ip_address, created_at)` — the two rate-limit
  windows.

## State transitions

```text
Session:  active ──logout──> revoked
          active ──expiry──> expired (expiresAt in the past; row kept until cleanup)

Account:  PENDING_APPROVAL ──approved──> ACTIVE        (admin feature)
          ACTIVE ──suspended──> SUSPENDED               (admin feature)
```

This feature only reads account status; it never changes it.

## Migration notes

- Create reviewed Prisma/SQL migrations for the enums, auth/audit tables, RLS policies,
  narrow bootstrap functions, and grants; apply to a development database first.
- Seed script inserts one verified active customer, one unverified customer, and one
  suspended customer, and one verified pending-approval customer, all with a development password from `.env.seed`; the seed
  refuses to run when `NODE_ENV=production`. Staff and admin accounts are added with the
  web client feature.
- No destructive migration is required by this feature.
