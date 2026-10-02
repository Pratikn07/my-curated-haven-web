# Where things stand

A single page answering two questions: what is finished, and what is not.

Last updated: 2026-10-02.

## Current owner updates (2026-10-02)

- **Amazon SES:** production access is approved. AWS confirms the account was moved out of the sandbox in US East (N. Virginia), with a quota of 50,000 messages per day and a maximum rate of 14 messages per second. An owner screenshot shows a sign-in code delivered to a separate Gmail address after approval. This confirms delivery, not completion of sign-in with that code.
- **Support email:** receipt was verified from the owner's screenshot. On 2026-10-02 the owner confirmed their team monitors `support@mycuratedhaven.com`. No fixed reply-time promise was supplied; buyer response timing remains part of C10. DNS/MX records were not independently inspected.
- **Free recipes:** the owner approved the three free recipes and their content checklist. This records owner sign-off, not an outside expert review or approval of paid drafts. Replacing the three misleading images is approved; preparing, checking and publishing the replacements and final image descriptions remains assistant work.
- **Removed owner tasks:** the owner removed the allergy-wording and AI-disclosure decisions from their task list. PR [#73](https://github.com/Pratikn07/my-curated-haven-web/pull/73) already removed the editorial allergen-review notice from the code while preserving listed allergens. This update does not change database review states or re-enable Dietary filters.
- **Image permission:** the owner confirms their image-generation plan allows commercial use. Provider terms were not independently reviewed here.
- **Business details:** the owner supplied **Nibble and Nurture**, **USA**. These details are recorded for the Terms. Terms implementation remains pending; no specific US governing-law state or arbitration decision was supplied. Selling territories, tax and receipt wording remain separate commercial choices.
- **Analytics:** form masking, recording retention, authorized website address, consent setup and optional Search Console are deferred by the owner. The existing accepted analytics risk remains recorded.
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

**157 audit items: 76 closed, 47 open, 34 of the open ones need the owner as counted in the 2026-09-28 baseline.** This is the original audit count; current updates supersede stale statuses for SES, support, Turnstile, 2FA and the 2026-10-02 owner decisions. The total has not been recomputed.

Two things gate everything else:

1. **Email sending is enabled for public recipients.** SES production access is approved and one sign-in code was delivered to a separate Gmail address. The owner has deferred the same-address Google/email account-linking check; it remains a pre-sale check if the owner reopens it.
2. **Nothing can be sold yet.** No Stripe account or production commerce setup exists. 13 of the 14 commercial choices remain open (C01–C10 and C12–C14); C11 is answered: there are no existing app purchases (R8-06, R8-07, M8-02).

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
| A12 / G7-01 | Google sign-in is configured; same-address account/purchase check is unverified and parked until the owner reopens it; complete before first sale | 👤 (parked) |
| M7-05 | Account linking between an email code and Google is unproven | 👤 (parked; pre-sale gate) |
| M7-04 | A failed send still shows Supabase's raw error text | assistant |
| M7-02 | Account-closure guide and database deletion test exist; production deletion has not been separately verified | assistant |
| R5-04, R5-10 | Owner approved the free-recipe review and image replacements; replacement images and final image descriptions still need implementation and verification | assistant |
| M1-05 | Nibble and Nurture, USA supplied; Terms implementation and a specific governing-law/dispute choice remain unfinished | assistant + later owner/legal review |
| M9-01 | Analytics settings and consent follow-up deferred; existing accepted risk remains | 👤 deferred |
| R3-06 | No screen-reader pass and no real-iPhone check | 👤 |
| R3-07 | Design approval still needs the owner's result | 👤 |
| M2-03 | Builds depend on downloading Google Fonts, so a Google hiccup fails a deploy | assistant |

### Gate 2 — before you sell anything

| ID | Item | Who |
| --- | --- | --- |
| **R8-06** | **13 of 14 commercial choices remain open** (C01–C10, C12–C14): recipes, price, seller and tax details, refund rules, access, support response time, and receipts. C11 is answered: no existing app purchases | 👤 |
| M8-02 | No Stripe account, webhook endpoint or keys | 👤 |
| M11-02 | Vercel Hobby forbids selling; Pro needed | 👤 |
| R8-07 | Commerce schema not applied to production | assistant, at launch |
| R5-11 | 34 rejected drafts and 18 image blockers must be fixed first | assistant + 👤 |
| R5-12 | Four draft recipe questions need a qualified human review if those recipes are selected for sale; free-recipe approval does not close them | 👤, after collection selection |
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

1. **Owner: test VoiceOver on an iPhone and review the design** (R3-06, R3-07). The short instructions are in `OWNER-TODO.md`, section C.
2. **Assistant: implement the approved three image replacements and final image descriptions** (R5-10, R5-04), then verify the recipe pages.
3. **Keep analytics, account-linking and paid-collection decisions parked** until the owner reopens them. Support monitoring, free-recipe owner review and commercial image permission no longer need owner approval.
