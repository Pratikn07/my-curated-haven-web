# Phase 7 validation and release

## Security and behaviour matrix

Use isolated synthetic users A and B, three free recipe fixtures, a paid recipe and a draft/withdrawn recipe.

| Case | Expected result |
| --- | --- |
| Anonymous free detail/print | Complete recipe, no account requirement |
| Anonymous account request | Safe sign-in redirect, no private payload |
| User A saved list | A's approved metadata only |
| A supplies B's user_id | Read/write denied by backend enforcement |
| Forged or expired session | Private request denied, no trusted client identity |
| Duplicate Save | One row, successful confirmed state |
| Repeated Remove | No row, successful confirmed state |
| Paid or draft nested body request | No unauthorized body through saved-list joins |
| Saved recipe becomes unavailable | Safe placeholder/removal, no stale private metadata |
| Failed write | Prior confirmed state and Retry |
| Failed list read | Error state, not false empty list |
| Rapid Save/Remove | Final state matches serialized confirmed operation |
| Sign out then sign in as B | No A data in UI, cache, history render or late response |
| Native account signs in on web | Same verified identity or explicitly documented supported migration |
| Wrong/expired/reused code | No session, recoverable message |
| Resend abuse | Server/provider throttling enforced |
| External or encoded redirect | Rejected, safe local fallback |
| Cross-origin mutation | Rejected by chosen request protections |
| Account closure with old token | No private read/write or profile recreation after closure |

Repeat owner isolation through direct data API requests and every exposed server action/route. A hidden button is not access control.

## Focused automated checks

Add tests for:

- Return-path parsing, including protocol-relative, encoded and backslash cases.
- Mutation result contracts and idempotency.
- Auth-aware cache keys and prior-user response rejection.
- Missing optional profiles and verification-pending signup.
- Saved-list projection excluding full bodies and private profile fields.
- Owner-only policies using actual migrations, explicit grants and synthetic users.
- Save, reload, second-session read and Remove journeys.
- Sign-out, browser Back and account switch.
- Required account-route noindex and sitemap exclusions.
- Preserved public routes, deferred routes and private design-review handling.

Do not use production credentials in browser fixtures. Keep auth state files and tokens out of git, test attachments and public artifacts. Sanitize failure traces before retaining or sharing them.

Use local Auth/email capture or a dedicated test project for deterministic verification. Use designated test inboxes for delivery checks. Mock-only tests do not prove deployed RLS or email delivery.

## Manual review

Check sign-in and saved recipes on narrow phones, desktop, keyboard and screen reader. Test code paste, autofill, expiry, resend, change-email and returning from an email app.

Review local sign-out alongside a native session. Confirm global provider/template changes have not disrupted established flows.

Inspect network responses, rendered payloads and error logs for private-data leakage. Compare two isolated browser contexts and a shared-browser account switch.

Record actual cache headers on protected and cookie-refresh responses. Confirm public recipe rendering remains functional during simulated auth failure.

## Release gates

1. Verified identity authority and saved-recipe source.
2. Native compatibility and shared-template review completed.
3. Phase 4 security and Phase 6 recipe prerequisites implemented.
4. Three free recipes remain accessible anonymously.
5. Production-capable email sender, limits and test delivery verified.
6. Owner isolation and cross-user cache tests passed.
7. Account closure support procedure has an owner and tested scoped execution.
8. Required web-quality checks passed on the exact PR head.
9. Protected preview reviewed with no real customer data in fixtures.
10. Rollback and monitoring ownership recorded.

This plan does not claim any gate has already passed.

## Rollout

Apply compatible database changes through the Phase 4 migration process. Deploy account code with public entry points disabled until email and isolation checks pass. Use the established configuration/release mechanism, with protected routes and mutations enforcing the same feature availability decision.

Enable account navigation and Save together. Verify a designated test account end to end in production, then remove test bookmarks through normal owner operations.

Monitor sanitized auth delivery failures, verification failures, saved-read/write errors and availability. Phase 9 owns product analytics. Do not log code values, raw email addresses, tokens or recipe preferences for troubleshooting.

## Rollback

For UI regressions, disable account entry points and reject unavailable feature operations consistently, then restore the last verified application version. Keep free recipes working.

For privacy or access failures, fix or close the affected backend access path and invalidate private caches. Hiding Account or Save does not prevent direct requests.

Do not drop saved tables, delete users or reverse additive migrations automatically during frontend rollback. Restore shared email/provider settings only after checking native dependencies. Keep user bookmarks for safe recovery.

## Evidence template

Create IMPLEMENTATION-EVIDENCE.md during implementation with:

- Exact source and deployment commits.
- Identity and saved-data reuse decision.
- Migration references and native compatibility results.
- Required CI and access-test links.
- Email delivery, mobile and accessibility findings.
- Cross-user cache and sign-out results.
- Account-closure runbook reference and test outcome.
- Remaining limitations, owner and rollback reference.

Mark tasks complete only after recording evidence.
