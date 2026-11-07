---
status: approved
owner: team
milestone: 1
---

# Registration Admin design review — T002

Open [the interactive proposal](high-fidelity/registration-admin-proposal.html) in
a browser. It is a local, dependency-free design artifact, not the production Admin
application. All records are synthetic; no API calls, files, credentials or email
delivery are connected. Do not enter a real password in the preview.

## References inspected

- Mobile `high-fidelity/registration.png`: six steps, OTP sheet, conditional guardian
  fields, two upload slots, three agreements, gold final action, success/error states.
- Web `sticker-sheet/sticker-sheet.png`: forest/gold branding, crest, input outlines,
  rounded cards, badges and navigation conventions. Mobile and web sheets are large;
  reduced local review copies were used after the image tool rejected full dimensions.
- Existing `apps/mobile/constants/theme.ts` supplies the established implementation
  tokens reused here. Poppins is preferred; the standalone preview falls back to Arial
  if Poppins is not installed. No remote font or icon dependency is introduced.
- Master §7 Administrator requirements: exact menu order, field order, registration
  statuses and separate trial/result delivery state.

## Proposed screens and behavior

1. **Login:** crest and forest heading, persistent email/password labels, busy/error/
   expiry states. Preview Home is clearly a simulated action. Password recovery is
   identified as outside this slice rather than linked to an unimplemented flow.
2. **Home:** links to review registrations, upcoming trials and awaiting results.
   Unbuilt payment/renewal/session counters have no fabricated values.
3. **Registrations:** name search, status filter, bounded-list design, named review
   links, distinct empty database and empty search feedback. Pagination is needed
   when production results exceed the server page limit.
4. **Detail:** type/email → personal → contact → conditional guardian → private photo/
   ID → agreements, followed by Set Free Trial. No real document embedded in proposal.
5. **Free Trial:** upcoming/waiting-for-result category, Manila date/time, positive
   duration/capacity entered by Admin, schedule confirmation, separate email outcome,
   and confirmed approval/rejection after a scheduled assessment. Decisions do not
   activate enrollment. Production must gate decisions by actual server state.

The menu is Home, Registrations, Free Trial, Students, Training, Schedule, Attendance,
Payments, Notifications, Log out. Unbuilt modules are visible but unavailable.
At narrow widths the proposal menu scrolls horizontally; confirm whether this is
acceptable for the thin Admin demonstration before production implementation.

## Owner review

Review the five screen links at the top, search/filter behavior, schedule confirmation
and decision dialogs. Try keyboard Tab/Shift+Tab and Escape to dismiss dialogs, and
resize the browser. The proposal includes state descriptions below every workspace
screen; these are design requirements, not passed runtime acceptance evidence.

**Approved 2026-11-06:** owner directed continuation after presentation; approval covers of new Admin layout/navigation, small-screen treatment,
unavailable-module presentation and the proposed state copy. No existing mobile UI
has been edited. Final browser keyboard/screen-reader and actual data/provider review
remain T029. T002 is complete; implementation and runtime acceptance remain pending.
