# Tiny Soho attribution and separate Instagram reporting

## Campaign links

Create a versioned campaign registry, initially a small reviewed configuration file. Each entry maps a neutral campaign code to a Tiny Soho post or placement, target route and publication date. Never include a follower handle, child's name or customer identifier in a campaign code.

Example proposed link:

```text
https://mycuratedhaven.com/recipes?utm_source=instagram&utm_medium=organic_social&utm_campaign=toddler_recipes_launch&utm_content=reel_001
```

Only emit links to implemented routes. Keep `utm_source`, `utm_medium`, `utm_campaign` and `utm_content` allowlisted against the registry. Ignore unknown values rather than passing arbitrary text into analytics. Drop `utm_term`, advertising click IDs and unrelated query parameters. Cap each accepted value at 64 characters. The server independently validates all submitted attribution.

## Attribution rule for launch

Use the first registered external campaign observed in the current consented session. Internal navigation does not replace it. Keep it through sign-in in the same browser session, without putting tokens or emails in URLs. A server-created checkout attempt snapshots the validated campaign and anonymous session association, if consent allows. Stripe redirects must not overwrite the original campaign.

This is a session attribution rule, not a 30-day marketing attribution model. A later untagged return, a copied link or a different device might remain unattributed. Report `registered_campaign`, `external_referral` or `unknown/direct` as distinct categories. A sanitised referrer-host category is weaker evidence than a registered campaign. Never infer Instagram solely because the visitor resembles an existing follower.

The funnel permits payment confirmation within seven days of the linked checkout attempt. This does not extend browser tracking beyond the consented session. Keep the original event time when delayed payment arrives, and label recent cohorts provisional.

## Instagram database access

First verify the separate project reference, source table names, metric definitions, account ownership, timestamps, refresh schedule and available history. This planning package does not claim a live Instagram audit or invent its schema.

Initial integration should be a read-only aggregate export to the private reporting workflow. Minimum approved columns:

| Field | Purpose |
| --- | --- |
| Source post ID and registered campaign code | Associate a published placement with its campaign |
| Reporting date and source timezone | Align daily reporting windows |
| Metric name, value and unit | Preserve distinctions between reach, views and clicks |
| Window start/end or cumulative-as-of time | Prevent summing overlapping snapshots |
| Source refreshed-at timestamp | Make stale data visible |

Do not export follower records, comments, direct messages, access tokens or personal handles. Retain only post-level aggregates needed for the product question. An absent source metric is unavailable, not zero.

If automating later, use a restricted reporting connection outside the public website request path. No schema changes or writes to the Instagram automation project are needed. Scheduled reads use bounded date windows, retry limits and a last-success timestamp. Verify credentials through the connector or deployment secret store, never a committed file or a chat transcript.

For lifetime snapshot metrics, display the latest snapshot per post and timestamp. Do not sum daily snapshots. For interval metrics, sum only disjoint compatible intervals. Distinct reach across several posts is not additive without source-supported deduplication. A change in a lifetime counter is labelled a counter delta, not automatically new daily reach.

## What the combined report means

Place post reach, registered-link observations, consented recipe sessions and attributed paid orders beside each other. Join only on the registered campaign code and compatible dates. Do not join Instagram people to app users.

Instagram clicks, website sessions and confirmed orders have different observation rules. In-app browsers, lost tags, consent declines and blockers create gaps. A post's reach does not provide a valid website conversion denominator. The report should say “observed paid orders attributed to this campaign,” not “all sales caused by this reel.”

Acceptance: a test campaign follows its expected journey on mobile, unknown tags are discarded, cumulative social metrics are not double counted, and a failed Instagram refresh never disrupts recipe browsing or payment.
