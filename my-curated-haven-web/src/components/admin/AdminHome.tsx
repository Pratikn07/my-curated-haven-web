import Link from "next/link";
import type { AdminHome as Home, AttentionFeed, ContinueItem, HomeResult } from "@/lib/admin/home/contracts";
import { formatUtc, workingLabel } from "@/lib/admin/collections/labels";

const ACTIONS: Record<HomeResult["action"], string> = {
  "revision.publish": "Recipe published",
  "recipe.withdraw": "Recipe withdrawn",
  "recipe.correct": "Recipe corrected",
  "collection.publish": "Collection published",
};

function resultState(result: HomeResult): string {
  if (result.noChange) return "No change";
  if (result.refreshState === "pending") return "Committed; refresh pending";
  if (result.refreshState === "complete") return "Committed; public pages updated";
  return "Committed";
}

function resultHref(result: HomeResult): string {
  return result.domain === "recipe" ? `/admin/recipes/${result.objectId}` : `/admin/collections/${result.objectId}`;
}

function continueHref(item: ContinueItem): string {
  return item.domain === "recipe" ? `/admin/recipes/${item.objectId}/edit` : `/admin/collections/${item.objectId}/edit`;
}

function Lane({ id, title, feed }: { id: string; title: string; feed: AttentionFeed }) {
  if (feed.state === "unauthorised") return null;
  const inventory = <Link href={feed.inventoryHref}>Open {title.toLowerCase()}</Link>;
  return <section aria-labelledby={id} className="admin-home__lane">
    <h3 id={id}>{title}</h3>
    {feed.state === "unavailable" ? <p role="status">{title} needing a decision are unavailable ({feed.code}, reference {feed.reference}).
      This is unknown, not zero. {inventory}</p> : <>
      <p className="admin-home__counts">{feed.counts.map((c) => `${c.label}: ${c.count}`).join(" · ")}
        <span> · checked at {formatUtc(feed.checkedAt)}</span></p>
      {feed.rows.length === 0 ? <p>Nothing needs your action right now. {inventory}</p> : <ul className="admin-home__rows" aria-label={`${title} needing a decision`}>
        {feed.rows.map((row) => <li key={row.key}>
          <div>
            <p className="admin-home__title">{row.title}</p>
            <p>{row.reason}</p>
            <p className="admin-home__meta">{row.state} · last change {formatUtc(row.changedAt)}</p>
          </div>
          <Link href={row.href} aria-label={`Open ${row.title}`}>Open</Link>
        </li>)}
      </ul>}
      {feed.total > feed.rows.length ? <p>{inventory}</p> : null}
    </>}
  </section>;
}

/** Publishing Home: what needs a decision, what can be continued, and what recently completed. */
export default function AdminHome({ home }: { home: Home }) {
  const results = home.results;
  const continueWork = home.continueWork;
  return (
    <article className="admin-home">
      <header className="admin-record__header">
        <p className="admin-record__eyebrow">Workspace</p>
        <h1>Home</h1>
        <p>What needs a decision, what you can continue, and what recently completed.</p>
      </header>

      <section aria-labelledby="home-publishing" className="admin-collection__section">
        <h2 id="home-publishing">Publishing</h2>
        <Lane id="home-recipes" title="Recipes" feed={home.recipes} />
        <Lane id="home-collections" title="Collections" feed={home.collections} />
      </section>

      {continueWork ? <section aria-labelledby="home-continue" className="admin-collection__section">
        <h2 id="home-continue">Continue work</h2>
        {!continueWork.ok ? <p role="status">Private drafts are unavailable ({continueWork.code}, reference {continueWork.reference}).</p>
          : continueWork.value.length === 0 ? <p>No private drafts to continue.</p>
          : <ul className="admin-home__rows" aria-label="Private drafts">
            {continueWork.value.map((item) => <li key={`${item.domain}:${item.objectId}`}>
              <div>
                <p className="admin-home__title">{item.title}</p>
                <p className="admin-home__meta">{item.domain === "recipe" ? "Recipe" : "Collection"} · {workingLabel(item.state)} ·
                  revision {item.version} · saved {item.savedByYou ? "by you" : "by someone else"} {formatUtc(item.savedAt)}</p>
              </div>
              <Link href={continueHref(item)} aria-label={`Continue ${item.title}`}>Continue</Link>
            </li>)}
          </ul>}
      </section> : null}

      <section aria-labelledby="home-results" className="admin-collection__section">
        <h2 id="home-results">Recent results</h2>
        {!results.ok ? <p role="status">Recent results are unavailable ({results.code}, reference {results.reference}).</p>
          : results.value.length === 0 ? <p>You have no recent publication results.</p>
          : <ul className="admin-home__rows" aria-label="Your recent results">
            {results.value.map((result) => <li key={result.operationId}>
              <div>
                <p className="admin-home__title">{result.title}</p>
                <p>{ACTIONS[result.action]}: {resultState(result)}</p>
                <p className="admin-home__meta"><time dateTime={result.committedAt}>{formatUtc(result.committedAt)}</time></p>
              </div>
              <Link href={resultHref(result)} aria-label={`Open ${result.title}`}>Open</Link>
            </li>)}
          </ul>}
      </section>
    </article>
  );
}
