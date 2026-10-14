import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Clock, Lock, Snowflake } from "lucide-react";
import { BookCover } from "@/components/collections/Book";
import { MakeAheadPlanCard } from "@/components/collections/MakeAheadPlan";
import { FreeRecipeCard, MaskedWords } from "@/components/collections/Showroom";
import CheckoutButton from "@/components/commerce/CheckoutButton";
import type { MakeAheadPlanEntry } from "@/config/halloween";
import type { CollectionRecipe, ShowroomCollection } from "@/lib/collections/types";
import { collectionFacts, recipeCount, rowAccess } from "@/lib/collections/visibility";
import type { RecipeCatalogItem } from "@/lib/data/recipes";
import type { CollectionOfferDto } from "@/lib/payments/types";

/** One collection page's content, from the showroom config, the commerce database, or both. */
export interface DetailModel {
  slug: string;
  title: string;
  tagline: string | null;
  story: string;
  forWhen: string | null;
  cloth: ShowroomCollection["cloth"];
  cover: ShowroomCollection["cover"];
  refresh: string | null;
  /** The live offer's price; null while there is no offer (no made-up price is shown). */
  price: string | null;
  offer: CollectionOfferDto | null;
  /** The commerce lookup failed: say so instead of "Opening soon", and infer nothing about price or ownership. */
  commerceUnavailable?: boolean;
  recipes: readonly CollectionRecipe[];
  /** The book's make-ahead plan (Halloween only): a card for buyers, one line in the buy box for everyone else. */
  makeAheadPlan?: MakeAheadPlanEntry | null;
}

function minutesLabel(minutes: number | null): string | null {
  if (minutes === null) return null;
  if (minutes < 90) return `${minutes} min`;
  const hours = Math.round((minutes / 60) * 2) / 2;
  return `${hours} hours`;
}

export function DetailHero({ model }: { model: DetailModel }) {
  const { offer } = model;
  const owned = offer?.ownershipState === "owned";
  const plan = model.makeAheadPlan ?? null;
  // This book's own free recipes sit further down the page; otherwise the recipe list has the free ones.
  const tryFreeHref = model.recipes.some((recipe) => recipe.free) ? "#free-samples" : "/recipes";
  return (
    <section className="cl-dhero" data-cloth={model.cloth} aria-labelledby="collection-title">
      <div className="cl-wrap">
        <nav aria-label="Breadcrumb">
          <ol className="cl-crumbs">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/collections">Collections</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{model.title}</li>
          </ol>
        </nav>

        {plan && owned ? <MakeAheadPlanCard entry={plan} /> : null}

        <div className="cl-dhero-grid">
          <div className="cl-dhero-book">
            <div className="cl-tilt">
              <BookCover book={model} sizes="(min-width: 1024px) 20rem, 60vw" priority tilt />
            </div>
          </div>

          <div className="cl-dhero-text">
            <h1 className="cl-dhero-title" id="collection-title">
              <MaskedWords text={model.title} />
            </h1>
            {model.tagline ? <p className="cl-tagline">{model.tagline}</p> : null}
            <p className="cl-story">{model.story}</p>
            <ul className="cl-facts" aria-label="At a glance">
              {collectionFacts(model).map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
            {model.forWhen ? <p className="cl-forwhen">{model.forWhen}</p> : null}
          </div>

          <aside className="cl-buy" id="buy" data-cloth={model.cloth} aria-label="Get this collection">
            <div>
              {model.price ? <p className="cl-buy-price">{model.price}</p> : null}
              <p className="cl-buy-kind">One-time purchase</p>
            </div>
            <ul className="cl-buy-list">
              <li>
                <Check aria-hidden="true" />
                <span>
                  {model.recipes.length === 1 ? "The recipe" : `All ${model.recipes.length} recipes`}, each with ingredients, steps, storage and allergens
                </span>
              </li>
              {plan && !owned ? (
                <li>
                  <Check aria-hidden="true" />
                  <span>{plan.buyLine}</span>
                </li>
              ) : null}
              <li>
                <Check aria-hidden="true" />
                <span>Includes printable recipe pages</span>
              </li>
              <li>
                <Check aria-hidden="true" />
                <span>{model.refresh ?? "Recipes added to this collection later are included"}</span>
              </li>
              <li>
                <Check aria-hidden="true" />
                <span>Yours to keep. No subscription; all sales are final</span>
              </li>
            </ul>
            <div className="cl-buy-cta">
              {offer ? (
                <CheckoutButton
                  collectionSlug={offer.collectionSlug}
                  formattedPrice={offer.formattedPrice}
                  ownershipState={offer.ownershipState}
                  expected={offer.expected}
                  appearance="cloth"
                />
              ) : (
                <span className="cl-button" aria-disabled="true">
                  {model.commerceUnavailable ? "Purchase unavailable right now" : "Opening soon"}
                </span>
              )}
            </div>
            <p className="cl-buy-hint">
              {owned ? (
                "You own this collection. Every recipe below is open to you."
              ) : offer ? (
                <>
                  Not sure yet? <Link href={tryFreeHref}>Cook a free recipe first</Link>.
                </>
              ) : model.commerceUnavailable ? (
                "We could not load checkout just now. Please refresh in a moment."
              ) : (
                <>
                  This collection is being finished. Meanwhile, <Link href="/recipes">cook a free recipe</Link>.
                </>
              )}
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

export function Contents({ model }: { model: DetailModel }) {
  // A buyer owns every recipe here, so free and locked marks would only confuse them.
  const owned = model.offer?.ownershipState === "owned";
  const freeCount = owned ? 0 : model.recipes.filter((recipe) => recipe.free).length;
  return (
    <section className="cl-contents" id="collection-recipes" data-cloth={model.cloth} aria-labelledby="contents-title">
      <div className="cl-wrap">
        <div className="cl-contents-head">
          <h2 className="cl-h2" id="contents-title">
            What&rsquo;s inside
          </h2>
          <p>
            {recipeCount(model.recipes.length)}, in the order we&rsquo;d cook them
            {freeCount > 0 ? ` · ${freeCount} free to cook now` : null}
          </p>
        </div>
        {/* A photo grid, not a text index: the food is what makes a parent tap. */}
        <ol className="cl-rows" data-reveal>
          {model.recipes.map((recipe, index) => {
            const time = minutesLabel(recipe.minutes);
            const access = rowAccess(recipe, owned);
            const body = (
              <div className="cl-row-inner" data-access={access ?? undefined} style={{ "--i": index } as CSSProperties}>
                <div className="cl-row-thumb">
                  {recipe.image ? (
                    <Image src={recipe.image} alt="" fill sizes="(min-width: 1024px) 17rem, (min-width: 640px) 30vw, 45vw" />
                  ) : null}
                  <span className="cl-row-num" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {access === "free" ? (
                    <span className="cl-row-free" aria-hidden="true">
                      Free
                    </span>
                  ) : access === "locked" ? (
                    <span className="cl-row-mark" aria-hidden="true">
                      <Lock />
                    </span>
                  ) : null}
                </div>
                <div className="cl-row-main">
                  <h3 className="cl-row-title">
                    {recipe.title}
                    {access === "free" ? <span className="cl-sr">, free</span> : null}
                    {access === "locked" ? <span className="cl-sr">, in the book</span> : null}
                  </h3>
                  <p className="cl-row-meta">
                    {time ? (
                      <span>
                        <Clock aria-hidden="true" />
                        {time}
                      </span>
                    ) : null}
                    {recipe.freezes ? (
                      <span>
                        <Snowflake aria-hidden="true" />
                        Freezes {recipe.freezes}
                      </span>
                    ) : null}
                  </p>
                  {recipe.protein ? <p className="cl-row-note">Built around {recipe.protein.toLowerCase()}</p> : null}
                  {recipe.allergens.length > 0 ? (
                    <p className="cl-row-note">Contains {recipe.allergens.join(", ")}</p>
                  ) : null}
                </div>
              </div>
            );
            return (
              <li className="cl-row" key={recipe.slug}>
                {recipe.href ? (
                  <Link className="cl-row-link" href={recipe.href}>
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function FreeSamples({ recipes }: { recipes: readonly RecipeCatalogItem[] }) {
  if (recipes.length === 0) return null;
  return (
    <section className="cl-samples" id="free-samples" aria-labelledby="samples-title">
      <div className="cl-wrap">
        <div className="cl-free-head">
          <div>
            <h2 className="cl-h2" id="samples-title">
              Try Free Sample Recipes
            </h2>
            <p className="cl-lede" style={{ marginTop: "0.8rem" }}>
              {recipes.length === 1 ? "This one is" : "These are"} from this collection, and every other recipe in it is
              laid out the same way. Read, cook and print {recipes.length === 1 ? "it" : "them"} now, with no account
              and no payment.
            </p>
          </div>
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

export function Questions() {
  const items = [
    {
      q: "Is this a subscription?",
      a: "No. You pay once and the collection stays in your library. Recipes we add to it later are included at no extra cost.",
    },
    {
      q: "Can I get a refund?",
      a: "All sales are final. That is why some complete recipes are free: cook one first and see whether our recipes suit your family.",
    },
    {
      q: "Do I need an account?",
      a: "No. Checkout asks only for your email and payment. Then we email you a code that opens the collection on any device; there is no password to remember.",
    },
    {
      q: "Can I print the recipes?",
      a: "Every recipe has a print-friendly page. If printing doesn't start inside Instagram's browser, open the page in Safari or Chrome.",
    },
    {
      q: "What about allergens?",
      a: `Each recipe lists the allergens in its ingredients, and the list above shows them for every recipe before you buy. Check every label against your child's needs.`,
    },
  ];
  return (
    <section className="cl-questions" aria-labelledby="questions-title">
      <div className="cl-wrap">
        <h2 className="cl-h2" id="questions-title">
          Good to know
        </h2>
        <div className="cl-qa">
          {items.map((item) => (
            <details key={item.q}>
              <summary>
                {item.q}
                <span className="cl-qa-icon" aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function NextBook({ next }: { next: ShowroomCollection }) {
  return (
    <Link className="cl-next" href={`/collections/${next.slug}`} data-cloth={next.cloth} data-dock-end>
      <div className="cl-wrap cl-next-inner">
        <div>
          <p className="cl-next-label">Next on the shelf</p>
          <p className="cl-next-title">{next.title}</p>
          <p className="cl-tagline">{next.tagline}</p>
        </div>
        <BookCover book={next} sizes="12rem" />
      </div>
    </Link>
  );
}

export function BuyDock({ model }: { model: DetailModel }) {
  if (model.offer?.ownershipState === "owned") return null;
  return (
    <div className="cl-dock" data-cloth={model.cloth} hidden>
      <p className="cl-dock-text">
        <strong>{model.title}</strong>
        <span>
          {model.price ? `${model.price} · ` : ""}
          {recipeCount(model.recipes.length)}
        </span>
      </p>
      <a className="cl-button" data-tone="cream" href="#buy">
        {model.offer ? "Get it" : "Details"}
        <ArrowRight className="cl-button-arrow" aria-hidden="true" />
      </a>
    </div>
  );
}
