# Phase 4 validation and acceptance

This document specifies implementation tests. Publishing the plan does not run database migrations or prove deployed security.

## Synthetic fixtures

Create local auth users A and B, one buyer grant for A, a revoked grant, an expired grant, three free recipes, two paid recipes in different releases, one draft recipe and one withdrawn recipe.

Use fictional identities and obvious synthetic recipe bodies with unique sentinel text. Keep test credentials local/ephemeral. Never substitute real family data.

Include a retired-for-sale release with an active historical grant, so retirement and revocation are tested separately.

## Access matrix tests

| ID | Scenario | Expected result |
| --- | --- | --- |
| S01 | Visitor lists catalog | Only published safe preview fields |
| S02 | Visitor requests a free body | Approved free content returned |
| S03 | Visitor requests a paid body | No protected text returned |
| S04 | Signed-in nonbuyer requests paid body | No protected text returned |
| S05 | Buyer A reads granted release recipe | Authorized body returned |
| S06 | Buyer A reads another release recipe | Denied unless separately free/granted |
| S07 | User B requests A's entitlement | No A grant returned |
| S08 | Customer inserts or modifies a grant | Permission denied, no state change |
| S09 | Customer changes publication/free slots | Permission denied, no state change |
| S10 | Revoked or expired grant | No paid body returned |
| S11 | Retired sale listing with active old grant | Owned manifest/body still available if recipe remains published |
| S12 | Draft or withdrawn recipe | No client body access, including buyer |
| S13 | Nested join/select-all/view/RPC path | Same boundary as direct reads |
| S14 | Forged, expired or wrong-project token | Identity rejected |
| S15 | Request body changes userId | No cross-user access |
| S16 | Error from backend | Typed failure, not successful empty content |
| S17 | Visitor retrieves private file directly | Denied unless policy explicitly permits a free file |
| S18 | Authorized signed file request | Correct object only, documented short expiry |
| S19 | Cross-user or altered storage path | Denied |
| S20 | Two concurrent publication updates | No fourth slot or half-updated free selection |

A successful HTTP response containing zero rows is a valid denied-read outcome for some RLS queries. Assert absence of protected content and unchanged state rather than demanding one universal status code.

## Direct API and database checks

Run SQL policy tests under the intended roles, then exercise the local Supabase HTTP API with real synthetic session tokens. Administrative connections bypass ordinary restrictions and do not prove customer security.

Check exposed schemas, table grants, column layout, function EXECUTE permissions, views and available GraphQL paths. Do not enable GraphQL merely for this phase, but test its access boundary if enabled.

Verify no public query can retrieve protected ingredients through search, a count/filter oracle with sensitive fields, an export, nested join or a convenience RPC. Keep public search limited to approved catalog data.

## Constraint and migration checks

- Empty-database replay succeeds.
- Synthetic upgrade succeeds.
- Generated types match the schema.
- Invalid slugs/states/references fail.
- Duplicate grant and membership identities fail.
- A fourth free slot fails.
- Fewer than three published free recipes fail the recipe launch gate.
- Sealed release membership changes fail through the publishing path.
- Unknown allergen/time data stays unknown.
- The prior app remains compatible with additive schema changes.

Record advisor findings and disposition. “No advisor finding” does not replace role-based tests.

## Next.js integration checks

Verify request-scoped user isolation, refreshed cookies, stale/expired sessions and sign-out behaviour with synthetic accounts.

Test protected data in HTML, RSC payloads, route handlers, prefetch and print/export examples. User A followed by user B must not receive a cached body from A's access.

Ensure public marketing pages still build without remote production secrets. Preserve deferred URL 404s and production design-review restrictions when composing the proxy.

Check that server-only credentials are absent from browser bundles and artifacts. Inspect variable names and code paths without dumping secret values.

## CI integration

Keep web-quality intact. Add a stable backend-quality job using a disposable local Supabase stack and synthetic fixtures.

Do not expose real Supabase or Vercel secrets to PR code. Retain sanitized failure summaries, not entire database dumps or raw auth sessions.

Demonstrate one controlled authorization regression in a disposable branch: a test must fail when a nonbuyer receives a paid body. Restore the intended policy and verify recovery. Never deploy the deliberate weakness.

Require the backend job after the successful check identity is known and the repository-settings change is authorized.

## Performance checks

Use representative synthetic catalog and membership sizes. Inspect query plans for catalog pagination and entitlement/body lookup. Verify foreign-key and ownership lookup indexes without assuming every sequential scan on a tiny table is a problem.

Record a baseline and the expected launch volume. Avoid premature partitioning, replicas, vector search or extra caching before a measured need.

## Completion report

Report separately:

1. Documentation and source review.
2. Local schema and test completion.
3. CI checks and merge requirements.
4. Staging/provider verification.
5. Production migration status.
6. Remaining project, content and payment decisions.

Attach exact SHAs, migration IDs and run links. Do not claim live policies are secure from source review alone.
