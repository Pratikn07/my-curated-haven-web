import Link from "next/link";
import type { AdminContext } from "@/lib/admin/contracts";
import type { CollectionDetail, CollectionSnapshot, Member } from "@/lib/admin/collections/contracts";
import {
  availabilityLabel, commerceLabel, formatUtc, listingLabel, publicationLabel, seriesLabel, shelfLabel,
  sourceLabel, stageLabel, workingLabel,
} from "@/lib/admin/collections/labels";
import AdminRecordFrame from "../AdminRecordFrame";
import CollectionHistory from "./CollectionHistory";
import CollectionDraftActions from "./CollectionDraftActions";

function NextAction({ context, detail, returnTo }: { context: AdminContext; detail: CollectionDetail; returnTo: string }) {
  if (context.collectionStage === "inspection") {
    return <p>Collections are in inspection stage. You can review what is live; private drafts are not switched on yet.</p>;
  }
  if (!context.operator.permissions.includes("collection.edit")) {
    return <p>You can inspect this collection. Preparing changes needs collection edit permission.</p>;
  }
  return <CollectionDraftActions collectionId={detail.collectionId} hasDraft={detail.working !== null}
    hasPublication={detail.published !== null} returnTo={returnTo} />;
}

function MemberList({ members, titles, protectedIds, addedIds, label }: {
  members: Member[];
  titles: Map<string, string>;
  protectedIds: Set<string>;
  addedIds: Set<string>;
  label: string;
}) {
  if (members.length === 0) return <p>{label}: no recipes yet.</p>;
  return <ol className="admin-collection__members" aria-label={label}>
    {members.map((member) => <li key={member.recipeId}>
      <span>{titles.get(member.recipeId) ?? member.recipeSlug}</span>
      {protectedIds.has(member.recipeId) ? <span className="admin-badge">Purchased · protected</span> : null}
      {addedIds.has(member.recipeId) ? <span className="admin-badge admin-badge--added">Added in draft</span> : null}
      {member.placementNote ? <p className="admin-collection__note">{member.placementNote}</p> : null}
    </li>)}
  </ol>;
}

function Overview({ snapshot, detail }: { snapshot: CollectionSnapshot; detail: CollectionDetail }) {
  return <section aria-labelledby="collection-overview" className="admin-collection__section">
    <h2 id="collection-overview">Overview</h2>
    <dl className="admin-collection__facts">
      <div><dt>Listing</dt><dd>{detail.published ? listingLabel(detail.published.snapshot.listingState) : "Not on the site"}</dd></div>
      <div><dt>Browsing</dt><dd>{availabilityLabel(snapshot.availability)}</dd></div>
      <div><dt>Sales</dt><dd>{commerceLabel(detail.commerceState)}</dd></div>
      <div><dt>Shelf</dt><dd>{shelfLabel(snapshot.shelf)}</dd></div>
      <div><dt>Ages</dt><dd>{stageLabel(snapshot.stage)}</dd></div>
      <div><dt>Series</dt><dd>{seriesLabel(snapshot.series)}</dd></div>
      <div><dt>Cover</dt><dd>{snapshot.cover ? snapshot.cover.alt : "No cover"}</dd></div>
      <div><dt>Source</dt><dd>{sourceLabel(detail.sourceMode)}</dd></div>
    </dl>
    {snapshot.tagline ? <p className="admin-collection__tagline">{snapshot.tagline}</p> : null}
  </section>;
}

function BuyerImpact({ detail }: { detail: CollectionDetail }) {
  if (!detail.impact.ok) {
    return <section aria-labelledby="collection-impact" className="admin-collection__section">
      <h2 id="collection-impact">Buyers and purchases</h2>
      <p role="status">Buyer information is unavailable ({detail.impact.code}, reference {detail.impact.reference}).
        It is unknown, not zero, and any publication stays blocked until it can be checked.</p>
    </section>;
  }
  const impact = detail.impact.value;
  return <section aria-labelledby="collection-impact" className="admin-collection__section">
    <h2 id="collection-impact">Buyers and purchases</h2>
    <dl className="admin-collection__facts">
      <div><dt>People with access</dt><dd>{impact.eligibleBuyerCount}</dd></div>
      <div><dt>Live checkouts in progress</dt><dd>{impact.pendingLiveCount}</dd></div>
      <div><dt>Protected purchased recipes</dt><dd>{impact.protectedRecipeIds.length}</dd></div>
      <div><dt>Offers</dt><dd>{impact.offerIds.length}</dd></div>
    </dl>
    <p>Protected recipes were sold in an earlier release. Later updates keep them. Checked at {formatUtc(impact.checkedAt)}.</p>
  </section>;
}

export default function CollectionWorkspace({ detail, context, returnTo }: {
  detail: CollectionDetail;
  context: AdminContext;
  returnTo: string;
}) {
  const snapshot = detail.working?.snapshot ?? detail.published?.snapshot ?? null;
  const title = detail.published?.snapshot.title || detail.working?.snapshot.title || detail.identity.title;
  const titles = new Map(detail.recipes.map((recipe) => [recipe.recipeId, recipe.title]));
  const protectedIds = new Set(detail.impact.ok ? detail.impact.value.protectedRecipeIds : []);
  const publishedMembers = detail.published?.snapshot.members ?? [];
  const publishedIds = new Set(publishedMembers.map((member) => member.recipeId));
  const draftMembers = detail.working?.snapshot.members ?? null;
  const added = new Set((draftMembers ?? []).filter((m) => !publishedIds.has(m.recipeId)).map((m) => m.recipeId));
  const removed = publishedMembers.filter((m) => draftMembers !== null && !draftMembers.some((d) => d.recipeId === m.recipeId));
  const failing = detail.readiness.checks.filter((check) => check.state !== "pass");
  return (
    <AdminRecordFrame
      eyebrow="Collection workspace"
      title={title}
      identifier={detail.identity.slug}
      liveState={publicationLabel(detail.published?.publicationId ?? null, publishedMembers.length)}
      workingState={detail.working ? `${workingLabel(detail.working.state)} · revision ${detail.working.version}` : workingLabel(null)}
      checkedAt={formatUtc(detail.checkedAt)}
      actions={<NextAction context={context} detail={detail} returnTo={returnTo} />}
    >
      <Link href={returnTo}>Back to collections</Link>
      {snapshot ? <Overview snapshot={snapshot} detail={detail} /> : <p role="status">This collection has no published page or private draft yet.</p>}
      <section aria-labelledby="collection-contents" className="admin-collection__section">
        <h2 id="collection-contents">Contents</h2>
        <p>
          Published: {publishedMembers.length} {publishedMembers.length === 1 ? "recipe" : "recipes"}.
          {draftMembers !== null ? ` Private draft: ${draftMembers.length} ${draftMembers.length === 1 ? "recipe" : "recipes"}, ${added.size} added, ${removed.length} removed.` : " No private draft."}
        </p>
        <div className="admin-collection__columns">
          <div>
            <h3>Published today</h3>
            <MemberList members={publishedMembers} titles={titles} protectedIds={protectedIds} addedIds={new Set()} label="Published recipes" />
          </div>
          {draftMembers !== null ? <div>
            <h3>Private draft</h3>
            <MemberList members={draftMembers} titles={titles} protectedIds={protectedIds} addedIds={added} label="Draft recipes" />
          </div> : null}
        </div>
      </section>
      <BuyerImpact detail={detail} />
      <section aria-labelledby="collection-readiness" className="admin-collection__section">
        <h2 id="collection-readiness">Readiness</h2>
        {detail.readiness.checks.length === 0
          ? <p>Readiness has not been checked. Nothing here can be published until it is.</p>
          : <ul>{detail.readiness.checks.map((check) => <li key={`${check.code}-${check.scope}`}>
              {check.explanation} <span className="admin-collection__check">{check.state === "pass" ? "Passed" : check.state === "fail" ? "Failed" : "Unknown"}</span>
            </li>)}</ul>}
        {failing.length > 0 ? <p role="status">{failing.length} {failing.length === 1 ? "check needs" : "checks need"} attention before publication.</p> : null}
      </section>
      <CollectionHistory key={detail.history[0]?.id ?? "empty"} collectionId={detail.collectionId}
        initial={detail.history} initialCursor={detail.historyCursor} />
    </AdminRecordFrame>
  );
}
