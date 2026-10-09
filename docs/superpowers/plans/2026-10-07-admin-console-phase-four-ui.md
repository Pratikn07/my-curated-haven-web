# Admin Console Phase 4 Campaigns and Reports UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make campaign authoring, publication and permitted reports follow the approved admin UX while preserving original promises and clear measurement provenance.

**Architecture:** Refine the functional campaign and reporting components created by the [Phase 4 domain plan](2026-10-07-admin-campaigns-phase-four.md). Reuse the console shell/record frame, exact private preview and protected report DTOs. Phase 4A Campaigns and Phase 4B reports activate independently; add each destination to Home/navigation only after its own protected read, authority and browser gates pass.

**Tech Stack:** Next.js 16, React 19, TypeScript, existing admin tokens, campaign/report protected RPCs and actions, Playwright with owned synthetic fixtures.

**Spec:** [Admin console UX design](../specs/2026-10-07-admin-console-ux-design.md), sections 2–4, 8 and 9–11; [Phase 4 design](../specs/2026-10-07-admin-campaigns-phase-four-design.md).

## Global Constraints

- Invoke `$unlazy` and create the `AGENTS.md` acceptance ledger before the first code edit. Recheck integrated contracts, latest phase flags and existing changes.
- Phase 4A needs private campaign read/editor/impact/review/publication/link contracts from domain Tasks 3–15. Phase 4B needs separately authorised and aggregate-only report contracts from Tasks 16–23. Never reveal a destination from a plan or migration alone.
- The original campaign promise is preserved; extras are additive. Promotion-inactive is distinct from public unavailability, and a registered first-party link is distinct from verified Instagram/DM delivery.
- Campaign editing never changes collection prices, sends Instagram messages or grants access. Report performance readers cannot derive finance facts; Finance is separately owner-authorised and uses verified ledger outcomes only.
- Keep draft copy, admin reports, financial values, provider references and search fields out of optional analytics/replay and public caches. Unknown sources are unavailable, not zero.

## Review Focus

1. An existing campaign's original recipe is removed or demoted: Preview blocks the change and keeps the original promise visible (Task 2).
2. Promotion becomes inactive while a shared link is still valid: the UI keeps publication/link readiness distinct (Tasks 1–2).
3. An offer or recipe changes after campaign approval: final publication returns to fresh eligibility, with no stale success copy (Task 2).
4. A performance-only operator requests Finance through URL, action or warmed cache: all channels deny finance data (Task 3).
5. An observed cohort or PostHog source is incomplete: purchase conversion says Unavailable/Provisional with definition and watermark, never zero (Task 3).

## File responsibility map

| File | UI responsibility |
| --- | --- |
| `my-curated-haven-web/src/lib/admin/campaigns/{contracts,decode,repository}.ts`, `supabase/migrations/20261007221000_admin_campaign_list_metadata.sql` | Add safe list metadata for linked collections and owner-recorded post reference absent from the domain plan's `CampaignRow` |
| `my-curated-haven-web/src/components/admin/campaigns/{CampaignLibrary,CampaignEditor,CampaignPreview,CampaignReview,CampaignPublication,CampaignLinks,CampaignHistory}.tsx` | Functional campaign screens refined to shared spatial grammar and truth states |
| `my-curated-haven-web/src/app/admin/campaigns/page.tsx`, `src/app/admin/campaigns/[campaignId]/page.tsx`, `src/app/admin/campaigns/[campaignId]/{edit,preview,publish}/page.tsx` | Protected inventory, detail, editor, comparison and final decision routes |
| `my-curated-haven-web/src/components/admin/reports/{ReportFilters,PerformanceReport,FinanceReport,ReportingGrants}.tsx` | Provenance, definitions, separate performance/finance scopes and grants |
| `my-curated-haven-web/src/app/admin/reports/{campaigns,finance}/page.tsx` | Independently protected report routes |
| `my-curated-haven-web/src/components/admin/{AdminShell,AdminHome,AdminTeam}.tsx` | Conditional destinations, campaign attention and grant explanation |
| `my-curated-haven-web/tests/e2e/{admin-campaigns-*,admin-campaign-reports,admin-report-permissions}.spec.ts` | Owner/staff workflows, privacy, responsive and unavailable-state acceptance |

The domain plan creates most files. This plan is the final UI pass on those exact components and adds no independent campaign/payment source of truth.

---

### Task 1: Make Campaigns a truthful inventory and record workspace

**Depends on:** Phase 4A domain Tasks 3–7 and the Phase 1 shared shell/frame.

**Files:** Modify `campaigns/CampaignLibrary.tsx`, `CampaignEditor.tsx`, `CampaignHistory.tsx`, `src/lib/admin/campaigns/contracts.ts`, `decode.ts`, `repository.ts`, `AdminShell.tsx`, `src/app/admin/campaigns/page.tsx`, `src/app/admin/campaigns/[campaignId]/page.tsx`, `tests/e2e/admin-campaigns-inspection.spec.ts`, `admin-campaigns-editing.spec.ts`; create `supabase/migrations/20261007221000_admin_campaign_list_metadata.sql`, `supabase/tests/database/58_admin_campaign_list_metadata.test.sql`.

**Interfaces:** Consume `CampaignRow`, `Detail`, `Revision`, `PromiseRecord` and `CampaignQuery` from `src/lib/admin/campaigns/contracts.ts`. Extend `CampaignRow` with `linkedCollections:{id:string;title:string}[]` and `postReferences:{kind:"post_url"|"keyword";label:string}[]`, sourced from the authorised campaign projection/reference registry, because the domain plan's initial row omits both. Keep `publication`, `promotion`, `review` and `health` as four separate labels. URL filters use the domain plan's validated query adapter.

- [ ] Add SQL and browser assertions for public versus draft, promotion inactive, original/extra counts, linked collections, owner-recorded post reference, no financial columns, selected-row return focus, source outage and recipe-only navigation denial. Run suite 58 and focused inspection/editing specs before the UI pass.
- [ ] Extend the protected campaign-list read with collection names and safe recorded post/keyword labels from the existing campaign reference registry. Decode those arrays strictly in `CampaignRow`; do not query Instagram or expose raw private draft/reference payloads. An empty recorded-reference array is not evidence that no post exists.
- [ ] Add Campaigns to nav only for active `campaign.read`. Render a record header with active publication, private candidate, original promise, approved extras, linked offers, recorded external references, readiness, history and one next action. A keyword/post URL is labelled Owner-recorded reference, not evidence of message delivery.
- [ ] Group editor fields, original and extra members, existing approved imagery/links and explicit Save. Keep unsaved navigation, failure retention and conflict comparison. A change to approved content returns it to unreviewed private work.

```tsx
<AdminState label="Publication" value={row.publication} />
<AdminState label="Promotion" value={row.promotion} />
<AdminState label="Readiness" value={row.health} />
```

- [ ] Register suite 58 in the owned DB runner/CI discovery. Rerun SQL and campaign inspection/editing browser tests at desktop and 320px, campaign query/decoder units, lint and typecheck; commit Task 1 files.

### Task 2: Clarify campaign comparison, links and exact publication

**Depends on:** Phase 4A domain Tasks 8–15 and Task 1.

**Files:** Modify `campaigns/CampaignPreview.tsx`, `CampaignReview.tsx`, `CampaignPublication.tsx`, `CampaignLinks.tsx`, `src/app/admin/campaigns/[campaignId]/preview/page.tsx`, `tests/e2e/admin-campaigns-review.spec.ts`, `admin-campaigns-publication.spec.ts`, `admin-campaigns-links.spec.ts`; create `src/app/admin/campaigns/[campaignId]/publish/page.tsx`.

**Interfaces:** Use `loadCampaignPreview(campaignId, revisionId)` and its exact `Revision`, `Impact` and renderer-safe `CampaignRenderData`; publication uses the protected `PublishCommand` and `Receipt`. Do not expose a public draft URL or bypass first-party placement registration.

- [ ] Test original-promise removal, additive extras, free/public recipe unknown, stale offer, promotion-inactive shared link, review digest change, committed refresh pending and emergency safety withdrawal. Run focused review/publication/links specs first.
- [ ] Show active publication and saved candidate side by side on desktop and stacked on phone. Reuse the story renderer privately, with customer actions omitted. Compare original/extra members, copy/counts, image, collection offers and price provenance. List exact eligibility checks with source/time/digest and label unknown blockers.
- [ ] Use the protected `/publish` route for final review of human decision, exact candidate/base, promised original content, new extras, linked offer/checkout effect, registered links, reason and current dependency check. A material change reopens comparison; publication uses the exact token under server/DB checks. The result separates committed publication, refresh and link readiness.

```tsx
const blocked = preview.impact.checks.some((check) => check.severity === "blocker" && check.state !== "pass");
return <button type="submit" disabled={blocked || pending}>Publish reviewed campaign</button>;
```

- [ ] Keep stable first-party addresses and safe unavailable copy after safety withdrawal. A placement URL can be Ready to share while its external status remains Unverified. Rerun review/publication/link browser specs, Phase 4A SQL suites, lint/typecheck; commit Task 2 files.

### Task 3: Make Performance and Finance legible without crossing grants

**Depends on:** Phase 4B domain Tasks 16–23.

**Files:** Modify `reports/ReportFilters.tsx`, `PerformanceReport.tsx`, `FinanceReport.tsx`, `ReportingGrants.tsx`, `AdminShell.tsx`, `AdminTeam.tsx`, `src/app/admin/reports/campaigns/page.tsx`, `src/app/admin/reports/finance/page.tsx`, `tests/e2e/admin-campaign-reports.spec.ts`, `admin-report-permissions.spec.ts`.

**Interfaces:** Consume `ReportResult<PerformanceDTO[]>`, `ReportResult<FinanceReportDTO>`, `ReportQuery` and `FinanceQuery`. Money stays canonical minor-unit strings; the browser receives only authorised aggregate DTOs. `ReportResult.state` controls Ready, Stale, Disabled and Unavailable messaging.

- [ ] Add browser tests for performance-only, finance-only, owner and revoked staff through route, RSC/action and cache. Add incomplete observation/cohort, missing source, mixed-currency/mode and activity-versus-cohort assertions. Run focused reports/permissions specs first.
- [ ] Display filters, period, timezone, definitions, source watermark, coverage and state above figures. Performance shows observed visits, recipe/offer engagement and linked checkout starts; purchase conversion appears only under the separate finance grant and a compatible complete cohort. Unknown or incomplete metrics render an explanation rather than zero.
- [ ] Finance is a separate destination with confirmed paid orders, captured/refunded amounts, disputes, attribution coverage and reconciliation by currency, mode, provider/account scope and time basis. Show Activity in period and Purchase cohort to date as separate choices. Never add mixed-currency totals or use a browser success event as paid evidence.

```tsx
if (result.state === "disabled" || result.state === "unavailable") {
  return <AdminState kind="unavailable" message={result.reason} />;
}
return <FinanceReport report={result.value} stale={result.state === "stale"} />;
```

- [ ] Add Performance/Finance nav only after each protected read and permission is active. Team grant UI names the exact account/capability/reason and shows revocation. A Finance read never adds refund or support buttons. Rerun browser specs, report units/SQL suites, admin privacy tests, lint and typecheck; commit Task 3 files.

### Task 4: Integrate Campaigns into Home and verify Phase 4 UI

**Depends on:** Tasks 1–3 and the Phase 3 Home read contracts.

**Files:** Modify `src/lib/admin/home/repository.ts`, `src/components/admin/AdminHome.tsx`, `AdminShell.tsx`, `tests/e2e/admin-home.spec.ts`, `admin-campaigns-inspection.spec.ts`; update `docs/implementation/admin-campaigns/GATES.md` with actual evidence.

**Interfaces:** Add an authorised Campaign attention envelope to Home's Publishing lane. It uses the same protected `CampaignQuery.attention` read as the inventory and its own source watermark; do not derive a count from display rows or expose finance in Publishing.

- [ ] Add Home browser tests for campaign.read versus recipe-only/finance-only staff, active campaign attention, report source outage, stale campaign source and no synthetic future tile. Run the focused Home/inspection tests first.

```ts
await expect(page.getByRole("region", { name: "Publishing" }).getByText("Campaigns")).toBeVisible();
await expect(page.getByRole("link", { name: "Finance" })).toHaveCount(0);
```

- [ ] Add campaign review/eligibility/refresh rows to Publishing only when Campaigns is active and the operator has `campaign.read`. Preserve independent unavailable states for Recipes, Collections, Campaigns and Support. Report links appear only for the precise performance or finance grant.
- [ ] Verify keyboard flow, 320/375px, 200% zoom, 44px touch targets, no horizontal overflow, no optional analytics/replay, no unauthorised RSC/action/report payload and exact source freshness. Run Phase 4 browser suites, report/campaign units, DB suites, lint, typecheck and build. Record observed results in `GATES.md`; commit Task 4 files.

## Acceptance crosswalk

This plan closes UX6 and Phase 4 portions of UX1, UX2, UX7 and UX8 from the cross-phase spec. Phase 4A campaign UI and Phase 4B reporting are independently gated; neither a visual preview nor a green build is evidence that public links, provider facts or production reports are live.
