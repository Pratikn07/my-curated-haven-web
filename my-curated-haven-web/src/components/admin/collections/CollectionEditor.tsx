"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  CollectionDetail, CollectionRevision, CollectionSnapshot, CoverAsset, SnapshotChange,
} from "@/lib/admin/collections/contracts";
import {
  controlCollectionDraftAction, loadCollectionDetailAction, saveCollectionDraftAction,
} from "@/lib/admin/collections/actions";
import { CLOTHS, SERIES, SHELVES, canonicalCollection, diffCollection, validateCollection } from "@/lib/admin/collections/snapshot";
import { formatUtc, shelfLabel, workingLabel } from "@/lib/admin/collections/labels";
import { useUnsavedGuard } from "../useUnsavedGuard";
import CollectionContents from "./CollectionContents";

const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

const FIELD_LABELS: Record<string, string> = {
  title: "Title", slug: "Address", tagline: "Tagline", story: "Story", forWhen: "Who it helps", refresh: "Refresh promise",
  shelf: "Shelf", sortOrder: "Shelf position", stage: "Ages", series: "Series", listingState: "Listing",
  availability: "Browsing", cloth: "Cloth", cover: "Cover", members: "Recipes",
};

function ageValue(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

export default function CollectionEditor({ detail, covers, returnTo }: {
  detail: CollectionDetail;
  covers: CoverAsset[];
  returnTo: string;
}) {
  const initial = detail.working as CollectionRevision;
  const [revision, setRevision] = useState<CollectionRevision>(initial);
  const [candidate, setCandidate] = useState<CollectionSnapshot>(() => structuredClone(initial.snapshot));
  const [titles, setTitles] = useState(() => new Map(detail.recipes.map((r) => [r.recipeId, r.title])));
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [reason, setReason] = useState("");
  const [reopen, setReopen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ latest: CollectionDetail; changes: SnapshotChange[] } | null>(null);
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);
  const router = useRouter();

  const dirty = useMemo(() => canonicalCollection(candidate) !== canonicalCollection(revision.snapshot), [candidate, revision]);
  const guard = useUnsavedGuard(dirty, "collection");
  const blockers = validateCollection(candidate).filter((c) => c.severity === "blocker" && c.state === "fail");
  const reviewed = revision.state === "submitted" || revision.state === "approved";
  const slugLocked = detail.published !== null;
  const publishedIds = new Set((detail.published?.snapshot.members ?? []).map((m) => m.recipeId));
  const protectedIds = new Set(detail.impact.ok ? detail.impact.value.protectedRecipeIds : []);
  const canSave = hydrated && !pending && dirty && blockers.length === 0 && reason.trim().length > 0 && (!reviewed || reopen);

  function patch(next: Partial<CollectionSnapshot>) {
    setCandidate((prev) => ({ ...prev, ...next }));
  }

  async function save() {
    setPending(true);
    setMessage(null);
    const result = await saveCollectionDraftAction({ collectionId: detail.collectionId, operationId, reason: reason.trim(),
      expectedVersion: revision.version, expectedDigest: revision.digest, base: revision.base, snapshot: candidate,
      reopenReviewed: reopen });
    setPending(false);
    if (result.ok && result.value.revision) {
      setRevision(result.value.revision);
      setCandidate(structuredClone(result.value.revision.snapshot));
      setOperationId(crypto.randomUUID());
      setReopen(false);
      setConflict(null);
      setMessage(result.value.noChange ? "No changes to save." : `Draft saved at ${formatUtc(result.value.committedAt)}.`);
      router.refresh();
      return;
    }
    if (!result.ok && result.code === "CONFLICT") {
      const latest = await loadCollectionDetailAction(detail.collectionId);
      if (latest.ok && latest.value.working) {
        setConflict({ latest: latest.value, changes: diffCollection(latest.value.working.snapshot, candidate) });
      }
      setMessage("Someone else changed this collection first. Your edits are still here; compare them below.");
      return;
    }
    if (!result.ok && result.code === "BLOCKED") {
      setMessage("This change is not allowed: purchased recipes must stay, and a published address cannot change.");
      return;
    }
    // Keep the same operation id so a retry cannot save twice.
    setMessage(`Save failed (${result.ok ? "UNAVAILABLE" : `${result.code}, reference ${result.reference}`}). Your edits are kept; try again.`);
  }

  async function useLatest() {
    if (!conflict?.latest.working) return;
    const latest = conflict.latest.working;
    const rebaseNeeded = conflict.latest.published?.publicationId !== latest.base.publicationId;
    if (rebaseNeeded) {
      setPending(true);
      const rebased = await controlCollectionDraftAction({ collectionId: detail.collectionId, operationId: crypto.randomUUID(),
        reason: "Rebase onto the current publication", action: "rebase", expectedDigest: latest.digest,
        referenceId: conflict.latest.published?.publicationId ?? null });
      setPending(false);
      if (!rebased.ok || !rebased.value.revision) {
        setMessage(`Could not move the draft onto the current publication (${rebased.ok ? "UNAVAILABLE" : rebased.code}).`);
        return;
      }
      setRevision(rebased.value.revision);
      setCandidate(structuredClone(rebased.value.revision.snapshot));
    } else {
      setRevision(latest);
      setCandidate(structuredClone(latest.snapshot));
    }
    setTitles(new Map(conflict.latest.recipes.map((r) => [r.recipeId, r.title])));
    setOperationId(crypto.randomUUID());
    setConflict(null);
    setMessage("Loaded the latest draft. Reapply any of your edits that are still needed.");
  }

  async function discard() {
    if (!window.confirm("Discard this private draft? The published collection does not change, and the draft stays in history.")) return;
    setPending(true);
    const result = await controlCollectionDraftAction({ collectionId: detail.collectionId, operationId: crypto.randomUUID(),
      reason: reason.trim() || "Discard private draft", action: "discard", expectedDigest: revision.digest, referenceId: null });
    setPending(false);
    if (!result.ok) {
      setMessage(`Could not discard the draft (${result.code}, reference ${result.reference}).`);
      return;
    }
    guard.allowLeaving();
    router.push(`/admin/collections/${detail.collectionId}`);
  }

  const status = !hydrated ? "Preparing editor" : pending ? "Saving" : message ?? (dirty ? "Unsaved changes" : "No unsaved changes");
  const cover = candidate.cover;

  return (
    <div className="admin-editor admin-collection-editor">
      {guard.dialog}
      <Link href={`/admin/collections/${detail.collectionId}?returnTo=${encodeURIComponent(returnTo)}`}>Back to collection</Link>
      <h1>Edit private draft: {revision.snapshot.title || detail.identity.title}</h1>
      <p>{workingLabel(revision.state)} · revision {revision.version} · nothing here is public until it is published.</p>
      <p role="status" aria-label="Save status" aria-live="polite" className="admin-editor__status">{status}</p>
      {!dirty && !pending ? <Link href={`/admin/collections/${detail.collectionId}/preview?returnTo=${encodeURIComponent(returnTo)}`}
        className="admin-editor__preview-link">Preview &amp; changes</Link> : null}

      {conflict ? (
        <section aria-labelledby="collection-conflict" className="admin-collection__section admin-collection__conflict">
          <h2 id="collection-conflict">Your edits compared with the latest draft</h2>
          {conflict.changes.length === 0 ? <p>Your edits match the latest draft.</p> : (
            <ul>{conflict.changes.map((c) => <li key={c.field}>{FIELD_LABELS[c.field] ?? c.field} differs</li>)}</ul>
          )}
          <button type="button" onClick={useLatest} disabled={pending}>Load the latest draft</button>
        </section>
      ) : null}

      {blockers.length > 0 ? (
        <div role="alert" aria-label="Fix before saving">
          <ul>{blockers.map((c) => <li key={`${c.code}-${c.scope}`}>{FIELD_LABELS[c.scope] ?? c.scope}: {c.explanation}</li>)}</ul>
        </div>
      ) : null}

      <fieldset className="admin-editor__fields" disabled={!hydrated || pending} aria-busy={!hydrated}>
        <legend>Collection page</legend>
        <label>Collection title<input value={candidate.title} maxLength={120} onChange={(e) => patch({ title: e.target.value })} /></label>
        <label>Address (slug)<input value={candidate.slug} maxLength={80} readOnly={slugLocked} aria-describedby="slug-note"
          onChange={(e) => patch({ slug: e.target.value })} /></label>
        <p id="slug-note" className="admin-collection__note">{slugLocked
          ? "The address is fixed because this collection has been published."
          : "Lowercase words joined by hyphens. Fixed once published."}</p>
        <label>Tagline<input value={candidate.tagline} maxLength={160} onChange={(e) => patch({ tagline: e.target.value })} /></label>
        <label>Story<textarea value={candidate.story} maxLength={1200} rows={4} onChange={(e) => patch({ story: e.target.value })} /></label>
        <label>Who it helps<textarea value={candidate.forWhen} maxLength={400} rows={2} onChange={(e) => patch({ forWhen: e.target.value })} /></label>
        <label>Refresh promise<input value={candidate.refresh} maxLength={400} onChange={(e) => patch({ refresh: e.target.value })} /></label>
      </fieldset>

      <fieldset className="admin-editor__fields" disabled={!hydrated || pending}>
        <legend>Where it appears</legend>
        <label>Shelf<select value={candidate.shelf} onChange={(e) => patch({ shelf: e.target.value })}>
          {SHELVES.map((s) => <option key={s} value={s}>{shelfLabel(s)}</option>)}
        </select></label>
        <label>Shelf position<input type="number" step="1" value={candidate.sortOrder}
          onChange={(e) => patch({ sortOrder: e.target.value === "" ? Number.NaN : Number(e.target.value) })} /></label>
        <label>Youngest age (months)<input type="number" min={0} max={216} value={candidate.stage.min ?? ""}
          onChange={(e) => patch({ stage: { ...candidate.stage, min: ageValue(e.target.value) } })} /></label>
        <label>Oldest age (months, blank for no limit)<input type="number" min={0} max={216} value={candidate.stage.max ?? ""}
          onChange={(e) => patch({ stage: { ...candidate.stage, max: ageValue(e.target.value) } })} /></label>
        <label>Series<select value={candidate.series?.key ?? ""}
          onChange={(e) => patch({ series: e.target.value ? { key: e.target.value, volume: candidate.series?.volume ?? 1 } : null })}>
          <option value="">Not in a series</option>
          {SERIES.map((s) => <option key={s} value={s}>{s === "meal-prep" ? "Meal Prep" : "Breakfast"}</option>)}
        </select></label>
        {candidate.series ? <label>Volume<input type="number" min={1} step="1" value={candidate.series.volume}
          onChange={(e) => patch({ series: { key: candidate.series!.key, volume: Number(e.target.value) } })} /></label> : null}
        <label>Listing<select value={candidate.listingState}
          onChange={(e) => patch({ listingState: e.target.value as CollectionSnapshot["listingState"] })}>
          <option value="listed">Listed on the bookcase</option><option value="unlisted">Unlisted</option><option value="retired">Retired</option>
        </select></label>
        <label>Browsing<select value={candidate.availability}
          onChange={(e) => patch({ availability: e.target.value as CollectionSnapshot["availability"] })}>
          <option value="open">Open (has a page)</option><option value="coming-soon">Coming soon (shelf only)</option>
        </select></label>
        <p className="admin-collection__note">Listing and browsing do not turn sales on. Sales are managed separately.</p>
        <label>Cloth<select value={candidate.cloth} onChange={(e) => patch({ cloth: e.target.value })}>
          {CLOTHS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select></label>
        <label>Cover<select value={cover?.src ?? ""} onChange={(e) => {
          const chosen = covers.find((c) => c.src === e.target.value);
          patch({ cover: chosen ? { ...chosen, alt: cover?.src === chosen.src ? cover.alt : chosen.alt } : null });
        }}>
          <option value="">No cover</option>
          {covers.map((c) => <option key={c.src} value={c.src}>{c.src.replace("/images/collections/", "")}</option>)}
        </select></label>
        {cover ? <label>Cover description<input value={cover.alt} maxLength={300}
          onChange={(e) => patch({ cover: { ...cover, alt: e.target.value } })} /></label> : null}
      </fieldset>

      <CollectionContents members={candidate.members} onChange={(members) => patch({ members })} titles={titles}
        staleSlugs={detail.readiness.checks.filter((c) => c.code === "RECIPE_CURRENT" && c.state === "fail").map((c) => c.scope)}
        onTitle={(id, title) => setTitles((prev) => new Map(prev).set(id, title))} protectedIds={protectedIds}
        protectionKnown={detail.impact.ok} publishedIds={publishedIds} disabled={!hydrated || pending} />

      <fieldset className="admin-editor__fields" disabled={!hydrated || pending}>
        <legend>Save</legend>
        <label>Reason for this change<input value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} /></label>
        {reviewed ? <label className="admin-library__check"><input type="checkbox" checked={reopen} onChange={(e) => setReopen(e.target.checked)} />
          Reopen this {revision.state} draft. Its earlier review stays in history but no longer applies.</label> : null}
        <div className="admin-collection__save-actions">
          <button type="button" onClick={save} disabled={!canSave}>Save draft</button>
          <button type="button" onClick={discard} className="admin-button--quiet">Discard draft</button>
        </div>
        {!canSave && hydrated && !pending ? <p className="admin-collection__note">{!dirty ? "Make a change to save."
          : blockers.length > 0 ? "Fix the items listed above to save."
          : reason.trim().length === 0 ? "Add a reason to save."
          : "Tick reopen to change a reviewed draft."}</p> : null}
      </fieldset>
    </div>
  );
}
