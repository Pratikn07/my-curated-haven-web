import Link from "next/link";
import type { CollectionLibrary as Library, CollectionQuery, CollectionRow } from "@/lib/admin/collections/contracts";
import { serializeCollectionQuery } from "@/lib/admin/collections/query";
import {
  availabilityLabel, commerceLabel, formatUtc, listingLabel, publicationLabel, shelfLabel, workingLabel,
} from "@/lib/admin/collections/labels";
import AdminLibraryFocus from "../AdminLibraryFocus";

function listHref(query: CollectionQuery, page: number = query.page): string {
  const params = serializeCollectionQuery({ ...query, page });
  return `/admin/collections${params.size ? `?${params}` : ""}`;
}

function collectionHref(row: CollectionRow, returnTo: string): string {
  return `/admin/collections/${row.collectionId}?${new URLSearchParams({ returnTo })}`;
}

function Title({ row, returnTo, selectedId }: { row: CollectionRow; returnTo: string; selectedId: string | null }) {
  return <Link href={collectionHref(row, returnTo)} data-selected={selectedId === row.collectionId ? "true" : undefined}>
    {row.title || row.slug}
  </Link>;
}

function draftText(row: CollectionRow): string {
  const label = workingLabel(row.workingState);
  return row.draftCount === null ? label : `${label} · ${row.draftCount} ${row.draftCount === 1 ? "recipe" : "recipes"}`;
}

export default function CollectionLibrary({ library, query, selectedId, canCreate = false }: {
  library: Library;
  query: CollectionQuery;
  selectedId: string | null;
  canCreate?: boolean;
}) {
  const { rows } = library;
  const returnTo = listHref(query);
  const filtered = Boolean(query.q || query.shelf.length || query.stage.length || query.status.length
    || query.draft !== null || query.attention);
  const lastPage = Math.max(1, Math.ceil(library.filteredTotal / library.pageSize));
  return (
    <AdminLibraryFocus selectedId={selectedId}>
      <section className="admin-library" aria-label="Collection library">
        <header className="admin-library__header">
          <p className="admin-record__eyebrow">Publishing</p>
          <h1>Collections</h1>
          <p>See what each collection shows today, whether a private draft is waiting, and whether it is for sale. These are separate facts.</p>
          {canCreate ? <Link href="/admin/collections/new" className="admin-library__new">New collection</Link> : null}
        </header>
        <form className="admin-library__filters" method="get" action="/admin/collections">
          <label>Search collections<input name="q" type="search" defaultValue={query.q} maxLength={200} /></label>
          <label>Shelf<select name="shelf" defaultValue={query.shelf[0] ?? ""}>
            <option value="">Any shelf</option><option value="mornings">Mornings</option>
            <option value="everyday-meals">Everyday meals</option><option value="cook-once">Cook once</option>
            <option value="nourish">Nourish</option><option value="snacks-and-treats">Snacks &amp; treats</option>
            <option value="seasons-and-parties">Seasons &amp; parties</option>
          </select></label>
          <label>Age<select name="stage" defaultValue={query.stage[0] ?? ""}>
            <option value="">Any age</option><option value="6-12m">6–12 m</option>
            <option value="1-2y">1–2 y</option><option value="2-4y">2–4 y</option>
          </select></label>
          <label>Status<select name="status" defaultValue={query.status[0] ?? ""}>
            <option value="">Any status</option><option value="published">Published</option>
            <option value="unpublished">Not published</option><option value="listed">Listed</option>
            <option value="unlisted">Unlisted</option><option value="retired">Retired</option>
          </select></label>
          <label>Private draft<select name="draft" defaultValue={query.draft === null ? "" : String(query.draft)}>
            <option value="">Either</option><option value="true">Has a draft</option><option value="false">No draft</option>
          </select></label>
          <label className="admin-library__check"><input type="checkbox" name="attention" value="1" defaultChecked={query.attention} />Needs attention</label>
          <div className="admin-library__filter-actions">
            <button type="submit">Apply filters</button>
            {filtered ? <Link href="/admin/collections">Reset filters</Link> : null}
          </div>
        </form>
        <div className="admin-library__result-head">
          <h2>{library.filteredTotal} matching {library.filteredTotal === 1 ? "collection" : "collections"}</h2>
          <p>Page {library.page} of {lastPage} · Checked at {formatUtc(library.checkedAt)}</p>
        </div>
        {rows.length === 0 ? <p role="status">{filtered ? "No collections match these filters." : "No collections exist yet."}</p> : (
          <>
            <div className="admin-library__table-wrap"><table className="admin-library__table" aria-label="Collections">
              <thead><tr>
                <th scope="col">Collection</th><th scope="col">Shelf</th><th scope="col">Published</th>
                <th scope="col">Listing</th><th scope="col">Browsing</th><th scope="col">Sales</th>
                <th scope="col">Private draft</th><th scope="col">Changed</th>
              </tr></thead>
              <tbody>{rows.map((row) => <tr key={row.collectionId}>
                <th scope="row"><Title row={row} returnTo={returnTo} selectedId={selectedId} />
                  {row.needsAttention ? <span className="admin-badge admin-badge--attention">Needs attention</span> : null}</th>
                <td>{shelfLabel(row.shelf)}</td>
                <td>{publicationLabel(row.publicationId, row.publishedCount)}</td>
                <td>{listingLabel(row.listingState)}</td>
                <td>{availabilityLabel(row.availability)}</td>
                <td>{commerceLabel(row.commerceState)}</td>
                <td>{draftText(row)}</td>
                <td>{new Date(row.changedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</td>
              </tr>)}</tbody>
            </table></div>
            <div className="admin-library__cards">{rows.map((row) => <article key={row.collectionId} className="admin-library__card">
              <h3><Title row={row} returnTo={returnTo} selectedId={selectedId} /></h3>
              {row.needsAttention ? <p className="admin-badge admin-badge--attention">Needs attention</p> : null}
              <dl>
                <div><dt>Shelf</dt><dd>{shelfLabel(row.shelf)}</dd></div>
                <div><dt>Published</dt><dd>{publicationLabel(row.publicationId, row.publishedCount)}</dd></div>
                <div><dt>Listing</dt><dd>{listingLabel(row.listingState)}</dd></div>
                <div><dt>Browsing</dt><dd>{availabilityLabel(row.availability)}</dd></div>
                <div><dt>Sales</dt><dd>{commerceLabel(row.commerceState)}</dd></div>
                <div><dt>Private draft</dt><dd>{draftText(row)}</dd></div>
              </dl>
            </article>)}</div>
          </>
        )}
        <nav aria-label="Collection pages" className="admin-library__pagination">
          {query.page > 1 ? <Link href={listHref(query, query.page - 1)}>Previous page</Link> : null}
          {query.page < lastPage ? <Link href={listHref(query, query.page + 1)}>Next page</Link> : null}
        </nav>
      </section>
    </AdminLibraryFocus>
  );
}
