---
status: approved-decisions-implementation-pending
owner: team
milestone: 1
---

# Login requirements alignment — 2026-11-05

The owner resolved the login review questions: approved students have the same access
before and after enrollment, technical session policy is delegated, and CUSTOMER
should migrate to STUDENT. These are decisions for implementation, not validation
of the existing backend. See [correction tasks T062–T066](../../specs/001-user-login/tasks.md).

## Access and status

Email verification and assessment approval remain necessary for login. Approval
changes the technical account from PENDING_APPROVAL to ACTIVE. Approved and enrolled
students share student screens and navigation. Enrollment/payment/package status
still determines purchased entitlements; viewing a screen does not activate an unpaid
package or authorize training attendance. Administrator permissions remain separate.
Expired packages must not turn approved students back into unapproved accounts.

Use STUDENT for the former CUSTOMER role, migrating existing data through a new
forward migration. Legacy STAFF records require inventory and a separate disposition;
never silently promote them or infer coach privileges. Applied migrations stay intact.

## Session policy

Choose 30 minutes of inactivity, enforced on the server, while retaining the eight-hour
absolute expiry. This is a project policy choice informed by
[OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html),
which requires server enforcement and a timeout appropriate to application risk.
The value is not a universal OWASP requirement. Reassess privileged workflows when
Administrator features are designed, including reauthentication for sensitive actions.

Only successful authenticated user-initiated protected operations renew activity.
Classify routes on the server; background polling, session restoration, rejected
requests and client clocks cannot keep sessions alive. Update activity atomically,
never beyond absolute expiry and never reviving an expired or revoked session.
At either deadline require login again with safe feedback; offline UI is not authority.
The current backend has only absolute expiry; idle enforcement remains unimplemented.

## Remaining boundaries

Student personal/contact corrections are Administrator-only. The existing runtime
self-profile grant needs removal through a forward migration, with RLS regression
coverage. Assessment/enrollment deadlines, automatic deletion, retention and pending
payment races remain unresolved; no destructive cleanup is authorized.

Full student Home/navigation and email-link password reset belong to dependent
features. Existing mockups must be inspected and reconciled before UI changes.
T062 reconciled the feature artifacts; the owner explicitly approved the master
amendments, applied on 2026-11-05. T027 owner typecheck and all 15 focused tests passed. T031 real
database coverage remains pending. No agent-run tests, setup or migrations occurred.

## Master amendments — approved and applied 2026-11-05

The owner approved the following amendments, now applied to `specifications.md`:

1. Replace section 16 item 1 with: **First login and enrollment access — resolved
   2026-11-05:** Verified assessment-approved Students have the same Student screens
   and navigation before and after enrollment. Account approval is separate from
   registration, payment and package status. Unapproved accounts cannot log in;
   equal navigation does not activate unpaid training entitlements. Align the first-login
   summary in section 7.2 with this decision.
2. Replace section 4 session rule 3 with: Store absolute expiry, last qualifying activity,
   idle expiry and revocation. Enforce 30-minute idle and eight-hour absolute expiry
   server-side, rejecting at either exact deadline. Only successful authenticated
   user-initiated protected operations renew idle expiry, capped by absolute expiry.
   Restore checks, background polling, failed requests and client timestamps do not
   renew validity; concurrent requests cannot revive expired or revoked sessions.
3. Replace section 6 legacy-role paragraph with: Guardian information is required for
   minors; no separate guardian login is introduced. Migrate CUSTOMER to STUDENT through
   a forward migration preserving existing users and relationships. STAFF remains legacy
   storage pending inventory and a separate coach/delegation decision. Do not silently
   convert it, promote it or grant it access. Administrator remains distinct.
4. In section 16 item 7 remove the unresolved exact-idle-timeout question and replace
   it with: Idle-session policy was resolved on 2026-11-05 as specified in section 4.
   All other settings/notification questions remain open.

Deletion/retention, consent, scheduling, coach powers, renewal and browser delivery
questions remain unresolved. T062 is complete following explicit owner approval under
AGENTS.md. Backend changes remain pending T063–T065; this document alignment does not
claim those changes are implemented or validated.
