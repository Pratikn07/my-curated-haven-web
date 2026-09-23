# Operations, environments and rollout

## Environment matrix

| Environment | Product data | Stripe | Email | Public sales |
| --- | --- | --- | --- | --- |
| Local | Local Supabase with synthetic fixtures | Sandbox/test mode only | Local capture or designated inboxes | Disabled |
| CI | Disposable local database | Signed fixtures and mocked transport by default | Captured, never customer delivery | Disabled |
| Protected preview/staging | Isolated verified staging project | Dedicated sandbox/test configuration | Designated test inboxes | Protected test journeys only |
| Production | Verified parenting/product project | Approved live account/Price | Approved transactional sender | Enable only after release gates |

Use separate secrets, origins, database references, buckets where needed and webhook destinations. Never copy production customer data into a preview to test payment. Do not assume a Vercel preview inherits safe credentials. Verify actual environment scoping.

Pin server SDK and API/event versions, commit lockfiles and record the tested Node/runtime versions. Read current Supabase CLI help/changelog before database operations. Migrations follow the existing repository workflow. No manually invented migration timestamp or unrecorded production SQL patch.

## Required configuration inventory

Record key names and secret-store locations, never values. Capture provider account ID/mode, Product/Price references, commercial offer version, product/staging Supabase references, approved app origin, webhook endpoint version/event list, worker transport, monitoring owner and support address.

Verify the dedicated commerce role has the required private-schema access and no unnecessary profile/content access. Rotate credentials through a tested sequence. If rotating webhook signing secrets, support the provider's safe overlap procedure and validate new delivery before retiring the previous secret.

## Independent switches

| Switch/control | Stops | Continues |
| --- | --- | --- |
| New checkout disabled | New Sessions and replacement attempts | Existing Session reconciliation, payment verification, grants and owned reading |
| Specific offer disabled | New sale for the affected offer | Valid historical orders and their access |
| Optional analytics disabled | Browser capture and optional exports | Full payment ledger and operational recovery |
| Content withdrawal | Reading/printing affected recipe | Purchase history, unaffected recipes and support resolution |
| Worker maintenance | Controlled processing pause | Durable webhook inbox receipt, with backlog alert |

Worker maintenance is not a normal sales rollback. Do not leave valid payments unprocessed while the public sales button remains active. No single feature flag should disable webhooks, refunds and owned-library access together.

## Reconciliation jobs

| Job | Proposed cadence | Required checks |
| --- | --- | --- |
| Inbox worker | Every minute, or durable queue equivalent | Due events, abandoned leases, bounded retries and dead-letter count |
| Pending purchase recovery | Every five minutes | Creation-unknown attempts, processing payments, paid orders without access |
| Recent payment/adjustment comparison | Daily with a seven-day overlap | Provider Sessions/payments, unique orders, refunds/disputes and access projections |
| Older open cases | Daily until resolved | Long-running disputes/refunds, historical manual changes and unresolved exceptions |
| Access validity boundaries | At source boundary plus periodic sweep | Future starts, finite-term expiry and eligible-source changes |
| Configuration/manifest readiness | At release and daily | Price/mode drift, webhook/worker health, free slot count and approved manifest integrity |

Cadences are engineering starting targets. Verify hosting schedule/runtime support before committing to them. Store durable cursors/watermarks and successful-run timestamps. Bounded overlap prevents missed late changes. Do not rely exclusively on a seven-day window for an older open dispute or refund.

Reconciliation reads provider state with pagination and checkpoints. Repair through the same fulfilment service. No second entitlement writer. A partial provider outage marks the run incomplete, retains its prior successful watermark and raises an alert. Missing records in a failed/partial scan are not evidence of deletion.

## Monitoring and alert ownership

| Signal | Initial action |
| --- | --- |
| Verified paid order without active access for over five minutes | Urgent operator review and replay, consider pausing new checkout |
| Oldest ready inbox item over five minutes | Check worker, DB lease and provider health |
| Signature errors after secret/configuration change | Verify endpoint/environment mapping without logging secrets |
| Growing creation-unknown attempts | Pause new attempt creation if unresolved outcomes threaten duplicates |
| Price/owner/mode binding mismatch | Hold affected order and disable affected offer |
| New dead-letter event | Named operator investigates and records disposition |
| Provider/ledger amount or count mismatch | Reconcile common time/currency/account scope, resolve each mismatch |
| Repeated access-email failures | Repair messaging independently, retain account access |
| Protected body/asset exposed publicly | Close the access path and pause affected sales immediately |

Five minutes is an initial internal target, not an advertised service guarantee. Tune after staging evidence. Operational alerts use the existing approved monitoring destination. This documentation does not send or schedule messages.

Show captured/refunded amounts by currency, outstanding adjustments, paid/access-pending count, reconciliation age and unresolved cases. Never equate provider balance or payout amount with gross sales. Link records using restricted operator tooling, not public dashboard URLs.

## Incident playbooks

**Customer paid, access missing:** locate the owned order, retrieve canonical provider facts, inspect inbox/projection failure and replay the shared service. Confirm the entitlement and customer-facing library. Do not generate another payment link.

**Provider API unavailable:** stop creating replacement attempts whose state is unknown. Persist signed webhook receipt when possible. Serve existing authorised recipes. Retry provider reads through durable work and show pending status honestly.

**Database unavailable:** new checkout fails closed. Webhook receipt returns retryable failure if durable storage is unavailable. Do not acknowledge success into process memory. Restore DB, process provider retries and run an overlap reconciliation.

**Worker unavailable:** accept events into the durable inbox while alerting backlog. Pause new sales if fulfilment target is missed. Restart worker, reclaim expired leases and verify semantic deduplication before clearing the incident.

**Duplicate charge:** keep both provider records, one user/release projection and a support case. Verify both payments before an authorised refund. Recompute access from the remaining valid source.

**Faulty commercial offer:** disable that offer. Inspect open Sessions and expire affected unpaid Sessions under the documented race-safe flow. Resolve already paid orders under the approved support policy. Do not delete their historical snapshots.

**Credential leak:** disable/rotate the compromised credential through the owner-controlled provider, preserve working verification during a safe transition and inspect affected actions. Do not expose the value in an incident document.

## Expand and contract migration sequence

1. Back up the verified target using the existing approved backup mechanism and confirm a tested restore path. Record the baseline migration list.
2. Apply additive private ledger/provenance objects and restricted grants first. Existing reading continues.
3. Backfill verified legacy access-source records, compare projections and leave unexplained rows for review.
4. Coordinate native-compatible access hardening and release freeze guards. Run the full direct-access matrix before publishing paid recipes.
5. Deploy disabled payment code, then configure sandbox endpoints/worker and test the integrated flow.
6. Apply approved live offer mapping only after commercial and validation gates close.
7. Enable controlled sales with monitoring and operator coverage, then expand after the observation window.

Do not rerun the broad Phase 5 ingestion against production as a Phase 8 shortcut. It updates publication/content fields and needs a separate reviewed data-change procedure. Use targeted release preparation from the existing records.

## Live go/no-go checklist

- C01–C14 approved and the collection promise matches the provider configuration.
- Exactly three complete free recipes read and print anonymously.
- Existing native rights and identities verified and preserved.
- Paid manifest frozen, content review complete and alternate public body paths closed.
- Phase 7 sign-in, recovery, current-account checks and email delivery pass.
- Sandbox purchase, no-return fulfilment, delayed event, duplicate event, full/partial refund and repurchase cases pass.
- Secret/mode separation, owner-only status, no-store cache checks and private database grants pass.
- Worker and reconciliation jobs run on the actual hosting plan with named operators.
- Backlog/mismatch alerts and support/refund procedures are rehearsed.
- Receipt identity, support route, terms/privacy wording and access policy are correct.
- Required CI checks pass for the exact release SHA, with manual mobile coverage recorded.
- Rollback preserves existing payments and customer access.

A real live smoke charge or refund needs explicit owner authorisation at execution. The plan's PR merge does not approve money movement. Before such a request, complete sandbox verification and provide the exact amount, account, action and expected reversal for review.

## Rollback

Disable new checkout and affected offers first. Keep webhook receipt, worker, reconciliation, refund/dispute processing and owned reading available. Expire open unpaid Sessions only when necessary and through verified provider state. Honour legitimate completed purchases.

Prefer reverting application behaviour while retaining additive financial tables. Do not drop order, inbox, source or audit records. Do not roll back access hardening by reintroducing public paid-content reads. Schema/data rollback needs a specific reviewed recovery procedure and reconciliation after restore.

Final evidence names the release SHA, migration versions, provider versions, deployment URL, source project references, test outcomes, support owner, unresolved items and disable-switch location. Do not include secrets or raw customer exports.
