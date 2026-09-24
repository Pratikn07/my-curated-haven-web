# Measurement and learning

## Main questions

Do visitors understand My Curated Haven's broader purpose? Do they distinguish available recipes from previews? Do they still reach recipes easily? Which previews attract further attention?

The first three are release-quality questions. The last is exploratory. Clicking a preview does not prove demand, willingness to pay or feature retention.

## Baseline and comprehension

Before changing the homepage, record the source/deployment version, current recipe availability, mobile layout and existing consented home-to-recipe funnel. If there is too little traffic or the current page is a preparation page, mark comparison limited. Do not imply a conversion lift from incomparable release states.

Conduct the five-person comprehension review described in [page structure](PAGE-STRUCTURE.md). Use adult target users and synthetic previews. Ask them to identify what works now, what is planned, what a purchase includes and how to reach a free recipe. Record actual answers and misunderstandings without private family details.

## Optional event additions within the existing pipeline

| Event | Allowed properties | Trigger |
| --- | --- | --- |
| `homepage_cta_clicked` | placement enum, destination enum, presentation state, content version | User follows a real homepage action |
| `homepage_preview_opened` | feature key enum, placement enum, content version | User follows a preview anchor from the overview/navigation |
| `homepage_preview_viewed` | feature key enum, content version | At least half the section visible for at least one second, once per page view |

Suggested destination enum: recipes_index, recipe_detail, collection_detail, previews, about, support. Do not capture raw destination URLs, arbitrary hash strings or user text. Feature key is chat/shop/bloom. Placement is hero/overview/preview/footer/final. If tracking direct recipe-card clicks needs recipe identity, use the existing approved recipe event contract rather than adding unrestricted values.

Add events through `events.ts`, schema property allowlists, sanitization and provider mapping together. Schema/version changes need backward-compatible validation. Respect existing consent on every event. No new cookie, fingerprint, signup, database table or analytics provider.

The page and anchor navigation work fully without analytics. Event errors must never delay recipe navigation. No optional events before consent, after revocation or through hidden operational logging. Do not queue pre-consent interaction histories for later export.

## Definitions and limitations

| Measure | Definition | Limit |
| --- | --- | --- |
| Home-to-recipe action | Consented homepage views with a recipe action divided by consented homepage views in the same presentation state/window | Click is not recipe completion or cooking |
| Preview interest | Consented page views with a preview-anchor action, reported by feature | Measures curiosity, not signup or purchase intent |
| Preview exposure | Consented page views meeting the visible-section rule | Scroll exposure is not comprehension |
| Collection handoff | Consented homepage views with the approved collection link followed | Purchase conversion remains Phase 9's canonical metric |
| Comprehension | Testers correctly identify availability and purchase scope | Small qualitative sample, not a population estimate |
| Recipe guardrail | Existing recipe access errors and home-to-recipe task completion | Acquisition/campaign changes affect comparisons |

Show raw counts, dates, presentation/content versions, consent coverage where known and missing data. Do not report all-site behaviour from the consenting subset. Keep paid-order operational totals separate from homepage click events.

Avoid announcing a winning preview at low volume. Review initial feedback after seven days and aggregate interaction patterns after 14 days if enough traffic exists. Sparse data means inconclusive. No automatic build priority, feature release or customer messaging follows from these events.

## Interest collection boundary

The earlier brainstorm included an optional “I'm interested” action. The base implementation excludes a vote, waitlist or contact form to keep this a presentation effort. Never show an action with a success message unless a real, specified process exists.

If a later request selects interest collection, create a scoped addendum covering whether the action is anonymous preference or opt-in contact, storage, abuse controls, duplicate handling, consent wording, retention, export/deletion and sender ownership. Clicking interest must not authorise marketing email automatically. Keep any feature selection separate from recipe purchasing.

## Follow-up decisions

Content owner reviews recurring questions about availability first. If visitors think Chat is live, improve labels and placement before adding more promotional detail. If previews obscure recipe actions, shorten their overview and preserve the detailed sections below. If a preview receives attention, feed the finding into later product research with its limitations.

This effort succeeds through clarity and usable recipe entry, even if no future feature is selected immediately.
