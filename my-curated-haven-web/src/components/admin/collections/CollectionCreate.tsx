"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CollectionSnapshot } from "@/lib/admin/collections/contracts";
import { createCollectionAction } from "@/lib/admin/collections/actions";
import { SHELVES } from "@/lib/admin/collections/snapshot";
import { shelfLabel } from "@/lib/admin/collections/labels";

const subscribeHydration = () => () => {};

function slugify(title: string): string {
  return title.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 80);
}

/** Starts a private, unlisted collection with no recipes. Everything else is set in the editor. */
export default function CollectionCreate() {
  const [collectionId] = useState(() => crypto.randomUUID());
  const [operationId] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [shelf, setShelf] = useState<string>(SHELVES[0]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const router = useRouter();
  const effectiveSlug = slugEdited ? slug : slugify(title);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const snapshot: CollectionSnapshot = { collectionId, slug: effectiveSlug, title: title.trim(), tagline: "", story: "",
      forWhen: "", refresh: "", shelf, sortOrder: 1, stage: { min: null, max: null }, series: null, listingState: "unlisted",
      availability: "coming-soon", cloth: "sage", cover: null, members: [] };
    const result = await createCollectionAction({ collectionId, operationId, reason: "New private collection", snapshot });
    if (result.ok) {
      router.push(`/admin/collections/${collectionId}/edit`);
      return;
    }
    setPending(false);
    setMessage(result.code === "CONFLICT" ? "That address is already used by another collection. Choose a different one."
      : `Could not create the collection (${result.code}, reference ${result.reference}). Try again.`);
  }

  return <form className="admin-editor" onSubmit={create}>
    <Link href="/admin/collections">Back to collections</Link>
    <h1>New collection</h1>
    <p>It starts private and unlisted, with no recipes and no sales. You add the rest in the editor.</p>
    <fieldset className="admin-editor__fields" disabled={!hydrated || pending}>
      <label>Collection title<input value={title} required maxLength={120} onChange={(e) => setTitle(e.target.value)} /></label>
      <label>Address (slug)<input value={effectiveSlug} required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*"
        onChange={(e) => { setSlugEdited(true); setSlug(e.target.value); }} /></label>
      <label>Shelf<select value={shelf} onChange={(e) => setShelf(e.target.value)}>
        {SHELVES.map((s) => <option key={s} value={s}>{shelfLabel(s)}</option>)}
      </select></label>
      <button type="submit" disabled={!title.trim() || !effectiveSlug}>{pending ? "Creating" : "Create private collection"}</button>
    </fieldset>
    {message ? <p role="status">{message}</p> : null}
  </form>;
}
