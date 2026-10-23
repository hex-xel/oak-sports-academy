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

END OF PROJECT TECHNICAL SPECIFICATION