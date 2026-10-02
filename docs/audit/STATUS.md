# Where things stand

A single page answering two questions: what is finished, and what is not.

Last updated: 2026-10-01.

## Current owner updates (2026-10-01)

- **Amazon SES:** production access is approved. AWS confirms the account was moved out of the sandbox in US East (N. Virginia), with a quota of 50,000 messages per day and a maximum rate of 14 messages per second. An owner screenshot shows a sign-in code delivered to a separate Gmail address after approval. This confirms delivery, not completion of sign-in with that code.
- **Support email:** an owner-provided screenshot confirms a test email sent from a separate Gmail account to `support@mycuratedhaven.com` arrived in the receiving Gmail inbox. Mail receipt is verified; who monitors it and the reply-time expectation remain undecided. DNS/MX records were not independently inspected.
- **Turnstile:** site key is deployed and Supabase enforcement is enabled. A live request without a valid CAPTCHA token was rejected (`captcha_failed`). Email delivery is now confirmed separately; this does not prove someone completed sign-in by entering the code.
- **Owner decision:** the owner declined rotating the Turnstile secret mentioned in the earlier transcript. Do not list rotation as an open task or ask again.
- **Account 2FA:** owner screenshots show Google 2-Step Verification, GitHub authenticator-based 2FA, and Supabase MFA enabled. The owner declined adding a second Supabase authenticator; do not list that as an open task.
- **Parked:** same-address email/Google account-linking test and paid-collection decisions are deferred by the owner. Do not present them as the next task unless the owner reopens them.

## Where the detail lives

| Document | What it is | Read it when |
| --- | --- | --- |
| **[OWNER-TODO.md](OWNER-TODO.md)** | Only the things **you** can do — accounts, keys, decisions, approvals. Grouped A (before promoting) and B (before selling) | You want your own next action |
| **[AUDIT-BACKLOG.md](AUDIT-BACKLOG.md)** | Every finding from the 2026-09-25/26 audit, by phase, with evidence. 157 items | You want the reasoning or proof behind an item |
| **[../implementation/](../implementation/)** | The per-phase plans and evidence records, phase-1 to phase-12 | You want to know how a phase was built or validated |
| **This page** | Roll-up of the other two | You want the overall picture |

ID prefixes: `R` = review finding, `M` = must-do found outside the plans, `G` = suggestion, `C` = commercial decision. 👤 marks an item only the owner can close.

## The short version

**157 audit items: 76 closed, 47 open, 34 of the open ones need the owner as counted in the 2026-09-28 baseline.** This is the original audit count; current updates below supersede stale statuses for SES, support mail, Turnstile, and 2FA. The total has not been recomputed.

Two things gate everything else:

1. **Email sending is enabled for public recipients.** SES production access is approved and one sign-in code was delivered to a separate Gmail address. The owner has deferred the same-address Google/email account-linking check; it remains a pre-sale check if the owner reopens it.
2. **Nothing can be sold.** No Stripe account, no commerce tables in production, and all 14 commercial decisions are still open (R8-06, R8-07, M8-02).

Neither is a code problem. Both are accounts and decisions.

## Done

### Shipped through 2026-09-29

| PR | What |
| --- | --- |
| [#60](https://github.com/Pratikn07/my-curated-haven-web/pull/60) | Google sign-in with a PKCE `/auth/callback`, and the emailed-code length read from one constant |
| [#61](https://github.com/Pratikn07/my-curated-haven-web/pull/61) | Root `.gitignore`; `.DS_Store` untracked |
| [#62](https://github.com/Pratikn07/my-curated-haven-web/pull/62) | Cloudflare Turnstile on the sign-in form; initially dormant, later enabled in production |
| [#63](https://github.com/Pratikn07/my-curated-haven-web/pull/63) | The email-delivery findings recorded as M7-03/04/05 |
| [#64](https://github.com/Pratikn07/my-curated-haven-web/pull/64) | A failed Turnstile challenge no longer blocks email sign-in |

Turnstile was enabled in production on 2026-09-29; a live request without a valid token was rejected. Owner screenshots on 2026-09-29 show 2FA/MFA enabled for Google, GitHub, and Supabase. A support-mail test sent from a separate Gmail account reached the receiving Gmail inbox the same day.

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
| R1-07 | Support-mail receipt verified; inbox monitor and response-time expectation still need an owner decision | 👤 |
| A12 / G7-01 | Google sign-in is configured; same-address account/purchase check is unverified and parked until the owner reopens it; complete before first sale | 👤 (parked) |
| M7-05 | Account linking between an email code and Google is unproven | 👤 (parked; pre-sale gate) |
| M7-04 | A failed send still shows Supabase's raw error text | assistant |
| M7-02 | Account-closure guide and database deletion test exist; production deletion has not been separately verified | assistant |
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

Plus 30-odd `G` suggestions, none blocking: security headers, Dependabot, self-hosted fonts, a security advisor in CI, a self-service delete-account button.

## What to do next

1. **Decide support inbox ownership and reply timing** (R1-07); receipt is verified, staffing is not.
2. **Replace the three recipe images** that conflict with the safety updates (A5 / R5-10).
3. **Review the free recipes and their images** for safety, accuracy, health claims, and alt text.
4. **Keep account-linking and paid-collection decisions parked** until the owner reopens them.
