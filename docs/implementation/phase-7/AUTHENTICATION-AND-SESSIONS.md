# Authentication and sessions

## Proposed initial sign-in

Use an email one-time code as the default web flow, subject to the compatibility checks in [existing accounts and data](EXISTING-ACCOUNTS-AND-DATA.md). A code supports returning from an email app to the original browser without requiring a cross-browser callback.

Flow: enter email, request code, enter code, verify, establish session, return to the validated destination. Show resend, change-email and recovery actions. Support paste, a single accessible code input and one-time-code autofill. Read code format, expiry and resend behaviour from verified configuration.

A request response is not a signed-in session. Only successful verification establishes identity. New-account creation must be intentional and disclosed beside Continue, with Privacy and Terms links. Do not enable silent signup in a sign-in-only recovery path.

Use the provider's supported verification flow. Do not invent or store raw codes yourself. Avoid email in URL query strings and analytics. Keep pending email state short-lived and clear after completion or cancellation.

## Shared-provider compatibility

The native app currently has password and Google code paths. Inventory enabled providers before selecting the web release flow. Preserve existing native authentication.

Email-code templates and expiry settings affect the shared project. Verify signup, recovery and existing native email flows in staging before editing global templates. If OTP would break an established flow, retain the compatible provider flow and document the revised default.

Google on web is conditional on verified existing-user need and correct web credentials/redirects. Do not show an unconfigured provider button. A web OAuth path must use supported PKCE code exchange, not the native token-fragment callback.

Password creation/reset screens are unnecessary for an OTP-only release. Existing users who need password or provider recovery still require a functioning supported route. Never promise continuity before testing their journey.

## Server session boundary

Extend the Phase 4 request-scoped web client using the installed supported Supabase SSR package. Reuse one implementation of cookie reads, writes and refresh. Do not create module-level user-bearing server clients.

Compose auth refresh with the existing `src/proxy.ts`. Its current matcher only covers deferred and design-review routes, so protected account routes need explicit coverage. Preserve existing unavailable-page responses. Refresh in the proxy is not sufficient authorization for mutations or data reads.

Verify identity at the protected data boundary and again for mutations. Signed-token claims establish identity within token validity. Use a current Auth-server user check for operations requiring current session/account status, especially account lifecycle actions. Never authorize from the unverified user object returned by getSession.

Apply refresh cookies and cache headers to the final response, including redirects. Use private, no-store responses for account/auth operations and any response carrying user-specific data or session cookies. Avoid shared caching of identity-bearing HTML, server component payloads or redirects.

Use HTTPS production cookies with compatible SameSite and path settings. Follow the supported SDK contract rather than forcing HttpOnly on cookies the browser client needs. Never serialize access or refresh tokens into page props.

## Public recipes and account state

Keep Phase 6 anonymous recipe rendering independent of an Auth-server round trip where practical. Load private saved indicators through an authenticated private request or a non-shared authenticated render.

A public recipe cache must not contain another visitor's email, saved state or session cookie. When authentication is unavailable, free recipe content still renders and Save explains the temporary problem.

After sign-in, finish session persistence before navigating to a page whose requests require the session. Reconcile client state after authentication changes and discard prior-user responses.

## Redirect and request safety

Suggested route contracts:

| Route | Purpose |
| --- | --- |
| `/sign-in` | Email request and code verification UI |
| `/auth/callback` | Conditional provider code exchange, only if a provider is enabled |
| `/account` | Private account overview |
| `/account/saved-recipes` | Private bookmark list |

Auth mutations should use server actions or POST route handlers with schema validation and origin/CSRF protection appropriate to the chosen transport. No save, delete or sign-out state change through a GET request.

Accept a narrowly validated local return path. Default to /account/saved-recipes. Allow intended recipe and account destinations only. Reject external origins, protocol-relative URLs, backslashes, control characters, ambiguous encodings and sign-in/callback loops. Do not trust forwarded host headers to construct authentication redirects.

Keep production redirect allowlists exact. Use a stable approved protected-preview origin rather than permitting every deployment host. Preserve native redirect schemes where still needed. Strip authorization codes from the destination and logs.

## Sign-out and expiry

Make normal Sign out local to the current session, with explicit provider scope. Do not rely on a default global sign-out which might disrupt the native app.

Clear private query caches, pending save actions and user-specific component state. Redirect to public recipes. Browser Back and account switching must not reveal the previous account's list. Other tabs sharing the same browser session should reconcile promptly.

Expired or invalid sessions return to sign-in with a safe destination. A failed save after expiry must not display Saved. Preserve no private response from the prior session.

Access-token validity and refresh-token revocation differ. Do not promise instant invalidation of all previously issued tokens on ordinary sign-out. Sensitive actions need current-user verification and applicable database access checks.

## Email delivery and abuse controls

Before public signup, configure a verified transactional sender and custom SMTP/provider suitable for production. Review sender branding, reply/support address, domain authentication, delivery errors and quotas.

Enforce server/provider rate limits for send, resend and verification. A disabled client button is not a rate limit. Return neutral messages which avoid disclosing account existence. Treat throttling and provider downtime as recoverable states. Add supported bot protection when required by the actual abuse model and provider configuration.

Test delivery to designated test inboxes and native compatibility before enabling public traffic. This plan does not authorize bulk emails or sending test codes to real customers.

Log sanitized error categories and request correlation IDs only. Never log OTP values, tokens, entire sessions, callback URLs or plaintext email addresses by default.

## Official implementation references

Recheck against installed versions during implementation:

- [Passwordless email sign-in](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [SSR client setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [SSR session and cache guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- [Production email delivery](https://supabase.com/docs/guides/auth/auth-smtp)
- [Sign-out scopes](https://supabase.com/docs/guides/auth/signout)
- [Next.js authentication boundaries](https://nextjs.org/docs/app/guides/authentication)

Provider documentation supports integration choices. The route structure, product scope and release requirements above are project decisions.
