# Measurement and experiments

## Decision before instrumentation

Name the user outcome, primary measure, denominator, observation window and decision rule before enrolment. The planner hypothesis is: parents with an observed planning problem use a private weekly recipe list repeatedly without reducing recipe access reliability or creating excessive support work.

Do not claim the planner improves nutrition, reduces food waste or saves time without measuring the relevant outcome. A recipe selected in a plan is not a meal cooked. A returned session is not proof of usefulness.

## Proposed event additions

Extend the Phase 9 schema, sanitizer, client/provider pipeline and consent tests together. Existing allowlists will not automatically accept new event names. Unknown properties remain rejected. Use the approved feature key/version, never arbitrary feature labels from query strings.

| Event | Allowed proposed properties | Meaning |
| --- | --- | --- |
| `feature_pilot_view` | feature key, feature version, coarse device class | Eligible consenting participant opened the pilot |
| `plan_write_succeeded` | feature version, action enum, entry-count bucket | Server confirmed create/assign/remove/delete |
| `plan_returned` | feature version, elapsed-day bucket | Later-day visit to an existing plan |
| `plan_print_requested` | feature version, entry-count bucket | Browser print action requested |
| `pilot_feedback_submitted` | feature version, structured rating bucket | Optional feedback response, no free text |

Do not send plan IDs, week dates, child identifiers, account email, search text, recipe combinations or notes to an analytics provider. Reuse the Phase 9 pseudonymous subject contract only after reviewing consent and linkage. Research text belongs in restricted research records, not event properties.

Operational records such as successful mutations, errors and eligibility changes have a separate purpose and minimised retention. Do not use security logs as a covert behavioural analytics stream after a user declines consent. Report all-enrolled administrative counts separately from consented behavioural counts.

## Metrics

| Metric | Definition | Caveat |
| --- | --- | --- |
| Enrolment | Verified adult accounts enrolled during the window | An invite is not enrolment or activation |
| Activation | Consented enrolled users who persist selections on at least 3 distinct days within 7 days of enrolment, divided by consented enrolled users with a complete 7-day observation window | Proposed threshold, no cooking inference |
| Repeat use | Activated consented users with a later meaningful action on a different day, 7–14 days after activation, divided by activated consented users with the full 14-day window | Browser/consent loss produces incomplete coverage |
| Task completion | Participants completing the predeclared choose-save-return task without facilitator intervention, divided by participants attempting | Moderated sample is not population conversion |
| Reliability | Committed valid mutation outcomes divided by valid authenticated mutation attempts, with conflicts/retries separately counted | Deduplicate request UUIDs, do not count expected denials as service failures |
| Support load | Pilot-related cases and handling minutes per enrolled account | At low volume show raw counts and minutes |
| Incremental cost | Attributable hosting/DB/support cost over a comparable baseline | Shared fixed costs and missing attribution need disclosure |
| Recipe guardrail | Existing access/payment failures, print regression and support incidents | A private tool must not damage the acquisition or purchased experience |

Always display numerator/denominator, missing data, mature cohort count, dates and feature version. Compare like-for-like recipe access groups. Nonbuyers with only three available recipes differ from buyers with a larger collection.

## Proposed pilot decision thresholds

These are decision proposals, not observed results or automatic production rules. Approve them in D12-05 before seeing pilot outcomes.

- Recruit 15–25 opted-in adult accounts with the validated problem. Run for 28 days after the first real enrolment, extending only with an explicit decision.
- Usability floor: at least 4 of 5 representative participants complete the core task without intervention after critical issues are fixed. Include a phone and keyboard/screen-reader review.
- Behavioural review floor: at least 15 consented enrolled users with mature activation windows and at least 10 activated users with mature repeat-use windows. If consent coverage prevents this floor, report inconclusive and use separately approved qualitative evidence without fabricating behavioural rates.
- Proposed usefulness targets: at least 60% activation and at least 40% repeat use among the defined mature groups. Show raw counts and uncertainty. These thresholds do not prove statistical lift.
- Safety/reliability guardrails: zero confirmed cross-user exposure, zero incorrect recipe grants, zero unreconciled loss of plan writes, and no unresolved critical recipe/payment regression.
- Operational targets: no more than 2 hours of incremental support per week and costs within D12-09. A single severe incident overrides good adoption.

If the minimum mature denominators are not reached, choose extend within budget, revise the question or hold. Do not lower thresholds after results arrive without recording a new experiment version and preserving the original result.

## Experiment design

Start with a single invited cohort and before/after task evidence. Avoid presenting a small convenience sample as a randomised experiment. Keep price, offer membership and major homepage changes stable while evaluating the pilot where feasible. Log concurrent changes and campaign traffic shifts.

If later traffic supports an A/B test, define sample-size assumptions, randomisation unit, exposure logging, duration, exclusions and stopping rule before assignment. Account-level assignment should stay stable across devices. Do not stop early because a daily chart looks positive. Sample-size planning follows the observed baseline, not the number of Instagram followers.

Report exploratory analysis separately from the predeclared primary result. Keep feedback from people declining analytics in the qualitative research stream with their permission. Analytics consent must not be a requirement for using the feature.

## Instagram boundary

Keep Tiny Soho campaign identifiers and aggregate snapshots in the existing Phase 9 attribution design. Do not copy follower records, direct messages or child content into the product database. Instagram saves and reach are context, not the denominator for web activation. Missing campaign tags remain unknown.

## Review cadence

During the first two staffed days, review errors and access failures daily. Review usability/support themes after week 1. Review mature activation weekly, then repeat use after full windows mature. At day 28 or the approved end date, issue one continue/revise/retire/hold decision with limitations and next ownership. Do not silently turn a pilot into permanent availability.
