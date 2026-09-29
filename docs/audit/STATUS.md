# Where things stand

A single page answering two questions: what is finished, and what is not.

Last updated: 2026-09-28.

## Where the detail lives

| Document | What it is | Read it when |
| --- | --- | --- |
| **[OWNER-TODO.md](OWNER-TODO.md)** | Only the things **you** can do — accounts, keys, decisions, approvals. Grouped A (before promoting) and B (before selling) | You want your own next action |
| **[AUDIT-BACKLOG.md](AUDIT-BACKLOG.md)** | Every finding from the 2026-09-25/26 audit, by phase, with evidence. 157 items | You want the reasoning or proof behind an item |
| **[../implementation/](../implementation/)** | The per-phase plans and evidence records, phase-1 to phase-12 | You want to know how a phase was built or validated |
| **This page** | Roll-up of the other two | You want the overall picture |

ID prefixes: `R` = review finding, `M` = must-do found outside the plans, `G` = suggestion, `C` = commercial decision. 👤 marks an item only the owner can close.

## The short version

**157 audit items: 76 closed, 47 open, 34 of the open ones need the owner.**

Two things gate everything else:

1. **Almost nobody can sign in by email.** Amazon SES is in sandbox and the production-access appeal was **denied**, so only verified addresses receive a code (M7-03). Google sign-in, added today, is the working way in.
2. **Nothing can be sold.** No Stripe account, no commerce tables in production, and all 14 commercial decisions are still open (R8-06, R8-07, M8-02).

Neither is a code problem. Both are accounts and decisions.

## Done

### Shipped today, 2026-09-28

| PR | What |
| --- | --- |
| [#60](https://github.com/Pratikn07/my-curated-haven-web/pull/60) | Google sign-in with a PKCE `/auth/callback`, and the emailed-code length read from one constant |
| [#61](https://github.com/Pratikn07/my-curated-haven-web/pull/61) | Root `.gitignore`; `.DS_Store` untracked |
| [#62](https://github.com/Pratikn07/my-curated-haven-web/pull/62) | Cloudflare Turnstile on the sign-in form, dormant until configured |
| [#63](https://github.com/Pratikn07/my-curated-haven-web/pull/63) | The email-delivery findings recorded as M7-03/04/05 |
| [#64](https://github.com/Pratikn07/my-curated-haven-web/pull/64) | A failed Turnstile challenge no longer blocks email sign-in |

Supabase configuration changed the same day: Apple provider disabled, sign-in code expiry cut from 1 hour to 10 minutes, code length raised to 10 digits, redirect URLs fixed for `/auth/callback` on all three origins.

### Closed earlier

- **Security (Phase 4, 8)** — public bucket locked down, an Edge Function that trusted a caller-supplied user id deleted, privileged functions closed to anonymous callers, Postgres patched, the forgeable Stripe webhook fixed, refunds now actually remove access, error text no longer leaked to callers.
- **The site itself (Phase 1, 2, 3)** — the broken `/recipes` link, the `www` certificate warning, fonts that never rendered, contrast failures on Privacy and Terms, the skip link, CI building a different bundle from production.
- **Content honesty (Phase 5, 6)** — copy claiming recipes were "tested", allergen labels claiming a review that never happened, invented refund and access terms, two real AI errors in drafts, and a publish gate that now blocks unreviewed recipes.
- **Analytics (Phase 9)** — PostHog live with signed-in users linked, real Instagram campaign codes, the consent banner contradiction resolved.

## Not done

### Gate 1 — before you promote the site

| ID | Item | Who |
| --- | --- | --- |
| **M7-03** | **SES sandbox; production-access appeal denied (case 179061640900508).** Only verified addresses get a sign-in code | 👤 |
| M11-03 | `support@mycuratedhaven.com` cannot receive mail — no MX records | 👤 |
| A12 / G7-01 | Google sign-in: live in code, still needs the owner's final confirmation on a real browser | 👤 |
| A13 / M7-01 | Turnstile: built and merged, needs the site key deployed and the secret set in Supabase | 👤 + assistant |
| M7-05 | Account linking between an email code and Google is unproven, and now testable | assistant |
| M7-04 | A failed send still shows Supabase's raw error text | assistant |
| M7-02 | No account-closure procedure | assistant |
| R5-03, R5-04 | Owner review of the 3 free recipes; alt text on every recipe image | 👤 |
| R5-10, R5-12, R5-13 | 3 recipe images contradict the safety fixes; 4 items need a human expert; how to label AI-checked recipes | 👤 |
| M5-02, M5-03 | No record that content is AI-generated; image rights unknown | 👤 |
| M6-01 | Card summaries make unreviewed health claims | 👤 |
| M1-05 | Terms have no governing law or dispute resolution | 👤 |
| M9-01 | Analytics and session recordings run without consent, including for EU and UK visitors | 👤 accepted risk |
| R3-06 | No screen-reader pass and no real-iPhone check | 👤 |
| M2-03 | Builds depend on downloading Google Fonts, so a Google hiccup fails a deploy | assistant |

### Gate 2 — before you sell anything

| ID | Item | Who |
| --- | --- | --- |
| **R8-06** | **All 14 commercial decisions open** (C01–C14): which recipes, price, seller identity, tax, refund terms, access duration, receipts | 👤 |
| M8-02 | No Stripe account, webhook endpoint or keys | 👤 |
| M11-02 | Vercel Hobby forbids selling; Pro needed | 👤 |
| R8-07 | Commerce schema not applied to production | assistant, at launch |
| R5-11 | 34 rejected drafts and 18 image blockers must be fixed first | assistant + 👤 |
| R9-03 | The measurement migration depends on the commerce tables | assistant, at launch |
| R10-01, R10-03 | Gate owners not named; no staging copy | 👤 |
| R10-07 | Payment gates G05 and G11 never run | 👤 |
| R11-01 | No server-side invite list for a first cohort | 👤 |
| R11-02 | No scheduled payment reconciliation | assistant |
| B3 | Test purchase and refund in Stripe test mode on staging | 👤 |

### Ongoing

| ID | Item |
| --- | --- |
| R11-04 | Domain auto-renew — `mycuratedhaven.com` expires 2027-01-28 | 
| R12-02 | 30-day free-recipe review, due about 2026-10-27 |
| G11-01 | Backups live only on one Mac |
| R7-01, R7-02, R7-04 | Saved recipes: database rules not enforced or proven, legacy table still referenced |
| — | 2FA on the Google, GitHub and Supabase accounts before Stripe keys exist |

Plus 30-odd `G` suggestions, none blocking: security headers, Dependabot, self-hosted fonts, a security advisor in CI, a self-service delete-account button.

## What to do next

1. **Reopen the SES case.** Nothing about email sign-in improves until that clears, and it is the slowest item because it waits on AWS.
2. **Finish Turnstile** — site key deployed, secret in Supabase, confirmed on a real browser.
3. **Make support mail work** (M11-03). The Privacy Policy and the account-closure route both point at an address that bounces.
4. **Start the 14 commercial decisions.** They gate every other selling task and depend on nobody but you.
