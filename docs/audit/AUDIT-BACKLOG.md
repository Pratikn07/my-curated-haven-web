# Phase audit backlog

Phase-by-phase audit of My Curated Haven web, started 2026-09-25.
Baseline: `origin/main` at `a496ce6`, live site https://mycuratedhaven.com, Supabase project `ccrgvammglkvdlaojgzv`.

Each phase has three lists:

- **Remaining**: work the phase plan required that is not done, or that a later phase broke.
- **Must do, not in any plan**: gaps the plans missed that have to be fixed. These are not optional.
- **Good to have**: improvements to come back to later.

Priority: **P0** = visitors affected now. **P1** = fix before launch. **P2** = cleanup.
Status: ✅ fixed, 🔶 fix in an open PR, ⏳ open, 👤 needs an owner decision.

## Waiting on the owner

| ID | Decision or action |
| --- | --- |
| R5-03 | Review the 3 free recipes with the checklist (allergens, steps, yield, time, choking and texture, alt text) |
| M5-02 | Decide whether to disclose AI-assisted recipes and illustrative AI images |
| M5-03 | Confirm the Replicate/FLUX Pro terms allow commercial use of the recipe images |
| M1-03 | Pick an email provider for sign-in emails (Resend or Postmark), then add its DNS records |
| M1-05 | Legal entity name and governing-law jurisdiction for the Terms. Decide on arbitration |
| R1-07 | Confirm someone monitors `support@mycuratedhaven.com` |
| R3-06 | VoiceOver on an iPhone: Home, a recipe page, sign-in, the cookie dialog |
| R3-07 | Approve the design direction (palette, Inter + Cormorant, card style) from the after-fix screenshots |
| R1-09 | Tick the content-register checklist in `docs/implementation/phase-1/CONTENT-REGISTER.md` |

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
| M1-04 | P1 | Supabase `site_url` is a dev address | ✅ | Done 2026-09-25. See [M1-04](#m1-04-production-auth-urls) |
| M1-05 | P1 | Terms have no governing law or dispute resolution | ⏳ 👤 | See [M1-05](#m1-05-terms-jurisdiction) |
| M1-06 | P1 | No production check after deploy | ✅ PR #41 | See [M1-06](#m1-06-post-deploy-production-check) |

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
- **Done 2026-09-25**:
  - `site_url` → `https://mycuratedhaven.com`.
  - Added `https://mycuratedhaven.com/**` to the redirect allow-list. Removed `exp://10.168.203.140:8081` and `exp://10.168.203.140:8081/--/auth/*`. Kept `localhost` and app-scheme entries.
  - Removed the link from both email templates. The website has no magic-link handler (no `exchangeCodeForSession`, `token_hash` or `/auth/callback` route), so a click signed nobody in. Emails now show only the 6-digit code. Subject for both: "Your My Curated Haven sign-in code".
  - Backup of the previous values: `docs/audit/rollback/auth-urls-and-templates-before-m1-04.json`.
  - `supabase/config.toml` now warns against `supabase config push`, which would overwrite these hosted settings with local values.
  - **Still to verify**: the owner signs in once with a real address and confirms the email shows a code and no link. Not sent by the audit because the project allows only 2 auth emails per hour (M1-03).

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

## Phase 2: development and release foundation

Plan: `docs/implementation/phase-2/IMPLEMENTATION-PLAN.md` (PR #2). Built in `f3643e9`, `7f82282`, `572a1ad` (PR #5, merged 2026-09-23). Deliberate-failure drill: PR #6 (closed, blocked as expected).
Remediation plan: none was written. Audit fixes merged in PR #41 (`f6c39cd`); `backend-quality` added to ruleset `23852646` on 2026-09-25 (previous rule: `docs/audit/rollback/ruleset-23852646-before-m2-01.json`). Later phases edited CI: Phase 4 (`72471a9`, `d6eddff`), Phase 6 (`910f252`), Phase 7 (`1c78e41`), Phase 10 (`a0150c0`, `556b893`).

Verified as done (no action):
- **Runtime**: Node `24.5.0` in `.nvmrc`, `packageManager: npm@11.5.1`, engines `>=24 <25`. Vercel uses Node `24.x` with root directory `my-curated-haven-web`.
- **CI**: `web-quality` runs on pull requests and pushes to `main`. It has `contents: read`, a 20-minute timeout and stale-run cancellation, and fails when no tests are found.
- **Branch rules**: ruleset `23852646` requires a PR, the `web-quality` check and an up-to-date branch. It blocks force-push and deletion, and has no bypass actors.
- **Preview protection**: `ssoProtection: all_except_custom_domains`. An anonymous request to the latest preview gets a 302 to Vercel SSO with `x-robots-tag: noindex`. The production domain stays public.
- **Security**: `next@16.3.6` (newest 16.x). `npm audit --omit=dev` finds 0 production vulnerabilities.
- **Merge block**: PR #6 was blocked while its check failed.
- **PR template**: `.github/pull_request_template.md` exists.

### Remaining

| ID | Pri | Item | Status | Evidence and fix |
| --- | --- | --- | --- | --- |
| R2-01 | P1 | README setup instructions are wrong, so a clean checkout can't run the tests (P2-02, P2-03 acceptance) | ✅ PR #41 | `my-curated-haven-web/README.md` says "No environment variables are required" and never mentions `supabase start`. Since Phase 4 the tests need a local Supabase and three variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `COMMERCE_DATABASE_URL`). Rewrite setup to match CI: Docker, `supabase start`, `supabase db reset`, the three local values |
| R2-02 | P1 | CI builds a different bundle from production | ✅ PR #41 | Phase 7 (`1c78e41`) changed CI to `npm run build -- --webpack` "to avoid turbopack font error". Vercel production builds with Next 16's default (Turbopack), so CI no longer tests what ships. A local Turbopack build passes. Remove `--webpack` from both jobs and fix the font failure at its cause, likely the build-time Google Fonts download |
| R2-03 | P1 | Some tests never run in CI or `npm run verify` | ✅ PR #41 | `test:homepage:unit` (7 tests in `tests/homepage/`, including the approved-slug guard from PR #38) is not called by `web-ci.yml` or `verify`. Add it to both |
| R2-04 | P2 | One CI action is not pinned to a commit SHA (CI spec: "Pin third-party actions to verified full commit SHAs") | ✅ PR #41 | `supabase/setup-cli@v1` in both jobs. Pin it to a full SHA with a version comment |
| R2-05 | P2 | Rollback never rehearsed (P2-09.4) | ✅ PR #41 | No drill or walkthrough is recorded in `IMPLEMENTATION-EVIDENCE.md`. This audit has two real production rollback targets (`dpl_3rxFT36wbT6FToggQJQLbty1tVy6`, `dpl_DjWtdCdddiX29H4ZC3XyEZTJG3RQ`). Record a reviewed walkthrough: `vercel rollback <deployment>` or dashboard "Instant Rollback", then the smoke checks |
| R2-06 | P2 | Release runbook's evidence record never filled in | ✅ PR #41 | `PREVIEW-AND-RELEASE.md` has 10 fields still "Pending" |
| R2-07 | P2 | Phase 2 status docs are stale | ✅ PR #41 | `README.md` says "implementation plan only". `IMPLEMENTATION-HANDOFF.md` checklist is all unchecked, although P2-01 to P2-08 have evidence |
| R2-08 | P2 | Signed-in preview review never done (P2-07.5) | ⏳ Phase 10 | The evidence admits it. Previews now have no Supabase variables by design, so recipe pages can't be reviewed on a preview at all. Staging is planned in Phase 10 (`CI-AND-ENVIRONMENT-RELIABILITY.md`); close this there |

### Must do, not in any plan

| ID | Pri | Item | Status | Evidence and fix |
| --- | --- | --- | --- | --- |
| M2-01 | P1 | `backend-quality` is not a required check | ✅ ruleset | The ruleset requires only `web-quality`. Phase 4 added `backend-quality`, which covers migration replay, pgTAP access tests, type drift and data-access tests, but never made it required. A PR that breaks database security can still merge. Add `backend-quality` to ruleset `23852646` |
| M2-02 | P1 | Production smoke checks are manual and weren't run | ✅ PR #41 | Answer to M1-06: the Phase 2 runbook lists production smoke checks, but only as a manual step. Phase 11 has one manual read-only smoke at launch. Nothing ran them after the Phase 4 to 9 deploys, which is how the recipe outage went unnoticed. Implement M1-06 as the automated version |

### Good to have

| ID | Pri | Suggestion | Why |
| --- | --- | --- | --- |
| G2-01 | P2 | Redirect `my-curated-haven-web.vercel.app` to `https://mycuratedhaven.com` | It serves production publicly (HTTP 200) as a second copy of the site. The canonical tags point to the real domain, so this is tidy-up, not urgent |
| G2-02 | P2 | Update the development tools behind the 9 `npm audit` findings (6 high: `brace-expansion`, `minimatch`, `picomatch` and others) | They don't ship to visitors, but they run on developer machines and CI |
| G2-03 | P2 | Add Dependabot or Renovate for npm and GitHub Actions | Next.js had critical advisories before Phase 2 patched it. Automated update PRs catch the next one |
| G2-04 | P2 | Run the Phase 1 `check:routes` script in CI, or remove it | `npm run check:routes` exists, but Playwright now covers the same checks |

---

## Phase 3: mobile-first design system

Plan: `docs/implementation/phase-3/IMPLEMENTATION-PLAN.md` (PR #3). Built in `b30027a` (PR #7, merged 2026-09-22, co-authored by Cursor).
Remediation plan: none was written. Audit fixes: `fix/phase-3` PR (fonts, contrast, skip link, dialog focus, reflow). Audited 2026-09-25 against `main` at `4b8c3c2` and the live site, using a read-only Playwright and axe run on 8 pages at 320, 390 and 1280px.

Verified as done (no action):
- **Tokens pass WCAG contrast**: body text 9.82:1, muted text 5.53:1 (5.00:1 on muted surfaces), button text 5.62:1, action links 5.47:1 (4.94:1 on muted surfaces), control borders 4.48:1, focus ring 9.82:1. Brand terracotta (2.87:1) and sage (2.54:1) are decorative only.
- **Primitives work without JavaScript**: `Badge`, `Button`, `ButtonLink`, `Card`, `Field`, `Section`, `StatePanel` are server components. No `framer-motion` in `src/` outside `legacy/`. A `prefers-reduced-motion` rule exists.
- **No page-level horizontal overflow** at 320, 390 or 1280px on `/`, `/recipes`, a recipe page, `/about`, `/support`, `/privacy`, `/terms`, `/sign-in`.
- **Reduced motion**: 0 hidden text and 0 running animations on Home, Recipes and a recipe page.
- **Print (D15)**: on `/recipes/salmon-and-pea-fish-cakes`, all 5 ingredients and 9 steps print, and the header, footer, breadcrumbs and buttons are hidden. A4 and Letter are 3 pages each. This also covers Phase 6's open print check (R4).
- **Performance (D16)**, lab run on 390px, 4× CPU and ~1.6 Mbps: LCP 1.62 s (Home), 1.08 s (Recipes), 1.29 s (recipe page). CLS 0. About 225 KB JS per page.
- **`/design-review`** returns 404 in production (D13).
- **Keyboard**: visible 2px focus outline.

### Remaining

| ID | Pri | Item | Status | Evidence and fix |
| --- | --- | --- | --- | --- |
| R3-01 | P1 | Inter and Cormorant never render: the whole site uses the system font (D04) | ✅ fixed | Computed `font-family` on body, h1 and the wordmark is `ui-sans-serif, system-ui…`, and `--font-body` computes empty. `next/font` puts its variables (`--font-inter-source`, `--font-cormorant-source`) on `<body>` (`src/app/layout.tsx:37`), but `tokens.css` reads them on `:root`, so the chain is invalid. The two font files still download for nothing. Put the font variable classes on `<html>`, and add a browser test asserting the computed families |
| R3-02 | P1 | Contrast failure on `/privacy` and `/terms` (D03) | ✅ fixed | axe `color-contrast` (serious): the "Last updated" line uses `text-foreground/60`, which is `#8a8b9a` on `#fdfcf8` = 3.27:1. Use `text-text-muted`. Extend the axe scan to every public page (the Phase 3 scan covered only `/`, `/about`, `/support`) |
| R3-03 | P1 | The skip link isn't the first focus stop (D08) | ✅ fixed | The first Tab lands on the cookie banner's "privacy notice" link. `AnalyticsProvider` renders the banner before its children, which include the skip link (`SiteShell.tsx:9-11`). Render the skip link first |
| R3-04 | P1 | Cookie preferences dialog has no focus management (D09) | ✅ fixed | It has `aria-modal="true"` and a label, and Escape closes it. But focus doesn't move into the dialog on open, Tab leaves it, and focus doesn't return to the opener on close. `ConsentPreferencesModal.tsx` only handles Escape. Move focus in, trap Tab, restore focus to the trigger |
| R3-05 | P2 | Homepage scrolls sideways at 200% text size (D06) | ✅ fixed | At 390px with 200% text, content is 459px wide. The Parenting Chat preview heading (`FeaturePreview.tsx`, homepage-vision work) grows to 427px because its grid column won't shrink. Add `min-w-0` to the preview grid items |
| R3-06 | P2 | No screen-reader pass and no real iPhone Safari check | ⏳ 👤 | The evidence admits both. They need a person with VoiceOver on an iPhone. Checklist: Home, a recipe page, sign-in, the cookie dialog |
| R3-07 | P2 | Design direction never recorded as approved (P3-02.6-7) | ⏳ 👤 | Owner confirms the palette, Inter/Cormorant pairing and card style (once R3-01 makes the fonts render) |
| R3-08 | P2 | Phase 3 status docs are stale | ✅ fixed | `README.md` says "detailed plan only". `IMPLEMENTATION-EVIDENCE.md` says "Not deployed" |

### Must do, not in any plan

| ID | Pri | Item | Status | Evidence and fix |
| --- | --- | --- | --- | --- |
| M3-01 | P1 | Vercel's build cache shipped stale CSS | ✅ env var | PR #46 changed `globals.css`, but production (`dpl_9oqbmV3rgRN97RRQx9tzgygNdtPj`) logged `Restored build cache from previous deployment` and served the old stylesheet `07ym34__ird41.css` without the new rule. Checked with `vercel curl` against the deployment itself, bypassing the CDN. A local build of the same commit had the rule. Set `VERCEL_FORCE_NO_BUILD_CACHE=1` for production and redeployed: the log shows `Skipping build cache`, and the new stylesheet `1uq11_dz3p1bg.css` has the rule. Builds take about 1 minute either way |
| M3-02 | P1 | Rendering the real fonts caused layout shift on slow phones | ✅ fixed | After R3-01, a slow first visit at 390px measured CLS 0.233 (target ≤ 0.1). The in-flow consent banner rewrapped when Inter replaced the fallback font and pushed the page down 52px. The banner is now fixed to the bottom, and the page reserves its height (`--consent-banner-height`) so it never covers the footer or a focused control. Local slow first visit: 0.062 |

### Good to have

| ID | Pri | Suggestion | Why |
| --- | --- | --- | --- |
| G3-01 | P2 | Make the header wordmark link and recipe-card title links at least 44px tall | They measure 201×24 and ~210×21 at 390px. That meets WCAG 2.2's 24px minimum, but not the plan's 44px product target (D07) |
| G3-02 | P2 | Record the lab performance numbers above as the baseline, and re-run after each UI phase | Phase 3 never recorded one (D16), so later regressions had nothing to compare against |

---

## Phase 4: backend security and data foundation

Plan: `docs/implementation/phase-4/IMPLEMENTATION-PLAN.md` (PR #8). Built in `72471a9`, `94e890f`, `0d47e07`, `4ce43da`, `d6eddff` (PR #11, merged 2026-09-22). PR #11 applied the schema straight to production, with no staging rehearsal.
Remediation plan: none was written. Reviewer fix PRs: #19 (`e58cbb7`, access hardening; applied to production by this audit) and #21 (`fca003c`, keep public pages up when Supabase env is missing, deployed). Audit changes applied to production on 2026-09-25 are listed in `docs/implementation/phase-4/IMPLEMENTATION-EVIDENCE.md#audit-2026-09-25`.

Verified as done (no action):
- `recipe_catalog`, `recipe_bodies`, `free_recipe_slots`, `recipe_collections`, `collection_releases`, `collection_recipes` and `access_entitlements` exist in production, all with RLS.
- A live anonymous API read on 2026-09-25 returned 3 rows from `recipe_catalog` and 3 from `recipe_bodies`: the free recipes only.
- Personal tables (`children`, `profiles`, `chat_messages`, `chat_sessions`, `conversation_summaries`, `onboarding_responses`, `milestones`, `user_activity_log`, `access_entitlements`) returned 0 rows to an anonymous caller.
- `recipe-protected` bucket is private, and its read policy follows the free-slot and entitlement rules. `recipe-previews` is public read-only.
- pgTAP suites `01_access_matrix` and `05_phase4_hardening` run in `backend-quality` and cover scenarios S01 to S15 and S17 to S20.
- The Supabase security advisor reports no ERROR-level findings.

### Remaining

| ID | Pri | Item | Status | Evidence and fix |
| --- | --- | --- | --- | --- |
| R4-01 | P0 | Legacy `public.recipes` is readable by anyone | ✅ applied | Anonymous REST read returned all 70 recipes. For example, the draft "Banana Avocado Breakfast Purée with Yogurt" came back with 4 ingredients and 11 steps. Policy `Recipes are viewable by everyone` (`USING true`). The fix exists, `20260924120000_phase4_access_hardening.sql` (PR #19), but was held back for the native app, which has no users (owner, 2026-09-25). Its `handle_new_user` body matches production except for a pinned `search_path`. Apply it and record it with `supabase migration repair` |
| R4-02 | P1 | No backup or restore evidence (P4-08.7, P4-10.2) | ✅ free | Owner chose free (2026-09-25). `ops/backup-production.sh` runs daily at 03:30 on the owner Mac via launchd (`com.mycuratedhaven.backup`): logical dump plus a mirror of the `recipe-images` bucket, 14 days kept, stored in `~/MyCuratedHavenBackups` (mode 700). Restore rehearsed into an empty local stack; all app rows and policies matched production. See `ops/README.md`. Limit: no backup on days the Mac is off; no point-in-time recovery |
| R4-03 | P1 | Production migration history has diverged from the repo | ✅ documented | Production has `20260923042735`, `20260923053000`, `20260923180000`. Six later migrations are unapplied (Phase 8 commerce schema, Phase 9 x2, Phase 4 hardening, Phase 8 guards, Phase 5 guard). A plain `supabase db push` would apply all six at once, including the Phase 8 commerce schema. Apply one at a time on purpose, and document "no blind `db push`" |
| R4-04 | P2 | The "prove CI catches a leak" drill was never done (P4-09.5) | ✅ drill | Drill 2026-09-25: PR #44 added a policy letting `anon` read every `recipe_bodies` row. `backend-quality` failed at "Run database access matrix tests (pgTAP)" on S03 and S13 (4 tests), the PR showed `BLOCKED`, and a merge attempt was refused. Closed without merging, branch deleted |
| R4-05 | P2 | Staging rehearsal skipped (P4-10.3) | ⏳ Phase 10 | Changes went straight to production. Covered by the Phase 10 staging plan |
| R4-06 | P2 | Evidence doc is wrong | ✅ corrected | `IMPLEMENTATION-EVIDENCE.md` says "This does not connect or modify the separate production database", but PR #11 applied the schema to production |
| R4-07 | P2 | S16 (backend error → typed failure) has no test | ✅ tests | `tests/data/backend-errors.test.mjs` (11 tests, `npm run test:data:unit`, in CI and `verify`): every catalog, body, free-slot, auth and entitlement failure returns a typed error or throws, never an empty success or a false "denied". A missing session is still "denied". A deliberate mutation (returning `[]` on a failed slot query) failed 2 tests |

### Must do, not in any plan

| ID | Pri | Item | Status | Evidence and fix |
| --- | --- | --- | --- | --- |
| M4-01 | P0 | Native `chat` Edge Function trusts a caller-supplied user ID | ✅ deleted | `parenting-app/supabase/functions/chat/index.ts:1230-1234`: uses `SUPABASE_SERVICE_ROLE_KEY`, then reads `userId` from the request body and loads that user's profile, children and conversation history. It only checks that an `Authorization` header exists, and `verify_jwt` accepts the public anon key. Anyone with the site's public key can act as any user and run DeepSeek/OpenAI calls at the owner's cost. Production has 4 accounts, 4 child profiles and 40 chat messages. The native app has no users, so delete the `chat` and `generate-tip` functions (the source stays in `parenting-app`) |
| M4-02 | P0 | Anyone can upload files to the public `recipe-images` bucket | ✅ migration | Storage policy `Allow public upload to recipe-images` (INSERT, role `public`, bucket check only). That bucket serves the live site's recipe photos. Drop the policy; only trusted tooling should upload |
| M4-03 | P1 | Sign-in codes stay valid for 24 hours | ✅ applied | `mailer_otp_exp: 86400`. The advisor recommends under 1 hour. Set it to 3600 or less. Update the "24 hours" line in the email template to match |
| M4-04 | P1 | Postgres has outstanding security patches | ✅ upgraded | Upgraded 2026-09-25 19:31 to 19:40 PDT: `17.4.1.074` → `17.6.1.166` (GA). Fresh dump taken first. Afterwards the collation version moved 153.120 → 153.121: reindexed `public` and `private`, ran `ALTER DATABASE postgres REFRESH COLLATION VERSION`. `auth` and `storage` indexes are Supabase-owned and were not rebuilt; the risk is low for a .001 bump. Smoke 13/13, access checks unchanged, advisor warning gone |
| M4-05 | P1 | Privileged functions callable by anonymous visitors | ✅ migration | Advisor: `handle_new_user()` and `increment_shop_click(uuid)` are `SECURITY DEFINER` and executable by `anon` and `authenticated` via `/rest/v1/rpc/`. `increment_shop_click` lets anyone inflate native shop click counts. Revoke EXECUTE from `anon` and `authenticated` on both. The trigger still works |
| M4-06 | P2 | 9 functions have a mutable `search_path` | ✅ migration | `20260926031344_phase4_audit_pin_function_search_path.sql` pins `search_path = public, pg_temp` on the 7 remaining functions (each uses only public tables and built-ins). Applied to production. pgTAP now fails if any `public` or `private` function lacks a pinned search_path. Advisor: 1 warning left (leaked password protection, which covers password logins the website doesn't use) |

### Good to have

| ID | Pri | Suggestion | Why |
| --- | --- | --- | --- |
| G4-01 | P2 | Drop or archive the empty legacy buckets `recipe-steps`, `recipe-thumbnails` and `chat-images` | They're empty, and fewer public buckets means less to secure |
| G4-02 | P2 | Run the Supabase security advisor in CI or on a schedule | This audit found M4-05 and M4-06 only by running it by hand |
| G4-04 | P2 | Check `~/MyCuratedHavenBackups/backup.log` weekly, or add a failure notification to the backup script | launchd failures are silent unless someone reads the log |
| G4-03 | P2 | Decide what to do with native-only tables (`children`, `chat_*`, `milestones`, `shop_*`) now that the app has no users | They hold test personal data and widen the attack surface. Archive them, or drop them after an owner-approved export |

---

## Phase 5: recipe structure and editorial review

Plan: `docs/implementation/phase-5/IMPLEMENTATION-PLAN.md`, written by the implementing agent in the same commit as the work (`234ec99`, PR #12). The shared index had said "Not written in this package". The contract other phases relied on is the "Required Phase 5 handoff" in `docs/implementation/phase-6/EXISTING-RECIPE-REUSE.md`.
Remediation: no plan. Reviewer fix PR #22 (`82eff91`, `20260925100000_phase5_allergen_review_guard.sql`) is **not applied to production**.

**Where the content came from (iOS repo `Pratikn07/parenting-app` at `5e5caa7`)**: all 70 recipes were written by an LLM from `scripts/RECIPE_PROMPT.md` ("paste it into ChatGPT or Claude", persona "a pediatric nutritionist", 7 categories × 10). They were loaded by `scripts/importRecipes.ts`, whose only check is skipping duplicate titles, and it hardcodes `rating: 4.5`. Images are FLUX Pro output via Replicate (`scripts/generateAllImages.ts`). The repo shows **no human review, source attribution or image-licence record**. The iOS app never claimed a review: it hides the allergen section when the list is empty (`AllergensSection.tsx:12`).

Verified as done (no action):
- 70 rows each in `recipe_catalog` and `recipe_bodies`, 3 published, 3 free slots. IDs preserved from `public.recipes`. Slugs unique.
- The 3 free recipes' allergen lists match their ingredients: Frittata eggs and milk; Oat Bars none; Fish Cakes fish and wheat. An ingredient keyword scan of all 70 flagged 12 recipes, **all drafts**.
- Salmon Fish Cakes step 9 includes "SAFETY REMINDER: Double check for bones".

### Remaining

| ID | Pri | Item | Status | Evidence and fix |
| --- | --- | --- | --- | --- |
| R5-01 | P0 | Every allergen label claims a review that never happened | ⏳ | 48 bodies are `reviewed_listed` and 22 `reviewed_no_allergens`. The live Fish Cakes page says "Contains reviewed allergens: fish wheat". The Phase 5 ingest derived "reviewed" from whether the LLM's array was empty. PR #22 only fixed the empty-array case and still kept Oat Bars as reviewed, based on an AI-written selection doc. Set all 70 to `unknown` until a person reviews each recipe |
| R5-02 | P0 | The `unknown` display drops the allergen list | ✅ code | `getAllergenDisplay` now returns the listed allergens for `unknown`, and the page shows "Listed in this recipe, not yet reviewed: …" with a check-the-labels note. Test: `unreviewed allergens stay visible and are labelled as not reviewed` |
| R5-03 | P1 | Owner review of the 3 free recipes | ⏳ 👤 checklist ready | Checklist with source content, audit notes and draft alt text: `docs/implementation/phase-5/FREE-RECIPE-REVIEW.md`. It found that the Frittata Fingers image shows round fritters next to pasta, not the rectangular strips the recipe makes |
| R5-04 | P1 | No alt text on any recipe image | ⏳ 👤 drafts ready | Draft alt text for the 3 images is in the checklist. Current alt is acceptable meanwhile: cards use `alt=""` next to the visible title, and detail pages use the recipe title. Add a catalog alt-text field once the wording is approved |
| R5-05 | P1 | `FREE-RECIPES-SELECTION.md` contains invented content | ✅ docs | Notes differ from the database (Oat Bars "ground oats", Fish Cakes "pin bones"), and the doc adds unsourced timings ("Active 10m, Bake 20m", "~16 strips") and meal labels. It presents AI content as "Verified". Correct it to match the source and state the true review status |
| R5-06 | P1 | Phase 5 docs call the work "implemented and verified" editorial review | ✅ docs | Rewrite the status: ingestion done; editorial review not done; content is AI-generated |
| R5-07 | P2 | PR #22's migration is still unapplied, so repo and production history differ | ⏳ | Superseded by R5-01, but it also creates `private.merge_publication_state` and `clear_unreviewed_allergen_claims`. Apply it for history parity before the R5-01 reset |
| R5-08 | P2 | Two AI errors in draft recipes | ⏳ | "Onigiri Rice Triangles" lists eggs but is tagged `egg-free`. "Soft Tofu Veggie Stir Fry with Rice" uses sesame oil without listing sesame. Fix both in source and bodies; both are drafts |

### Must do, not in any plan

| ID | Pri | Item | Status | Evidence and fix |
| --- | --- | --- | --- | --- |
| M5-01 | P0 | The live recipes page claims the recipes are "tested" | ✅ copy | Meta description and hero no longer say "tested" or "verified ingredients". Test: `recipe pages make no tested or verified claims`. The same change fixed the doubled brand in 9 page titles (test: `page titles name the brand once`) |
| M5-02 | P1 | No record that the content is AI-generated | ⏳ 👤 | Owner decides whether the site discloses AI-assisted recipes and illustrative AI images. At minimum, don't imply real photos of cooked dishes |
| M5-03 | P1 | Image rights unknown | ⏳ 👤 | FLUX Pro output via Replicate. The owner confirms their account terms allow commercial use, and records it (Phase 6 handoff asked for "image source, usage permission") |
| M5-04 | P1 | No gate stops an unreviewed recipe being published | ✅ migration | `20260926052702_phase5_audit_publish_requires_review.sql`: triggers block publishing, taking a free slot or joining a collection unless the body is reviewed. pgTAP `08_phase5_publish_gate` (7 tests). Inserting a brand-new row directly as published is not gated |

### Good to have

| ID | Pri | Suggestion | Why |
| --- | --- | --- | --- |
| G5-01 | P2 | Keep a review record per recipe (reviewer, date, checklist result, content version) in a private table | Phase 6 and 8 handoffs both ask for approver and timestamp; docs are easy to lose |
| G5-02 | P2 | Before any paid launch, review all 67 drafts with the same checklist, starting with the 12 the keyword scan flagged | The scan is rough (false positives on "sunflower seed butter", "coconut milk", "chickpea flour") but it caught both real errors |

---

## Noticed in other phases (confirm during their audits)

| Phase | Item |
| --- | --- |
| 6 | Flaky: `recipes.spec.ts` "search input updates URL state and filters recipes" failed 1 of 15 runs on WebKit (URL not updated within 10 s). R3 content test always skips. R4 print check not done. Evidence doc names wrong columns. `/recipes` title repeats the brand |
| 7 | "Free or purchased only" save rule enforced only in the server action, not by RLS. Save-access tests use a mocked client. See also M1-02 to M1-04 |
| 8 | Webhook falls back to the public `whsec_mock_dummy_webhook_secret` when `STRIPE_WEBHOOK_SECRET` is unset (`src/lib/payments/config.ts:14`). Webhook refunds never revoke access. Commerce schema not in production. Vercel `COMMERCE_DATABASE_URL` is a template value (logs show host `HOST`), so `/collections/*` returns 500. The collection page shows a "14-day satisfaction refund guarantee" that the owner never decided (O3) |
| 9 | Never reviewed. The consent dialog claims "90-day retention", which the code doesn't enforce |
