import type { CollectionRow, CollectionState, CollectionSnapshot, SourceMode } from "./contracts";

/**
 * Plain-language labels for the separate collection facts. Each label comes from exactly one
 * field: listing never implies sales, publication never implies listing.
 */

export function listingLabel(state: CollectionSnapshot["listingState"]): string {
  return { listed: "Listed", unlisted: "Unlisted", retired: "Retired" }[state];
}

export function availabilityLabel(state: CollectionSnapshot["availability"]): string {
  return state === "open" ? "Open" : "Coming soon";
}

export function commerceLabel(state: CollectionRow["commerceState"]): string {
  return {
    enabled: "Sales enabled",
    disabled: "Sales disabled",
    no_offer: "No offer",
    unavailable: "Sales status unavailable",
  }[state];
}

export function workingLabel(state: CollectionState | null): string {
  if (state === null) return "No private draft";
  return {
    draft: "Private draft",
    submitted: "Submitted for review",
    approved: "Approved, not published",
    changes_requested: "Changes requested",
    rejected: "Rejected",
    published: "Published",
    superseded: "Superseded",
    discarded: "Discarded",
  }[state];
}

export function publicationLabel(publicationId: string | null, count: number): string {
  if (publicationId === null) return "Not published";
  return `Published · ${count} ${count === 1 ? "recipe" : "recipes"}`;
}

export function sourceLabel(mode: SourceMode): string {
  return mode === "legacy"
    ? "The public page still comes from the site configuration."
    : "The public page comes from the collection database.";
}

export function stageLabel(stage: CollectionSnapshot["stage"]): string {
  const months = (n: number) => (n >= 24 && n % 12 === 0 ? `${n / 12} y` : `${n} m`);
  if (stage.min === null && stage.max === null) return "All ages";
  if (stage.min !== null && stage.max === null) return `${months(stage.min)} and older`;
  if (stage.min !== null && stage.max !== null) return `${months(stage.min)} – ${months(stage.max)}`;
  return "Unspecified";
}

export function seriesLabel(series: CollectionSnapshot["series"]): string {
  if (!series) return "Not in a series";
  const name = series.key === "meal-prep" ? "Meal Prep" : series.key[0].toUpperCase() + series.key.slice(1);
  return `${name} series · volume ${series.volume}`;
}

export function shelfLabel(shelf: string): string {
  const known: Record<string, string> = {
    mornings: "Mornings", "everyday-meals": "Everyday meals", "cook-once": "Cook once", nourish: "Nourish",
    "snacks-and-treats": "Snacks & treats", "seasons-and-parties": "Seasons & parties",
  };
  return known[shelf] ?? (shelf ? shelf : "No shelf");
}

export function formatUtc(value: string): string {
  return new Date(value).toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" });
}
