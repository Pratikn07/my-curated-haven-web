# Phase 12 opt-in research plan

**Status:** proposed protocol for owner review. Research collection has not started. No invitation has been sent.

## Objective

Identify one recurring adult-parent job after finding a toddler recipe, or record that the evidence is too weak to select a new feature. Compare improvements to the current recipe experience, saved-recipe organisation, a weekly planner, reviewed resources, and hold only after a specific problem is supported.

Do not open with “Would you use a planner?” or “Do you want AI?” Ask about the parent's most recent behaviour and workaround first. A feature list or native implementation is not a problem statement.

## Existing evidence intake

Before interviews, ask the approved product/operations owner for a redacted aggregate report, if one exists. Use the metric definitions in [Phase 11 First 30 Days](../../../phase-11/FIRST-30-DAYS.md) and [Phase 9 Measurement](../../../phase-9/MEASUREMENT-AND-EVENTS.md).

For each measure record its source, environment, date window, timezone, freshness, version, numerator/denominator, consent coverage, and missing segments. Keep provider-confirmed order/refund/access totals separate from optional consented browser events. Do not export account-level rows or child-linked records to this repository. If a source is absent, record “unavailable,” not zero.

The committed Phase 9 evidence says the optional analytics provider is not provisioned and Instagram aggregates are unavailable. Confirm current status through the accountable owner before relying on any later readout; this document does not initiate a production query.

## Participants and recruitment

Proposed exploratory sample: 8–12 adult parents/caregivers, if eligible people can be reached through an approved opt-in channel. Seek variation across:

- Buyers who returned to use recipes, if a mature cohort exists.
- Buyers who did not return, if a mature cohort exists.
- Free visitors who did not purchase.
- Phone users arriving from Instagram, where recruitment and attribution are permitted.

Record unavailable segments and actual recruitment sources. If no paid cohort exists, do not fabricate one or present a free-only sample as representative of buyers. This sample is for discovery, not population estimates.

**Before recruitment, an accountable owner must approve:** research purpose; recruitment channel and eligible contact rule; invitation text; privacy/contact owner; consent scope; participant-record access; retention/deletion date; whether recording is proposed; and any participant expense. A purchase, support email, or social follow is not by itself permission for unrelated research contact.

### Invitation draft (not ready to send)

> We are learning how parents use toddler recipes in everyday meal planning. Would you be open to an optional conversation about a recent recipe experience? This is research, not a sales offer or health consultation, and it will not affect your account, purchase, or support. You do not need to share information about a child. Before you decide, we will explain how notes are handled and when they are deleted. [Add the approved time commitment, contact, privacy notice, and withdrawal instructions.]

Do not send this draft until the approvals above are recorded. No outreach was sent for this review.

## Interview flow

Use the existing script in [Research and Evidence](../../RESEARCH-AND-EVIDENCE.md). Begin with a recent task, the steps from deciding to serving, frequency in the last two weeks, and the workaround. Ask what happened after opening a My Curated Haven recipe and what was missing. Only after the problem discussion may the researcher show a neutral candidate prototype and ask what the participant expects to happen.

Avoid leading language, availability promises, medical advice, or asking a participant to disclose a child's identity, birth date, diagnosis, photos, or feeding history. If a participant volunteers sensitive child information, redirect to the parent's workflow and leave that information out of the notes.

## Notes and analysis

- Use pseudonymous participant IDs; store contact/consent information separately in an approved restricted system.
- Do not record by default. If recording is proposed, get separate permission. The existing 30-day raw-recording retention is a proposal and needs a named owner's approval before collection.
- Record segment, recruitment source, date, recent task, frequency, workaround, consequence, observed task outcome, contradictions, and confidence. Separate observation from interpretation and product preference.
- Keep only aggregate counts and paraphrased, redacted themes in the repository. Do not commit recordings, transcripts, contact details, account rows, or unredacted quotations.
- Include negative feedback, confusion, unavailable segments, acquisition/access defects, and competing explanations.

The proposed discovery floor is five independent households describing the same recurring problem, supported by a second evidence source and a usable prototype task. This is a prioritisation heuristic, not statistical proof; the product owner must approve or revise it before results are interpreted. Explain why improving the existing recipe experience is insufficient before selecting a new feature.

## Deliverables and decision gate

1. Restricted source report or a written data-gap note.
2. Redacted `RESEARCH-SUMMARY.md` with actual counts, dates, denominators, segment gaps, themes, contradictions, and limitations.
3. A problem brief with one recurring task, evidence references, alternatives, consequence, frequency, and confidence.
4. Candidate comparison using the same problem and including hold.
5. Product-owner decision: selected feature charter or hold/research-more decision, with named owner, backup, cost ceiling, success measure, pilot/end policy, and next review date.

Until items 1–4 are supported and item 5 is approved, P12-05/P12-06 remain open and no product feature implementation or pilot should begin. This plan is not authorization to contact participants or access private production data.
