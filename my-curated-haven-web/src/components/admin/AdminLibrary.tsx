import Link from "next/link";
import Image from "next/image";
import type { LibraryResult, RecipeRow } from "@/lib/admin/contracts";
import { usableImageSrc } from "@/lib/recipes/format";
import AdminLibraryFocus from "./AdminLibraryFocus";

function recipeHref(row: RecipeRow, returnTo: string): string {
  return `/admin/recipes/${row.id}?${new URLSearchParams({ returnTo, selected: row.id })}`;
}

function pageHref(returnTo: string, page: number): string {
  const url = new URL(returnTo, "https://admin.local");
  url.searchParams.set("page", String(page));
  return `${url.pathname}${url.search}`;
}

function RecipeTitle({ row, returnTo, selectedId }: { row: RecipeRow; returnTo: string; selectedId: string | null }) {
  return <Link href={recipeHref(row, returnTo)} data-selected={selectedId === row.id ? "true" : undefined}>{row.title}</Link>;
}

function RecipeThumbnail({ row }: { row: RecipeRow }) {
  const src = usableImageSrc(row.imagePath);
  return src
    ? <Image className="admin-library__thumbnail" src={src} alt="" width={72} height={72} />
    : <span className="admin-library__image-state">No image</span>;
}

export default function AdminLibrary({ result, returnTo, selectedId }: {
  result: LibraryResult;
  returnTo: string;
  selectedId: string | null;
}) {
  const { query, rows } = result;
  const filtered = Boolean(query.q || query.collections.length || query.publication.length || query.review.length || query.view !== "all");
  const lastPage = Math.max(1, Math.ceil(result.filteredTotal / query.pageSize));
  return (
    <AdminLibraryFocus selectedId={selectedId}>
      <section className="admin-library" aria-label="Recipe library">
        <header className="admin-library__header">
          <p className="admin-record__eyebrow">Publishing</p>
          <h1>Recipe library</h1>
          <p>Find an existing recipe, inspect what is live, and continue its private work.</p>
        </header>
        <form className="admin-library__filters" method="get" action="/admin/recipes">
          <label>Search recipes<input name="q" type="search" defaultValue={query.q} maxLength={200} /></label>
          <label>View<select name="view" defaultValue={query.view}>
            <option value="all">All recipes</option><option value="attention">Needs attention</option>
            <option value="awaiting_review">Awaiting review</option><option value="ready">Ready to publish</option>
            <option value="published">Published</option><option value="withdrawn">Withdrawn</option>
          </select></label>
          <label>Publication<select name="publication" defaultValue={query.publication[0] ?? ""}>
            <option value="">Any state</option><option value="draft">Draft</option>
            <option value="published">Published</option><option value="withdrawn">Withdrawn</option>
          </select></label>
          <label>Review<select name="review" defaultValue={query.review[0] ?? ""}>
            <option value="">Any state</option><option value="unreviewed">Unreviewed</option>
            <option value="submitted">Submitted</option><option value="approved">Approved</option>
            <option value="changes_requested">Changes requested</option><option value="rejected">Rejected</option>
          </select></label>
          <label>Collection ID<input name="collections" defaultValue={query.collections.join(",")} /></label>
          <div className="admin-library__filter-actions">
            <button type="submit">Apply filters</button>
            {filtered ? <Link href="/admin/recipes">Reset filters</Link> : null}
          </div>
        </form>
        <div className="admin-library__result-head">
          <h2>{result.filteredTotal} matching {result.filteredTotal === 1 ? "recipe" : "recipes"}</h2>
          <p>Page {query.page} of {lastPage} · Checked at {new Date(result.checkedAt).toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" })}</p>
        </div>
        {result.dependencyChecks.some((check) => check.state === "unknown") ? <p role="status">Some checks need verification. Retry before making a change.</p> : null}
        {rows.length === 0 ? <p role="status">{filtered ? "No recipes match these filters." : "No recipes are available in this library."}</p> : (
          <>
            <div className="admin-library__table-wrap"><table className="admin-library__table">
              <thead><tr><th scope="col">Recipe</th><th scope="col">Live state</th><th scope="col">Review state</th><th scope="col">Collections</th><th scope="col">Changed</th></tr></thead>
              <tbody>{rows.map((row) => <tr key={row.id}>
                <th scope="row"><span className="admin-library__recipe-cell"><RecipeThumbnail row={row} /><RecipeTitle row={row} returnTo={returnTo} selectedId={selectedId} /></span></th>
                <td>{row.publication}</td><td>{row.readiness.review}</td>
                <td>{row.collections.length ? row.collections.map((collection) => collection.title).join(", ") : "None"}</td>
                <td>{new Date(row.changedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</td>
              </tr>)}</tbody>
            </table></div>
            <div className="admin-library__cards">{rows.map((row) => <article key={row.id} className="admin-library__card">
              <RecipeThumbnail row={row} />
              <h3><RecipeTitle row={row} returnTo={returnTo} selectedId={selectedId} /></h3>
              <dl>
                <div><dt>Live</dt><dd>{row.publication}</dd></div>
                <div><dt>Review</dt><dd>{row.readiness.review}</dd></div>
                <div><dt>Collections</dt><dd>{row.collections.length ? row.collections.map((collection) => collection.title).join(", ") : "None"}</dd></div>
                <div><dt>Changed</dt><dd>{new Date(row.changedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</dd></div>
              </dl>
            </article>)}</div>
          </>
        )}
        <nav aria-label="Recipe pages" className="admin-library__pagination">
          {query.page > 1 ? <Link href={pageHref(returnTo, query.page - 1)}>Previous page</Link> : null}
          {query.page < lastPage ? <Link href={pageHref(returnTo, query.page + 1)}>Next page</Link> : null}
        </nav>
      </section>
    </AdminLibraryFocus>
  );
}
