# Release and implementation handoff

## Starting state

This separate effort defines 18 implementation tasks and 64 acceptance scenarios. The plan PR was documentation-only; a later implementation candidate adds the homepage and static previews while retaining the preparation state. See [the implementation release record](evidence/homepage-vision-implementation-v1/RELEASE-RECORD.md) for its PR, merge and deployment evidence. No database, payment setting or customer communication change is part of this effort.

Keep this package under `docs/implementation/homepage-vision/`. Do not call the effort Phase 13 or fold the tasks into Phase 12. Later product features require their own implementation scope. This work provides an informational introduction to those features.

## Proposed implementation PRs

The sequence below was the original review proposal. The first implementation grouped the coherent content, composition, metadata, measurement and automated validation changes into one review; manual release gates remain separately recorded.

| PR | Tasks | Review focus |
| --- | --- | --- |
| 1. Content and visual contract | HV-01–HV-06 | Current deployment, recipe state, copy, wireframes, approved assets and typed configuration |
| 2. Homepage composition | HV-07–HV-11 | Hero, four pillars, free recipes, conditional collection, static previews, story and navigation |
| 3. Metadata and measurement | HV-12/HV-13 | Social/search accuracy and existing consent pipeline |
| 4. Validation and release evidence | HV-14–HV-18 | Mobile, accessibility, state tests, comprehension, deployed-domain check and handoff |

Combine small changes when one coherent review is clearer, but keep content assumptions visible. No PR should quietly add live chat, retailer tracking, an interest form or personal-data collection. If a dependency requires backend repair, open a separate scoped remediation and keep this homepage in a truthful lower state.

## Effort estimate

Proposed range: baseline/content decisions 1–2 working days, wireframes/assets 2–4, implementation 2–4, integrated/manual/comprehension review 1–3. These are planning estimates, not a launch-date promise. They assume existing primitives, static previews, no new service and available asset/content reviewers.

Real-device access, image permissions, native screenshot capture and unresolved recipe deployment issues affect timing. Synthetic concept visuals avoid making native simulator setup a critical dependency. A lower-state homepage release is allowed only when the approved content makes the limitation clear.

## Preflight

1. Record candidate SHA, content version, homepage presentation state and asset manifest.
2. Confirm all five acceptance gates for that state.
3. Verify official domain/hosting project, preview protection and current production artifact.
4. Confirm every recipe and collection destination with anonymous and appropriate signed-in actors.
5. Review title, social image and actual page copy as rendered, including error states.
6. Confirm no future feature runtime, private data or unapproved tracking is introduced.
7. Identify safe rollback artifact and content owner/backup.
8. Obtain the normal implementation release approval for the concrete preview. Plan approval is not release approval.

Production checks never use a real card to simulate payment. Existing commerce testing remains in sandbox/test mode. The homepage only hands visitors to the approved collection journey.

## Deployment verification

Check https://mycuratedhaven.com/ after promotion from a fresh browser session and phone. Record the deployed SHA and visible content version in internal evidence. Verify broad hero, four pillars, current recipe state, preview labels, real links, metadata, mobile menu and consent access.

Check an image-failure fallback and inspect representative network requests. Confirm no unexpected chat/AI/provider call. Existing recipe detail and buyer account routes must still work. If the domain continues showing older marketing, investigate domain/deployment association and cache state rather than claiming the merge launched the page.

Do not send an Instagram announcement or update campaign links as part of this task unless separately requested. Existing recipe campaigns keep their direct recipe destinations.

## Rollback and urgent content changes

For a copy or asset mistake, prefer a narrow content patch or asset withdrawal. For a broken homepage, return to a known safe homepage artifact or revert the homepage-specific changes on current main. Never redeploy an older whole application containing payment/security defects merely because the old homepage looked correct.

Preserve recipe, account, checkout and webhook functionality. There is no schema rollback for this effort. If a cached preview leaks private details, remove the asset and derived variants, invalidate relevant caches, inspect access scope and follow the established incident process. Static-public publication has no access control, so prevent private content before export.

If a collection is paused, remove the transactional summary or switch to free-ready copy while preserving buyer access. If recipes are temporarily unavailable, retain the static brand/preview page and show the recipe fallback. Do not replace the entire homepage with an unrelated error page.

## Maintenance ownership

| Trigger | Required action |
| --- | --- |
| Recipes become usable | Verify three slots, details and print, then review free-ready copy |
| Collection approved or changed | Reconcile homepage summary with exact offer, terms and destination |
| Offer paused | Remove current sale assurances, keep existing buyer access |
| Future feature enters development | Update status only with a named owner and verified scope |
| Future feature launches | Separate feature release, then replace preview with a real destination through a reviewed homepage change |
| Native UI changes | Review whether the static illustration still represents the intended direction |
| Preview causes confusion | Revise labels/layout and rerun comprehension questions |
| Asset rights or privacy issue | Withdraw promptly and record replacement review |

Review the page after seven days for broken links and clarity issues. After roughly 14 days, inspect consented preview interest if sample size permits. Sparse traffic is inconclusive. No automatic feature promise or development trigger follows from a click ranking.

## Future evidence layout

```text
docs/implementation/homepage-vision/evidence/<release-id>/
  BASELINE.md
  DECISIONS-AND-COPY.md
  ASSET-MANIFEST.md
  CASE-RESULTS.csv
  MOBILE-AND-PERFORMANCE.md
  COMPREHENSION-REVIEW.md
  RELEASE-RECORD.md
  POST-RELEASE-REVIEW.md
```

These records are templates for later execution, not evidence already produced. Keep raw participant details and sensitive operational records in approved restricted storage. Public summaries use redacted references.

## Release record template

```text
Status: pending
Web SHA / deployment ID / official domain:
Content version / recipe presentation state:
Approved copy and decision references:
Asset manifest and privacy/rights review:
Verified free slots and collection reference, if applicable:
Automated CI results and required manual cases:
Mobile/browser/assistive-technology versions:
Performance profile, baseline and measured values:
Comprehension answers, corrections and final result:
Consent/events enabled or explicitly omitted:
Safe rollback and cache withdrawal procedure:
Content owner / release owner / backup:
Release approval, date and live-domain smoke evidence:
Outstanding limitations and next review:
```

## Definition of done

The approved homepage introduces all four pillars, presents a working recipe path appropriate to its release state, and labels every sneak peek clearly. Visitors understand the purchase boundary. Previews expose no real family data and invoke no underlying feature services. Links, metadata, mobile layout and accessibility pass the applicable checks. The official domain shows the approved version, with a named owner for future changes.

The completion report must distinguish “plan merged” from “homepage implementation merged” and “homepage released.” The current evidence package records which code checks passed and which human or live-release gates remain open.
