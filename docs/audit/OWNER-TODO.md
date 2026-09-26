# Owner to-do list

Everything only you (the owner) can do, collected from the 2026-09-25/26 audit. Each item says why it matters, the steps, and how we'll know it's done. IDs match [AUDIT-BACKLOG.md](AUDIT-BACKLOG.md), where the evidence lives.

When you finish an item, tell the assistant the ID. It will do its part, verify, and tick the item here.

Last updated: 2026-09-26, after Phase 9.

---

## A. Before you promote the site

### A1. Custom email sender for sign-in codes (M1-03)

- **Why**: Supabase's built-in sender allows **2 sign-in emails per hour for the whole site**. The third visitor that hour gets no code. Its mail also lands in spam more often.
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

### A3. Confirm a sign-in email arrives (R7-03)

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

### A10. Analytics: switch on or hide the banner (R9-01)

- **Now**: the cookie banner asks visitors to accept analytics, but analytics isn't set up, so accepting does nothing.
- **Choose one**:
  1. **Set it up**: create a free PostHog account (EU or US region), then send the assistant the project key and region. It adds them to Vercel and checks that nothing is sent before consent.
  2. **Hide the banner until later**: tell the assistant. Nothing is tracked either way.

### A11. Register your real Instagram campaigns (R9-04)

- Only links whose campaign name is on the site's list are counted. The list still has placeholders like `sample_reel_001`.
- Send the assistant the names you'll use (for example `bio_link`, `reel_first_recipe`). It updates the list and gives you ready-made links.

---

## B. Before you sell anything

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

### B3. Test purchase and refund (Phase 10)

- In Stripe **test mode**, on the staging copy: buy the collection with a test card, check the recipes unlock, refund, and check access is removed. Only then switch on sales (`CHECKOUT_ENABLED=true`).

### B4. Fix the draft recipes you'll sell (R5-11)

- The AI review rejected 34 drafts and flagged 18 images. Pick the collection (C01) first; the assistant or the other AI then applies the review fixes to those recipes only.

---

## C. Quick checks, any time

| ID | What | How |
| --- | --- | --- |
| R3-07 | Approve the design | Compare `docs/implementation/phase-3/evidence/audit-2026-09-25/before-home-390.png` and `after-home-390.png`. Reply "approved" or say what to change |
| R3-06 | Screen reader check | On your iPhone: Settings → Accessibility → VoiceOver on. Visit Home, a recipe page, sign-in and the cookie dialog. Note anything confusing |
| R1-09 | Content register sign-off | Tick the checklist in `docs/implementation/phase-1/CONTENT-REGISTER.md` (or tell the assistant "approved") |
| R5-03, R5-04 | Recipe checklist and alt text | Only if you want a human sign-off beyond the AI review: `docs/implementation/phase-5/FREE-RECIPE-REVIEW.md` |

---

## D. Ongoing

- **Backups**: glance at `~/MyCuratedHavenBackups/backup.log` weekly. You should see a `done:` line each day your Mac was on.
- **Production checks**: GitHub emails you if the hourly production smoke check fails. If you get one, tell the assistant.
- **Account deletion requests**: follow `ops/ACCOUNT-CLOSURE.md`.
