# Support operations

## Support promise and staffing

The site currently lists `support@mycuratedhaven.com`. Verify the mailbox, owner, backup and reply routing before invitations. A working link does not prove someone receives or answers mail.

Propose acknowledgement within one staffed business day for ordinary cases, with payment/access problems escalated during the launch window. Approve the exact hours and wording before publication. Automated acknowledgement is not resolution.

Support material should explain how to sign in, find the purchased collection, print, request help and understand approved refund terms. Avoid infrastructure language in customer-facing steps.

## Case record

Use a restricted case system or controlled register with case ID, category, verified account reference, order reference where needed, reported time, severity, owner, next response, actions and resolution. Keep customer email/content out of the public repository and public issue tracker.

Collect only what resolves the case. Never ask for a password, OTP, full card number, payment secret, child health record or complete browser storage dump. Redact screenshots before sharing internally beyond the responsible operators.

## Triage playbooks

| Case | Verification | Resolution path |
| --- | --- | --- |
| Paid but collection missing | Verified sign-in identity, canonical payment, ledger order and effective rights | Trigger safe reconciliation, repair proven failed transition, explain pending status. Never request another payment |
| Used another email/account | Confirm both ownership claims through approved identity flow | Apply approved account-recovery/link policy. Never transfer a purchase solely from a typed email or forwarded receipt |
| Sign-in code missing/expired | Sender health, rate limit, redacted delivery status and correct address | Safe resend/recovery, no support request for the code itself |
| Suspected duplicate charge | Retrieve each genuine provider payment, distinguish auth hold/pending from captured payment | Escalate verified duplicate under approved refund policy, preserve valid remaining right |
| Refund request | Order, amount/currency, request reason and approved eligibility | Authorised provider workflow, pending/succeeded status tracked, accurate source-based access update |
| Partial refund/dispute | Canonical adjustment/dispute state and policy | Commerce owner decides, recompute affected source without revoking unrelated rights |
| Print problem | Recipe slug/revision, device/browser and non-sensitive screenshot | Provide browser-specific approved steps, fix layout, no unsecured paid PDF workaround |
| Recipe accuracy/safety concern | Exact recipe/revision and reported issue | Escalate editorial, withdraw affected content if warranted, preserve history and approved customer remedy |
| Account/data deletion | Verified identity and approved retention policy | Separate auth/access lifecycle from required financial retention, suppress optional export, document completion |

Support operators should see the state they need without broad database administration. Readonly lookup is the default. Refund, grant, merge-account and deletion actions require their specific authority and audit trail.

## Access recovery rules

Use the existing verified UUID as the owner. Do not create a second parenting identity to fix web sign-in. Before a support grant, inspect current purchase/native/support sources and rule out a pending reconciliation.

If a legitimate support grant is approved, record grant source, release, reason, actor, validity and linked case. Recompute the entitlement projection through the trusted path. Never issue a generic “premium forever” flag or promise all future features.

Refund status and access status remain separate. A pending refund is not a completed refund. A revoked entitlement does not move money. Confirm provider result before saying a refund was issued, and use provider-approved timing language without guaranteeing bank settlement.

## Draft response patterns

These are internal starting points, not messages to send during planning. Final wording must match the verified case and approved policy.

- **Access pending:** “Your payment is confirmed. Access to your collection is still processing. Please do not purchase again. We’re checking your order and will update you through this support thread.” Use only after payment confirmation.
- **Identity check:** “Please sign in using the email address linked to your purchase. If you used another address, reply here so we can guide you through account recovery. Please do not send a sign-in code or card details.”
- **Unverified payment:** “We’re checking the payment status for your order. Please avoid starting another purchase while we review the existing attempt.” Do not call the payment successful yet.
- **Recipe correction:** “We’ve temporarily withdrawn [recipe] while we review [verified issue]. Your other available recipes are unchanged. We’ll share the reviewed update and any applicable next steps.”

Remove placeholders and unverified claims before sending. Route mass customer notifications through the approved incident/content communication process.

## Daily support handoff

At each staffed handoff, list unresolved access/payment cases, waiting provider actions, promised next responses, repeated recipe issues and incidents. Assign a next owner/time. Escalate patterns to product weekly using anonymised counts, not customer transcripts.

Track acknowledgement time, resolution time, reopened cases and category volume. Do not present fast automated replies as fast resolution. Use the oldest unresolved critical case as a capacity signal before expanding the cohort.
