# Architecture, source audit and environment decisions

## Recommended system shape

Use the existing Next.js app for the web product and Supabase for database, identity and storage. Keep ordinary reads under anonymous or user-scoped credentials so database rules enforce access.

The browser receives public metadata or authorized recipe content. The Next.js data layer validates requests and shapes responses. Supabase enforces row permissions. A later trusted payment worker grants collection access after verified payment events.

Do not route all reads through a service-role client. Server execution alone does not supply row-level authorization.

## Project decision gate

| Candidate | Evidence | Decision |
| --- | --- | --- |
| Native parenting project | Repository marker ccrgvammglkvdlaojgzv | Candidate only. Verify owner, environment, live schema and existing users |
| Connected insta-automation | Project kukpvpklizsvedcmybhn | Do not use for product tables by assumption |
| Separate product project | No project selected or provisioned | Recommended fallback if the existing product backend cannot be safely reused |
| Local development | Disposable isolated Supabase instance | Start here with synthetic data |

Prefer reusing the verified product project only after assessing compatibility and operational ownership. Otherwise use a separate product project with a deliberate future identity/content migration plan. Neither choice authorizes provisioning or payment for infrastructure through this documents task.

Record project reference, account/organization, environment purpose, database version, exposed schemas, migration owner, auth settings, backup capabilities and deployment consumers. Keep credentials out of the public repository.

The connected project listing is not proof the native project was deleted or is inaccessible through all accounts.

## Environment boundaries

| Environment | Data | Allowed purpose |
| --- | --- | --- |
| Local | Synthetic users and recipes | Schema design, policy tests and replay |
| CI | Disposable local database | Automated access and migration checks |
| Shared staging | Synthetic or explicitly approved nonpersonal fixtures | Provider-level auth/storage verification |
| Production | Approved content and actual customer state | Only reviewed, authorized migrations and operations |

No production data export is needed to establish this phase. Do not import child profiles, chats or Instagram contacts to build recipe browsing.

Use separate storage buckets and secrets per environment. A preview must never fall back to production credentials because staging settings are absent.

## Repository ownership

Proposed migration home: repository-root supabase/, with scripts explicitly resolving that directory. Application code remains under my-curated-haven-web/.

Do not modify the existing parenting_app or SuperClaude_Framework gitlinks. Do not create a second migration owner for a shared database until the native and web repository responsibilities are documented.

If the native repository already owns the selected live schema, choose one migration authority and a compatible release process. The web repository may consume generated types without independently rewriting the same migration history.

## Native source findings

| Finding | Source | Consequence |
| --- | --- | --- |
| AsyncStorage session client | src/lib/supabase.ts | Rebuild web session integration around cookies and current SSR APIs |
| Full recipe detail query | src/services/recipeService.ts, getRecipeById path | Native select('*') is not a web paywall boundary |
| Missing allergens mapped to an empty list | src/services/recipeService.ts | Preserve unknown status during normalization |
| Recipe request errors return empty arrays in some paths | src/services/recipeService.ts | Use distinct success, empty and failure results |
| Saved recipes owned by auth.users | 20251212000000_create_saved_recipes.sql | Useful ownership pattern, not proof of deployed policy |
| Base schema defines children.parent_id but later references children.user_id | 20251129000000_base_schema.sql | Do not replay native history blindly |
| Later migration assumes legacy names and optional tables | 20251130000000_rename_users_to_profiles.sql | Reconcile against actual schema before choosing a baseline |
| Chat handler accepts body userId and creates a service-role client | supabase/functions/chat/index.ts | Do not port this authorization pattern |
| Chat gateway sets verify_jwt=true | supabase/config.toml | Token validity does not establish ownership of body-supplied IDs |

The chat handler checks for an Authorization header, then uses body-supplied userId for privileged data access without a visible caller-ID binding in the reviewed handler. This is a source-level authorization concern, not a verified live exploit.

AI chat is outside the recipe launch. If the selected shared backend still exposes this function to the same identities, audit the deployed function and fix or isolate the issue before connecting the web product. Do not deploy or disable native functions as part of this plan-only change.

## Web integration findings

The current src/proxy.ts returns early 404s for deferred pages and blocks /design-review when VERCEL_ENV is production. Its matcher currently names those routes rather than a general session-refresh path.

When adding SSR integration, compose the existing behaviour. Preserve early route restrictions, extend matching only where needed, and keep refreshed cookies on the final response. Do not replace the proxy with a copied starter template.

The design review uses fictional fixtures. Those fixtures are not a production recipe source or schema migration seed.

## Architecture decisions to record

| ID | Decision | Local work proceeds before resolution? |
| --- | --- | --- |
| A1 | Verified product project and environment mapping | Yes |
| A2 | Reuse product database or create a separate one | Yes, with a portable local proposal |
| A3 | Authoritative migration repository | Yes, without remote history edits |
| A4 | Existing identity reuse and account compatibility | Yes, with synthetic auth users |
| A5 | Published catalog and protected-body schema names | Yes, reconcile names before shared deployment |
| A6 | Trusted editorial publishing operator | Yes, no public write endpoint |
| A7 | Storage and backup recovery method | Yes, blocks shared rollout |
| A8 | Hosted access duration and future additions policy | Yes, no production entitlements until decided |

## Current documentation review

The Supabase markdown changelog endpoint failed to load through the available web tool. The HTML changelog was reviewed instead.

Relevant changes to recheck at implementation:

- Management API logs.all migration to logs affects any future monitoring scripts.
- Extension version clauses are being deprecated/ignored. Do not rely on them for reproducible extension selection.
- GraphQL introspection defaults changed. Disabled introspection is not an authorization control.
- The plan uses current SDK/SSR guidance and explicit privileges rather than assuming platform defaults.

References: [changelog](https://supabase.com/changelog), [logs migration](https://supabase.com/changelog/48235-migration-of-supabase-management-api-logs-all-analytics-endpoint-to-logs-endpoint), [extension version change](https://supabase.com/changelog/extension-version-pinning-ignored), [GraphQL introspection change](https://supabase.com/changelog/46320-breaking-change-in-pg-graphql-1-6-0-graphql-introspection-disabled-by-default).
