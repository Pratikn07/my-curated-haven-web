import Link from "next/link";
import type { Check } from "@/lib/admin/contracts";
import type { CollectionDetail, CollectionRevision, CollectionSnapshot } from "@/lib/admin/collections/contracts";
import { diffCollection } from "@/lib/admin/collections/snapshot";
import {
  availabilityLabel, formatUtc, listingLabel, seriesLabel, shelfLabel, stageLabel,
} from "@/lib/admin/collections/labels";
import { Contents, DetailHero, type DetailModel } from "@/components/collections/CollectionDetail";
import type { ClothName, CollectionRecipe } from "@/lib/collections/types";
import { usableImageSrc } from "@/lib/recipes/format";
import CollectionReview from "./CollectionReview";

const FIELD_LABELS: Record<string, string> = {
  title: "Title", tagline: "Tagline", story: "Story", forWhen: "Who it helps", refresh: "Refresh promise",
  shelf: "Shelf", sortOrder: "Shelf position", stage: "Ages", series: "Series", listingState: "Listing",
  availability: "Browsing", cloth: "Cloth", cover: "Cover", slug: "Address",
};

function show(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "None";
  if (field === "stage") return stageLabel(value as CollectionSnapshot["stage"]);
  if (field === "series") return seriesLabel(value as CollectionSnapshot["series"]);
  if (field === "shelf") return shelfLabel(String(value));
  if (field === "listingState") return listingLabel(value as CollectionSnapshot["listingState"]);
  if (field === "availability") return availabilityLabel(value as CollectionSnapshot["availability"]);
  if (field === "cover") return (value as NonNullable<CollectionSnapshot["cover"]>).alt;
  return String(value);
}

function freezes(storage: string | null): string | null {
  const match = storage?.match(/freez[^.]*?(\d+\s*(?:months?|weeks?))/i);
  return match ? match[1] : null;
}

function names(ids: string[], titles: Map<string, string>): string {
  return ids.map((id) => titles.get(id) ?? id).join(", ");
}

function CheckList({ title, checks }: { title: string; checks: Check[] }) {
  if (checks.length === 0) return null;
  return <div>
    <h3>{title}</h3>
    <ul>{checks.map((c) => <li key={`${c.code}-${c.scope}`}>{c.explanation}</li>)}</ul>
  </div>;
}

export default function CollectionPreview({ detail, working, returnTo, canEdit, canReview }: {
  detail: CollectionDetail;
  working: CollectionRevision;
  returnTo: string;
  canEdit: boolean;
  canReview: boolean;
}) {
  const proposed = working.snapshot;
  const published = detail.published?.snapshot ?? null;
  const titles = new Map(detail.recipes.map((r) => [r.recipeId, r.title]));
  const publishedIds = published?.members.map((m) => m.recipeId) ?? [];
  const proposedIds = proposed.members.map((m) => m.recipeId);
  const added = proposedIds.filter((id) => !publishedIds.includes(id));
  const removed = publishedIds.filter((id) => !proposedIds.includes(id));
  const kept = proposedIds.filter((id) => publishedIds.includes(id));
  const reordered = kept.join() !== publishedIds.filter((id) => proposedIds.includes(id)).join();
  const fieldChanges = published ? diffCollection(published, proposed).filter((c) => c.field !== "members") : [];
  const checks = detail.readiness.checks;
  const blockers = checks.filter((c) => c.severity === "blocker" && c.state === "fail");
  const unknown = checks.filter((c) => c.severity === "blocker" && c.state === "unknown");
  const notes = checks.filter((c) => c.severity === "suggestion");
  const impact = detail.impact.ok ? detail.impact.value : null;
  const protectedKept = checks.find((c) => c.code === "PROTECTED_KEPT")?.state === "pass";

  const recipes: CollectionRecipe[] = proposed.members.map((m) => {
    const r = detail.recipes.find((x) => x.recipeId === m.recipeId);
    return { slug: m.recipeSlug, title: r?.title ?? m.recipeSlug, minutes: r?.totalMinutes ?? null,
      image: usableImageSrc(r?.imagePath) ?? "", allergens: r?.allergens ?? [], freezes: freezes(r?.storageNotes ?? null) };
  });
  const model: DetailModel = { slug: proposed.slug, title: proposed.title, tagline: proposed.tagline || null,
    story: proposed.story, forWhen: proposed.forWhen || null, cloth: proposed.cloth as ClothName,
    cover: proposed.cover ? { src: proposed.cover.src, width: proposed.cover.width, height: proposed.cover.height,
      alt: proposed.cover.alt } : null,
    refresh: proposed.refresh || null, price: "Preview", offer: null, recipes };

  return (
    <article className="admin-collection-preview">
      <header className="admin-record__header">
        <p className="admin-record__eyebrow">Collection workspace</p>
        <h1>Preview &amp; changes</h1>
        <p className="admin-record__identifier">{proposed.title} · revision {working.version}</p>
        <p className="admin-record__checked">Checked at {formatUtc(detail.checkedAt)} · review digest {working.digest.slice(0, 12)}
          {impact ? ` · based on ${impact.sourceRevision === "none" ? "no publication" : `publication ${impact.sourceRevision.slice(0, 8)}`}` : ""}</p>
        <nav className="admin-collection__preview-nav" aria-label="Draft">
          <Link href={`/admin/collections/${detail.collectionId}?returnTo=${encodeURIComponent(returnTo)}`}>Back to collection</Link>
          <Link href={`/admin/collections/${detail.collectionId}/edit?returnTo=${encodeURIComponent(returnTo)}`}>Edit private draft</Link>
        </nav>
      </header>

      <section aria-labelledby="preview-changes" className="admin-collection__section">
        <h2 id="preview-changes">What changes</h2>
        <p>
          Published: {publishedIds.length} {publishedIds.length === 1 ? "recipe" : "recipes"}.
          {" "}Draft: {proposedIds.length} {proposedIds.length === 1 ? "recipe" : "recipes"}.
          {added.length ? ` Adds ${names(added, titles)}.` : " No recipes added."}
          {removed.length ? ` Removes ${names(removed, titles)}.` : ""}
          {reordered ? " The order changes." : ""}
        </p>
        {!published ? <p>This collection has never been published; everything here is new.</p> : null}
        {fieldChanges.length > 0 ? <dl className="admin-collection__changes">
          {fieldChanges.map((c) => <div key={c.field}>
            <dt>{FIELD_LABELS[c.field] ?? c.field}</dt>
            <dd><span className="admin-collection__before">Published: {show(c.field, c.before)}</span>
              <span className="admin-collection__after">Draft: {show(c.field, c.after)}</span></dd>
          </div>)}
        </dl> : published ? <p>No page details change.</p> : null}
      </section>

      <section aria-labelledby="preview-buyers" className="admin-collection__section">
        <h2 id="preview-buyers">Buyers</h2>
        {impact ? <>
          <p>{impact.eligibleBuyerCount} {impact.eligibleBuyerCount === 1 ? "person has" : "people have"} access today.
            {" "}{impact.pendingLiveCount ? `${impact.pendingLiveCount} live checkout${impact.pendingLiveCount === 1 ? " is" : "s are"} in progress.` : "No live checkout is in progress."}</p>
          <p>{protectedKept ? "No purchased recipe is removed." : "This draft removes a purchased recipe and cannot be published."}</p>
          <p>Whether existing buyers receive the added recipes is decided from each purchase&rsquo;s access policy when this is published. This preview does not promise it.</p>
          {impact.affectedCampaignSlugs.length ? <p>Campaigns promising these recipes: {impact.affectedCampaignSlugs.join(", ")}.</p> : null}
        </> : <p role="status">Buyer information is unavailable ({detail.impact.ok ? "" : `${detail.impact.code}, reference ${detail.impact.reference}`}). It is unknown, not zero, and blocks review. Reload to retry.</p>}
      </section>

      <section aria-labelledby="preview-readiness" className="admin-collection__section">
        <h2 id="preview-readiness">Readiness</h2>
        <p>{detail.readiness.readyForApproval ? "Ready for review." : "Not ready for review yet."}</p>
        <CheckList title="Must fix" checks={blockers} />
        <CheckList title="Not yet known" checks={unknown} />
        <CheckList title="Notes" checks={notes} />
      </section>

      <CollectionReview detail={detail} working={working} canEdit={canEdit} canReview={canReview} />

      <section aria-labelledby="preview-page" className="admin-collection__section admin-collection__preview-page">
        <h2 id="preview-page">Proposed collection page</h2>
        <p className="admin-collection__private-banner" role="note">Private draft. Visitors cannot see this page; buying is turned off here.</p>
        <div className="cl" data-cloth={model.cloth} inert>
          <DetailHero model={model} />
          <Contents model={model} />
        </div>
      </section>
    </article>
  );
}
