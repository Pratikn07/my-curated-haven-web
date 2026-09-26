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
Remediation plan: none was written. Fixes below are from this audit. Code fixes merged in PR #38.

### Remaining

| ID | Pri | Item | Status | Resolution |
| --- | --- | --- | --- | --- |
| R1-01 | P0 | Header, footer and sitemap linked to `/recipes`, which was broken (A06, A08) | ✅ | Added `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel production and redeployed. Runtime log showed `NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required`. Rollback: `dpl_3rxFT36wbT6FToggQJQLbty1tVy6` |
| R1-03 | P1 | About and Support said there were no recipes or accounts | ✅ PR #38 | Rewritten after owner decision "recipes are live" |
| R1-04 | P1 | Homepage said "in preparation" while the header linked to Recipes | ✅ PR #38 | `HOMEPAGE_RECIPE_STATE` set to `free_ready` with the three slot slugs |
| R1-05 | P1 | Privacy and Terms contradicted each other (C13) | ✅ PR #38 | Rewritten from the site's real data handling. Owner approved the merge on 2026-09-25. Jurisdiction still open: M1-05 |
| R1-06 | P1 | Privacy description said "no accounts"; body said "username and password" | ✅ PR #38 | Fixed in the rewrite |
| R1-07 | P1 | Support mailbox never verified (O7) | 👤 | Owner confirms someone reads `support@mycuratedhaven.com` |
| R1-08 | P1 | Native app users and subscriptions not resolved (O8) | ✅ | Owner confirmed 2026-09-25: the native app has no users. No separate app privacy policy is needed. See the effects on M1-04 and Phase 4 below |
| R1-09 | P2 | Content register never signed off | 👤 | Owner ticks the checklist in `CONTENT-REGISTER.md` when approving the PR |
| R1-10 | P2 | Phase 1 docs said "not deployed" | ✅ PR #38 | README and evidence updated, with an audit section |
| R1-11 | P2 | A16 signed-in preview review never done | ✅ PR #38 | Closed as superseded by the live-site checks |

### Must do, not in any plan

| ID | Pri | Item | Status | Resolution |
| --- | --- | --- | --- | --- |
| M1-01 | P0 | `www.mycuratedhaven.com` showed a certificate warning. DNS pointed to Vercel, but the domain was not on the project | ✅ | Added to Vercel with a 308 redirect to `https://mycuratedhaven.com`, keeping path and query |
| M1-02 | P0 | Sign-in emails had no code. The website asks for a 6-digit code, but the Supabase templates only contained a link to `site_url`, which is `http://localhost:8081` | ✅ | Added `{{ .Token }}` to the magic-link and confirm-signup templates. Link kept for the native app. Backup: `docs/audit/rollback/auth-templates-backup-2026-09-25.json` |
| M1-03 | P1 | Sign-in emails capped at 2 per hour for the whole project | ⏳ 👤 | See [M1-03](#m1-03-custom-email-sender) |
| M1-04 | P1 | Supabase `site_url` is a dev address | ⏳ | See [M1-04](#m1-04-production-auth-urls) |
| M1-05 | P1 | Terms have no governing law or dispute resolution | ⏳ 👤 | See [M1-05](#m1-05-terms-jurisdiction) |
| M1-06 | P1 | No production check after deploy | ⏳ | See [M1-06](#m1-06-post-deploy-production-check) |

#### M1-03: custom email sender

- **Problem**: Supabase Auth sends sign-in emails through its built-in sender. `rate_limit_email_sent` is `2`: the whole project can send 2 auth emails per hour. The third person to sign in within an hour gets no code. The built-in sender is meant for testing, and its mail is more likely to land in spam.
- **Evidence**: `GET /v1/projects/ccrgvammglkvdlaojgzv/config/auth` on 2026-09-25: `smtp_host` empty, `rate_limit_email_sent: 2`.
- **Owner decision**: choose a provider. Resend and Postmark both work with Supabase custom SMTP. Either needs DNS records (SPF, DKIM, and ideally DMARC) on `mycuratedhaven.com`.
- **Steps**:
  1. Create the provider account and verify `mycuratedhaven.com` by adding its DNS records at the domain registrar.
  2. Supabase → Authentication → SMTP settings: host, port, username, password from the provider. Sender `My Curated Haven <no-reply@mycuratedhaven.com>`.
  3. Raise `rate_limit_email_sent` to a launch-safe value (for example 30 per hour), and keep per-address limits.
  4. Rebrand the two templates (subject "Your My Curated Haven sign-in code"). Keep `{{ .Token }}`.
  5. Send one test sign-in to an owner-controlled address and confirm the code arrives in the inbox, not spam.
- **Done when**: 5 sign-ins in a row within one hour all receive a code, from `mycuratedhaven.com`, with SPF and DKIM passing in the message headers.

#### M1-04: production auth URLs

- **Problem**: Supabase `site_url` is `http://localhost:8081` (the Expo dev server). Any email link, including the magic link still in the template, sends users there. The redirect allow-list holds only Expo, localhost and app-scheme URLs, so `https://mycuratedhaven.com` is not allowed.
- **Changed by the owner's answer**: the native app has no users, so there is no one to break. It was held back only for the app.
- **Steps**:
  1. Set `site_url` to `https://mycuratedhaven.com`.
  2. Add `https://mycuratedhaven.com/**` to the redirect allow-list. Keep the `localhost` entries for local development. Remove the `exp://10.168.203.140:8081` entries (a private dev IP).
  3. Decide whether the magic link should stay in the emails. The website only uses the code. Removing the link avoids a second sign-in path that the website doesn't handle.
- **Done when**: `site_url` is the production domain and a test sign-in email contains no `localhost` link.

#### M1-05: Terms jurisdiction

- **Problem**: the redrafted Terms (PR #38) have only an informal "email us first" dispute step. The previous arbitration and governing-law clauses had `[Your State/Country]` placeholders and were removed rather than published unfinished.
- **Owner decision**: the legal entity name and the state or country whose law governs. Decide whether to keep binding arbitration and a class-action waiver. That needs a lawyer, because consumer arbitration rules vary by place.
- **Steps**: add "Governing law" and, if chosen, "Arbitration" sections to `src/app/terms/page.tsx`. Name the operating entity in section 1. Update the "Last updated" date.
- **Done when**: Terms name the entity and governing law, and contain no placeholders.

#### M1-06: post-deploy production check

- **Problem**: CI runs against a local Supabase, so it cannot see production-only failures such as missing env vars. On 2026-09-25 every recipe page returned 500, and nothing alerted.
- **Check first**: whether the Phase 2 plan already specifies a post-deploy smoke test. Record the answer in the Phase 2 audit.
- **Steps**:
  1. Add a GitHub Actions workflow that runs on Vercel's `deployment_status` event when production succeeds, and also every hour on a schedule.
  2. Request `/`, `/recipes`, each recipe URL from `/sitemap.xml`, `/about`, `/support`, `/privacy`, `/terms`, `/sign-in`, and `https://www.mycuratedhaven.com/`.
  3. Fail if any returns 5xx, if `/recipes` contains "Temporarily Unavailable", or if the sitemap has fewer than 3 recipe URLs.
  4. On failure, notify the owner (GitHub failure email, or a Slack or email alert).
  5. Send no emails and make no sign-ins or purchases. The check is read-only.
- **Done when**: the check runs after each production deploy, and a deliberately broken preview fails it.

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
| 4 | `20260924120000_phase4_access_hardening.sql` not applied in production. `public.recipes` is readable by `anon` (`USING true`), exposing all 70 full recipes, including the 67 drafts meant to be paid. It was held back because the native app reads the table. The owner confirmed 2026-09-25 that the app has no users, so that blocker is gone. Apply it during the Phase 4 audit |
| 5 | `20260925100000_phase5_allergen_review_guard.sql` not applied: 22 recipes show `reviewed_no_allergens`, only 1 is reviewed. `FREE-RECIPES-SELECTION.md` "Reviewed Notes" differ from the database (the salmon recipe's bone check is in its steps, so it does reach readers). `image_description` (alt text) is empty for all 70 recipes |
| 6 | R3 content test always skips. R4 print check not done. Evidence doc names wrong columns. `/recipes` title repeats the brand |
| 7 | "Free or purchased only" save rule enforced only in the server action, not by RLS. Save-access tests use a mocked client. See also M1-02 to M1-04 |
| 8 | Webhook falls back to the public `whsec_mock_dummy_webhook_secret` when `STRIPE_WEBHOOK_SECRET` is unset (`src/lib/payments/config.ts:14`). Webhook refunds never revoke access. Commerce schema not in production. Vercel `COMMERCE_DATABASE_URL` is a template value (logs show host `HOST`), so `/collections/*` returns 500. The collection page shows a "14-day satisfaction refund guarantee" that the owner never decided (O3) |
| 9 | Never reviewed. The consent dialog claims "90-day retention", which the code doesn't enforce |
