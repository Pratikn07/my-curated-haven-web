# Phase 3 owner rehearsal and release packet

The owner walks through every support decision on the owned local stack with synthetic data before anything is switched on in production. Nothing here touches a real customer, a live Stripe account or production email. Results go in the "Outcome" column; a blank row is not a pass.

Candidate: branch `codex/admin-support-phase-three`, commit recorded at the start of the session: `__________`.

## Before you start

1. Start the owned stack (never the default 54321/54322 one) and load its keys into your shell without printing them:

   ```bash
   supabase start --workdir .superpowers/sdd/2026-10-09-admin-support/local
   ```

   ```bash
   eval "$(supabase status --workdir .superpowers/sdd/2026-10-09-admin-support/local -o env)"
   ```

2. Run the app against it (from `my-curated-haven-web`) with the local verifier and the local payment records standing in for Stripe: set `NEXT_PUBLIC_SUPABASE_URL`, the anon and service keys from step 1, `SUPPORT_VERIFIER_DATABASE_URL` to the owned database on port 54362, and `SUPPORT_PROVIDER_FIXTURE=local-ledger`. Leave `VERCEL_ENV` unset. Build and start on port 3060.
3. Open `http://127.0.0.1:3060/sign-in`, sign in once with your own email (the code arrives in the stack's local mail at port 54364), and set up your authenticator when the admin asks.
4. Seed the scenarios. This makes your local account the owner and switches support on, in the local database only:

   ```bash
   node scripts/admin-support-rehearsal-seed.mjs --workdir .superpowers/sdd/2026-10-09-admin-support/local --owner-email you@example.com
   ```

   It prints four support references, `MCH-R…1` to `MCH-R…4`. Write them here: 1 `______` 2 `______` 3 `______` 4 `______`.
5. To rehearse a lost answer, create an empty marker file just before the click (the next matching step consumes it):

   ```bash
   mkdir -p "$TMPDIR/mch-support-test-faults" && touch "$TMPDIR/mch-support-test-faults/lose-next-commit"
   ```

   Other markers: `refund-timeout-after-acceptance`, `refund-rejected`, `notice-timeout-after-acceptance`, `notice-rejected`. Emails "sent" locally appear as files in `$TMPDIR/mch-support-test-mail`.

## Walkthrough

| # | Do | You should see | Outcome |
| --- | --- | --- | --- |
| 1 | Support → search by the customer email of order 1 (`rehearsal-…-locked@synthetic.test`), typed with capitals and spaces; then by reference `MCH-R…1` | One customer, one order; the email never appears in the address bar | |
| 2 | Open order 1 | Seven separate states: checkout, payment (paid $15.00), refunds, disputes, purchase sources, access ("No access"), account. Terms at purchase, policy `rehearsal-v1` | |
| 3 | Check provider status, then Repair → "Reconcile the purchase with Stripe" with a reason → Prepare | Preview: this purchase "No purchase source → Eligible", access "No access → Has access", email "None" | |
| 4 | Touch `lose-next-commit`, then Approve and apply repair | "Result not known yet"; no second apply button. Check operation result → "Applied"; access now "Has access" | |
| 5 | Order 2: Check Stripe before a refund → Part of it `4.00` → reasons → Prepare | Fixed $4.00 USD; paid $15.00, already refunded $0.00, still refundable $15.00; access stays | |
| 6 | Approve and submit refund of $4.00 (try a double click) | "Sent to Stripe: $4.00. Stripe reports the refund succeeded. Access has been updated." One refund only | |
| 7 | Order 2 again: everything still refundable, touch `refund-timeout-after-acceptance`, Approve and submit | "Outcome unknown", no way to prepare another; "Ask Stripe what happened" → "Sent to Stripe: $11.00" and access removed | |
| 8 | Order 3: full refund | Preview says this purchase becomes not eligible but access stays "through another purchase or grant"; after sending, access is still "Has access" | |
| 9 | Prepare a refund on order 3 or 4 and wait six minutes before approving | The proposal expires; nothing can be approved or sent | |
| 10 | Switch sending off: `UPDATE private.support_workspace_settings SET refund_submission_enabled = false WHERE singleton;` | Approve and submit is disabled with a reason; earlier refunds still show; Check refund status still works. Switch it back on after | |
| 11 | Order 4: check provider status | Disputes: "Dispute (needs response; respond in Stripe by …)"; Home → Customer support lists it first with the deadline | |
| 12 | Order 4: Repair → reconcile → prepare and apply | Preview "Removes access" (this purchase Eligible → Not eligible); after applying, access is paused while the dispute is open. A repair can never restore access during an open dispute | |
| 13 | Order 4: Dispute notice → Prepare notice → read the preview | Exact recipient, subject and text; "Respond in Stripe by"; customer access wording matches the order | |
| 14 | Approve and send notice | "Accepted. Email accepted by the provider. Delivery is not confirmed." The file in `$TMPDIR/mch-support-test-mail` has exactly the previewed text. Preparing another for the same dispute is blocked | |
| 15 | Team: give a test account the Support role, sign in as it in a private window, then revoke the role | The member reads support; after revocation the next page load is refused. They never see Refund or Dispute notice | |
| 16 | Home | Customer support lane and "Your recent support outcomes" (repair, refunds, notice) with support references only, no amounts or emails | |
| 17 | Explain back | Which facts come from Stripe ("Stripe last confirmed …") and which from our records; which buttons change access (apply repair, a sent refund) and which never do (checks, previews, notices) | |

Owner sign-off: ______________________ Date: __________

## What this rehearsal cannot prove (open gates)

- **Real Stripe test mode.** The local payment records stand in for Stripe. Refunds against Stripe itself need a test-mode order paid through checkout and a restricted test key (`STRIPE_REFUND_SECRET_KEY=rk_test_…`) that you create; then repeat steps 5–8 once.
- **Real email.** Notices are written to a file locally. A controlled-recipient send through SES needs a verified sender and region (`SUPPORT_NOTICE_FROM`, `SUPPORT_NOTICE_REPLY_TO`, `SUPPORT_NOTICE_SES_REGION`) and an address you control.
- **Wrong Stripe account or mode, forged evidence.** Proven in database suites 74, 75, 82 and 83; the admin has no way to enter them by hand, so they are not part of this walkthrough.

## Release packet

| Item | Value |
| --- | --- |
| Migrations | `20261009010100` … `20261009011600` (16 files) and `20261009220000_admin_home_support_results`, all additive, applied in order after `20261008001300` |
| Before applying `010600` | Run the read-only binding check in `ops/ADMIN-SUPPORT.md` ("Payment reconciliation"); a refund or dispute recorded against another order's payment stops the migration and must be corrected first |
| Stages after deploy | Support `disabled`; `refund_submission_enabled = false`; `dispute_notice_enabled = false`; no retention periods; no notice support address |
| Roles | Owner holds every support right; `support_viewer`, `support_operator` assigned by the owner on Team; agents only through registered operator logins (repairs only) |
| Policy | No approved access policy yet: approve the `v1` mapping (`POLICY-MATRIX.md`) before diagnosis can judge orders |
| Verifier | One registered verifier login (`SUPPORT_VERIFIER_DATABASE_URL`), never the app's normal database user; registration by the owner (`private.commerce_verifier_register`) |
| Stripe | API version `2025-02-24.acacia`; webhook events per `ops/ADMIN-SUPPORT.md`; restricted refund key per "Refund safety rules"; check the Stripe refund email setting |
| Email | SES verified sender, region and least-privilege identity; a controlled-recipient receipt before `dispute_notice_enabled` |
| Kill switches | Support stage (`admin_support_set_stage`), `refund_submission_enabled`, `dispute_notice_enabled`, each independent; switching off keeps answers, recovery and history |
| Refund retry deadline | None automatic: an unknown refund is only read back; escalate after 23 hours |
| Backup and recovery | Back up before migrating; schema rollback does not undo money or email; correct access only through a new approved repair |
| Read-only production checks after deploy | Migration count and latest version; support stage and both switches off; no rows in refund or notice tables; `admin_support_readiness` lists what diagnosis still needs |
| Stop if | The binding check reports a conflict; a migration fails; any switch is on after deploy; the verifier login is the app's user; an unknown refund or notice appears without an operator having sent one |

Enable in this order, each only on your explicit go-ahead: inspection → diagnosis (after policy and verifier) → repair (after this rehearsal and review) → refund sending (after the Stripe test-mode run) → notice sending (after the controlled-recipient email).
