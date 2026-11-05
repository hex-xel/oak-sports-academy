# OAK SPORTS ACADEMY TRAINING REGISTRATION AND MANAGEMENT SYSTEM
## Final Project Technical Specification and AI Development Instructions

## Revision Basis and Precedence

Revised on 2026-11-05 against `REQUIREMENTS ENGINEERING-v3.12.09.2026.docx` (document heading: Group 5, III-BCSAD, University of Makati, October 17, 2026). The source defines Student requirements FR R-01 through FR P-01, Administrator requirements FR AL-01 through FR AN-01, and non-functional requirements 1–16.

The revised business requirements below supersede conflicting older business rules in this file. Compatible stack and security decisions are retained as technical decisions, not attributed to the revised requirements document. Unresolved source conflicts are listed in section 16; do not silently resolve them in implementation. This revision changes the master specification only; existing feature specifications, plans, tasks, architecture notes, and code require a separate consistency review before implementation.

## 1. PROJECT OVERVIEW

Project Name: Oak Sports Academy Training Registration and Management System Enhancement

Client: Oak Sports Academy, Taguig Branch

Project Type: Web and Android application system

Primary Goal:
Develop a centralized system for student registration, free-trial assessment and account approval, package enrollment, manually confirmed GCash/QR Ph payments, assigned schedules, attendance, training modules, belt promotion, monthly renewal, and medical make-up classes.

The system will have three client applications:
1. Android mobile application for students, with guardian information required for minors.
2. Public website for academy information and announcements.
3. Web-based Administrator dashboard, with scheduling and attendance duties also described for the coach.

All applications must communicate with one shared backend API and database. The revised requirements explicitly define Student and Administrator modules and mobile-browser compatibility. The existing Android app and public website remain technical baseline decisions; extra public content features are not newly required by this revision.

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

Supabase free-tier quotas and inactivity behavior must be verified before deployment; these service references are retained from the technical baseline and are not verified by this requirements revision:
https://supabase.com/pricing
https://supabase.com/docs/guides/platform/free-project-pausing

### File Storage
- Supabase Storage Free Plan
- Private storage buckets for participant photos, IDs, consent documents, and other sensitive uploads

Use private buckets and authorized server-side access. Do not make sensitive documents publicly accessible.

The backend must verify file ownership and permissions before providing access or generating short-lived signed download links.

Verify current Supabase Storage quotas before deployment:
https://supabase.com/docs/guides/storage/pricing

### Email Delivery
- Resend Free Plan for transactional email

Use email delivery for:
- Email verification OTPs.
- Password-reset instructions.
- Necessary account and enrollment notifications.

Keep email delivery behind a small backend service module so the provider can be replaced without changing authentication logic.

Verify Resend free-tier allowances, daily limits and sender-domain requirements before use; assess them against the five-minute notification target:
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
- Student records and mandatory parent/guardian information for minors; separate guardian logins are not required by the revised source.
- Training programs and training types.
- Training packages, rates, and session counts.
- Administrator-scheduled mandatory free-trial assessment before approval and enrollment.
- Training schedule conflict detection.
- Enrollment and approval workflows.
- GCash/QR Ph payment submissions and Administrator confirmation or rejection.
- Student and Administrator permissions; restricted coach scheduling and attendance access once the coach account model is confirmed.
- Automatic email and in-app notifications, delivery status, and failed-delivery resend.
- Relevant reports and dashboards.

### Database and API
The team will design the database schema, implement Prisma models and migrations, create REST endpoints, validate incoming data, enforce business rules, and test authorization.

### UI and Application Integration
The team will integrate the retained mobile/web clients with the same backend. Confirm the responsive Student web surface required by NFR 9 before expanding application scope.

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

These parameters are a starting point and must be checked against the installed library and actual hosting environment. Tune them after owner-run performance testing.

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
3. Store absolute expiry, last qualifying activity, idle expiry and revocation. Enforce 30-minute idle and eight-hour absolute expiry server-side, rejecting at either exact deadline. Only successful authenticated user-initiated protected operations renew idle expiry, capped by absolute expiry. Restore checks, background polling, failed requests and client timestamps do not renew validity; concurrent requests cannot revive expired or revoked sessions. This policy was approved on 2026-11-05 and implements NFR 5.
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
- Generate a 6-digit numeric OTP using cryptographically secure randomness.
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

Retain the existing SHA-256 append-only audit design to support the revised auditability requirement. Hash chaining provides tamper evidence under documented access and verification assumptions; it does not alone guarantee non-repudiation or detect a privileged rewrite of the entire chain without an independently trusted checkpoint.

1. **Triggered Actions**: Every time an administrator or staff member:
   - Creates or updates an account,
   - Approves, modifies, or rejects an enrollment,
   - Uploads, verifies, or revokes a participant document/file,
   - Adjusts fee schedules or payment statuses,
   - Grants or alters user permissions/roles,
   - Changes schedules or packages, records assessment outcomes, or promotes a belt.
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
   - An integrity verification routine recomputes the hash chain sequentially from the genesis record. Verification detects inconsistent records and links when run; tail deletion or complete privileged chain reconstruction requires an independently retained checkpoint to detect. Serialize concurrent appends and commit the business mutation and audit record atomically.

### Information Assurance & Security Architecture (The CIA Triad)

The system enforces strict compliance with Information Assurance and Security (IAS) standards structured around the three pillars of the CIA Triad:

#### 1. Confidentiality (Data Privacy & Access Control)
- **Compliance with the Data Privacy Act of 2012 (RA 10173)**: Because Oak Sports Academy processes personally identifiable information (PII) of minors (youth athletes), specific privacy safeguards are mandated:
  - Record waiver acceptance and protect minor data, 2x2 photos, and valid IDs. Preserve the existing requirement for explicit parent/legal guardian consent before storing minor data; reconcile the source registration order and non-parent relationship choices before implementation (section 16). A photo is not automatically treated as biometric processing.
  - Granular data isolation: Students can access only their own records. If existing linked-guardian or staff capabilities are retained, their access remains limited to explicitly linked children or assigned programs; these are not additional required user roles.
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
  - Cryptographic append-only event logging with SHA-256 chaining (detailed above) supports detection of historical tampering within the verification and checkpoint limits described above.

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
10. Complete required information, uploads, and waiver acceptance. The Administrator schedules and emails a free-trial assessment, then approves or rejects the student after assessment. Approval starts the default one-week enrollment/payment deadline; verification alone never grants approval.

Email verification and academy approval are separate. A verified email does not automatically mean the account, participant, or enrollment is approved.

### Login
1. User submits their credentials.
2. The backend validates the input and applies rate limits.
3. The backend retrieves the account.
4. The password is verified using Argon2id.
5. The backend checks email verification, assessment approval, account status, and other applicable login restrictions. Only verified, approved accounts may authenticate. Whether approved but not-yet-enrolled students receive limited enrollment access requires clarification in section 16; do not bypass the gate.
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

The revised source defines two user roles: Student and Administrator (NFR 5). Registration cannot grant Administrator privileges. All protected operations require backend session validation, a centralized permission gate, and resource ownership checks.

- Student: access only their own dashboard, eligible training choices, schedules, notifications, profile, attendance, evaluations, belt history, and payments. Students may edit their own personal/contact information and upload/edit their 2x2 photo without requesting Administrator approval (owner override 2026-11-05). Validate edits server-side and restrict them to an explicit profile-field allowlist. Role, account approval/status, credentials/verification, belt/progress, attendance, balances and payment records are not general profile fields. Viewing the valid ID does not imply permission to replace it.
- Administrator: review registrations, schedule and assess free trials, approve/reject accounts, correct student information, manage packages and fees, record progress and belt promotion, assign/change/cancel schedules, manage attendance and medical make-up approvals, confirm/reject payments, and inspect notification delivery.
- Coach: FR AC-01 and FR AA-01 permit scheduling and attendance duties, but the source does not define a third login role. Confirm whether this is the Administrator acting as coach or delegated staff access before implementing separate credentials. Never grant payment or account-approval powers implicitly.

Guardian information is required for minors; no separate guardian login is introduced. Migrate `CUSTOMER` to `STUDENT` through a forward migration preserving existing users and relationships. `STAFF` remains legacy storage pending inventory and a separate coach/delegation decision. Do not silently convert it, promote it or grant it access. Administrator remains distinct. These role-alignment decisions were approved on 2026-11-05; linked-participant permissions do not introduce additional business scope.

Retain the existing `requirePermission(permissionBitmask)` gate where compatible. An action is permitted only when `(userPermissions & requiredBitmask) == requiredBitmask`, followed by ownership checks. Deny with 403 and record appropriate security audit information. Self-profile editing permits validated owned personal/contact fields, but never protected account fields, balances, approval, belt level or payment status. Client visibility never grants authorization.

## 7. INITIAL RELEASE FEATURES

### 7.1 Student Registration and Assessment (FR R-01)

Provide a six-step form with a visible progress indicator:

1. Student type: Newly White Belts or Experienced Students (Colored/Black Belts).
2. Credentials: email, password, confirm password, and 6-digit email verification code.
3. Personal information: first name, middle name, surname, gender, date of birth, and age computed from date of birth.
4. Contact details: mobile number; address comprising house and lot, barangay, municipality, province. For minors, require guardian name, relationship (Parent, Aunt/Uncle, Sibling, Other), occupation, and contact number; prevent submission if missing.
5. Requirements: 2x2 photo and valid ID.
6. Terms and agreement: readable waiver and acceptance checkboxes; prevent registration submission until all are accepted.

After submission, show confirmation instructing the student to check email for the free-trial schedule. The Administrator assigns and emails the date/time. The student attends for assessment. The Administrator approves or rejects based on results. Approved students must enroll and pay within one week; accounts not enrolled by the deadline are automatically deleted. The deletion and pending-payment safeguards require confirmation in section 16 before enabling destructive automation.

### 7.2 Login and Student Home (FR L-01, FR H-01)

- Login uses email/password for verified students approved after assessment. Approved and enrolled students have the same Student screens and navigation; enrollment/payment/package status remains separate from account approval. Equal navigation does not activate unpaid training entitlements. Unapproved accounts cannot log in (owner decision approved 2026-11-05).
- Forgot password sends an expiring reset link to the registered email; allow entering and confirming the new password.
- Home shows a welcome message, current belt, student type, current package, total/used/remaining sessions, current module for Newly White Belts, and the next scheduled session.
- Student navigation is consistently ordered: Home, Training, Schedule, Notification, Profile (NFR 3).

### 7.3 Training Eligibility, Packages, and Modules (FR T-01)

Newly White Belts complete Modules 1–3 sequentially; completing the preceding module unlocks the next. They may access Group Classes only; Elite Training remains unavailable. Experienced Students access Regular Training and eligible students may access Elite Training (One-on-One Private Coaching). Experienced Students choose Kyorugi, Poomsae, or Mixed when enrolling. Elite eligibility criteria require client confirmation.

Every package defaults to 8 sessions plus 2 free bonus sessions (10 total).

| Student/package | Class length | Fee and uniform |
|---|---|---|
| Newly White Belts, Module 1 (required first package) | Group, 1.5 hours | PHP 6,499, free uniform |
| Newly White Belts, Module 2 (first renewal after completed Module 1) | Group, 1.5 hours | PHP 3,999, no uniform |
| Newly White Belts, Module 3 (Evaluation and Belt Promotion) | Group-only pathway; duration not separately specified | Fee to be confirmed; do not invent or collect a fee |
| Experienced Students, Group Class | 1.5 hours | PHP 5,500 with free uniform (source lists regular price PHP 6,000, “1st Module”), or PHP 3,999 without uniform |
| Experienced Students, Elite One-on-One | 1 hour | PHP 6,000 with free uniform, or PHP 3,999 without uniform |
| Regular renewal after one month | Applicable eligible class type | PHP 3,999 without uniform; also applies to Newly White Belts after their modules |

Group Classes require at least 3 and at most 10 students per age group. Block additions beyond the maximum; handling of groups below the minimum and age-group boundaries needs confirmation. All students renew after one month. Administrator configuration may change defaults under NFR 11; rules must use validated settings consistently rather than hardcoded constants.

Module content:

- Module 1 — Introduction and Basic Fundamentals: meaning of Taekwondo (Tae, Kwon, Do), basic stances, commands, footwork, kicking, blocking, and punching.
- Module 2 — Taekwondo Principles and Training Development: Five Tenets (S-M-I-P-E), basic movements and exercises, Foundation Forms #1 and #2, self-defense techniques 1–5 (three selected by coach), and Teacher's Combination Program.
- Module 3 — Evaluation and Belt Promotion: Evaluation Test, waiting for results, promotion and awarding ceremony. The source also says entry follows completion of Modules 1 and 2 and the required evaluation; clarify evaluation ordering before implementation.

### 7.4 Enrollment and Payment (FR T-01, FR AT-01, FR AP-01)

Before payment, the student chooses an eligible package, class type, training frequency (twice or thrice weekly), and weekday/weekend availability. Newly White Belts choose Group only; Experienced Students may choose Group or One-on-One and their training program. Show these choices on Training and to the Administrator.

1. Display the chosen package and amount due.
2. Display the academy's GCash or QR Ph QR code.
3. Student enters amount sent and reference number, then selects Submit Payment.
4. Record the payment as Pending and include it in Payment History. Prevent duplicate payment reference numbers (NFR 7).
5. Administrator checks amount and reference against the GCash/QR Ph record, then confirms or rejects after “Are you sure?”.
6. Confirmation enrolls the student and starts the package; rejection notifies the student and does not activate the package. Notify on either result.

Payment states are Pending, Confirmed, Rejected. They are separate from registration/assessment status, module progress, and package status. Do not retain the former generic enrollment states Pending/Approved/Needs Correction/Rejected as a substitute for these distinct workflows.

Automatic gateway confirmation is outside the stated enhancement scope, with final scope confirmation still noted by the source. A displayed QR code does not verify settlement. No payment-proof upload is required by the revision.

### 7.5 Schedule, Attendance, Renewal, and Make-Up Classes (FR S-01, FR AC-01, FR AA-01)

- Administrator/coach assigns date, time, coach, and class type using the student's weekday/weekend choice and twice/thrice-weekly frequency. Students view assigned sessions, rather than directly booking arbitrary slots.
- Administrator sees daily/weekly schedules and class counts per age group, can change/cancel sessions, and triggers student notifications. Prevent overcapacity and retain participant/coach overlap checks.
- Attendance lists today's sessions and students. Mark Present or Absent and update remaining sessions automatically, with idempotent corrections to prevent double deduction.
- For absence, choose Valid medical concern or Other. Approved medical absences carry over upon renewal, with no limit on the number carried; add approved carry-over to the remaining-session balance. Other/unexcused absences forfeit the missed session.
- All students renew after one month. Show students due for renewal with a Renew action. For Newly White Belts who completed Module 1, renewal uses Module 2 at PHP 3,999 by default. Do not unlock a module solely because time elapsed or a payment was received.
- Administrator marks modules complete, records evaluation results, and promotes belts. Record belt history and expose progress to the student. Exact renewal/payment ordering and session accounting rules are listed in section 16.

### 7.6 Student Notifications and Profile (FR N-01, FR P-01)

Notifications include enrollment/training and schedule confirmation, payment confirmed/rejected, session reminders, and monthly renewal reminders. Completed Module 1 reminders show Module 2 at PHP 3,999 by default, using the current approved fee configuration.

Profile provides personal/contact information, editable 2x2 photo, viewable valid ID, current belt and promotion history, training records, completed white-belt modules, evaluation results, attended/missed sessions and make-up sessions, and Payment History for packages, renewals, and fees with Pending/Confirmed/Rejected status. Students may edit their own personal/contact information directly without Administrator approval (owner override 2026-11-05), subject to validation and ownership. Sensitive account/security changes require their dedicated flows; academy-managed progress and financial records remain read-only to Students. Include logout.

### 7.7 Administrator Screens (FR AL-01 through FR AN-01)

Administrator login uses email/password and email-link password recovery; successful login opens Home. Keep the left menu in this order on every screen: Home, Registrations, Free Trial, Students, Training, Schedule, Attendance, Payments, Notifications, Log out.

| Source ID / screen | Required behavior |
|---|---|
| FR AH-01 Home | Clickable counts/lists: registrations awaiting review, upcoming trials, trials awaiting results, approved students not enrolled with days left, pending payments, renewals due, today's sessions. |
| FR AR-01 Registrations | List name, student type, submitted date, status; search by name/filter by status. Detail follows registration order: type, email, personal, contact, minor guardian information, photo/ID, waiver accepted Yes/No. Set Free Trial opens the student's trial screen. |
| FR AF-01 Free Trial | Choose student/date/time and Send Schedule by email. Approve/Reject after assessment with confirmation and result notification. Show enrollment days left. Lists: Upcoming, Waiting for result, Approved, Rejected. Automatic expiry deletion is subject to section 16. |
| FR AS-01 Students | Enrolled-student list with name, type, belt, package, remaining sessions; name search and type filter. Detail sections: Profile (guardian/photo/ID), Belts, Attendance, Records, Payment History. Correct information on student request. |
| FR AT-01 Training | Show approved student's choices, package durations/session counts/fees, Save fee with confirmation, monthly Renew action, module completion, evaluation and belt promotion, experienced student's class and program. Payment confirmation stays on Payments. |
| FR AC-01 Schedule | Daily/weekly sessions; assign student/date/time/coach/type using recorded preferences; enforce group limits; change/cancel and notify. |
| FR AA-01 Attendance | Today's rosters; Present/Absent; medical/Other reason; Approve Make-Up; automatic remaining-session updates. |
| FR AP-01 Payments | List student, package, amount sent, reference, method, date; manually Confirm/Reject with confirmation; search all/per-student history by name/reference; display status. |
| FR AN-01 Notifications | Automatic delivery; list sent date and Sent/Failed status; Resend action for failures. Email trial schedule, result, and enrollment deadline reminders before enrollment; deliver training/payment/session/renewal messages in-app. |

Registration list statuses: New, Free Trial Scheduled, Approved, Rejected, Enrolled. “Waiting for result” is a trial list category; do not automatically invent an additional registration status. Email verification and technical session/account states remain distinct.

### 7.8 Non-Functional Requirements (source NFR 1–16)

| No. | Criterion | Acceptance requirement |
|---|---|---|
| 1 | Performance | Pages load within 3 seconds; login, registration, and schedule requests complete within 5 seconds under normal network conditions. Define workload/network measurement conditions before acceptance. |
| 2 | Reliability | At least 99% monthly availability excluding scheduled maintenance; clear errors rather than silent failures. Demonstrate feasibility with chosen hosting; free-tier sleep is not proof this target is met. |
| 3 | Usability | Six-step registration progress; consistent Student and Administrator menu orders; plain admin wording; “Are you sure?” before approve/reject/delete actions. Reconcile automatic deletion separately. |
| 4 | Accessibility/readability | Readable font sizes, sufficient contrast, clear labels, responsive phone/tablet/desktop layouts. |
| 5 | Security | Hashed passwords, 6-digit email verification, expiring reset links, idle session termination, Student/Administrator role limits. Confirm idle timeout duration. |
| 6 | Privacy | Protect personal data, minors, photos and IDs in line with RA 10173; students see only their own data. |
| 7 | Integrity | Required-field/email/mobile validation, unique account email and payment reference, computed age, accurate 8+2 sessions and module sequence. |
| 8 | Capacity | Default minimum 3/maximum 10 per age group; prevent enrollment over maximum. |
| 9 | Compatibility | Latest Chrome, Edge, Firefox, Safari; Android and iOS mobile browsers. Native Android testing alone does not satisfy this requirement. |
| 10 | Maintainability | Separate Student and Administrator modules with documented code. |
| 11 | Configurability | Administrator can change fees, session counts, capacity, enrollment deadline (default one week), renewal period (default one month) without code changes. Settings UI location and effects on existing packages require confirmation. |
| 12 | Backup/recovery | Daily database backup and restoration within 24 hours after failure; owner must demonstrate backup/restore capability with selected services. |
| 13 | Notification reliability | Verification codes, schedules, assessment results and reminders delivered within 5 minutes; code resend and failed-email retries. Track failures and allow Administrator resend. |
| 14 | Auditability | Record user/date/time for approvals/rejections, schedule changes, package/fee changes, payment confirmations, and belt promotions. Retain compatible stronger audit controls. |
| 15 | Payment scope | GCash/QR Ph QR display and amount/reference recording with Administrator confirmation; no automatic gateway confirmation in current scope, subject to client confirmation. |
| 16 | Organizational | Follow assessment-before-enrollment, one-week deadline, monthly renewal, Make-Up Class Policy; train the Administrator to use the system. |

Apply the approved high-fidelity mockups and sticker sheets in `docs/design/` before UI implementation. Record design gaps rather than overriding approved visuals. Cover relevant loading, empty, error, offline, timeout, retry, submitting, invalid, focused, disabled, session-restoring, expired-session and denied-access states; preserve safe input and prevent duplicate submissions. These are retained project acceptance conventions alongside the revised source.

## 8. DATABASE DESIGN PRINCIPLES

Retain PostgreSQL/Prisma and backend-controlled access. This section identifies conceptual information needs only; it does not authorize schema changes or migrations.

Model the following responsibilities without requiring one table per item:

- Accounts, hashed credentials, verification/reset challenges, sessions with idle/absolute expiry, registration submission and assessment approval.
- Student type, personal/contact information, computed age from date of birth, minor guardian details, waiver acceptance evidence, private 2x2 photo and ID references.
- Free-trial schedules, attendance/assessment outcome, approval timestamp and enrollment deadline.
- Programs, class types, package/fee versions, configurable policy defaults, sequential module completion, evaluations and belt promotion history.
- Enrollment choices, payment submissions/status/reference uniqueness, confirmation actor/time, package activation and renewal dates.
- Scheduled sessions, coach assignment, age-group capacities, attendance, session deductions, approved medical make-up credits and carry-over at renewal.
- Notification delivery attempts, Sent/Failed state, retry/resend history, and key administrative audit events.

Use keys, foreign keys, unique constraints, indexes and atomic operations to protect capacity, duplicate payments, package activation and balances under concurrent requests. Define enrollment/trial/payment/module states separately. Do not persist passwords, codes, tokens, or sensitive uploads in logs. Store private object references and metadata rather than file bytes in database columns.

Store timestamps consistently in UTC; evaluate academy dates/schedules in Asia/Manila. Compute age from date of birth; minor age threshold, deadline boundaries and calendar-month renewal semantics need confirmation (section 16). Preserve approved fee/session policy snapshots so configuration edits do not silently rewrite historical transactions; confirm prospective-versus-current-package behavior before implementation.

Use reviewed Prisma migrations and owner-run development validation before shared/production changes. Implement automatic account expiry only after deletion scope, retention, audit preservation, pending-payment races and notification handling have been agreed. Never silently replace deletion with deactivation.

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
10. Supply exact validation commands and expected results for the owner to run, wait for reported output, and report actual results. Agents do not run test suites, installs, or setup under the root AGENTS.md execution boundary.
11. Explain assumptions, limitations, failures, and incomplete work.
12. Ask for approval before destructive actions, significant schema changes, dependency changes with broad impact, or major architectural changes.
13. Never expose secrets in code, logs, commits, or responses.
14. Never claim a feature or test works unless it has actually been verified.
15. Keep changes small and reviewable.

Application-specific AGENTS.md files may add rules for mobile, web, or API development. They must not contradict the root instructions.

AI tools may propose improvements, but the group retains control over requirements, security-sensitive decisions, and major architectural changes.

## 12. TESTING REQUIREMENTS

The owner runs automated suites, manual checks, builds, setup and acceptance exercises. Agents supply exact commands, working directories, expected results and failure guidance, then wait for reported results. Do not claim validation passed from this specification revision.

Acceptance coverage must trace to section 7 source IDs:

- Registration: all six steps and progress; required fields; matching passwords; 6-digit verification, expiry, attempt/resend limits; duplicate email; computed age; conditional guardian fields; required photo/ID and waiver checkboxes; confirmation email guidance (FR R-01, NFR 3/5/7).
- Approval/access: assessment precedes approval; verification alone never permits login; unapproved/rejected/expired users cannot access protected functions; Student cannot access another student's records; coaches cannot acquire ungranted administrative powers (FR L-01, FR AF-01, NFR 5/6).
- Deadline: approval timestamp, default one-week countdown, reminders, configured deadline changes, enrollment/payment completion, deadline boundary, retries, and concurrent confirmation/deletion. Do not execute destructive expiry acceptance until section 16 is resolved.
- Training: each student type; white-belt Group-only and sequential modules; Elite eligibility; exact default prices, uniform options, durations, 8+2 sessions; Module 1 completion followed by Module 2 renewal; evaluation/promotion history (FR T-01, FR AT-01).
- Payments: QR display for both methods, required amount/reference, unique references including concurrent submissions, Pending/Confirmed/Rejected history; confirmation prompt; reject notification; confirmation activates enrollment/package exactly once; unauthorized confirmation denied (FR AP-01).
- Scheduling/capacity: weekday/weekend and twice/thrice-weekly preferences, coach/date/time/class details, daily/weekly views, next session on Home, full-class rejection, group counts by age group, concurrent additions at capacity, conflicts and back-to-back sessions, change/cancel notifications (FR S-01, FR AC-01).
- Attendance/renewal: present/absent updates, safe repeated/corrected attendance, medical approval and unlimited approved carry-over at renewal, unexcused forfeiture, no duplicate make-up credits, one-month renewal and configurable periods (FR AA-01).
- Screens/records: both menu orders, dashboard links/counts, registration search/filter and field order, enrolled-student search/filter, profile photo editing and owned personal/contact self-editing, payment search, belt/evaluation/attendance histories, logout (FR H-01, FR P-01, FR AH-01/AR-01/AS-01).
- Notifications: verification resend; pre-enrollment emails; automatic in-app confirmations and reminders; Module 2 renewal copy; Sent/Failed state and resend; retry without duplicate business effects; five-minute delivery target (FR N-01, FR AN-01, NFR 13).
- Security: password/reset/session lifecycle including idle timeout, ownership and permission denial, private file access, upload type/size restrictions, rate limits, safe error messages, audit coverage and integrity verification (NFR 5/6/14).
- Operations: measured response targets, monthly uptime, responsive layouts, specified desktop/mobile browsers, Android application, daily backups and demonstrated restore within 24 hours, settings changes without code edits, Administrator training and academy acceptance (NFR 1–4/9–12/16).
- UI states: loading, empty, invalid, submitting, offline, timeout, retry, expired/denied session and keyboard/accessibility review against approved design assets.

Use synthetic data unless real sensitive data use is explicitly authorized with safeguards. Resolve section 16 acceptance blockers before treating affected flows as implementation-ready.

## 13. IMPLEMENTATION PRIORITIES

1. Reconcile this revised master specification with affected feature specs/plans/tasks, security and architecture notes, existing role mappings, and approved design screens. Obtain decisions for section 16; do not overwrite completed work or migrate data implicitly.
2. Complete six-step registration, verification, private uploads, waiver/guardian safeguards, Administrator registration review, free-trial email scheduling and assessment decisions.
3. Implement the approved access path for enrollment, configurable deadline tracking, GCash/QR Ph submissions, manual payment decisions and atomic enrollment/package activation. Enable expiry deletion only after its safeguards are approved.
4. Implement student-type eligibility, package prices, sequential modules, admin-assigned schedules, capacities, attendance, monthly renewal, medical carry-over, evaluations and belt promotion.
5. Complete Student and Administrator screens, notification reliability/resend, audit events, policy configuration, backup/recovery procedures and Administrator training.
6. Owner performs automated/manual acceptance, security and device/browser checks, operational target measurements and deployment review. Record limitations of selected free-tier services rather than claiming they meet unmeasured targets.

## 14. FINAL RULES FOR DEVELOPMENT

Treat this document as the revised business requirements and retained technical baseline, subject to the explicit implementation gates in section 16.

Before implementing features:
1. Inspect the repository and existing instructions.
2. Read the relevant requirements.
3. Propose a small implementation plan.
4. Implement the smallest complete solution.
5. Add or update tests.
6. Provide owner-run check commands and expected results; wait for the owner's results where validation is required.
7. Summarize modified files, test results, and remaining issues.

Do not implement every feature in one large change. Build incrementally and verify each layer before integrating the next.

Do not add AI-powered features, pose estimation, payment-gateway integration, social login, advanced analytics, or other unconfirmed features unless the requirements are explicitly updated and approved.

Prioritize correctness, maintainability, access control, and successful core workflows over unnecessary architectural complexity.

## 15. ALGORITHM SPECIFICATIONS

The previous baseline specified three academic algorithms. The revised requirements do not mandate these algorithms. Retain compatible work as technical context only; academic deliverable requirements need confirmation. They must not override the revised student/admin workflows or add analytics to release scope.

---

### Algorithm 1: Cardinality-Constrained Weighted Interval Scheduling (CC-WIS)

- **Feature**: Training Schedule Recommendation
- **Algorithm**: Cardinality-Constrained Weighted Interval Scheduling
- **Paradigm**: Dynamic Programming with Binary Search
- **Status**: Retained academic design; release requirement unconfirmed.
- **Time Complexity**: $O(n \log n + nq)$, simplified to $O(n \log n)$ because cardinality $q \in \{2, 3\}$ is a small constant.
- **Space Complexity**: $O(nq)$, simplified to $O(n)$ where $n$ is the number of candidate training sessions.

#### Purpose
Provide an optional recommendation to the Administrator/coach while assigning schedules. Students specify weekday/weekend availability and twice/thrice-weekly frequency; the Administrator/coach remains responsible for the assignment. Preference scores are an internal algorithm input, not a newly required student form. Filter by student eligibility, availability, class duration, capacity and coach conflicts before scoring.

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

### Algorithm 2: Registration and Enrollment Lifecycle Tracking

Retain an FSM approach with O(1) transition checks for fixed state sets, but replace the former two-day trial entitlement, direct registration-to-enrollment bypass, 14-day trial inactivity rule and churn analytics. Those rules are not supported by the revised requirements.

| Current registration state | Event | Next state | Guard/effect |
|---|---|---|---|
| New | Administrator sends free-trial schedule | Free Trial Scheduled | Registration, required documents and waiver submitted; email schedule. |
| Free Trial Scheduled | Administrator records assessment approval | Approved | Assessment completed; confirm action; record approval time/default one-week deadline; notify. |
| Free Trial Scheduled | Administrator records assessment rejection | Rejected | Assessment completed; confirm action; notify. |
| Approved | Administrator confirms package payment | Enrolled | Valid eligible package and payment; atomically confirm payment, activate package and update registration. Deadline race policy requires confirmation. |
| Approved | Enrollment deadline expires without enrollment | Account deleted as required by source | Destructive action, not an added registration status; enable only after section 16 safeguards are approved. |

Trial attendance and “Waiting for result” may be tracked separately without changing the published registration statuses. Payment remains Pending/Confirmed/Rejected. Module completion and monthly renewal remain distinct from registration; do not mark an enrolled student unapproved merely because a package expires. Invalid/duplicate events must not double-activate a package, deduct sessions twice or duplicate make-up credits. Keep important business mutations and audit records atomic. Enrollment access and deletion/renewal rules are gated by section 16.

---
### Algorithm 3: Digital Document Collection & Automated Image Quality Screening

- **Feature**: Digital Document Collection & Secure Screening
- **Algorithm**: Magic Byte Signature & MIME Validation with Quality Pre-Screening
- **Paradigm**: Stream-based Header Inspection & Structural Binary Validation (Fixed-Offset Byte Verification)
- **Status**: Retained technical screening design; revised source requires private 2x2 photo and valid ID uploads.
- **Time Complexity**: Signature matching uses a bounded header. JPEG dimension parsing scans marker segments; full-file checksumming is O(file size). Do not claim the entire upload pipeline is O(1).
- **Space Complexity**: $O(1)$ buffer space (inspects initial binary chunk without buffering full multi-megabyte payloads in memory).

#### Purpose
Secure the required valid-ID and 2x2-photo collection workflow against malicious file uploads (e.g. executable scripts, PHP/JS shells disguised with image extensions), confirm authentic MIME types via magic numbers, and reject unreadable or inadequate uploads before storage in private Supabase buckets.

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
   Parse image structure (JPEG SOF markers or PNG IHDR) to extract dimensions; JPEG dimensions need not be within the first 32 bytes. Bound parser work, reject malformed files and separately validate complete decoding; a valid signature alone does not establish image safety or readability:
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

## 16. REQUIRED CLARIFICATIONS AND DOWNSTREAM ALIGNMENT

The revised document is authoritative for the changed business requirements, but contains gaps and conflicting statements. The following are explicit implementation gates, not invented policy:

1. **First login and enrollment access — resolved 2026-11-05:** Verified assessment-approved Students have the same Student screens and navigation before and after enrollment. Account approval is separate from registration, payment and package status. Unapproved accounts cannot log in; equal navigation does not activate unpaid training entitlements.
2. **One-week deletion:** Confirm exact deadline start/boundary, timezone, whether enrollment requires confirmed payment before expiry, and treatment of an on-time Pending payment awaiting Administrator action. Define deletion scope (account, profile, documents and pending records), retention/anonymization and audit preservation, failure recovery and notice. FR AF-01 automatic deletion must be reconciled with NFR 3 confirmation before deletion. Do not substitute deactivation or enable destructive deletion without these decisions.
3. **Minor/guardian rules:** Confirm minor-age threshold and age calculation date, authorized consent provider, and how guardian consent is collected before storing minor data when the source places waiver acceptance last. Guardian relationship choices alone do not establish legal consent authority. Confirm whether separate guardian logins from the old baseline remain desired.
4. **Modules and eligibility:** Confirm Module 3 fee, duration/session entitlement and evaluation ordering; white-belt completion criteria; transition into Experienced Student classification; Elite eligibility. Clarify the experienced Group fee wording “regular price PHP 6,000, 1st Module”. Do not apply white-belt module locks to Experienced Students without approval.
5. **Renewal and balances:** Confirm calendar month versus fixed days, expiry time, treatment of unused bonus sessions, medical evidence/approval timing, deduction/reversal rules, and whether Renew waits for confirmed payment. Medical carry-over has no count limit; unexcused absences forfeit sessions. Define how configured counts/periods affect existing paid packages.
6. **Scheduling/capacity:** Confirm age-group bands, minimum-group-size behavior, free-trial capacity/duration and rescheduling/no-show rules. The old two-trial-day allowance is superseded; no new numeric trial entitlement is specified. Confirm coach credentials and delegated permissions.
7. **Settings and notifications:** Confirm settings location without changing the mandated menu order, permitted setting ranges, fee-change effective dates, payment reference uniqueness/normalization across methods, reminder cadence, retry limits and resend behavior. Idle-session policy was resolved on 2026-11-05 as specified in section 4. All other settings/notification questions remain open.
8. **Delivery/platform feasibility:** Confirm responsive student web access needed for Android/iOS browser compatibility alongside the retained native Android app; no native iOS app is specified. Agree measurement conditions and hosting/backup arrangements for 99% availability, response/delivery targets, daily backups and 24-hour recovery. No plan upgrade or architecture replacement is authorized by this document revision.
9. **Downstream review:** Existing `specs/001-user-login/` artifacts, role/guardian architecture, audit documentation, README, design mockups and academic algorithm notes must be reviewed against this baseline before their affected behavior is implemented. This revision does not update those artifacts or certify existing code as compliant. Public content/merchandise and churn analytics from the older baseline are not required by the revised source; confirm any retained scope separately.

END OF PROJECT TECHNICAL SPECIFICATION
