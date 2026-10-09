"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Result } from "@/lib/admin/contracts";
import type {
  AccessDecision, CollectionDetail, CollectionReceipt, CollectionReceiptLog, UndecidedAccess,
} from "@/lib/admin/collections/contracts";
import { approveAndPublishCollection } from "@/lib/admin/collections/actions";
import { diffCollection } from "@/lib/admin/collections/snapshot";
import { accessSourceLabel, commerceLabel, fieldLabel, formatUtc, workingLabel } from "@/lib/admin/collections/labels";
import CollectionReceipts from "./CollectionReceipts";

const subscribeHydration = () => () => {};

function failure(result: { code: string; reference: string }): string {
  if (result.code === "CONFLICT") {
    return "Nothing was published. The draft, its review or the buyer evidence changed after this page loaded. Check Preview & changes again.";
  }
  if (result.code === "BLOCKED") {
    return "Nothing was published. A check is failing or unknown, a blocking issue is open, or a buyer group still needs a decision.";
  }
  if (result.code === "DENIED") return "Nothing was published. You do not have permission for this step.";
  if (result.code === "DISABLED") return "Nothing was published. Collection publication is switched off in this console.";
  return `The result is not confirmed (${result.code}, reference ${result.reference}). Try again: repeating this request returns the same publication and cannot publish twice.`;
}

function names(ids: string[], titles: Map<string, string>): string {
  return ids.map((id) => titles.get(id) ?? id).join(", ");
}

const groupKey = (group: UndecidedAccess) => `${group.releaseId}:${group.sourceKind}`;

/** The final decision page: the exact revision, what it changes for visitors, buyers and sales, and one action. */
export default function CollectionPublication({ detail, undecided, receipts, operatorEmail, canPublish, canApprove, returnTo }: {
  detail: CollectionDetail;
  undecided: Result<UndecidedAccess[]>;
  receipts: Result<CollectionReceiptLog>;
  operatorEmail: string;
  canPublish: boolean;
  canApprove: boolean;
  returnTo: string;
}) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const router = useRouter();
  const statusRef = useRef<HTMLParagraphElement>(null);
  const inFlight = useRef(false);
  const [reason, setReason] = useState("");
  const [policies, setPolicies] = useState<Record<string, AccessDecision["policy"]>>({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [published, setPublished] = useState<CollectionReceipt | null>(null);
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());

  const working = detail.working;
  const title = working?.snapshot.title || detail.published?.snapshot.title || detail.identity.title;
  const query = `?returnTo=${encodeURIComponent(returnTo)}`;
  const backHref = `/admin/collections/${detail.collectionId}${query}`;
  const previewHref = `/admin/collections/${detail.collectionId}/preview${query}`;
  const impact = detail.impact.ok ? detail.impact.value : null;
  const groups = undecided.ok ? undecided.value : null;
  const openBlockers = detail.review.issues.filter((i) => !i.resolved && i.severity === "blocker");

  const serverReceipts = receipts.ok ? receipts.value.receipts : [];
  const latest = published && !published.noChange
    ? (serverReceipts.find((r) => r.operationId === published.operationId && r.refreshState === "complete") ?? published) : null;
  const shownReceipts = latest ? [latest, ...serverReceipts.filter((r) => r.operationId !== latest.operationId)] : serverReceipts;

  const mode = !working ? "none"
    : working.state === "approved" ? (canPublish ? "publish" : "none")
    : ["draft", "changes_requested", "submitted"].includes(working.state) && canPublish && canApprove ? "approve" : "none";
  // Buyer-group decisions need review authority as well. Someone who has it decides under that authority; on an
  // already approved revision the database keeps the existing approval.
  const canDecide = mode === "approve" || (mode === "publish" && canApprove);
  const decidesGroups = mode === "publish" && canApprove && (groups?.length ?? 0) > 0;

  async function publish() {
    // A second click before the button re-renders as disabled must not send a second request.
    if (!working || !impact || !groups || mode === "none" || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setMessage(null);
    setStale(false);
    const result = await approveAndPublishCollection({ collectionId: detail.collectionId, operationId, reason: reason.trim(),
      revisionId: working.id, expectedVersion: working.version, expectedDigest: working.digest, base: working.base,
      impactToken: impact.token, approveNow: mode === "approve" || decidesGroups,
      accessDecisions: groups.map((g) => ({ releaseId: g.releaseId, sourceKind: g.sourceKind, policy: policies[groupKey(g)] })) });
    inFlight.current = false;
    setPending(false);
    if (!result.ok) {
      // Only an unconfirmed result keeps its operation id, so a retry replays the same request.
      if (result.code !== "UNAVAILABLE") setOperationId(crypto.randomUUID());
      setStale(result.code === "CONFLICT" || result.code === "BLOCKED");
      setMessage(failure(result));
      statusRef.current?.focus();
      if (result.code === "CONFLICT" || result.code === "BLOCKED") router.refresh();
      return;
    }
    setPublished(result.value);
    setMessage(result.value.noChange ? "Nothing changed. This revision matches what is already published."
      : `Published revision ${result.value.version}.`);
    statusRef.current?.focus();
    router.refresh();
  }

  return (
    <article className="admin-collection-preview admin-collection-publication">
      <header className="admin-record__header">
        <p className="admin-record__eyebrow">Collection workspace</p>
        <h1>Review collection effect</h1>
        <p className="admin-record__identifier">{title}{working ? ` · revision ${working.version}` : ""}</p>
        <p className="admin-record__checked">Source checked at {formatUtc(detail.checkedAt)}
          {impact ? ` · buyers checked at ${formatUtc(impact.checkedAt)}` : ""}</p>
        <nav className="admin-collection__preview-nav" aria-label="Publication">
          <Link href={backHref}>Back to collection</Link>
          {working ? <Link href={previewHref}>Preview &amp; changes</Link> : null}
        </nav>
      </header>

      <p ref={statusRef} tabIndex={-1} role="status" aria-label="Publication status" aria-live="polite"
        className={message ? "admin-collection__stale" : undefined}>{message ?? ""}</p>
      {stale ? <p><Link href={previewHref}>Back to Preview &amp; changes</Link></p> : null}

      {/* Once a receipt is back, only the result shows: the evidence above it described the page before publishing. */}
      {working && !published ? <Evidence detail={detail} groups={groups} undecided={undecided} policies={policies}
        onPolicy={(key, policy) => setPolicies((current) => ({ ...current, [key]: policy }))}
        disabled={!hydrated || pending || !canDecide} canDecide={canDecide} />
        : !published ? <p>Nothing is waiting to publish. Prepare and review a private draft first.</p> : null}

      {working && !published ? <section aria-labelledby="publish-decision" className="admin-collection__section admin-collection-review">
        <h2 id="publish-decision">Your decision</h2>
        {mode === "none" ? <p>{
          working.state === "rejected" ? "This revision was rejected. Edit the draft to prepare a different one."
            : !canPublish ? "Publishing needs collection publish permission in the publication stage."
            : working.state === "approved" ? "Publishing needs collection publish permission."
            : "This revision needs an approved review before you can publish it. Approving and publishing in one step needs review permission too."
        }</p> : <>
          <p>{mode === "approve"
            ? `Recorded as ${operatorEmail}: your approval of exactly revision ${working.version} and its publication, in one step.`
            : decidesGroups ? `Recorded as ${operatorEmail}: publication of the approved revision ${working.version} and your decisions for its buyer groups.`
            : `Recorded as ${operatorEmail}: publication of the approved revision ${working.version}.`}</p>
          <label>Reason for publishing<input value={reason} maxLength={1000} disabled={!hydrated || pending}
            onChange={(e) => setReason(e.target.value)} /></label>
          <button type="button" onClick={publish}
            disabled={!hydrated || pending || !detail.readiness.readyForApproval || impact === null || groups === null
              || openBlockers.length > 0 || !groups.every((g) => policies[groupKey(g)]) || reason.trim().length === 0}>
            {pending ? "Publishing" : mode === "approve" ? "Approve and publish" : "Publish approved revision"}</button>
          {!detail.readiness.readyForApproval ? <div className="admin-collection__note" role="note" aria-label="Checks to resolve">
              <p>Every readiness check must pass first. Resolve these in the editor or on Preview &amp; changes:</p>
              <ul>{detail.readiness.checks.filter((c) => c.severity === "blocker" && c.state !== "pass")
                .map((c) => <li key={`${c.code}-${c.scope}`}>{c.state === "unknown" ? "Not yet known: " : ""}{c.explanation}</li>)}</ul>
            </div>
            : openBlockers.length > 0 ? <p className="admin-collection__note">Resolve the blocking review issues first.</p>
            : groups && !groups.every((g) => policies[groupKey(g)]) ? <p className="admin-collection__note">{canDecide
              ? "Choose what each buyer group receives."
              : "Someone who can also approve collections must decide what each buyer group receives. They can publish this revision with those decisions."}</p>
            : null}
        </>}
      </section> : null}

      {receipts.ok ? <CollectionReceipts collectionId={detail.collectionId} receipts={shownReceipts} canRetry={canPublish} />
        : <p role="status">Publication receipts are unavailable ({receipts.code}, reference {receipts.reference}).</p>}
    </article>
  );
}

function Evidence({ detail, groups, undecided, policies, onPolicy, disabled, canDecide }: {
  detail: CollectionDetail;
  groups: UndecidedAccess[] | null;
  undecided: Result<UndecidedAccess[]>;
  policies: Record<string, AccessDecision["policy"]>;
  onPolicy: (key: string, policy: AccessDecision["policy"]) => void;
  disabled: boolean;
  canDecide: boolean;
}) {
  const working = detail.working!;
  const proposed = working.snapshot;
  const published = detail.published?.snapshot ?? null;
  const impact = detail.impact.ok ? detail.impact.value : null;
  const titles = new Map(detail.recipes.map((r) => [r.recipeId, r.title]));
  const publishedIds = published?.members.map((m) => m.recipeId) ?? [];
  const proposedIds = proposed.members.map((m) => m.recipeId);
  const added = proposedIds.filter((id) => !publishedIds.includes(id));
  const removed = publishedIds.filter((id) => !proposedIds.includes(id));
  const membershipChanges = proposedIds.join() !== publishedIds.join();
  const fieldChanges = published ? diffCollection(published, proposed).filter((c) => c.field !== "members") : [];
  const protectedKept = detail.readiness.checks.find((c) => c.code === "PROTECTED_KEPT")?.state === "pass";
  const approval = detail.review.decisions.find((d) => d.decision === "approve" && d.revisionId === working.id
    && d.digest === working.digest);

  return <>
    <section aria-labelledby="publish-version" className="admin-collection__section">
      <h2 id="publish-version">Exact version</h2>
      <dl className="admin-collection__facts">
        <div><dt>Revision</dt><dd>{working.version}</dd></div>
        <div><dt>State</dt><dd>{workingLabel(working.state)}</dd></div>
        <div><dt>Review digest</dt><dd><code>{working.digest.slice(0, 12)}</code></dd></div>
        <div><dt>Replaces</dt><dd>{working.base.publicationId ? `Publication ${working.base.publicationId.slice(0, 8)}` : "Nothing yet. This is the first publication."}</dd></div>
      </dl>
      <p>{approval ? `Approved by ${approval.decidedBy ?? "staff"} at ${formatUtc(approval.decidedAt)}. Reason: ${approval.reason}`
        : "Not approved yet."}</p>
    </section>

    <section aria-labelledby="publish-recipes" className="admin-collection__section">
      <h2 id="publish-recipes">Recipes and page</h2>
      <p>Published: {publishedIds.length} {publishedIds.length === 1 ? "recipe" : "recipes"}. This revision: {proposedIds.length}{" "}
        {proposedIds.length === 1 ? "recipe" : "recipes"}.</p>
      <ul>
        <li>{added.length ? `Adds ${names(added, titles)}.` : "No recipes added."}</li>
        <li>{removed.length ? `Removes ${names(removed, titles)}.` : "No recipes removed."}</li>
        {membershipChanges && added.length === 0 && removed.length === 0 ? <li>The order changes.</li> : null}
        <li>{!published ? "Every page detail is new."
          : fieldChanges.length ? `Page details that change: ${fieldChanges.map((c) => fieldLabel(c.field)).join(", ")}.`
          : "No page details change."}</li>
      </ul>
    </section>

    <section aria-labelledby="publish-buyers" className="admin-collection__section">
      <h2 id="publish-buyers">Buyers</h2>
      {impact ? <p>{impact.eligibleBuyerCount} {impact.eligibleBuyerCount === 1 ? "person has" : "people have"} access today.
        {" "}{protectedKept ? "No purchased recipe is removed." : "This revision removes a purchased recipe and cannot be published."}</p>
        : <p role="status">Buyer information is unavailable{detail.impact.ok ? "" : ` (${detail.impact.code}, reference ${detail.impact.reference})`}.
          It is unknown, not zero, and publishing stays blocked.</p>}
      {groups === null ? <p role="status">Buyer groups could not be checked
        {undecided.ok ? "" : ` (${undecided.code}, reference ${undecided.reference})`}. Publishing stays blocked until they can.</p>
        : groups.length === 0 ? <p>Every existing buyer group already has a recorded decision about added recipes and keeps it.</p>
        : <>
          <p>These buyer groups have no decision yet about recipes added after their purchase. Give additions: they also get
            recipes added now and in later updates. Original only: they keep exactly what they bought. {canDecide
              ? "Your choice is recorded with your reason and applies to later updates too."
              : "Only someone who can also approve collections makes this choice."}</p>
          {groups.map((g) => {
            const key = groupKey(g);
            return <fieldset key={key} className="admin-collection__review-step" disabled={disabled}>
              <legend>{accessSourceLabel(g.sourceKind)}, release {g.version}: {g.buyers} {g.buyers === 1 ? "person" : "people"}</legend>
              <label className="admin-library__check"><input type="radio" name={key} checked={policies[key] === "additions-v1"}
                onChange={() => onPolicy(key, "additions-v1")} />Give additions</label>
              <label className="admin-library__check"><input type="radio" name={key} checked={policies[key] === "original-only"}
                onChange={() => onPolicy(key, "original-only")} />Original only</label>
            </fieldset>;
          })}
        </>}
    </section>

    <section aria-labelledby="publish-sales" className="admin-collection__section">
      <h2 id="publish-sales">Sales and checkout</h2>
      <dl className="admin-collection__facts">
        <div><dt>Sales</dt><dd>{commerceLabel(detail.commerceState)}</dd></div>
        <div><dt>Offers</dt><dd>{impact ? impact.offerIds.length : "Unknown"}</dd></div>
        <div><dt>Live checkouts in progress</dt><dd>{impact ? impact.pendingLiveCount : "Unknown"}</dd></div>
      </dl>
      <p>{proposedIds.length === 0 ? "This revision has no recipes, so it has nothing to sell."
        : !membershipChanges ? "The recipes and their order are unchanged, so the current release and its offer stay as they are."
        : published ? "The recipes or their order change, so this creates a new release and seals the current one for its buyers. Any offer moves to the new release with the same price, terms and sale switch."
        : "This creates the collection's first release. Sales stay as they are until an offer is enabled."}</p>
      <p>Checkouts already in progress keep the recipes and price they started with.</p>
    </section>
  </>;
}
