---
status: in-progress
owner: team
milestone: 1
---

# Authentication data layer

The login feature's Prisma schema lives at
[apps/api/prisma/schema.prisma](../../apps/api/prisma/schema.prisma).
The approved fields and behavior remain defined in
[the feature data model](../../specs/001-user-login/data-model.md) and
[the implementation tasks](../../specs/001-user-login/tasks.md).

T018 adds User, Session, SignInAttempt, AuditLog, and the Role/AccountStatus enums.
Prisma generates the client used by the Express API; mobile and web clients must not
connect directly to this database. DATABASE_URL is the runtime connection and DIRECT_URL
is reserved for migration tooling. See the root README for owner-run validation.

User defaults to PENDING_APPROVAL. Login later requires ACTIVE plus email verification;
changing the status is part of the separate approval workflow. Session retains only a
SHA-256 token hash. SignInAttempt has no required user relation so unknown-email
attempts can be retained. Audit actor/target identifiers are historical values without
cascading relations; unique previousHash disallows a fork at a shared predecessor.

Schema types, relations, uniqueness, and indexes alone do not provide the full security
boundary. T019 must add RLS, narrow authentication functions, runtime/migration role
separation, grants, and SQL CHECK constraints for hexadecimal hashes. Audit append-only
access, serialization, chain verification, input normalization, session lifetime, and
current-account eligibility also require the planned SQL/service implementations.
No database changes or client generation have been performed by the agent. T018's
schema is written; owner-run Prisma validation is pending.
