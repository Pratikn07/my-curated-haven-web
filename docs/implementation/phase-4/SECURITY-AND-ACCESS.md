# Security, access rules and server integration

## Enforcement layers

Use explicit object grants and row policies together. RLS limits rows after a role reaches a table. It does not protect individual columns inside an otherwise readable row.

Enable RLS on every exposed table before granting access. Keep internal schemas unexposed and revoke unnecessary object/function privileges. Do not assume new-project defaults match an existing project.

Reference: [Securing the Data API](https://supabase.com/docs/guides/api/securing-your-api).

## Access matrix

| Resource | Visitor | Signed-in nonbuyer | Buyer for release A | Trusted writer |
| --- | --- | --- | --- | --- |
| Published recipe catalog | Read approved preview fields | Same | Same | Managed writes |
| Draft/withdrawn catalog | No read | No read | No read | Editorial access |
| Free recipe body | Read when recipe occupies a free slot and is published | Same | Same | Managed writes |
| Paid recipe body | No read | No read | Read only recipes in an active granted release | Managed writes |
| Listed collection/release manifest | Read public metadata | Same | Same | Managed publication |
| Retired release manifest | No public listing | No read without grant | Read owned release membership | Managed writes |
| Entitlements | No access | Read own rows only | Read own rows only | Grant/revoke through a trusted process |
| Drafts and audit events | No access | No access | No access | Restricted operator access |
| Private file | No read unless tied to a free, published recipe | Same | Read only authorized recipe files | Restricted upload/manage |

Do not equate authenticated role with ownership. Anonymous sign-in users also use an authenticated database role. Future purchase linking must establish the intended durable account.

## Policy shape

Catalog SELECT requires published state. Body SELECT requires an eligible catalog row and either free-slot membership or an active entitlement joined through collection membership.

Entitlement SELECT checks auth.uid() equals user_id. No browser role receives INSERT, UPDATE or DELETE privileges for grants. Profiles or user-editable metadata cannot confer purchase or admin access.

Release membership policies permit a listed published release or an owned sealed release. Keep policy dependency direction acyclic: ownership comes from the entitlement row, not a reverse query through the body being authorized.

Explicitly handle null auth.uid() for visitor access. Keep free-read and owner-read conditions separate and test their combination.

Customer-owned writable tables introduced later need ownership checks on both existing and new rows. Use explicit USING and WITH CHECK clauses where appropriate and the SELECT policy needed by updates.

Prefer security-invoker functions. If a privileged helper is unavoidable, isolate it in an unexposed schema, qualify object names, fix search_path, restrict EXECUTE and review every caller. Do not add SECURITY DEFINER to silence a permission error.

Views need deliberate ownership and privileges. Use security_invoker where supported and test direct reads as the real caller. A view in front of protected tables must not bypass their policies.

Reference: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Next.js client boundaries

Proposed files under the application:

| File | Responsibility |
| --- | --- |
| src/lib/supabase/browser.ts | Browser client using public project URL and publishable key |
| src/lib/supabase/server.ts | Per-request cookie-backed client, no shared user session |
| src/lib/supabase/session.ts | Session refresh/validation integration with the existing proxy |
| src/lib/supabase/admin.ts | Server-only privileged client, created only if a specific trusted operation needs one |
| src/lib/data/recipes.ts | Explicit catalog/body DTO queries under caller credentials |
| src/lib/data/access.ts | Access-status result shaping using authoritative grant data |
| src/lib/types/database.ts | Generated database types from the selected schema |

Pin exact SDK and SSR versions with the lockfile at implementation time. Do not copy the React Native AsyncStorage adapter.

Use current verified-token APIs such as getClaims for identity validation and getUser where a current server-side user record is required. Do not authorize requests from getSession's embedded user or from an unverified decoded token.

Keep admin credentials server-only and out of NEXT_PUBLIC variables. Use a fresh request-scoped authenticated client, not a global singleton carrying another customer's session.

Reference: [Supabase Next.js SSR](https://supabase.com/docs/guides/auth/server-side/nextjs).

## Existing proxy integration

The current proxy already handles deferred routes and the design-review production restriction. Preserve those early responses.

Extend the matcher deliberately for routes needing refresh. Copy refreshed cookies onto the returned response. Exclude assets where appropriate. Do not introduce a global auth redirect which blocks free pages or causes login loops.

Proxy session refresh is not the only authorization layer. Data reads and future mutation endpoints enforce access independently. Phase 4 tests cookie behaviour with synthetic identities without launching public login screens.

## Cache and response boundaries

Treat protected HTML, React Server Component responses, API data and print responses as user-specific. Avoid shared static generation, ISR or shared cache entries containing paid bodies. Use an explicit no-store/private response policy and verify framework/runtime behaviour.

Do not depend on client-side hiding, navigation removal or a lock icon. Test direct API calls and nested joins.

Public metadata/free content may be cached under an explicit publication/invalidation policy. Never mix authenticated and anonymous responses under one unpartitioned cache key. Do not cache cookie-setting auth responses.

A failed access check or unavailable backend must fail closed. Return a typed failure or unavailable result rather than a successful empty recipe body.

## Storage

Use one bucket for deliberately public preview images and a separate private bucket for protected files. Public-bucket URLs remain public regardless of a page paywall.

Authorize private objects through storage policies tied to recipe access, or through a narrowly scoped trusted delivery operation which checks access first. Store stable object paths, not signed URLs, in records.

Signed URLs are bearer access until expiry. Start with a short documented expiry, proposed at most five minutes, and do not log or persist them. Revoking an entitlement does not retrieve downloaded files or guarantee immediate invalidation of a previously issued URL.

Customers do not upload, replace or delete recipe assets. Trusted replacement flows need the relevant insert, select and update permissions. Test object paths and old versions independently of catalog reads.

References: [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [private file delivery](https://supabase.com/docs/guides/storage/serving/downloads).

## Native compatibility and identity

Never accept a body-supplied userId as the authority for a privileged operation. Derive identity from a verified token, then check ownership of child, session, recipe or other resource IDs separately.

Gateway JWT verification does not perform those ownership checks. Do not port the native chat handler unchanged. If the selected shared project exposes the same risky endpoint, resolve or isolate it before web integration.

Keep old and new auth audiences/projects distinct during testing. A token issued by an unrelated project must fail validation.

Token expiry, logout and user deletion have different effects. Do not promise immediate access-token revocation from deleting a user. Later sensitive account/payment operations should define required session freshness and revocation checks.

Reference: [JWT guidance](https://supabase.com/docs/guides/auth/jwts), [Edge Function auth](https://supabase.com/docs/guides/functions/auth).

## Writes and audit

Only trusted editorial tools change publication or free slots. Only the later verified payment/administration path changes real grants. Bind input fields to server-verified identity and validated resource IDs.

Future cookie-authenticated mutation endpoints need origin/CSRF controls, validation and appropriate rate limits. Do not claim RLS replaces these controls.

Log request identifiers, operation outcomes and safe error codes. Exclude tokens, signed URLs, full recipe bodies, child data and payment payloads. Audit grant changes in the same transaction as the change.

Do not introduce an admin console, public RPC writer or new AI endpoint during this phase.
