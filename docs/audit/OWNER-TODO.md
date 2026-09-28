# Owner to-do list

Everything only you (the owner) can do, collected from the 2026-09-25/26 audit. Each item says why it matters, the steps, and how we'll know it's done. IDs match [AUDIT-BACKLOG.md](AUDIT-BACKLOG.md), where the evidence lives.

When you finish an item, tell the assistant the ID. It will do its part, verify, and tick the item here.

Last updated: 2026-09-28: added A12 (Google sign-in).

---

## A. Before you promote the site

> **Most urgent, 2026-09-26:** A1 and A0 below. Today no parent except you can sign in (Supabase's built-in sender only emails your Supabase team), and mail to `support@mycuratedhaven.com` bounces (the domain has no mail records).

### A0. Make support@mycuratedhaven.com receive mail (M11-03)

- **Why**: the site, the Privacy Policy and the account-deletion steps all send people to this address, but the domain has no mail (MX) records, so every message bounces.
- **Steps** (free option):
  1. Sign up at **ImprovMX** (improvmx.com) with `mycuratedhaven.com`. Set `support@` to forward to the inbox you read.
  2. In Hostinger → DNS for `mycuratedhaven.com`, add the 2 MX records and the SPF TXT record ImprovMX shows.
  3. When you set up A1, merge the two SPF records into one (`v=spf1 include:... include:... ~all`). Ask the assistant if unsure.
- **Done when**: an email from another account to `support@mycuratedhaven.com` arrives in your inbox. Then do A4.

### A1. Custom email sender for sign-in codes (M1-03, M11-01) — urgent

- **Why**: Supabase's built-in sender **only delivers to members of your Supabase team** (just you), so every other parent gets "We can't send sign-in codes to new email addresses yet". It also allows only 2 emails an hour for the whole site.
- **Steps**:
  1. Sign up for **Resend** (free tier: 3,000 emails a month) or **Postmark**.
  2. Add `mycuratedhaven.com` as a sending domain. The provider shows DNS records (SPF, DKIM, DMARC); add them where you bought the domain.
  3. Wait until the provider shows the domain as verified.
  4. Tell the assistant, and keep the SMTP username and password ready to paste into Supabase yourself (Authentication → SMTP Settings). Don't paste them into chat.
- **Assistant then**: raises the hourly limit, rebrands the email, tests.
- **Done when**: 5 sign-ins in a row within an hour all receive a code from `mycuratedhaven.com`.

### A2. Bot protection on sign-in (M7-01)

- **Why**: without it, a script can use up the email quota or create junk accounts. Do it together with A1.
- **Steps**:
  1. dash.cloudflare.com → **Turnstile** → **Add site**. Domain `mycuratedhaven.com`, mode **Managed**. It's free.
  2. Copy the **secret key** into Supabase → Authentication → **Bot and Abuse Protection** → Turnstile.
  3. Send the assistant the **site key** (it's public).
- **Done when**: sign-in works for you, and the assistant's test confirms requests without the check are refused.

### A3. Confirm a sign-in email arrives (R7-03) ✅ (owner received the code, 2026-09-26)

- **After A1.** Sign in once at mycuratedhaven.com/sign-in with your own email. Check the code arrives in your inbox (not spam) within a minute and that it signs you in.

### A4. Confirm the support inbox is read (R1-07)

- **Why**: the site, the account page and the Privacy Policy all send people to `support@mycuratedhaven.com`, including for account deletion.
- **Steps**: send a test email to it from another address and confirm you receive it. Decide who answers and how fast.

### A5. Replace 3 recipe images (R5-10)

- **Why**: the live images contradict the safety fixes. Oat Bars shows **whole blueberries**, Fish Cakes shows **whole peas**, and the Frittata shows round bites beside pasta instead of strips.
- **Steps**: generate or photograph new images matching the steps (flattened berries, flattened peas, frittata cut into strips). Send them to the assistant, or upload them to the `recipe-images` bucket with the same file names.

### A6. Decide how AI-checked recipes are labelled (R5-13)

- **Choice**:
  1. Keep "Listed in this recipe, not yet reviewed" (current), or
  2. Add "Allergens checked against the ingredients by an automated review, not by a person".
- **This also decides** when the Dietary filters (Gluten-Free, Dairy-Free, etc.) come back (R6-01).

### A7. AI disclosure and image rights (M5-02, M5-03)

- **M5-02**: decide whether the site says recipes are AI-assisted and images are illustrative. The assistant will write the wording.
- **M5-03**: check your Replicate / FLUX Pro account terms allow commercial use of the images. Note the answer.

### A8. Recipe questions for a person or expert (R5-12)

- The AI reviewer couldn't decide these: frozen yogurt pops at 12 months, date-almond bites at 24 months, peanut-butter oat discs at 18 months (texture and portion), and the vegetable curry image, which it couldn't see.
- All are drafts, so nothing is live. Needed before they're sold.

### A9. Terms: legal entity and governing law (M1-05)

- **Why**: the Terms have no "governing law" or dispute clause. The old text had `[Your State/Country]` placeholders, so they were removed rather than published unfinished.
- **Steps**: tell the assistant your legal business name and the state or country whose law applies. Ideally a lawyer confirms whether to include arbitration.

### A10. PostHog settings (R9-01, M9-01, M9-02)

- **Done**: banner removed, PostHog chosen, project key added to Vercel (2026-09-26).
- **You**:
  1. ~~Turn on session replay~~: already on (recordings arrive).
  2. PostHog → **Settings → Session replay**: check **Mask all inputs** is on (the site also masks them) and pick how long recordings are kept.
  3. PostHog → **Settings → Project → Authorized URLs**: add `https://mycuratedhaven.com` so the toolbar and heatmaps work.
  4. Optional: **Google Search Console** (search.google.com/search-console) → add `mycuratedhaven.com` as a Domain property and add the TXT record it shows. It's free and shows which Google searches bring people in, which PostHog can't.
- **Before you promote in the EU or UK**: add the consent platform (OneTrust or similar). Today analytics and recordings run for everyone without asking, which EU/UK law requires consent for (M9-01).

### A11. Instagram links (R9-04) ✅

- Done 2026-09-26: bio, Stories and DMs. Copy links from `docs/INSTAGRAM-LINKS.md`. Tell the assistant if you start sharing links anywhere else.

### A12. Turn on Google sign-in (G7-01)

- **Why**: email codes are the only way in on the website today, and the sign-in form has no CAPTCHA (`security_captcha_enabled: false`, M7-01), so the hourly email quota is still a single point of failure for every sign-in. Google sign-in does not touch that quota. The button and the `/auth/callback` route are built and tested.
- **Checked live 2026-09-28 against project `ccrgvammglkvdlaojgzv`** (Supabase Management API, `/config/auth`). Most of this is already configured:

| What | State | Action |
| --- | --- | --- |
| Google provider | Enabled, client `321281378255-jfp2ck24…apps.googleusercontent.com` — Google Cloud project **Parenting Compass** (`parenting-compass-469321`, number `321281378255`), on the `pratik.nandoskar07@gmail.com` account, confirmed 2026-09-28 | **None.** It is already a **Web** client — 3 real Google sign-ins ran through `https://ccrgvammglkvdlaojgzv.supabase.co/auth/v1/callback` between 2025-11-30 and 2025-12-15, and Google only accepts an `https` redirect from a Web client. No new OAuth client needed |
| Production redirect URL | `uri_allow_list` contains `https://mycuratedhaven.com/**`, whose globstar does match `/auth/callback` | Works as is. Optional hardening: add the exact `https://mycuratedhaven.com/auth/callback`, which is what Supabase recommends for production instead of a globstar |
| Local redirect URL | Neither local origin works for `/auth/callback`. `127.0.0.1:3000` is absent, and the `http://localhost:3000/*` entry uses a **single** star — Supabase treats `/` as a separator, so `*` stops at it and never matches `/auth/callback` | Add `http://127.0.0.1:3000/**` and change `http://localhost:3000/*` to `http://localhost:3000/**` |
| Email code expiry | `mailer_otp_exp = 3600` — a 6-digit code stays valid for a full hour, with no CAPTCHA on the form | **Change to 600 (10 minutes)**, Authentication → Providers → Email → *Email OTP expiration*. Codes are used within a minute or two in practice. This is the highest-value change on that screen |
| Apple provider | **Enabled**, with a web Services ID `com.pratikn07.mycuratedhaven.web` | **Turn off.** This is a live web sign-in endpoint with no button in front of it. Apple returns a Private Relay address, so a parent who bought with an email code would come back as a different user and lose the collection |
| Passwords | **Cannot be turned off separately.** Supabase has one `external_email_enabled` switch covering both the sign-in code and passwords; disabling it would kill the code the website depends on. `disable_signup` would also block new parents. 2 of the 5 existing users do have a password hash | Accept them, and reduce the blast radius: `password_min_length` 6 → 10, turn on *Secure password change* and *Require current password when updating*, and enable *Prevent use of leaked passwords* once you are on Vercel/Supabase Pro (B5). A password sign-up grants no entitlement, so the exposure is junk accounts, not access to paid recipes. If you later want passwords genuinely blocked, the mechanism is a `password_verification_attempt` auth hook that rejects every attempt |

- **Done when**: on the live site, `/sign-in` → *Continue with Google* signs you in and lands you back where you started.
- **Still untested, and it must be tested before any collection goes on sale.** No account has ever held both an email and a Google identity (5 users, 0 duplicate addresses, 0 linked accounts), so Supabase's same-address linking has never actually run here. Buy with an email code, then sign in with Google on that same address, and confirm it is the **same** user and the purchase is still in `/account/collections`. If a second user is created, the buyer sees "No Purchased Collections Yet" for a collection they paid for.

---

## B. Before you sell anything

### B5. Upgrade Vercel to Pro (M11-02)

- **Why**: Vercel's free Hobby plan is for non-commercial use only; taking payments or advertising a product for sale needs Pro ($20/month). Pro also lifts the 5,000-a-month image limit.
- **Steps**: Vercel → Settings → Billing → upgrade the team to Pro, before `CHECKOUT_ENABLED` is turned on.

### B6. Invite-only first, or open to everyone? (R11-01)

- **Choose**: (1) a small invited group first (the assistant builds a server-side invite list), or (2) open checkout to everyone at once. The Phase 11 plan recommends (1).

### B7. Domain renewal (R11-04)

- Hostinger → Domains → `mycuratedhaven.com`: turn on **auto-renew**. It expires 2027-01-28.

### B1. The 14 commercial decisions (R8-06)

Checkout stays off until these are decided. The collection page will show your real terms.

| # | Decide |
| --- | --- |
| C01 | Which recipes are in the paid collection (exact list) |
| C02 | Whether the 3 free recipes count as part of it |
| C03 | Price and currency |
| C04 | Seller identity, which countries you sell to, and tax |
| C05 | Refund policy: who can get one, within how long, how to ask |
| C06 | What happens to access after a partial refund |
| C07 | Access while a refund or card dispute is pending |
| C08 | Whether future recipes are included or sold separately |
| C09 | How long buyers keep access, and what happens if the site closes |
| C10 | Support address and response time for buyers |
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
| R3-06 | Screen reader check | On your iPhone: Settings → Accessibility → VoiceOver on. Visit Home, a recipe page and sign-in. Note anything confusing |
| R1-09 | Content register sign-off | Tick the checklist in `docs/implementation/phase-1/CONTENT-REGISTER.md` (or tell the assistant "approved") |
| R5-03, R5-04 | Recipe checklist and alt text | Only if you want a human sign-off beyond the AI review: `docs/implementation/phase-5/FREE-RECIPE-REVIEW.md` |

---

## D. Ongoing

- **About 2026-10-27, 30-day recipe review (R12-02)**: in PostHog, look at the last 30 days: visitors and campaigns (Web analytics), recipe opens, saves and prints by recipe (Trends), the Home → recipes → recipe → print funnel, and 10 recordings of visits that opened a recipe but didn't print. Share the numbers with the assistant to decide what to improve next (Phase 12).

- **Backups**: glance at `~/MyCuratedHavenBackups/backup.log` weekly. You should see a `done:` line each day your Mac was on.
- **Production checks**: GitHub emails you if the hourly production smoke check fails. If you get one, tell the assistant.
- **Account deletion requests**: follow `ops/ACCOUNT-CLOSURE.md`.
