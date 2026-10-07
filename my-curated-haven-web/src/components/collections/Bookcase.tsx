"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { BookCover } from "@/components/collections/Book";
import { isOpeningBook, openBook, shouldOpenBook } from "@/components/collections/motion/openBook";
import {
  FILTERS,
  STAGE_OPTIONS,
  isStageKey,
  matchingBooks,
  stageLabel,
  type BookcaseEntry,
  type FilterKey,
  type StageKey,
} from "@/lib/collections/bookcase";
import type { SeriesKey, ShelfKey } from "@/lib/collections/types";

interface BookcaseProps {
  entries: BookcaseEntry[];
  shelves: { key: ShelfKey; title: string }[];
  series: { key: SeriesKey; title: string; lede: string; volumes: string[] }[];
  featured: string | null;
}

/** "1 recipe", "8 recipes" (kept here so the bookcase does not pull the collection data into the browser). */
function recipeCount(count: number): string {
  return `${count} recipe${count === 1 ? "" : "s"}`;
}

/** The parent's chosen age, remembered on this device only. */
const STAGE_STORAGE_KEY = "mch:collections-stage";

function readInitial(): { stage: StageKey; filters: FilterKey[] } {
  const params = new URLSearchParams(window.location.search);
  let stage: StageKey = "all";
  const fromUrl = params.get("stage");
  if (isStageKey(fromUrl)) stage = fromUrl;
  else {
    try {
      const saved = window.localStorage.getItem(STAGE_STORAGE_KEY);
      if (isStageKey(saved)) stage = saved;
    } catch {
      // Storage can be blocked (private mode, in-app browsers); the default stands.
    }
  }
  const known = new Set<string>(FILTERS.map((filter) => filter.key));
  const filters = (params.get("f") ?? "")
    .split(",")
    .filter((key): key is FilterKey => known.has(key));
  return { stage, filters };
}

/**
 * The bookcase: "Cooking for" an age, filter chips, then either the shelves
 * (no chips on) or a grid of the books that match. Rendered on the server with
 * every book showing, so the page reads fully before any script runs; the age
 * and chips are kept in the address so a shared link opens the same view.
 */
export default function Bookcase({ entries, shelves, series, featured }: BookcaseProps) {
  const [stage, setStage] = useState<StageKey>("all");
  const [filters, setFilters] = useState<FilterKey[]>([]);

  useEffect(() => {
    // Restore from the address or this device once mounted (the server render shows everything).
    const initial = readInitial();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL and storage after hydration
    setStage(initial.stage);
    setFilters(initial.filters);
  }, []);

  function update(nextStage: StageKey, nextFilters: FilterKey[]) {
    setStage(nextStage);
    setFilters(nextFilters);
    const params = new URLSearchParams(window.location.search);
    if (nextStage === "all") params.delete("stage");
    else params.set("stage", nextStage);
    if (nextFilters.length) params.set("f", nextFilters.join(","));
    else params.delete("f");
    const query = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    try {
      window.localStorage.setItem(STAGE_STORAGE_KEY, nextStage);
    } catch {
      // Not remembered; the address still carries it.
    }
  }

  function toggleFilter(key: FilterKey) {
    update(stage, filters.includes(key) ? filters.filter((filter) => filter !== key) : [...filters, key]);
  }

  const visible = useMemo(() => matchingBooks(entries, stage, filters), [entries, stage, filters]);
  const filtering = filters.length > 0;
  const featuredEntry = !filtering ? visible.find((entry) => entry.slug === featured && entry.open) : undefined;

  return (
    <>
      <section className="bk-controls" aria-label="Find a collection">
        <div className="bk-stage" role="group" aria-labelledby="bk-stage-label">
          <span id="bk-stage-label" className="bk-stage-label">
            Cooking for
          </span>
          <div className="bk-stage-options">
            {STAGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className="bk-stage-option"
                aria-pressed={stage === option.key}
                onClick={() => update(option.key, filters)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bk-chips" role="group" aria-label="Filter collections">
          {/* Chips that are on come first, so a chosen one is never scrolled out of sight. */}
          {[...FILTERS.filter((f) => filters.includes(f.key)), ...FILTERS.filter((f) => !filters.includes(f.key))].map((filter) => {
            const active = filters.includes(filter.key);
            const wouldMatch = active ? visible.length : matchingBooks(entries, stage, [...filters, filter.key]).length;
            const empty = !active && wouldMatch === 0;
            return (
              <button
                key={filter.key}
                type="button"
                className="bk-chip"
                aria-pressed={active}
                disabled={empty}
                onClick={() => toggleFilter(filter.key)}
              >
                {filter.label}
                {empty ? <span className="bk-chip-count"> (0)</span> : null}
                {active ? (
                  <span className="bk-chip-x" aria-hidden="true">
                    ×
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {filtering ? (
        <section className="bk-results" aria-labelledby="bk-results-title">
          <div className="bk-results-head">
            <h2 id="bk-results-title" aria-live="polite">
              {visible.length === 1 ? "1 collection matches" : `${visible.length} collections match`}
            </h2>
            <button type="button" className="bk-clear" onClick={() => update(stage, [])}>
              Clear all
            </button>
          </div>
          <ul className="bk-grid">
            {visible.map((entry, index) => (
              <li key={entry.slug} style={{ "--i": index } as CSSProperties}>
                <BookTile entry={entry} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          {featuredEntry ? <Featured entry={featuredEntry} /> : null}
          {shelves.map((shelf) => {
            const books = visible.filter((entry) => entry.shelf === shelf.key);
            if (books.length === 0) return null;
            return (
              <section key={shelf.key} className="bk-shelf" aria-labelledby={`bk-shelf-${shelf.key}`}>
                <h2 id={`bk-shelf-${shelf.key}`} className="bk-shelf-title">
                  {shelf.title}
                </h2>
                {/* A row of only coming-soon books has nothing to tab to, so the row itself takes focus to scroll by keyboard. */}
                <ul
                  className="bk-row"
                  tabIndex={books.some((entry) => entry.open) ? undefined : 0}
                  aria-labelledby={`bk-shelf-${shelf.key}`}
                >
                  {books.map((entry, index) => (
                    <li key={entry.slug} style={{ "--i": index } as CSSProperties}>
                      <BookTile entry={entry} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {visible.length === 0 ? <p className="bk-empty">No collections for this age yet.</p> : null}
        </>
      )}

      <section className="bk-series" aria-labelledby="bk-series-title">
        <h2 id="bk-series-title" className="bk-shelf-title">
          Series that grow with your child
        </h2>
        <ul className="bk-series-list">
          {series.map((item) => (
            <li key={item.key}>
              <Link className="bk-series-card" href={`/collections/series/${item.key}${stage === "all" ? "" : `?stage=${stage}`}`}>
                <span className="bk-series-name">{item.title}</span>
                <span className="bk-series-lede">{item.lede}</span>
                <span className="bk-series-volumes">{item.volumes.join(" · ")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/**
 * Tapping an open book lifts it, opens the cover to its contents and hands over
 * to the collection page (motion/openBook.ts). Touching it starts loading the page.
 */
function useOpenBook(entry: BookcaseEntry) {
  const router = useRouter();
  const href = `/collections/${entry.slug}`;
  return {
    onPointerDown: () => router.prefetch(href),
    onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (isOpeningBook()) {
        event.preventDefault();
        return;
      }
      if (!shouldOpenBook(event.nativeEvent)) return;
      event.preventDefault();
      openBook({
        link: event.currentTarget,
        title: entry.title,
        contents: entry.contents,
        total: entry.recipeCount,
        cloth: entry.cloth,
        navigate: () => router.push(href),
      });
    },
  };
}

function BookTile({ entry }: { entry: BookcaseEntry }) {
  const opener = useOpenBook(entry);
  const book = { title: entry.title, cover: entry.cover, cloth: entry.cloth };
  if (!entry.open) {
    return (
      <div className="bk-book" data-soon="" role="group" aria-label={`${entry.title}, coming soon`}>
        <span className="bk-book-cover" aria-hidden="true">
          <BookCover book={book} sizes="(min-width: 768px) 10rem, 34vw" />
        </span>
        <span className="bk-book-title" aria-hidden="true">
          {entry.title}
        </span>
        <span className="bk-book-meta" aria-hidden="true">
          Coming soon
        </span>
      </div>
    );
  }
  return (
    <Link className="bk-book" href={`/collections/${entry.slug}`} {...opener}>
      <span className="bk-book-cover">
        <BookCover book={book} sizes="(min-width: 768px) 10rem, 34vw" tilt />
      </span>
      <span className="bk-book-title">{entry.title}</span>
      <span className="bk-book-meta">
        {recipeCount(entry.recipeCount)} · {entry.price}
      </span>
    </Link>
  );
}

function Featured({ entry }: { entry: BookcaseEntry }) {
  const opener = useOpenBook(entry);
  return (
    <section className="bk-featured" data-cloth={entry.cloth} aria-labelledby="bk-featured-title">
      <Link className="bk-featured-link" href={`/collections/${entry.slug}`} {...opener}>
        <span className="bk-featured-cover">
          <BookCover book={{ title: entry.title, cover: entry.cover, cloth: entry.cloth }} sizes="(min-width: 768px) 12rem, 38vw" priority />
        </span>
        <span className="bk-featured-text">
          <span className="bk-eyebrow">Featured this month</span>
          <span id="bk-featured-title" className="bk-featured-title">
            {entry.title}
          </span>
          <span className="bk-featured-tagline">{entry.tagline}</span>
          <span className="bk-featured-meta">
            {stageLabel(entry.stage)} · {recipeCount(entry.recipeCount)} · {entry.price}
          </span>
        </span>
      </Link>
    </section>
  );
}
