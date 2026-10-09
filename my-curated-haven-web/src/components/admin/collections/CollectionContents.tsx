"use client";

import { useState } from "react";
import type { CatalogRecipe, Member } from "@/lib/admin/collections/contracts";
import { listCollectionRecipesAction } from "@/lib/admin/collections/actions";

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function CollectionContents({ members, onChange, titles, onTitle, protectedIds, protectionKnown,
  publishedIds, disabled, staleSlugs = [] }: {
  staleSlugs?: string[];
  members: Member[];
  onChange: (members: Member[]) => void;
  titles: Map<string, string>;
  onTitle: (recipeId: string, title: string) => void;
  protectedIds: Set<string>;
  protectionKnown: boolean;
  publishedIds: Set<string>;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogRecipe[] | null>(null);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const included = new Set(members.map((m) => m.recipeId));

  // Without buyer evidence every published recipe is treated as protected (fail closed).
  const isProtected = (id: string) => protectedIds.has(id) || (!protectionKnown && publishedIds.has(id));

  async function search(event: React.FormEvent) {
    event.preventDefault();
    setSearchStatus("Searching recipes");
    const result = await listCollectionRecipesAction(query, 1);
    if (!result.ok) {
      setResults(null);
      setSearchStatus(`Recipe search unavailable (${result.code}, reference ${result.reference}). Try again.`);
      return;
    }
    setResults(result.value.rows);
    setSearchStatus(`${result.value.filteredTotal} ${result.value.filteredTotal === 1 ? "recipe matches" : "recipes match"}.`);
  }

  function add(recipe: CatalogRecipe) {
    if (recipe.contentVersion === null || recipe.activeHash === null || included.has(recipe.recipeId)) return;
    onTitle(recipe.recipeId, recipe.title);
    onChange([...members, { recipeId: recipe.recipeId, recipeSlug: recipe.slug, contentVersion: recipe.contentVersion,
      reviewDigest: recipe.activeHash, tagsDigest: recipe.tagsDigest, placementNote: "", fit: "unverified" }]);
  }

  /** Point stale members at each recipe's current version (the recipe changed after it was added). */
  async function refreshReferences() {
    setSearchStatus("Updating recipe references");
    let next = members;
    for (const slug of staleSlugs) {
      const result = await listCollectionRecipesAction(slug, 1);
      const current = result.ok ? result.value.rows.find((r) => r.slug === slug) : undefined;
      if (!current || current.contentVersion === null || current.activeHash === null) {
        setSearchStatus(`Could not read the current version of ${slug}. Try again.`);
        return;
      }
      next = next.map((m) => m.recipeSlug === slug ? { ...m, contentVersion: current.contentVersion as number,
        reviewDigest: current.activeHash as string, tagsDigest: current.tagsDigest } : m);
    }
    onChange(next);
    setSearchStatus("Recipe references updated. Save the draft to keep them.");
  }

  function update(index: number, patch: Partial<Member>) {
    onChange(members.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  return (
    <section aria-labelledby="collection-contents-editor" className="admin-collection__section">
      <h2 id="collection-contents-editor">Recipes in this draft</h2>
      <p>{members.length} {members.length === 1 ? "recipe" : "recipes"}. Order here is the order on the collection page. There is no minimum or maximum.</p>
      {staleSlugs.length > 0 ? <div className="admin-collection__stale" role="note">
        <p>{staleSlugs.length} {staleSlugs.length === 1 ? "recipe has" : "recipes have"} changed since being added to this draft.</p>
        <button type="button" onClick={refreshReferences} disabled={disabled}>Use current recipe versions</button>
      </div> : null}
      {!protectionKnown ? <p role="note">Buyer information could not be checked, so every published recipe is kept in place.</p> : null}
      {members.length === 0 ? <p>No recipes yet. Search below to add existing recipes.</p> : (
        <ol className="admin-collection__members admin-collection__members--edit" aria-label="Draft recipes">
          {members.map((member, index) => {
            const title = titles.get(member.recipeId) ?? member.recipeSlug;
            const locked = isProtected(member.recipeId);
            const noteId = `member-note-${member.recipeId}`;
            return (
              <li key={member.recipeId} draggable={!disabled}
                onDragStart={() => setDragFrom(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => { if (dragFrom !== null) onChange(move(members, dragFrom, index)); setDragFrom(null); }}>
                <div className="admin-collection__member-head">
                  <span className="admin-collection__member-title">{index + 1}. {title}</span>
                  {locked ? <span className="admin-badge">Purchased · protected</span> : null}
                  {!publishedIds.has(member.recipeId) ? <span className="admin-badge admin-badge--added">Added in draft</span> : null}
                </div>
                <div className="admin-collection__member-controls">
                  <button type="button" onClick={() => onChange(move(members, index, index - 1))} disabled={disabled || index === 0}
                    aria-label={`Move ${title} up`}>Move up</button>
                  <button type="button" onClick={() => onChange(move(members, index, index + 1))}
                    disabled={disabled || index === members.length - 1} aria-label={`Move ${title} down`}>Move down</button>
                  <button type="button" onClick={() => onChange(members.filter((_, i) => i !== index))} disabled={disabled || locked}
                    aria-label={`Remove ${title}`} aria-describedby={locked ? `${noteId}-protected` : undefined}>Remove</button>
                </div>
                {locked ? <p id={`${noteId}-protected`} className="admin-collection__note">
                  Bought in an earlier release. Buyers keep it, so it stays in every update. You can still move it.
                </p> : null}
                <div className="admin-collection__member-fields">
                  <label>Belongs here?<select value={member.fit} disabled={disabled}
                    onChange={(e) => update(index, { fit: e.target.value as Member["fit"] })}>
                    <option value="unverified">Not checked yet</option>
                    <option value="accepted">Yes, it fits</option>
                    <option value="blocked">No, it does not fit</option>
                  </select></label>
                  <label>Placement note<input id={noteId} value={member.placementNote} maxLength={500} disabled={disabled}
                    onChange={(e) => update(index, { placementNote: e.target.value })} /></label>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <form className="admin-collection__search" onSubmit={search} role="search" aria-label="Add recipes">
        <label>Search recipes to add<input type="search" value={query} maxLength={200} disabled={disabled}
          onChange={(e) => setQuery(e.target.value)} /></label>
        <button type="submit" disabled={disabled}>Search</button>
      </form>
      {searchStatus ? <p role="status" aria-live="polite">{searchStatus}</p> : null}
      {results && results.length > 0 ? (
        <ul className="admin-collection__results" aria-label="Recipe search results">
          {results.map((recipe) => {
            const already = included.has(recipe.recipeId);
            const noBody = recipe.contentVersion === null || recipe.activeHash === null;
            return (
              <li key={recipe.recipeId}>
                <div>
                  <strong>{recipe.title}</strong>
                  <span className="admin-collection__note">
                    {" "}{recipe.totalMinutes ? `${recipe.totalMinutes} min · ` : ""}
                    {recipe.allergens.length ? `Contains ${recipe.allergens.join(", ")}` : "No listed allergens"}
                    {recipe.mealLabels.length ? ` · ${recipe.mealLabels.join(", ")}` : ""}
                  </span>
                  {!recipe.reviewed ? <span className="admin-badge admin-badge--attention">Not reviewed · blocks publication</span> : null}
                  {recipe.publication !== "published" ? <span className="admin-badge">Recipe not published</span> : null}
                </div>
                <button type="button" onClick={() => add(recipe)} disabled={disabled || already || noBody}>
                  {already ? "Already in this collection" : noBody ? "No recipe body yet" : `Add ${recipe.title}`}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
