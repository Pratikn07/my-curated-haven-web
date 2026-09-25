# Phase audit backlog

Phase-by-phase audit of My Curated Haven web, started 2026-09-25.
Baseline: `origin/main` at `a496ce6`, live site https://mycuratedhaven.com, Supabase project `ccrgvammglkvdlaojgzv`.

Each phase has three lists:

- **Remaining**: work the phase plan required that is not done, or that a later phase broke.
- **Must do, not in any plan**: gaps the plans missed that have to be fixed. These are not optional.
- **Good to have**: improvements to come back to later.

Priority: **P0** = visitors affected now. **P1** = fix before launch. **P2** = cleanup.
Status: ✅ fixed, 🔶 fix in an open PR, ⏳ open, 👤 needs an owner decision.

---

## Phase 1: preserve the website and prepare the recipe launch

Plan: `docs/implementation/phase-1/IMPLEMENTATION-PLAN.md` (PR #1). Built in `692d77e` (PR #4, merged 2026-09-23).
Remediation plan: none was written. Fixes below are from this audit, on branch `fix/phase-1-completion`.

### Remaining

| ID | Pri | Item | Status | Resolution |
| --- | --- | --- | --- | --- |
| R1-01 | P0 | Header, footer and sitemap linked to `/recipes`, which was broken (A06, A08) | ✅ | Added `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel production and redeployed. Runtime log showed `NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required`. Rollback: `dpl_3rxFT36wbT6FToggQJQLbty1tVy6` |
| R1-03 | P1 | About and Support said there were no recipes or accounts | 🔶 | Rewritten after owner decision "recipes are live" |
| R1-04 | P1 | Homepage said "in preparation" while the header linked to Recipes | 🔶 | `HOMEPAGE_RECIPE_STATE` set to `free_ready` with the three slot slugs |
| R1-05 | P1 | Privacy and Terms contradicted each other (C13) | 🔶 👤 | Rewritten from the site's real data handling. Owner review before merge |
| R1-06 | P1 | Privacy description said "no accounts"; body said "username and password" | 🔶 | Fixed in the rewrite |
| R1-07 | P1 | Support mailbox never verified (O7) | 👤 | Owner confirms someone reads `support@mycuratedhaven.com` |
| R1-08 | P1 | Native app users and subscriptions not resolved (O8) | 👤 | Owner confirms whether app users exist and whether the app needs its own privacy policy. The new Privacy Policy covers the website only |
| R1-09 | P2 | Content register never signed off | 👤 | Owner ticks the checklist in `CONTENT-REGISTER.md` when approving the PR |
| R1-10 | P2 | Phase 1 docs said "not deployed" | 🔶 | README and evidence updated, with an audit section |
| R1-11 | P2 | A16 signed-in preview review never done | 🔶 | Closed as superseded by the live-site checks |

### Must do, not in any plan

| ID | Pri | Item | Status | Resolution |
| --- | --- | --- | --- | --- |
| M1-01 | P0 | `www.mycuratedhaven.com` showed a certificate warning. DNS pointed to Vercel, but the domain was not on the project | ✅ | Added to Vercel with a 308 redirect to `https://mycuratedhaven.com`, keeping path and query |
| M1-02 | P0 | Sign-in emails had no code. The website asks for a 6-digit code, but the Supabase templates only contained a link to `site_url`, which is `http://localhost:8081` | ✅ | Added `{{ .Token }}` to the magic-link and confirm-signup templates. Link kept for the native app. Backup: `docs/audit/rollback/auth-templates-backup-2026-09-25.json` |
| M1-03 | P1 | Sign-in emails use Supabase's built-in sender: 2 emails per hour for the whole project, shared with the native app | 👤 | Set up custom SMTP (for example Resend or Postmark) in Supabase Auth, then raise the rate limit |
| M1-04 | P1 | Supabase `site_url` is `http://localhost:8081` and the redirect allow-list has only dev and Expo URLs | 👤 | Decide the production value together with the native app owner. Changing it affects app emails |
| M1-05 | P1 | Terms have no governing law or dispute resolution. The old text had `[Your State/Country]` placeholders | 👤 | Owner or lawyer supplies jurisdiction; add sections back |
| M1-06 | P1 | No production check after deploy. The recipe outage went unnoticed because CI uses a local database | ⏳ | Add a post-deploy smoke test on production: `/`, `/recipes`, one recipe page, `/sitemap.xml`. Fail on 500 or "Temporarily Unavailable". Check the Phase 2 plan first |

### Good to have

| ID | Pri | Suggestion | Why |
| --- | --- | --- | --- |
| G1-01 | P1 | Add security headers in `next.config.ts`: CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, frame protection, `Permissions-Policy` | Live responses send only HSTS. The site now has sign-in |
| G1-02 | P2 | One shared `siteStatus` config read by the nav and the About, Support, Privacy and Terms copy | Copy drifted because each phase edited different files. The new regression test catches drift but doesn't prevent it |
| G1-03 | P2 | Keep a short change log under Privacy and Terms | Readers can see what changed, not only the date |
| G1-04 | P2 | Log or alert when the sitemap's recipe query fails instead of quietly returning static routes | During the outage the sitemap returned 200 with no recipe URLs |
| G1-05 | P2 | Add `/.well-known/security.txt` pointing to the support address | Returns 404 today |

---

## Noticed in other phases (confirm during their audits)

| Phase | Item |
| --- | --- |
| 4 | `20260924120000_phase4_access_hardening.sql` not applied in production. `public.recipes` is readable by `anon` (`USING true`), exposing all 70 full recipes, including the 67 drafts meant to be paid. Held back because the native app reads the table |
| 5 | `20260925100000_phase5_allergen_review_guard.sql` not applied: 22 recipes show `reviewed_no_allergens`, only 1 is reviewed. `FREE-RECIPES-SELECTION.md` "Reviewed Notes" differ from the database (the salmon recipe's bone check is in its steps, so it does reach readers). `image_description` (alt text) is empty for all 70 recipes |
| 6 | R3 content test always skips. R4 print check not done. Evidence doc names wrong columns. `/recipes` title repeats the brand |
| 7 | "Free or purchased only" save rule enforced only in the server action, not by RLS. Save-access tests use a mocked client. See also M1-02 to M1-04 |
| 8 | Webhook falls back to the public `whsec_mock_dummy_webhook_secret` when `STRIPE_WEBHOOK_SECRET` is unset (`src/lib/payments/config.ts:14`). Webhook refunds never revoke access. Commerce schema not in production. Vercel `COMMERCE_DATABASE_URL` is a template value (logs show host `HOST`), so `/collections/*` returns 500. The collection page shows a "14-day satisfaction refund guarantee" that the owner never decided (O3) |
| 9 | Never reviewed. The consent dialog claims "90-day retention", which the code doesn't enforce |
