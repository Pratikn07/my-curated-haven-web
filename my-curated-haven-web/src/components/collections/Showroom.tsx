import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { BookCover, OpeningBook } from "@/components/collections/Book";
import type { CollectionRecipe, ShowroomCollection } from "@/lib/collections/types";
import type { RecipeCatalogItem } from "@/lib/data/recipes";
import { collectionFacts } from "@/lib/collections/visibility";
import { usableImageSrc } from "@/lib/recipes/format";

export interface ShowroomEntry {
  collection: ShowroomCollection;
  /** The live price when the commerce database has an offer; the placeholder otherwise. */
  price: string;
}

/** Splits a line into masked words; `em` words get the italic accent. */
export function MaskedWords({ text, em = [], offset = 0 }: { text: string; em?: string[]; offset?: number }) {
  return (
    <>
      {text.split(" ").map((word, index) => {
        const emphasised = em.includes(word.replace(/[.,]/g, ""));
        const inner = (
          <span className="cl-word-in" style={{ "--w": index + offset } as CSSProperties}>
            {word}
          </span>
        );
        return (
          <span key={`${word}-${index}`}>
            <span className="cl-word">{emphasised ? <em>{inner}</em> : inner}</span>{" "}
          </span>
        );
      })}
    </>
  );
}

function minutesText(minutes: number): string {
  if (minutes < 90) return `${minutes} min`;
  return `${Math.round((minutes / 60) * 2) / 2} hours`;
}

/** What a screen reader hears for a page: both faces at once. */
function pageLabel(recipe: CollectionRecipe): string {
  const facts = [
    recipe.minutes !== null ? minutesText(recipe.minutes) : null,
    recipe.freezes ? `freezes ${recipe.freezes}` : null,
    recipe.allergens.length > 0 ? `contains ${recipe.allergens.join(", ")}` : "no listed allergens",
  ].filter(Boolean);
  return `${recipe.title}: ${facts.join(", ")}`;
}

export function ShowroomHero({ entries }: { entries: readonly ShowroomEntry[] }) {
  const first = entries[0]?.collection;
  return (
    <header className="cl-hero">
      <div className="cl-wrap cl-hero-grid">
        <div className="cl-hero-copy">
          <h1 className="cl-display cl-hero-title">
            <MaskedWords text="Little cookbooks for the moments that fill the week." em={["moments"]} />
          </h1>
          <p className="cl-byline">
            Picked by <strong>Bhagyashree</strong> · Recipes by <strong>Tiny Soho</strong>
          </p>
        </div>

        <ul className="cl-stack" aria-label="Collections on the shelf">
          {entries.map(({ collection, price }, index) => (
            <li key={collection.slug} style={{ display: "contents" }}>
              <a className="cl-stack-book" href={`#${collection.slug}`} data-flood-to={collection.slug} aria-label={`${collection.title}: ${collection.recipes.length} recipes, ${price}`}>
                <BookCover book={collection} sizes="(min-width: 1024px) 17rem, 46vw" priority={index < 3} tilt />
                <span className="cl-stack-label" aria-hidden="true">
                  {collection.recipes.length} recipes · {price}
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="cl-hero-actions">
          {first ? (
            <a className="cl-button" href={`#${first.slug}`} data-flood-to={first.slug} data-magnetic>
              Browse the collections
              <ArrowRight className="cl-button-arrow" aria-hidden="true" />
            </a>
          ) : null}
          <Link className="cl-link" href="/recipes">
            Try a free recipe <ArrowRight className="cl-button-arrow" aria-hidden="true" />
          </Link>
        </div>

        <p className="cl-lede cl-hero-note">
          Each collection gathers eight to ten toddler recipes around one part of family life. Pay once, keep it, and the
          recipes we add to it later are yours too.
        </p>
      </div>
    </header>
  );
}

export function ShelfRail({ entries }: { entries: readonly ShowroomEntry[] }) {
  return (
    <nav className="cl-rail" aria-label="Jump to a collection">
      <div className="cl-rail-track">
        <span className="cl-rail-pill" aria-hidden="true" />
        <ul className="cl-rail-list">
          {entries.map(({ collection }, index) => (
            <li key={collection.slug}>
              <a className="cl-rail-link" href={`#${collection.slug}`} data-rail={collection.slug} aria-current={index === 0 ? "true" : undefined}>
                <span className="cl-rail-swatch" data-cloth={collection.cloth} aria-hidden="true" />
                {collection.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export function Chapter({ entry, index }: { entry: ShowroomEntry; index: number }) {
  const { collection, price } = entry;
  const fan = collection.recipes.slice(0, 4);
  const rest = collection.recipes.length - fan.length;
  const headingId = `${collection.slug}-title`;
  return (
    <section className="cl-chapter" id={collection.slug} data-cloth={collection.cloth} data-chapter={collection.slug} data-reveal aria-labelledby={headingId}>
      <div className="cl-wrap cl-chapter-grid">
        <div className="cl-chapter-book">
          <span className="cl-numeral" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <OpeningBook collection={collection} />
        </div>

        <div className="cl-chapter-text">
          <h2 className="cl-chapter-title" id={headingId} tabIndex={-1}>
            <MaskedWords text={collection.title} />
          </h2>
          <p className="cl-tagline">{collection.tagline}</p>
          <p className="cl-story">{collection.story}</p>
          <ul className="cl-facts" aria-label="At a glance">
            {collectionFacts(collection).map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>

        <div className="cl-chapter-pages">
          <ul className="cl-fan" aria-label={`Some of the recipes in ${collection.title}`}>
            {fan.map((recipe, cardIndex) => (
              <li className="cl-fan-card" key={recipe.slug} style={{ "--i": cardIndex } as CSSProperties}>
                <button type="button" className="cl-page" aria-pressed="false" aria-label={pageLabel(recipe)}>
                  <span className="cl-page-front" aria-hidden="true">
                    <span className="cl-fan-photo">
                      <Image src={recipe.image} alt="" fill sizes="(min-width: 1024px) 10rem, 30vw" />
                    </span>
                    <span className="cl-fan-caption">
                      <span>{recipe.title}</span>
                    </span>
                  </span>
                  <span className="cl-page-back" aria-hidden="true">
                    <span className="cl-page-title">{recipe.title}</span>
                    <span className="cl-page-facts">
                      {recipe.minutes !== null ? <span>{minutesText(recipe.minutes)}</span> : null}
                      {recipe.protein ? <span>Built around {recipe.protein.toLowerCase()}</span> : null}
                      {recipe.freezes ? <span>Freezes {recipe.freezes}</span> : null}
                      <span>{recipe.allergens.length > 0 ? `Contains ${recipe.allergens.join(", ")}` : "No listed allergens"}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="cl-chapter-more">
            Tap a page to turn it over{rest > 0 ? ` · ${rest} more inside` : ""}
          </p>
        </div>

        <div className="cl-chapter-buy">
          <p className="cl-price">
            {price} <small>pay once, keep it</small>
          </p>
          <Link className="cl-button" data-tone="cream" href={`/collections/${collection.slug}`} data-magnetic>
            Explore {collection.title}
            <ArrowRight className="cl-button-arrow" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="cl-how" aria-labelledby="how-title">
      <div className="cl-wrap">
        <div className="cl-how-head">
          <h2 className="cl-h2" id="how-title">
            How collections work
          </h2>
          <p className="cl-lede">Start free, buy only what fits your week, and keep everything you buy.</p>
        </div>
        <div className="cl-steps" data-reveal>
          <span className="cl-thread" aria-hidden="true" />
          <ol className="cl-steps-list">
          <li className="cl-step">
            <span className="cl-step-mark" aria-hidden="true">1</span>
            <div>
              <h3>Cook a free recipe</h3>
              <p>Three complete recipes are free to read, cook and print. No account, no card.</p>
            </div>
          </li>
          <li className="cl-step">
            <span className="cl-step-mark" aria-hidden="true">2</span>
            <div>
              <h3>Choose a collection</h3>
              <p>Pay once for the one that fits your week. There is no subscription.</p>
            </div>
          </li>
          <li className="cl-step">
            <span className="cl-step-mark" aria-hidden="true">3</span>
            <div>
              <h3>Keep it as it grows</h3>
              <p>Recipes we add to your collection later are included, and they appear in your library.</p>
            </div>
          </li>
          </ol>
        </div>
        <p className="cl-how-note">All sales are final, so the free recipes are there to help you decide first.</p>
      </div>
    </section>
  );
}

export function FreeRecipes({ recipes, headingId = "free-title" }: { recipes: readonly RecipeCatalogItem[]; headingId?: string }) {
  if (recipes.length === 0) return null;
  return (
    <section className="cl-free" aria-labelledby={headingId}>
      <div className="cl-wrap">
        <div className="cl-free-head">
          <div>
            <h2 className="cl-h2" id={headingId}>
              Start with a free recipe
            </h2>
            <p className="cl-lede">Every recipe in a collection is laid out like these: ingredients, steps, storage, allergens and a page you can print.</p>
          </div>
          <Link className="cl-link" href="/recipes">
            All free recipes <ArrowRight className="cl-button-arrow" aria-hidden="true" />
          </Link>
        </div>
        <ul className="cl-free-grid">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <FreeRecipeCard recipe={recipe} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function FreeRecipeCard({ recipe }: { recipe: RecipeCatalogItem }) {
  const photo = usableImageSrc(recipe.previewImagePath);
  return (
    <Link className="cl-free-card" href={`/recipes/${recipe.slug}`}>
      <div className="cl-free-photo">
        {photo ? <Image src={photo} alt="" fill sizes="(min-width: 720px) 30vw, 6.5rem" /> : null}
      </div>
      <div>
        <h3>{recipe.title}</h3>
        <p className="cl-free-meta">
          Free
          {recipe.totalMinutes ? (
            <>
              {" · "}
              <Clock aria-hidden="true" style={{ display: "inline", width: "0.9em", height: "0.9em", verticalAlign: "-0.1em" }} /> {recipe.totalMinutes} min
            </>
          ) : null}
        </p>
      </div>
    </Link>
  );
}

export function ShowroomClose() {
  return (
    <footer className="cl-close">
      <div className="cl-wrap">
        <p className="cl-display cl-close-line">
          Good enough is <em>exactly</em> enough.
        </p>
        <p>Made in our kitchen. Shared with yours.</p>
        <div className="cl-close-actions">
          <a className="cl-link" href="#main">
            Back to the shelf
          </a>
          <Link className="cl-link" href="/recipes">
            Free recipes <ArrowRight className="cl-button-arrow" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
