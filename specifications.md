# OAK SPORTS ACADEMY TRAINING REGISTRATION AND MANAGEMENT SYSTEM
## Final Project Technical Specification and AI Development Instructions

## 1. PROJECT OVERVIEW

Project Name: Oak Sports Academy Training Registration and Management System Enhancement

Client: Oak Sports Academy, Taguig Branch

Project Type: Web and Android application system

Primary Goal:
Develop a centralized system that improves athlete registration, participant management, training enrollment, free-trial registration, schedule management, payment monitoring, and academy information management.

The system will have three client applications:
1. Android mobile application for athletes and parents/guardians.
2. Public website for academy information and announcements.
3. Web-based admin dashboard for authorized academy staff.

All applications must communicate with one shared backend API and database.

The system should be developed as a practical academic project with limited development time and free-tier services. Avoid unnecessary complexity, excessive dependencies, and features outside the agreed initial release.

## 2. FINAL TECHNOLOGY STACK

### Mobile Application
- React Native
- Expo
- TypeScript
- Expo SecureStore for securely storing mobile session tokens

Purpose:
Build a genuine Android application with native mobile screens and navigation. Do not implement the mobile app as a WebView-only wrapper.

### Public Website and Admin Dashboard
- Next.js
- React
- TypeScript
- Tailwind CSS

Purpose:
Use one web application with separate public pages and protected administrative pages. Reuse common components where practical.

### Backend
- Node.js
- Express.js
- TypeScript
- REST API architecture

Purpose:
Provide a single backend for the mobile app, public website, and admin dashboard.

The backend is responsible for authentication, authorization, business rules, validation, database access, file access permissions, and all important eligibility and scheduling decisions.

### Database
- PostgreSQL
- Supabase Free Plan for managed PostgreSQL hosting
- Prisma ORM for database access, schema management, and migrations

Use Supabase as a managed database provider, not as the authentication provider.

The Express backend should connect to PostgreSQL using Prisma. All database operations that require authorization or business-rule enforcement must pass through the backend.

Do not expose database credentials, service-role keys, or other privileged credentials in browser or mobile application code.

Supabase Free currently provides a limited database and storage quota and can pause projects after inactivity. Review its current limits before deployment:
https://supabase.com/pricing
https://supabase.com/docs/guides/platform/free-project-pausing

### File Storage
- Supabase Storage Free Plan
- Private storage buckets for participant photos, IDs, consent documents, and other sensitive uploads

Use private buckets and authorized server-side access. Do not make sensitive documents publicly accessible.

The backend must verify file ownership and permissions before providing access or generating short-lived signed download links.

Supabase Storage Free has limited storage capacity, currently listed as 1 GB:
https://supabase.com/docs/guides/storage/pricing

### Email Delivery
- Resend Free Plan for transactional email

Use email delivery for:
- Email verification OTPs.
- Password-reset instructions.
- Necessary account and enrollment notifications.

Keep email delivery behind a small backend service module so the provider can be replaced without changing authentication logic.

Resend currently lists a free allowance of 3,000 emails per month, with a daily limit of 100 emails. Verify current limits and sender-domain requirements before use:
https://resend.com/pricing

### Hosting and Deployment
- Vercel Hobby: candidate for the web application and academic demonstrations, subject to its current eligibility and usage terms.
- Render Free Web Service: candidate for the Express API during development and demonstrations.
- Supabase Free: PostgreSQL and private file storage.
- Expo EAS Free: optional cloud Android builds.
- Local development: Windows, Node.js, npm, and VS Code.

Render Free Web Services can sleep after inactivity and take time to restart. Its free PostgreSQL offering has different restrictions and expiration rules, so use Supabase as the selected database provider rather than depending on Render Free PostgreSQL.

References:
https://vercel.com/docs/plans/hobby
https://render.com/docs/free
https://docs.expo.dev/billing/plans/

### Development Tools
- Visual Studio Code
- Git
- GitHub private repository
- Postman for API testing
- Figma for UI/UX design
- Docker only if needed for a consistent local environment
- npm workspaces for monorepo management

### Testing Tools
- Vitest for unit and service-level tests
- Supertest for Express API tests
- Postman for manual API testing
- Playwright for web end-to-end tests if time permits
- Physical Android devices and Expo development tools for mobile testing

Use current stable, mutually compatible package versions. Pin exact installed versions in the package lockfile. Do not blindly upgrade dependencies during feature implementation.

## 3. WHAT THE TEAM WILL IMPLEMENT

The team will build and maintain the following application-specific functionality.

### Custom Authentication
Implement authentication in the Express backend using established libraries. Do not implement cryptographic algorithms from scratch.

The team is responsible for:
- Account registration.
- Password hashing and verification.
- Email verification logic.
- Login and logout.
- Server-managed sessions.
- Password recovery.
- Role-based access control.
- Participant ownership checks.
- Account approval rules.
- Session expiration and revocation.
- Rate limiting and validation.
- Security testing.

### Academy Business Logic
Implement:
- Participant and parent/guardian account relationships.
- Training programs and training types.
- Training packages, rates, and session counts.
- Free-trial eligibility and capacity allocation.
- Training schedule conflict detection.
- Enrollment and approval workflows.
- Payment-status monitoring.
- Staff permissions.
- Academy content and announcements.
- Relevant reports and dashboards.

### Database and API
The team will design the database schema, implement Prisma models and migrations, create REST endpoints, validate incoming data, enforce business rules, and test authorization.

### UI and Application Integration
The team will build the mobile app, public website, and admin dashboard and integrate all three with the same backend.

### Managed Services
Use managed services where they reduce unnecessary work:
- Supabase manages PostgreSQL infrastructure and object storage.
- Resend delivers transactional emails.
- Hosting platforms deploy the web application and API.
- Expo supports mobile development and optional cloud builds.

Do not build a custom email server, database server, object-storage service, or deployment platform.

Do not use Supabase Auth for the initial release. Authentication is intentionally implemented by the team to meet the project's learning requirements.

## 4. AUTHENTICATION AND SECURITY LIBRARIES

Use the following baseline:

- Password hashing: Node.js package argon2 using Argon2id.
- Secure random values: Node.js built-in crypto module.
- Input validation: Zod.
- API rate limiting: express-rate-limit.
- Security headers: Helmet through the helmet package.
- Cookie handling: cookie-parser if required by the chosen cookie setup.
- Database access: Prisma.
- Email: Resend SDK or its supported API.
- Mobile session storage: expo-secure-store.

Use maintained versions compatible with the selected Node.js release and framework versions.

### Password Hashing Algorithm: Argon2id

Use Argon2id because it is a modern, memory-hard password-hashing algorithm designed to resist brute-force attacks, including attacks using specialized hardware.

Initial baseline configuration:
- Algorithm: Argon2id.
- Memory cost: 19 MiB.
- Iterations: 2.
- Parallelism: 1.
- Salt: generated automatically by the library.
- Verification: use the library's password verification function.

These parameters are a starting point and must be checked against the installed library and actual hosting environment. Tune them after performance testing.

Never:
- Store plaintext passwords.
- Encrypt passwords reversibly instead of hashing them.
- Create a custom password-hashing algorithm.
- Store passwords in logs.
- Return password hashes in API responses.

Use the library's supported password-hashing and verification methods.

### Session Management

Use opaque, server-managed sessions instead of implementing a JWT access-token and refresh-token rotation system for the initial release.

Session rules:
1. Generate a cryptographically random session token using Node.js crypto.
2. Store only a hash of the session token in PostgreSQL.
3. Store session expiration and revocation information.
4. Send the session token to the client only through the intended secure channel.
5. Check session validity on protected API requests.
6. Revoke the current session during logout.
7. Revoke relevant sessions after password recovery or other security-sensitive events.
8. Never log session tokens or return session database records to clients.

For the web application:
- Use Secure cookies in production.
- Use HttpOnly cookies.
- Set an appropriate SameSite policy.
- Implement CSRF protection and origin checks appropriate to the cookie-based setup.

For the Android application:
- Store the session token using Expo SecureStore.
- Do not store session tokens in ordinary persistent application storage.
- Send the token using the agreed authorization header.
- Provide a logout mechanism that revokes the server-side session.

Do not store session tokens in the URL.

### OTP and Password Reset Security

For email verification:
- Generate a short numeric OTP using cryptographically secure randomness.
- Store a keyed hash or otherwise securely protected representation of the OTP.
- Associate it with the account and expiration time.
- Limit verification attempts and resend requests.
- Invalidate it after successful verification.
- Never log the OTP.

For password recovery:
- Generate a high-entropy, cryptographically random reset token.
- Store only a hash of the reset token.
- Set an expiration time.
- Make the token single-use.
- Revoke it after successful use.
- Apply rate limits and return non-revealing responses to prevent account enumeration.

The team must use established cryptographic APIs rather than inventing security algorithms.

### Cryptographic Append-Only Event Logging (SHA-256 Hash Chain)

To guarantee audit integrity, tamper detection, and non-repudiation required for Information Assurance and Security, all administrative actions must be recorded in an immutable, append-only audit log structured as a cryptographic hash chain.

1. **Triggered Actions**: Every time an administrator or staff member:
   - Creates or updates an account,
   - Approves, modifies, or rejects an enrollment,
   - Uploads, verifies, or revokes a participant document/file,
   - Adjusts fee schedules or payment statuses,
   - Grants or alters user permissions/roles.
2. **Logged Fields**:
   - `id`: Unique identifier (UUID).
   - `timestamp`: UTC ISO-8601 timestamp.
   - `userId`: Identifier of the executing actor.
   - `action`: Specific operation performed (e.g., `ACCOUNT_CREATE`, `DOCUMENT_UPLOAD`, `STATUS_UPDATE`).
   - `targetEntity`: Target resource type (e.g., `User`, `ParticipantDocument`, `Enrollment`).
   - `targetId`: Unique ID of the affected resource.
   - `payloadHash`: SHA-256 hash of the action payload or state mutation details.
   - `previousHash`: SHA-256 hash of the immediately preceding audit log record (linking the chain).
   - `currentHash`: SHA-256 hash computed over all fields:
     $$\text{currentHash} = \text{SHA-256}(\text{previousHash} \parallel \text{timestamp} \parallel \text{userId} \parallel \text{action} \parallel \text{targetEntity} \parallel \text{targetId} \parallel \text{payloadHash})$$
3. **Genesis Record**: The initial record in the chain has a fixed, well-known `previousHash` consisting of 64 hexadecimal zeros (`0000000000000000000000000000000000000000000000000000000000000000`).
4. **Tamper Detection Mechanism**:
   - The append-only table permits only `INSERT` and `SELECT` operations at the database role level; `UPDATE` and `DELETE` permissions are strictly revoked.
   - An integrity verification routine recomputes the hash chain sequentially from the genesis record. If an attacker directly alters, injects, or deletes any historical record in the database, the hash chain breaks at that exact entry, exposing the tampering immediately.

### Information Assurance & Security Architecture (The CIA Triad)

The system enforces strict compliance with Information Assurance and Security (IAS) standards structured around the three pillars of the CIA Triad:

#### 1. Confidentiality (Data Privacy & Access Control)
- **Compliance with the Data Privacy Act of 2012 (RA 10173)**: Because Oak Sports Academy processes personally identifiable information (PII) of minors (youth athletes), specific privacy safeguards are mandated:
  - Explicit parent or legal guardian consent is recorded prior to storing minor participant data, health waivers, or biometric photos.
  - Granular data isolation: Minors cannot access other athletes' data. Parents/guardians can only view linked children. Staff view only athletes within assigned programs.
  - Private Supabase Storage buckets for sensitive files (IDs, medical forms, photos) protected by short-lived, signed URLs (TTL $\le 15$ minutes); public access is disabled.
- **Role-Based Access Control (RBAC) & PostgreSQL Row-Level Security (RLS)**:
  - Gate middleware enforces access controls at the application API layer.
  - PostgreSQL Row-Level Security (RLS) is enabled on sensitive tables (e.g., `User`, `Participant`, `ParticipantDocument`, `Enrollment`) in Supabase to guarantee that database queries enforce multi-tenant isolation even if application layer filters are omitted.

#### 2. Integrity (Data Accuracy & Tamper Resistance)
- **Input Validation & Injection Prevention**:
  - Every API request body, query parameter, and route parameter is strictly validated using Zod schemas with unexpected properties stripped.
  - SQL injection prevention is guaranteed through Prisma ORM's parameterized query engine.
  - XSS protection is maintained via HTTP security headers (Helmet, strict CSP) and React/React Native's automatic output encoding.
- **Immutable Administrative Audit Logging**:
  - Cryptographic append-only event logging with SHA-256 chaining (detailed above) prevents repudiation and exposes historical database tampering.

#### 3. Availability (Operational Resilience & Reliability)
- **API Rate Limiting & Denial-of-Service (DoS) Defense**:
  - Rate limiting using `express-rate-limit` across multiple tiers:
    - Global IP tier: General endpoint rate limiting (e.g., 100 requests / 15 minutes).
    - Sensitive endpoint tier: Login and verification endpoints limited to 10 requests per 15 minutes per IP and 5 requests per 15 minutes per email address with standardized `Retry-After` headers.
  - Request body payload size limits: Strict 10 kB cap on JSON request payloads and 5 MB cap on document uploads to prevent memory exhaustion DoS attacks.
  - Mobile retry resilience: Graceful offline detection, timeout recovery, and retry mechanisms on client requests to handle free-tier API cold starts (Render spin-up delays).

#### Security Audit & Engineering Guidelines
Development and code reviews should reference:
- **Cloudflare's Security-Audit skill guidelines** (https://github.com) for edge-layer security considerations, TLS configurations, and API perimeter defense.
- **OWASP Agentic Skills Top 10** for securing agentic AI development environments, validating tool boundary execution, and preventing unauthorized agent side effects.

## 5. AUTHENTICATION FLOW

### Registration
1. User submits the required registration information.
2. The backend validates all inputs.
3. The backend checks whether the email or other unique identifier is already registered.
4. The password is hashed using Argon2id.
5. The account is created in an unverified state.
6. The backend generates an email verification OTP and sends it through Resend.
7. The user submits the OTP.
8. The backend validates its hash, expiration, attempt limit, and account association.
9. If valid, the account's email is marked verified.
10. The account follows the academy's applicable approval rules.

Email verification and academy approval are separate. A verified email does not automatically mean the account, participant, or enrollment is approved.

### Login
1. User submits their credentials.
2. The backend validates the input and applies rate limits.
3. The backend retrieves the account.
4. The password is verified using Argon2id.
5. The backend checks email verification, account status, and other applicable login restrictions.
6. If permitted, the backend creates a server-managed session.
7. The session token is delivered through the appropriate web or mobile mechanism.
8. The client uses the session for subsequent authenticated requests.

Invalid credentials should produce safe responses that do not disclose whether an email exists.

### Authenticated Requests
1. Client sends the session through the agreed mechanism.
2. Backend verifies that the session exists, has not expired, and has not been revoked.
3. Backend loads the authenticated user's identity and permissions.
4. Authorization middleware checks the requested action.
5. Ownership checks verify that the user may access the specific participant, enrollment, payment record, or document.
6. The backend executes the operation only when all required checks pass.

### Logout
1. Client requests logout.
2. Backend revokes the current server-side session.
3. Web client clears the session cookie; mobile client clears the token from SecureStore.
4. The revoked session cannot be used again.

### Password Recovery
1. User requests a password reset.
2. Backend responds without revealing whether the account exists.
3. If eligible, the backend generates a random, expiring, single-use reset token.
4. The token is delivered using the configured email provider.
5. The user submits the token and a new password.
6. Backend verifies the token, validates the new password, and hashes the new password with Argon2id.
7. Backend updates the password, invalidates the reset token, and revokes relevant existing sessions.

## 6. ROLES AND AUTHORIZATION

Use backend-enforced role-based access control combined with ownership checks.

Initial role categories:
- Customer: an athlete or parent/guardian account holder.
- Staff: an authorized academy staff member.
- Admin: an administrator with explicitly granted administrative permissions.

Do not assume that every participant needs an independent login. An account holder may be responsible for multiple participant records.

A parent/guardian must only access participants linked to their account. An athlete must only access their own participant record and related resources unless another explicitly authorized relationship exists.

Staff permissions should be limited to their assigned responsibilities. Admin access must not be granted merely because a user submits a role name during registration.

The backend must enforce authorization on every protected endpoint. Hiding a button or page in the frontend is not an authorization control.

Use a centralized permission approach rather than duplicating inconsistent role checks throughout the application.

### Role-Based Access Control (RBAC) Bitmasking & Gate Middleware

To support high-performance, composable, and mathematically verifiable permission checking, the backend implements an RBAC Gate Middleware architecture with optional bitmasking:

1. **Permission Bitmask Representation**:
   Individual fine-grained capabilities are defined as powers of 2 (bit flags):
   - `PERM_READ_SELF` = $1$ ($1 \ll 0$)
   - `PERM_WRITE_SELF` = $2$ ($1 \ll 1$)
   - `PERM_READ_LINKED_MINORS` = $4$ ($1 \ll 2$)
   - `PERM_WRITE_LINKED_MINORS` = $8$ ($1 \ll 3$)
   - `PERM_STAFF_VIEW_ROSTER` = $16$ ($1 \ll 4$)
   - `PERM_STAFF_MANAGE_SCHEDULE` = $32$ ($1 \ll 5$)
   - `PERM_STAFF_RECORD_ATTENDANCE` = $64$ ($1 \ll 6$)
   - `PERM_ADMIN_MANAGE_ACCOUNTS` = $128$ ($1 \ll 7$)
   - `PERM_ADMIN_APPROVE_ENROLLMENT` = $256$ ($1 \ll 8$)
   - `PERM_ADMIN_VIEW_AUDIT_LOG` = $512$ ($1 \ll 9$)
   - `PERM_ADMIN_ALL` = `0xFFFFFFFF`

2. **Role Mapping**:
   High-level roles are bitwise combinations of individual permissions:
   - `CUSTOMER` = `PERM_READ_SELF | PERM_WRITE_SELF | PERM_READ_LINKED_MINORS | PERM_WRITE_LINKED_MINORS`
   - `STAFF` = `CUSTOMER | PERM_STAFF_VIEW_ROSTER | PERM_STAFF_MANAGE_SCHEDULE | PERM_STAFF_RECORD_ATTENDANCE`
   - `ADMIN` = `PERM_ADMIN_ALL`

3. **Gate Middleware Verification**:
   - Express Gate Middleware (`requirePermission(permissionBitmask)`) evaluates authorization in constant $O(1)$ time using bitwise AND:
     $$(\text{userPermissions} \mathbin{\&} \text{requiredBitmask}) == \text{requiredBitmask}$$
   - If the check evaluates to `false`, the middleware immediately terminates the request with `403 FORBIDDEN` and emits a security audit event.
   - Resource-level ownership checks (e.g. verifying that a participant ID in the request route is owned by the authenticated parent user) are executed immediately following the permission gate.

## 7. INITIAL RELEASE FEATURES

Prioritize the core features needed for the academy's registration and training workflows.

### Public Website
- Home page.
- About the academy.
- Programs and training types.
- Coaches.
- Events and announcements.
- Public schedules.
- Merchandise information where required.

### Customer Accounts and Participants
- Registration and login.
- Email verification and password recovery.
- Parent/guardian accounts.
- Participant profiles.
- Multiple linked participants per parent/guardian.
- Participant photo and required-document uploads.
- Enrollment status and relevant account information.

### Training and Enrollment
- Kyorugi.
- Poomsae.
- Mixed Program.
- Group Class.
- One-on-One Private Coaching.
- Packages, rates, and session counts.
- Schedule selection.
- Enrollment status management.
- Free-trial eligibility and slot allocation.
- Schedule conflict detection.

### Admin Dashboard
- Account and participant management.
- Account approval and correction workflows.
- Program and training-type management.
- Package and rate management.
- Schedule management.
- Free-trial capacity management.
- Enrollment approval and rejection.
- Payment-status monitoring.
- Public content, coach, event, and announcement management as required.

### Payment Scope
For the initial release, prioritize recording and monitoring payment status and any required payment evidence. Do not implement a payment gateway or claim that payments are automatically verified unless the client explicitly confirms that requirement and the group has time to integrate it.

QR payment instructions may be displayed if confirmed by the academy, but generating a QR code does not itself process or verify a payment.

### Enrollment Statuses
Use the agreed statuses:
- Pending.
- Approved.
- Needs Correction.
- Rejected.

Apply status transitions consistently in the backend and record appropriate audit information for important administrative changes.

## 8. DATABASE DESIGN PRINCIPLES

Use PostgreSQL with Prisma.

Potential core entities:
- User.
- Session.
- EmailVerificationToken or VerificationChallenge.
- PasswordResetToken.
- Participant.
- ParentParticipant relationship, if needed for the chosen account model.
- Program.
- TrainingType.
- Package.
- TrainingSchedule.
- Enrollment.
- FreeTrialRegistration or a clearly defined trial-enrollment model.
- PaymentRecord.
- UploadedDocument.
- Announcement.
- Coach.
- Event.
- Merchandise, if included in the initial scope.
- AuditLog for important administrative and security-sensitive actions.

These are initial design candidates, not permission to create every table without examining the requirements.

Important rules:
- Use primary keys, foreign keys, appropriate unique constraints, and indexes.
- Store timestamps consistently and define the academy's local timezone.
- Keep account-holder records distinct from participant records.
- Define enrollment, trial, and payment statuses explicitly.
- Avoid storing sensitive documents directly in database columns; store private file references and metadata.
- Use Prisma migrations for schema changes.
- Never edit production data manually without an approved procedure.
- Test migrations against a development database before applying them to shared or production environments.

## 9. REPOSITORY STRUCTURE

Use one private GitHub monorepo.

oak-sports-academy/
    AGENTS.md
    README.md
    package.json
    package-lock.json
    .gitignore
    .editorconfig
    .env.example

    apps/
        mobile/
            app/
            components/
            features/
            lib/
            AGENTS.md

        web/
            src/
                app/
                components/
                features/
                lib/
            AGENTS.md

        api/
            prisma/
                schema.prisma
            src/
                config/
                middleware/
                modules/
                    auth/
                    users/
                    participants/
                    programs/
                    enrollments/
                    schedules/
                    payments/
                    uploads/
                    content/
                app.ts
                server.ts
            AGENTS.md

    packages/
        shared/

    docs/
        requirements.md
        architecture.md
        database-design.md
        security.md
        development-workflow.md
        decisions/

    scripts/

Use npm workspaces for the monorepo unless a concrete compatibility issue requires another tool. Keep the structure simple and introduce files and modules as needed.

## 10. GIT AND GITHUB WORKFLOW

Use:
- main: stable, reviewed code.
- dev: shared integration branch.
- feat/feature-name: feature work.
- fix/issue-name: bug fixes.

Rules:
1. Create a private GitHub repository.
2. Do not push unreviewed code directly to main.
3. Keep feature branches focused.
4. Use descriptive commits.
5. Test before merging into dev.
6. Review security-sensitive changes and database migrations.
7. Never commit real environment files, credentials, passwords, tokens, or private keys.
8. Keep .env.example limited to placeholder values.
9. Do not run destructive database commands without explicit approval.
10. Keep Git history and pull requests understandable to the group.

## 11. AGENTS.MD AND AI CODING RULES

The root AGENTS.md must be the primary tool-neutral instruction file for all coding agents.

Every agent must:
1. Read the root AGENTS.md before making changes.
2. Read the relevant requirements and architecture documents.
3. Inspect the existing code before editing.
4. Follow the approved stack and repository structure.
5. Avoid introducing unnecessary dependencies or replacement frameworks.
6. Implement only the requested feature unless related changes are necessary and explained.
7. Never modify approved requirements, architecture, authentication decisions, or security policies without approval.
8. Never bypass authorization or weaken validation to make a feature work.
9. Add or update tests for meaningful changes.
10. Run relevant tests and report actual results.
11. Explain assumptions, limitations, failures, and incomplete work.
12. Ask for approval before destructive actions, significant schema changes, dependency changes with broad impact, or major architectural changes.
13. Never expose secrets in code, logs, commits, or responses.
14. Never claim a feature or test works unless it has actually been verified.
15. Keep changes small and reviewable.

Application-specific AGENTS.md files may add rules for mobile, web, or API development. They must not contradict the root instructions.

AI tools may propose improvements, but the group retains control over requirements, security-sensitive decisions, and major architectural changes.

## 12. TESTING REQUIREMENTS

At minimum, test:

### Authentication
- Registration with valid and invalid input.
- Duplicate email handling.
- Password verification.
- OTP expiration and attempt limits.
- Reuse of an already-consumed OTP.
- Password-reset token expiration and single-use behavior.
- Session expiration and logout revocation.
- Unauthorized API requests.
- Rate limiting.

### Authorization
- Customers cannot access other customers' participant records.
- Parents can access only linked participants.
- Unverified or unapproved accounts cannot perform restricted actions.
- Staff cannot perform actions outside their permissions.
- Admin routes reject unauthorized users.
- Private documents cannot be accessed through guessed or copied URLs without authorization.

### Free Trial
- Every supported age group.
- Unsupported ages.
- Maximum trial-day limit.
- Overall capacity limit.
- Age-group capacity limit.
- Unavailable schedules.
- Duplicate submissions.
- Cancelled or rejected registration counting policy.
- Concurrent registrations near full capacity.

### Scheduling
- Overlapping sessions.
- Non-overlapping sessions.
- Back-to-back sessions.
- Different dates.
- Participant conflicts.
- Instructor conflicts.
- Recurring sessions.
- Invalid start and end times.

### General
- Invalid request data.
- Database errors.
- Upload type and size restrictions.
- Error responses that do not expose internal details.
- Core workflows on Android and the web.
- Usability testing and user acceptance testing with authorized academy representatives.

Do not use real sensitive client data in development or testing unless there is explicit authorization and appropriate safeguards.

## 13. IMPLEMENTATION PRIORITIES

Phase 1: Repository and foundation
- Create the GitHub repository and monorepo.
- Configure npm workspaces and TypeScript.
- Write AGENTS.md and README.md.
- Set up the Express API, Prisma, and Supabase PostgreSQL.
- Configure environment validation and error handling.

Phase 2: Authentication and security
- Implement registration and Argon2id hashing.
- Implement email verification and password recovery.
- Implement server-managed sessions.
- Implement role checks, ownership checks, and account approval rules.
- Add security tests.

Phase 3: Core academy features
- Participant and parent/guardian management.
- Programs, training types, packages, and schedules.
- Enrollment and status workflows.
- Free-trial algorithm.
- Schedule conflict detection.
- Payment-status tracking.

Phase 4: Client applications
- Public website.
- Admin dashboard.
- Android mobile application.
- API integration and protected navigation.

Phase 5: Verification and deployment
- Automated and manual testing.
- Security and permission checks.
- User acceptance testing.
- Deployment using suitable free-tier services where permitted.
- Document known limitations and migration steps before real-world use.

## 14. FINAL RULES FOR DEVELOPMENT

Treat this document as the approved initial technical baseline.

Before implementing features:
1. Inspect the repository and existing instructions.
2. Read the relevant requirements.
3. Propose a small implementation plan.
4. Implement the smallest complete solution.
5. Add or update tests.
6. Run the relevant checks.
7. Summarize modified files, test results, and remaining issues.

Do not implement every feature in one large change. Build incrementally and verify each layer before integrating the next.

Do not add AI-powered features, pose estimation, payment-gateway integration, social login, advanced analytics, or other unconfirmed features unless the requirements are explicitly updated and approved.

Prioritize correctness, maintainability, access control, and successful core workflows over unnecessary architectural complexity.

## 15. ALGORITHM SPECIFICATIONS

The system incorporates three core algorithms required for academic evaluation in Algorithms & Complexity and Information Assurance & Security.

---

### Algorithm 1: Cardinality-Constrained Weighted Interval Scheduling (CC-WIS)

- **Feature**: Training Schedule Recommendation
- **Algorithm**: Cardinality-Constrained Weighted Interval Scheduling
- **Paradigm**: Dynamic Programming with Binary Search
- **Priority**: Primary / Required
- **Time Complexity**: $O(n \log n + nq)$, simplified to $O(n \log n)$ because cardinality $q \in \{2, 3\}$ is a small constant.
- **Space Complexity**: $O(nq)$, simplified to $O(n)$ where $n$ is the number of candidate training sessions.

#### Purpose
Recommend the optimal combination of weekly training sessions based on participant preferences while strictly preventing schedule overlaps.

The participant selects a desired weekly training frequency of twice ($q = 2$) or thrice ($q = 3$) per week. The algorithm identifies exactly the requested number of non-overlapping sessions that maximizes the cumulative preference score.

#### Inputs
- Available training sessions with unique IDs, day of week, start time, and end time.
- Participant preference scores ($w_i \in [1, 3]$) for each session slot.
- Requested weekly frequency constraint ($q \in \{2, 3\}$).

#### Algorithm Process
1. **Validation & Filtering**: Validate inputs ($q \in \{2, 3\}$); filter out cancelled or capacity-full sessions.
2. **Sorting**: Sort available candidate sessions by ending time:
   $$e_1 \le e_2 \le \dots \le e_n$$
3. **Compatibility Lookup**: For each session $i \in \{1, \dots, n\}$, find the latest compatible preceding session $p(i)$ such that:
   $$\text{end}(p(i)) \le \text{start}(i)$$
   Compute $p(i)$ using binary search over sorted ending times in $O(\log n)$ per item ($O(n \log n)$ total).
4. **Dynamic Programming Recurrence**:
   Define $DP[i][k]$ as the maximum preference score achievable using a subset of the first $i$ sessions with exactly $k$ non-overlapping sessions ($0 \le k \le q$):
   $$DP[i][k] = \max\Big(DP[i-1][k], \; DP[p(i)][k-1] + w_i\Big)$$
   Base cases: $DP[0][0] = 0$, $DP[0][k] = -\infty$ for $k > 0$, $DP[i][0] = 0$.
5. **Backtracking**: Starting at $DP[n][q]$, backtrack to determine the exact set of sessions chosen to reach the optimal score.
6. **Deterministic Tie-Breaking**: When multiple distinct schedules yield identical total scores, resolve ties deterministically using the lexicographical order of sorted session IDs.

#### Expected Output
- **Success**: Selected session IDs, cumulative preference score, session count ($q$), execution benchmark duration.
- **Failure**: `NO_FEASIBLE_SCHEDULE` error when no combination of $q$ mutually compatible sessions exists, or validation error for malformed inputs.

#### Rules and Constraints
- Selected sessions must not overlap in time; back-to-back sessions (where $\text{end}(A) == \text{start}(B)$) are permitted.
- Missing preference weights default to a neutral score ($w = 2$).
- Session times must be normalized to the academy's operational timezone (Asia/Manila).
- Instructor availability and facility capacity limits are filtered upstream before passing valid candidate slots to CC-WIS.

#### Benchmark Targets
- Test suite with $n = 100$, $n = 1{,}000$, and $n = 5{,}000$ candidate sessions.
- Execution time target: Less than 250 ms for $n = 5{,}000$ on standard server hardware.

---

### Algorithm 2: Trial Conversion & Student Churn Tracking

- **Feature**: Participant Lifecycle Monitoring and Trial Conversion Tracking
- **Algorithm**: Finite State Machine (FSM) Lifecycle Tracker
- **Paradigm**: Finite State Machine / Deterministic State Transition Modeling
- **Priority**: Secondary / Required
- **Time Complexity**: $O(1)$ per state transition using a fixed transition lookup table.
- **Space Complexity**: $O(1)$ per transition, excluding persistent event log history.

#### Purpose
Track each participant's lifecycle from initial registration through free trial participation, regular training enrollment, inactivity thresholds, and potential churn/withdrawal.

The FSM guarantees that participants move exclusively through valid, business-approved lifecycle states, while collecting telemetry for cohort conversion metrics and rule-based churn monitoring.

#### Lifecycle States
- `REGISTERED`: Profile created; no trial or enrollment booked yet.
- `TRIAL_SCHEDULED`: Free trial booking submitted and approved.
- `TRIAL_ACTIVE`: Attended at least one trial session (with entitlement remaining).
- `TRIAL_COMPLETED`: Completed trial entitlement (maximum 2 trial days) or trial period closed.
- `ENROLLED`: Regular paid training enrollment confirmed and active.
- `INACTIVE`: No active enrollment exceeding configured academy inactivity threshold (e.g., 30 days without renewal).
- `WITHDRAWN`: Formally withdrawn or participation concluded.

#### State Transition Table

| Current State | Valid Trigger Event | Next State | Guard Condition / Business Rule |
|---|---|---|---|
| `REGISTERED` | `TRIAL_BOOKED` | `TRIAL_SCHEDULED` | Trial eligibility confirmed (participant has $\le 2$ trial allocations) |
| `REGISTERED` | `ENROLLMENT_APPROVED` | `ENROLLED` | Academy administrative approval & fee confirmation |
| `TRIAL_SCHEDULED` | `FIRST_ATTENDANCE` | `TRIAL_ACTIVE` | Attendance check-in recorded by coach/staff |
| `TRIAL_ACTIVE` | `TRIAL_FINISHED` | `TRIAL_COMPLETED` | Trial session entitlement completed |
| `TRIAL_COMPLETED` | `ENROLLMENT_APPROVED` | `ENROLLED` | Regular enrollment submitted and approved |
| `REGISTERED` | `INACTIVITY_TIMEOUT` | `INACTIVE` | Profile idle without booking for $\ge 30$ days |
| `TRIAL_COMPLETED` | `INACTIVITY_TIMEOUT` | `INACTIVE` | No enrollment within 14 days of trial completion |
| `ENROLLED` | `MEMBERSHIP_EXPIRED` | `INACTIVE` | Training package concluded without renewal |
| `INACTIVE` | `ENROLLMENT_APPROVED` | `ENROLLED` | Account reactivated via approved new enrollment |
| Any non-withdrawn | `WITHDRAWAL_CONFIRMED` | `WITHDRAWN` | Guardian or admin formal cancellation confirmed |

#### Metrics & Analytics
- **Trial Conversion Rate**:
  $$\text{Conversion Rate} = \left(\frac{\text{Trial participants converted to regular enrollment in cohort}}{\text{Total eligible trial participants in cohort}}\right) \times 100\%$$
- **Rule-Based Churn Risk Indicators**:
  - Flag 1: Trial completed $\ge 7$ days ago without regular enrollment submission.
  - Flag 2: Active enrollment expiration in $\le 7$ days without renewal intent.
  - Flag 3: Unexcused absences $\ge 3$ consecutive sessions.

#### Rules and Constraints
- Transitions are deterministic; invalid transition attempts are rejected with `INVALID_LIFECYCLE_TRANSITION` and logged.
- Duplicate event deliveries are idempotent and do not trigger duplicate transitions.
- Participant lifecycle states are strictly separated from financial payment states (`PENDING`, `PAID`, `OVERDUE`).
- Transition events are persisted atomically within database transactions alongside the cryptographic audit log.

---

### Algorithm 3: Digital Document Collection & Automated Image Quality Screening

- **Feature**: Digital Document Collection & Secure Screening
- **Algorithm**: Magic Byte Signature & MIME Validation with Quality Pre-Screening
- **Paradigm**: Stream-based Header Inspection & Structural Binary Validation (Fixed-Offset Byte Verification)
- **Priority**: Secondary / Required
- **Time Complexity**: $O(k)$ where $k \le 32$ is the inspected header byte window, executing in constant $O(1)$ time prior to full file streaming.
- **Space Complexity**: $O(1)$ buffer space (inspects initial binary chunk without buffering full multi-megabyte payloads in memory).

#### Purpose
Secure the document collection workflow (IDs, birth certificates, medical clearances, and photo uploads) against malicious file uploads (e.g. executable scripts, PHP/JS shells disguised with image extensions), confirm authentic MIME types via magic numbers, and reject unreadable or inadequate uploads before storage in private Supabase buckets.

#### Inputs
- Initial binary byte stream/buffer of uploaded file (first 16–32 bytes).
- Client-provided `Content-Type` header and filename extension.
- File byte size (`Content-Length`).
- Document category validation rules (e.g., minimum dimensions for legal documents).

#### Algorithm Process
1. **Magic Byte Inspection**:
   Inspect the initial bytes (magic numbers) of the incoming file buffer to determine actual binary format:
   - **JPEG / JPG**: Must begin with `FF D8 FF` (specifically `FF D8 FF E0`, `FF D8 FF E1`, or `FF D8 FF EE`).
   - **PNG**: Must match the 8-byte signature: `89 50 4E 47 0D 0A 1A 0A` (`\x89PNG\r\n\x1a\n`).
2. **MIME Cross-Verification**:
   Compare the true binary signature against the client-declared `Content-Type` and file extension. If the client claims `image/png` but magic bytes indicate `text/plain`, `application/x-executable`, or JPEG, immediately terminate the upload with `MIME_SIGNATURE_MISMATCH`.
3. **Payload Boundary Enforcement**:
   - Minimum file size check: $\text{size} \ge 5\text{ KB}$ (rejects empty or corrupt stubs).
   - Maximum file size check: $\text{size} \le 5\text{ MB}$ (prevents memory and storage exhaustion).
4. **Header Dimension & Geometry Pre-Screening**:
   Parse the image header chunks (e.g., JPEG SOF0/SOF2 marker or PNG IHDR chunk) to extract pixel width and height without decompressing the full bitmap:
   - Enforce minimum resolution (e.g., $400 \times 400$ px for ID/waiver legibility).
   - Reject malformed or truncated image headers with `CORRUPTED_IMAGE_HEADER`.
5. **Path & Filename Sanitization**:
   Discard the client-provided filename. Generate a cryptographically random UUIDv4 filename (e.g., `doc_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d.png`) to eliminate directory traversal (`../`) and remote code execution vulnerabilities.
6. **Secure Hand-off**:
   Stream the validated file into the private Supabase Storage bucket and record the upload event in the cryptographic append-only audit log.

#### Expected Output
- **Success**: Verified MIME type, detected dimensions, sanitized storage path, SHA-256 payload checksum.
- **Failure**: `INVALID_FILE_SIGNATURE`, `MIME_TYPE_MISMATCH`, `FILE_SIZE_LIMIT_EXCEEDED`, `IMAGE_DIMENSIONS_TOO_SMALL`.

#### Rules and Constraints
- Never trust the client's file extension or HTTP `Content-Type` header without magic byte verification.
- SVG (`image/svg+xml`) is strictly forbidden for user document uploads to eliminate Stored Cross-Site Scripting (XSS) via embedded XML/JavaScript.
- All stored documents reside in private, non-public buckets; retrieval is permitted exclusively via signed, time-limited URLs generated by the backend after verifying ownership/RBAC permissions.

---

END OF PROJECT TECHNICAL SPECIFICATION