import Image from "next/image";
import Link from "next/link";
import { STORY_ROOM_LABEL, type StoryConfig } from "@/config/stories";
import type { StoryOfferData } from "@/lib/data/load-story";
import type { RecipeCatalogItem, RecipeWithBody } from "@/lib/data/recipes";
import { getAllergenDisplay } from "@/lib/recipes/allergen-display";
import { formatIngredient, normalizeInstructions, usableImageSrc } from "@/lib/recipes/format";

function recipeCount(count: number): string {
  return `${count} ${count === 1 ? "recipe" : "recipes"}`;
}

/** "Get the recipe · 40 min", used by the card button and the sticky button. */
export function recipeActionLabel(recipe: RecipeWithBody): string {
  const minutes = recipe.catalog.totalMinutes;
  return minutes ? `Get the recipe · ${minutes} min` : "Get the recipe";
}

function allergenLine(recipe: RecipeWithBody): string | null {
  const display = getAllergenDisplay(recipe.body.allergenReviewState, recipe.body.allergens);
  if (display.kind === "reviewed_listed") return `Contains ${display.allergens.join(", ")}.`;
  if (display.kind === "reviewed_no_allergens") return "No allergens listed.";
  return display.allergens.length > 0 ? `Allergens listed: ${display.allergens.join(", ")}.` : null;
}

function metaLine(story: StoryConfig, recipe: RecipeWithBody): string {
  const parts = [story.audience];
  if (recipe.catalog.totalMinutes) parts.push(`${recipe.catalog.totalMinutes} min`);
  if (recipe.body.yield) parts.push(recipe.body.yield);
  return parts.join(" · ");
}

/** 1 and 2: the post's photo and words on a clay recipe card, with the recipe right inside it. */
export function StoryCard({ story, recipe }: { story: StoryConfig; recipe: RecipeWithBody }) {
  const { catalog, body } = recipe;
  const cover = story.cover ?? (usableImageSrc(catalog.previewImagePath) ? { src: catalog.previewImagePath, alt: catalog.title } : null);
  const allergens = allergenLine(recipe);
  const steps = normalizeInstructions(body.instructions);

  return (
    <div className="story-stage" data-has-photo={cover ? "true" : "false"}>
      <div className="story-photo">
        {cover ? (
          <Image src={cover.src} alt={cover.alt} fill priority sizes="(min-width: 640px) 640px, 100vw" className="story-photo-img" />
        ) : null}
        <Link href="/#room-kitchen" className="story-door">
          <span className="story-door-room">{STORY_ROOM_LABEL[story.room]}</span>
          <span className="story-door-house">· My Curated Haven</span>
        </Link>
      </div>

      <article className="story-card" aria-labelledby="story-title">
        <p className="story-eyebrow">From the Kitchen</p>
        <h1 id="story-title" className="story-title">{story.headline}</h1>
        <p className="story-meta">{metaLine(story, recipe)}</p>
        {catalog.dietLabels.length > 0 ? (
          <ul className="story-chips" aria-label="Diet">
            {catalog.dietLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        ) : null}
        {allergens ? <p className="story-allergens">{allergens}</p> : null}
        {story.pickedBy ? (
          <p className="story-byline">
            <span className="story-byline-mark" aria-hidden="true">{story.pickedBy.charAt(0)}</span>
            <span>
              Picked by <b>{story.pickedBy}</b> · recipe by Tiny Soho
            </span>
          </p>
        ) : null}
        <a
          id="story-card-action"
          href="#story-recipe"
          className="story-button"
          data-story-action="recipe_jump"
          data-story-placement="card"
        >
          {recipeActionLabel(recipe)} <span aria-hidden="true">↓</span>
        </a>

        <section id="story-recipe" className="story-recipe" aria-labelledby="story-recipe-heading">
          <h2 id="story-recipe-heading">{catalog.title}</h2>
          <h3>Ingredients</h3>
          <ul>
            {body.ingredients.map((ingredient, index) => (
              <li key={index}>{formatIngredient(ingredient)}</li>
            ))}
          </ul>
          <h3>Steps</h3>
          <ol>
            {steps.map((step) => (
              <li key={step.step}>{step.text}</li>
            ))}
          </ol>
          {body.storageNotes ? (
            <>
              <h3>Storing it</h3>
              <p className="story-storage">{body.storageNotes}</p>
            </>
          ) : null}
          <Link
            href={`/recipes/${catalog.slug}`}
            className="story-text-link"
            data-story-action="full_recipe"
            data-story-placement="recipe"
          >
            Open the full recipe page to print or save it <span aria-hidden="true">→</span>
          </Link>
        </section>
      </article>
    </div>
  );
}

/** 3: a little more than they asked for, a card made to be screenshotted. */
export function StorySaveCard({ recipe }: { recipe: RecipeWithBody }) {
  const { catalog, body } = recipe;
  const allergens = allergenLine(recipe);
  return (
    <section className="story-block" aria-labelledby="story-save-heading">
      <h2 id="story-save-heading" className="story-block-heading">Keep the shopping list</h2>
      <figure className="story-save-card">
        <div className="story-save-head">
          <b>{catalog.title}</b>
          {catalog.totalMinutes ? <span>{catalog.totalMinutes} min</span> : null}
        </div>
        <ul>
          {body.ingredients.map((ingredient, index) => (
            <li key={index}>{formatIngredient(ingredient)}</li>
          ))}
        </ul>
        <figcaption>
          {allergens ? `${allergens} ` : ""}mycuratedhaven.com
        </figcaption>
      </figure>
      <p className="story-note">
        <b>Screenshot this card</b> to keep the ingredients. No account needed.
      </p>
      <p className="story-note">
        To print inside Instagram, tap <b>⋯</b> at the top, choose <b>Open in browser</b>, then open the full recipe page.
      </p>
    </section>
  );
}

/** 4: the person behind the kitchen, after the recipe and before any offer. */
export function StoryAbout({ story }: { story: StoryConfig }) {
  const about = story.about;
  if (!about) return null;
  return (
    <section className="story-block" aria-labelledby="story-about-heading">
      <h2 id="story-about-heading" className="story-block-label">Who’s behind this kitchen</h2>
      <figure className="story-about">
        {about.photo ? (
          <div className="story-about-photo">
            <Image src={about.photo.src} alt={about.photo.alt} fill sizes="(min-width: 640px) 600px, 100vw" />
          </div>
        ) : null}
        <blockquote>
          {about.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </blockquote>
        <figcaption>
          <span className="story-signature">{about.name}</span>
          <Link href="/about" className="story-text-link" data-story-action="about" data-story-placement="about">
            Read our story
          </Link>
        </figcaption>
      </figure>
    </section>
  );
}

/** 5: one honest offer, shown only when the collection can really be bought. */
export function StoryOffer({ story, offer }: { story: StoryConfig; offer: StoryOfferData }) {
  if (!story.offer) return null;
  return (
    <section className="story-block" aria-labelledby="story-offer-heading">
      <div className="story-offer">
        <h2 id="story-offer-heading" className="story-offer-heading">{story.offer.heading}</h2>
        {offer.preview.length > 0 ? (
          <ul className="story-offer-tiles" aria-label={`Recipes in ${offer.collectionTitle}`}>
            {offer.preview.map((recipe) => {
              const src = usableImageSrc(recipe.previewImagePath);
              return (
                <li key={recipe.id}>
                  <div className="story-offer-photo">
                    {src ? <Image src={src} alt="" fill sizes="(min-width: 640px) 280px, 45vw" /> : null}
                    <span>In the collection</span>
                  </div>
                  <b>{recipe.title}</b>
                </li>
              );
            })}
          </ul>
        ) : null}
        <p className="story-note">Each one is laid out like this recipe: ingredients, steps, allergens and how to store it.</p>
        <p className="story-note">{story.offer.growsLine}</p>
        <div className="story-offer-price">
          <b>{offer.collectionTitle}</b>
          <span>
            {recipeCount(offer.recipeCount)} · {offer.formattedPrice}
            <br />
            one-time purchase
          </span>
        </div>
        <Link
          href={`/collections/${offer.collectionSlug}`}
          className="story-button"
          data-story-action="collection"
          data-story-placement="offer"
        >
          See what’s inside <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}

/** 5, while checkout is off: more free recipes from the Kitchen as the soft next step. */
export function StoryMoreFromKitchen({ recipes }: { recipes: RecipeCatalogItem[] }) {
  if (recipes.length === 0) return null;
  return (
    <section className="story-block" aria-labelledby="story-more-heading">
      <h2 id="story-more-heading" className="story-block-label">More from the Kitchen</h2>
      <ul className="story-more">
        {recipes.map((recipe) => {
          const src = usableImageSrc(recipe.previewImagePath);
          return (
            <li key={recipe.id}>
              <Link href={`/recipes/${recipe.slug}`} data-story-action="more_recipe" data-story-placement="next">
                <span className="story-more-photo">{src ? <Image src={src} alt="" fill sizes="72px" /> : null}</span>
                <span>
                  <b>{recipe.title}</b>
                  {recipe.totalMinutes ? <span>{recipe.totalMinutes} min</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** 6: plain answers to a careful parent's doubts. */
export function StoryQuestions({ story, offer }: { story: StoryConfig; offer: StoryOfferData | null }) {
  return (
    <section className="story-block" aria-labelledby="story-questions-heading">
      <h2 id="story-questions-heading" className="story-block-label">Questions</h2>
      <div className="story-questions">
        <details>
          <summary>Is this recipe really free?</summary>
          <p>Yes. No account and no email. Cook it, screenshot it or print it.</p>
        </details>
        <details>
          <summary>My child has allergies. Will it work for us?</summary>
          <p>Allergens are listed at the top of every recipe, so you can check before you cook. If you’re unsure, ask your child’s doctor.</p>
        </details>
        {offer && story.offer ? (
          <>
            <details>
              <summary>What’s in the collection?</summary>
              <p>
                {recipeCount(offer.recipeCount)} for toddlers and the whole family, each with ingredients, steps, allergens and storage.
              </p>
            </details>
            <details>
              <summary>Do new recipes get added?</summary>
              <p>Yes. Recipes added to the collection later are included at no extra cost.</p>
            </details>
          </>
        ) : null}
      </div>
    </section>
  );
}

/** 7: most parents don't buy on the first visit, so leave a way back through the DMs. */
export function StoryWayBack({ story, offer }: { story: StoryConfig; offer: StoryOfferData | null }) {
  if (!story.wayBackKeyword || !offer) return null;
  return (
    <section className="story-block" aria-label="Get the link later">
      <div className="story-wayback">
        <b>Not today?</b>
        <p>
          Comment <span className="story-keyword">{story.wayBackKeyword}</span> on any of our posts and we’ll send you the link.
        </p>
      </div>
    </section>
  );
}
