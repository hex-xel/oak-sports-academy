---
status: deferred
owner: team
milestone: 1
---

# Deferred content WebView handoff

This records the future direction from [plan: WebView scope](../../specs/001-user-login/plan.md#client-architecture-and-the-webview-question)
and [research R11](../../specs/001-user-login/research.md#r11--webview-session-handoff-deferred-design).
No WebView, handoff endpoint, exchange-code storage or browser-cookie authentication
is implemented by this feature. The current [native authentication flow](auth.md)
and [opaque-session decision](../decisions/ADR-0001-opaque-sessions.md) remain unchanged.

## Scope and native boundary

Content-heavy, low-interaction pages such as schedules, announcements and program
information are candidates for later reuse. Login, logout and account actions stay
native. A WebView is not authorization and must not become a replacement for the
native app. Content reuse must support 360 dp layouts and the future Student website.
Using WebView for an authentication screen requires explicit approval and an amendment
to the master requirements before implementation.

The native opaque bearer stays in Expo SecureStore and travels only in API
Authorization headers. Never place it in a WebView URL, page source, injected
JavaScript, a message bridge, browser storage or a page-readable cookie. A page may
not choose a user ID, role or permissions for the handoff. Native token persistence
and the existing server-side expiry, permission and ownership checks remain authoritative.

## Proposed exchange sequence — not an available API

1. After an explicit request to open an eligible content page, the native app asks
   the API for a handoff code using its existing authenticated transport. Research R11
   names the future candidate `POST /auth/webview-handoff`; that route does not exist
   in the current API and must not be called by this feature.
2. The future server validates the current session/account and destination access,
   then issues a code bound to the user with a 60-second lifetime and single use.
   The code is distinct from the native bearer and cannot extend its validity.
3. Native navigation opens only the intended trusted content origin with `?code=…`,
   as described in R11. The receiving server validates and atomically consumes the
   code, establishes an appropriately scoped browser cookie, and redirects to the
   clean content URL. The page never receives the native bearer.
4. Subsequent content requests require server-side authentication, permissions and
   ownership; the clean URL is not a grant of access. Reuse, expiry or rejection of
   the code must lead to safe recovery, without an automatic authentication loop.

The exchange code is itself a short-lived credential. Single use alone does not
prevent interception before redemption. Before implementation, review URL handling
at the ingress, server and browser so codes are excluded from logs/analytics,
third-party subresources and referrers. A clean redirect does not by itself guarantee
removal from every intermediary or browser-history entry.

## Decisions required before implementation

The future feature must specify the exact issuance/redemption schemas, code entropy
and protected storage, atomic consumption under concurrency, audience/origin and
destination binding, and rate limits. Code expiry must use server time. Issuance and
redemption must recheck the applicable session/account state and must not provide
unpaid entitlements or broader browser privileges.

It must also define cookie domain/path, Secure/HttpOnly/SameSite policy, CSRF controls,
TLS, redirects, WebView origin/navigation allowlists, bridge restrictions and external-
link behavior. Cookie lifetime, native logout propagation, account suspension and
session revocation require an explicit relationship to the originating native session;
do not silently create an independent long-lived browser session. Whether handoff
issuance counts as successful interactive activity must be classified server-side;
page loading/background polling must not acquire renewal authority implicitly.

These are implementation gates, not claims of an already delivered browser contract.
No dependency, database migration, cookie policy or runtime endpoint is added here.

## Future acceptance evidence

The implementing feature must cover expiry at the exact deadline, two simultaneous
redemptions with only one winner, replay, incorrect origin/destination, restricted or
revoked accounts, and failed/timeout recovery. Verify no bearer crosses the native
boundary, no exchange code remains in the clean URL or telemetry, and cookie-backed
requests cannot bypass permissions/ownership. Review native logout and browser-session
cleanup together, including offline behavior. Test responsive content and accessibility
at 360 dp. Setup remains owner-run and documented in the [README](../../README.md).

This deferred design has no executable acceptance result in T056. Current native
acceptance limitations remain tracked separately in [T053](../../specs/001-user-login/tasks.md).
