# Owner to-do list

Everything only you (the owner) can do, collected from the 2026-09-25/26 audit. Each item says why it matters, the steps, and how we'll know it's done. IDs match [AUDIT-BACKLOG.md](AUDIT-BACKLOG.md), where the evidence lives.

When you finish an item, tell the assistant the ID. It will do its part, verify, and tick the item here.

For the overall picture — what is finished and what is not — see [STATUS.md](STATUS.md).

Last updated: 2026-10-02: support monitoring and free-recipe review confirmed by the owner; image replacements approved; commercial image use confirmed; business name and country provided; analytics deferred.

## Your task list in everyday language

This is the short version. The detailed steps and audit IDs are below. Items marked **deferred** are recorded for later, not current requests.

### Before sharing the site publicly

- **Try the site with VoiceOver on an iPhone and approve the design.** These checks are in the quick-check list below.

### Your decisions recorded on 2026-10-02

- **Support email is monitored by your team.** This means `support@mycuratedhaven.com`. No fixed reply-time promise was supplied.
- **The three free recipes and their content checklist are approved by you.** This includes the owner review requested for their ingredients, instructions, safety guidance, summaries and draft image descriptions. It does not approve paid drafts or claim an outside expert review.
- **The three image replacements are approved for implementation:** flattened blueberries, flattened peas, and frittata strips. The replacement images and final descriptions still need to be prepared, checked against each other and published by the assistant.
- **Allergy-wording and AI-disclosure decisions are removed from your active task list at your request.** PR #73 has already removed the editorial allergen-review notice from the code; listed allergens remain visible. No AI-disclosure change is requested.
- **Commercial use of the recipe pictures is confirmed by you.** Provider terms have not been independently reviewed here.
- **Business name: Nibble and Nurture. Country: USA.** These are the details you supplied for the Terms; they are not a decision about where to sell, taxes or receipt wording.
- **Analytics is deferred:** form masking, recording retention, allowed website address, consent setup and optional Search Console remain for later. The existing accepted analytics risk remains recorded.

### Before selling recipes

- **When you are ready to set up checkout, complete Stripe and upgrade Vercel to Pro.** Add Stripe's secret values in Vercel yourself; never paste them into chat. Then tell the assistant so it can finish the protected database setup.
- **Choose who owns the launch sign-offs and tell the assistant when to prepare a test site.**
- **Test a purchase and refund on the test site** before taking real payments.
- **After choosing the collection, review and fix only the recipes and pictures you plan to sell.** Four draft recipe questions need a qualified human review before those recipes are sold.

### Keep in mind

- **SES is ready:** Amazon approved production access in US East (N. Virginia), and a login code reached another Gmail address. No email-provider fallback is needed.
- **Deferred until you reopen them:** checking that Google and email-code sign-in for the same address reach the same account, and choosing the paid collection.
- **Already done:** two-step verification is on for Google, GitHub, and Supabase. You declined rotating the Turnstile secret and adding a second Supabase authenticator; neither is listed as an open task.
- **Routine:** turn on domain auto-renew before it expires on 2027-01-28; check the backup log weekly; review recipe analytics around 2026-10-27; tell the assistant if GitHub reports a production smoke-check failure. If someone asks to delete their account, follow the existing `ops/ACCOUNT-CLOSURE.md` guide.
- **Optional sign-in settings:** strengthen password rules in Supabase. The site needs email codes, so password sign-in cannot simply be switched off there. Exact production callback-URL hardening is optional; local callback fixes are only needed if you want sign-in testing on your computer.

### Deferred until you are ready to plan sales again

- **Choose the paid collection and its terms:** which recipes, price, seller and tax details, refund rules, buyer access, future updates, corrections, personal printing, and the name shown on receipts. Existing app purchases are already confirmed as none.
- **Choose whether sales start with invited buyers or open to everyone.**
- **Check that Google sign-in and email-code sign-in with the same address reach one account.** You asked to park this check; it needs to be completed before the first sale if you reopen sales planning.

---

## A. Before you promote the site

> **Current state (2026-10-02):** AWS approved SES production access in US East (N. Virginia), with a quota of 50,000 messages per day and a maximum rate of 14 messages per second. A sign-in code was delivered to a separate Gmail address after approval. A test email to `support@mycuratedhaven.com` also arrived. The owner confirms their team monitors support mail; no fixed reply-time promise was supplied.

### A0. Make support@mycuratedhaven.com receive mail (M11-03) ✅ (receipt verified 2026-09-29)

- **Why**: the site, the Privacy Policy and the account-deletion steps all send people to this address.
- **Original setup option** (already receiving mail; use only if routing needs repair):
  1. Sign up at **ImprovMX** (improvmx.com) with `mycuratedhaven.com`. Set `support@` to forward to the inbox you read.
  2. In Hostinger → DNS for `mycuratedhaven.com`, add the 2 MX records and the SPF TXT record ImprovMX shows.
  3. When you set up A1, merge the two SPF records into one (`v=spf1 include:... include:... ~all`). Ask the assistant if unsure.
- **Done**: owner screenshots show a test sent from a separate Gmail account to `support@mycuratedhaven.com` arrived in the receiving Gmail inbox on 2026-09-29. The receiving message displayed a Gmail suspicious-message banner, but was delivered. Mail routing is verified; DNS/MX configuration was not independently inspected.

### A1. Sign-in email delivery (M1-03, M7-03) ✅ production access and external delivery confirmed 2026-10-01

- AWS confirms SES is out of the sandbox in US East (N. Virginia): 50,000 messages per day and up to 14 messages per second.
- An owner screenshot shows a sign-in code from the site delivered to a separate Gmail address after approval.
- No fallback sender is needed. This confirms email delivery; it does not claim that the code was entered to complete a sign-in.

### A2. Bot protection on sign-in (M7-01 CAPTCHA portion) ✅ (verified 2026-09-29)

- **Done**: Turnstile is enabled on the production sign-in form and Supabase enforcement is on. A live request without a valid CAPTCHA token was rejected (`captcha_failed`).
- **Limit**: this confirms CAPTCHA enforcement only; it does not verify that someone completed sign-in by entering an email code. SES access and delivery are recorded in A1.

### A3. Confirm a sign-in email arrives (R7-03) ✅ (separate Gmail address)

- The owner received a sign-in code at a separate Gmail address after SES production access was approved. This verifies delivery to an external address; completing sign-in with that code was not part of this check.

### A4. Confirm the support inbox is read (R1-07) ✅ owner confirmed 2026-10-02

- **Why**: the site, the account page and the Privacy Policy all send people to `support@mycuratedhaven.com`, including for account deletion.
- **Receipt test done 2026-09-29**: an email from a separate Gmail account to `support@mycuratedhaven.com` arrived in the receiving inbox.
- **Owner confirmed 2026-10-02**: their team monitors the inbox. No fixed reply-time promise was supplied; do not publish one as approved. A buyer response-time policy remains part of C10 when sales planning resumes.

### A5. Replace 3 recipe images (R5-10)

- **Owner approval recorded 2026-10-02**: replacement is approved. Implementation and verification remain with the assistant; the current images are not approved as the final result.
- **Why**: the live images contradict the safety fixes. Oat Bars shows **whole blueberries**, Fish Cakes shows **whole peas**, and the Frittata shows round bites beside pasta instead of strips.
- **Assistant work**: prepare new images matching the steps, verify the depicted food shapes, update their image descriptions, then publish and check the recipe pages. R5-04's image-description field is also pending implementation.

### A6. Allergy-wording decision (R5-13) — removed from owner tasks

- **Owner decision 2026-10-02**: remove this wording task. Do not ask again unless the owner reopens it.
- **Current source**: PR #73 removed the editorial allergen-review notice. Listed allergens remain visible; recipes with none listed say "No allergens are listed for this recipe." This documentation update does not change recipe review states or re-enable Dietary filters (R6-01).

### A7. AI disclosure and image rights (M5-02, M5-03) — no open owner action

- **M5-02**: owner removed this disclosure task on 2026-10-02. No disclosure change is requested.
- **M5-03**: owner confirmed on 2026-10-02 that their image-generation plan permits commercial use. This is owner confirmation, not an independent review of the provider terms.

### A8. Recipe questions for a person or expert (R5-12)

- The AI reviewer couldn't decide these: frozen yogurt pops at 12 months, date-almond bites at 24 months, peanut-butter oat discs at 18 months (texture and portion), and the vegetable curry image, which it couldn't see.
- All are drafts, so nothing is live. Needed before they're sold.

### A9. Terms: legal entity and governing law (M1-05)

- **Details supplied 2026-10-02**: business name **Nibble and Nurture**, country **USA**. The request to provide those details is answered.
- **Remaining implementation**: the Terms still lack governing-law and dispute clauses. No particular US state or arbitration choice was supplied; do not invent them or describe the Terms as finished. Substantive Terms changes belong in a separate reviewed task.

### A10. PostHog settings (R9-01, M9-01, M9-02) — deferred by owner 2026-10-02

- **Owner choice**: keep the checks below for later. They are not current requests; the existing accepted analytics risk remains recorded.
- **Done**: banner removed, PostHog chosen, project key added to Vercel (2026-09-26).
- **You**:
  1. ~~Turn on session replay~~: already on (recordings arrive).
  2. PostHog → **Settings → Session replay**: check **Mask all inputs** is on (the site also masks them) and pick how long recordings are kept.
  3. PostHog → **Settings → Project → Authorized URLs**: add `https://mycuratedhaven.com` so the toolbar and heatmaps work.
  4. Optional: **Google Search Console** (search.google.com/search-console) → add `mycuratedhaven.com` as a Domain property and add the TXT record it shows. It's free and shows which Google searches bring people in, which PostHog can't.
- **Before you promote in the EU or UK**: add the consent platform (OneTrust or similar). Today analytics and recordings run for everyone without asking, which EU/UK law requires consent for (M9-01).

### A11. Instagram links (R9-04) ✅

- Done 2026-09-26: bio, Stories and DMs. Copy links from `docs/INSTAGRAM-LINKS.md`. Tell the assistant if you start sharing links anywhere else.

### A12. Google sign-in and same-address account check (G7-01 / M7-05)

- **Current state (2026-09-29)**: Google sign-in is configured and the button/callback are built. Email/Google same-address account linking and purchase preservation have not been verified.
- **Owner choice**: the owner has deferred this test and paid-collection decisions. Keep it parked until the owner reopens it; complete the same-address check before the first sale.
- **Checked live 2026-09-28 against project `ccrgvammglkvdlaojgzv`** (Supabase Management API, `/config/auth`). Most of this is already configured:

| What | State | Action |
| --- | --- | --- |
| Google provider | Enabled, client `321281378255-jfp2ck24…apps.googleusercontent.com` — Google Cloud project **Parenting Compass** (`parenting-compass-469321`, number `321281378255`), on the `pratik.nandoskar07@gmail.com` account, confirmed 2026-09-28 | **None.** It is already a **Web** client — 3 real Google sign-ins ran through `https://ccrgvammglkvdlaojgzv.supabase.co/auth/v1/callback` between 2025-11-30 and 2025-12-15, and Google only accepts an `https` redirect from a Web client. No new OAuth client needed |
| Production redirect URL | `uri_allow_list` contains `https://mycuratedhaven.com/**`, whose globstar does match `/auth/callback` | Works as is. Optional hardening: add the exact `https://mycuratedhaven.com/auth/callback`, which is what Supabase recommends for production instead of a globstar |
| Local redirect URL | Neither local origin works for `/auth/callback`. `127.0.0.1:3000` is absent, and the `http://localhost:3000/*` entry uses a **single** star — Supabase treats `/` as a separator, so `*` stops at it and never matches `/auth/callback` | Add `http://127.0.0.1:3000/**` and change `http://localhost:3000/*` to `http://localhost:3000/**` |
| Email code expiry | ✅ done 2026-09-28: `mailer_otp_exp = 600` | None |
| Apple provider | ✅ done 2026-09-28: disabled. (Was enabled with a web Services ID `com.pratikn07.mycuratedhaven.web`.) | None. For the record, the reason was: This is a live web sign-in endpoint with no button in front of it. Apple returns a Private Relay address, so a parent who bought with an email code would come back as a different user and lose the collection |
| Passwords | **Cannot be turned off separately.** Supabase has one `external_email_enabled` switch covering both the sign-in code and passwords; disabling it would kill the code the website depends on. `disable_signup` would also block new parents. 2 of the 5 existing users do have a password hash | Accept them, and reduce the blast radius: `password_min_length` 6 → 10, turn on *Secure password change* and *Require current password when updating*, and enable *Prevent use of leaked passwords* once you are on Vercel/Supabase Pro (B5). A password sign-up grants no entitlement, so the exposure is junk accounts, not access to paid recipes. If you later want passwords genuinely blocked, the mechanism is a `password_verification_attempt` auth hook that rejects every attempt |


> **⚠️ Changing `Email OTP length` in the dashboard breaks the website on its own.**
> The sign-in form has to accept exactly the number of digits Supabase sends. That number lives in
> `my-curated-haven-web/src/lib/auth/otp.ts` (`EMAIL_OTP_LENGTH`) and in `supabase/config.toml`
> (`otp_length`). Changing it in Supabase without changing both of those truncates every emailed
> code and nobody can sign in — which is exactly what happened on 2026-09-28 when it went from 6 to
> 10. If you want a different length, tell the assistant instead of only changing the dashboard.

- **Pre-sale acceptance check**: sign in with an email code and Google using the same address; confirm both methods resolve to the same user and that a test purchase remains in `/account/collections`.

---

### A13. Turnstile follow-up

This duplicate checklist item is superseded by A2. No additional owner action is open here.


## B. Before you sell anything

### B5. Upgrade Vercel to Pro (M11-02)

- **Why**: Vercel's free Hobby plan is for non-commercial use only; taking payments or advertising a product for sale needs Pro ($20/month). Pro also lifts the 5,000-a-month image limit.
- **Steps**: Vercel → Settings → Billing → upgrade the team to Pro, before `CHECKOUT_ENABLED` is turned on.

### B6. Invite-only first, or open to everyone? (R11-01)

- **Choose**: (1) a small invited group first (the assistant builds a server-side invite list), or (2) open checkout to everyone at once. The Phase 11 plan recommends (1).

### B7. Domain renewal (R11-04)

- Hostinger → Domains → `mycuratedhaven.com`: turn on **auto-renew**. It expires 2027-01-28.

### B1. Commercial decisions before selling (R8-06)

Checkout stays off until these are decided. The collection page will show your real terms.

| # | Decide |
| --- | --- |
| C01 | Which recipes are in the paid collection (exact list) |
| C02 | Whether the 3 free recipes count as part of it |
| C03 | Price and currency |
| C04 | Seller details partly supplied: Nibble and Nurture, USA. Countries to sell to and tax treatment remain undecided |
| C05 | Refund policy: who can get one, within how long, how to ask |
| C06 | What happens to access after a partial refund |
| C07 | Access while a refund or card dispute is pending |
| C08 | Whether future recipes are included or sold separately |
| C09 | How long buyers keep access, and what happens if the site closes |
| C10 | Support address is `support@mycuratedhaven.com`, monitored by the owner's team. Buyer response-time promise remains undecided |
| C11 | Existing app purchases: **answered, none exist** |
| C12 | How recipe corrections or safety withdrawals are handled for buyers |
| C13 | What buyers may do with printed recipes (personal use) |
| C14 | The name that appears on receipts and card statements |

### B2. Stripe setup (M8-02)

1. Create or finish the Stripe account (business details, bank account).
2. Stripe Dashboard → Developers → **Webhooks** → add endpoint `https://mycuratedhaven.com/api/stripe/webhook` with events `checkout.session.completed`, `refund.created`, `refund.updated`.
3. Put these in Vercel → Settings → Environment Variables (Production) yourself, not in chat: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (from the endpoint), `STRIPE_EXPECTED_ACCOUNT_ID`.
4. Tell the assistant. It then sets up the checkout database connection (`COMMERCE_DATABASE_URL`) and applies the checkout database changes, staging first.

### B0. Name yourself as gate owner, and decide on staging (R10-01, R10-03)

- **Gate owners**: Phase 10 has 6 sign-off roles (release, QA, editorial, commerce, support, operations). Reply "I own all Phase 10 gates" and the assistant records it.
- **Staging**: when you're ready to test checkout, say so. The assistant creates a free Supabase staging project (your org has room for one more) and points Vercel preview deployments at it. Nothing to do until then.

### B3. Test purchase and refund (Phase 10)

- In Stripe **test mode**, on the staging copy: buy the collection with a test card, check the recipes unlock, refund, and check access is removed. Only then switch on sales (`CHECKOUT_ENABLED=true`).

### B4. Fix the draft recipes you'll sell (R5-11)

- The AI review rejected 34 drafts and flagged 18 images. Pick the collection (C01) first; the assistant or the other AI then applies the review fixes to those recipes only.

---

## C. Quick checks, any time

| ID | What | How |
| --- | --- | --- |
| R3-07 | Approve the design | Compare `docs/implementation/phase-3/evidence/audit-2026-09-25/before-home-390.png` and `after-home-390.png`. Reply "approved" or say what to change |
| R3-06 | Screen reader check | Follow the short iPhone test below; visit Home, a recipe page and sign-in. Report confusing labels, skipped controls or getting stuck |
| R1-09 | Content register sign-off | Tick the checklist in `docs/implementation/phase-1/CONTENT-REGISTER.md` (or tell the assistant "approved") |
| R5-03, R5-04 | Recipe checklist and image descriptions | Owner approval recorded 2026-10-02 in `docs/implementation/phase-5/FREE-RECIPE-REVIEW.md`; image replacements and final image-description implementation remain with the assistant |

### A short iPhone VoiceOver test

VoiceOver is the iPhone's built-in screen reader. It speaks text and control names aloud so someone can use the site without seeing it. This check asks whether the pages can be read and operated that way.

1. Open `https://mycuratedhaven.com` in Safari. Ask Siri to "Turn on VoiceOver", or use Settings → Accessibility → VoiceOver. To exit at any time, ask Siri to "Turn off VoiceOver".
2. Swipe right with one finger to hear the next item; swipe left for the previous item. A single tap selects and reads an item. Double-tap to activate the selected link or button. Swipe up with three fingers to scroll down, and down with three fingers to scroll up. These are [Apple's VoiceOver gestures](https://support.apple.com/guide/iphone/use-voiceover-gestures-iph3e2e2281/ios); Apple also explains [turning VoiceOver on and off](https://support.apple.com/guide/iphone/turn-on-and-practice-voiceover-iph3e2e415f/ios).
3. On **Home**, find and open the navigation/menu and a recipe link. On **one recipe page**, listen to its title, ingredients and steps; find Save and Print. On **sign-in**, find the email field, Google option and email-code control. This checks the controls; the deferred same-address sign-in test is not required here.
4. A pass means the reading order makes sense, links and buttons have useful names, and you can reach and activate the controls without getting stuck. Record the page and what VoiceOver said when something is confusing, along with your iPhone/iOS version. Do not share passwords or sign-in codes.
5. Turn VoiceOver off and review the normal page appearance separately: readable text, usable buttons, no sideways scrolling or overlapping content. Tell the assistant whether you approve the design or what needs changing.

Example report: "Home: pass. Recipe: pass. Sign-in: a button has no name. Design: approved." Only mark the real-device test and design approval done after the owner reports the result.

---

## D. Ongoing

- **About 2026-10-27, 30-day recipe review (R12-02)**: in PostHog, look at the last 30 days: visitors and campaigns (Web analytics), recipe opens, saves and prints by recipe (Trends), the Home → recipes → recipe → print funnel, and 10 recordings of visits that opened a recipe but didn't print. Share the numbers with the assistant to decide what to improve next (Phase 12).

- **Backups**: glance at `~/MyCuratedHavenBackups/backup.log` weekly. You should see a `done:` line each day your Mac was on.
- **Production checks**: GitHub emails you if the hourly production smoke check fails. If you get one, tell the assistant.
- **Account deletion requests**: follow `ops/ACCOUNT-CLOSURE.md`.
