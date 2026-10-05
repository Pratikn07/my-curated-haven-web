import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Clock, Snowflake } from "lucide-react";
import { BookCover } from "@/components/collections/Book";
import { FreeRecipeCard } from "@/components/collections/Showroom";
import CheckoutButton from "@/components/commerce/CheckoutButton";
import type { CollectionRecipe, ShowroomCollection } from "@/lib/collections/types";
import { collectionFacts, recipeCount } from "@/lib/collections/visibility";
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
  price: string;
  offer: CollectionOfferDto | null;
  recipes: readonly CollectionRecipe[];
}

/** next/image's resized copy of a photo, for the pointer peek (a plain <img>). */
function peekSrc(src: string): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=384&q=75`;
}

function minutesLabel(minutes: number | null): string | null {
  if (minutes === null) return null;
  if (minutes < 90) return `${minutes} min`;
  const hours = Math.round((minutes / 60) * 2) / 2;
  return `${hours} hours`;
}

export function DetailHero({ model }: { model: DetailModel }) {
  const { offer } = model;
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

        <div className="cl-dhero-grid">
          <div className="cl-dhero-book">
            <div className="cl-tilt">
              <BookCover book={model} sizes="(min-width: 1024px) 20rem, 60vw" priority tilt />
            </div>
          </div>

          <div className="cl-dhero-text">
            <h1 className="cl-dhero-title" id="collection-title">
              {model.title}
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
              <p className="cl-buy-price">{model.price}</p>
              <p className="cl-buy-kind">One-time purchase</p>
            </div>
            <ul className="cl-buy-list">
              <li>
                <Check aria-hidden="true" />
                <span>
                  {model.recipes.length === 1 ? "The recipe" : `All ${model.recipes.length} recipes`}, each with ingredients, steps, storage and allergens
                </span>
              </li>
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
                  appearance="cloth"
                />
              ) : (
                <span className="cl-button" aria-disabled="true">
                  Opening soon
                </span>
              )}
            </div>
            <p className="cl-buy-hint">
              {offer?.ownershipState === "owned" ? (
                "You own this collection. Every recipe below is open to you."
              ) : offer ? (
                <>
                  Not sure yet? <Link href="/recipes">Cook a free recipe first</Link>.
                </>
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
  return (
    <section className="cl-contents" data-cloth={model.cloth} aria-labelledby="contents-title">
      <div className="cl-wrap">
        <div className="cl-contents-head">
          <h2 className="cl-h2" id="contents-title">
            What&rsquo;s inside
          </h2>
          <p>
            {recipeCount(model.recipes.length)}, in the order we&rsquo;d cook them
          </p>
        </div>
        <ol className="cl-rows" data-reveal>
          {model.recipes.map((recipe, index) => {
            const time = minutesLabel(recipe.minutes);
            const body = (
              <div className="cl-row-inner" style={{ "--i": index } as CSSProperties}>
                <div className="cl-row-thumb">
                  {recipe.image ? <Image src={recipe.image} alt="" fill sizes="4.2rem" /> : null}
                </div>
                <div className="cl-row-main">
                  <h3 className="cl-row-title">
                    <span className="cl-row-num" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {recipe.title}
                  </h3>
                  <p className="cl-row-meta">
                    {time ? (
                      <span className="cl-chip">
                        <Clock aria-hidden="true" style={{ width: "0.85em", height: "0.85em", marginRight: "0.35em" }} />
                        {time}
                      </span>
                    ) : null}
                    {recipe.protein ? <span className="cl-chip">Built around {recipe.protein.toLowerCase()}</span> : null}
                    {recipe.freezes ? (
                      <span className="cl-chip">
                        <Snowflake aria-hidden="true" style={{ width: "0.85em", height: "0.85em", marginRight: "0.35em" }} />
                        Freezes {recipe.freezes}
                      </span>
                    ) : null}
                    {recipe.allergens.length > 0 ? (
                      <span className="cl-chip" data-kind="allergen">
                        Contains {recipe.allergens.join(", ")}
                      </span>
                    ) : null}
                  </p>
                </div>
                {recipe.href ? <ArrowRight className="cl-row-go" aria-hidden="true" /> : null}
              </div>
            );
            return (
              <li className="cl-row" key={recipe.slug} data-peek={recipe.image ? peekSrc(recipe.image) : undefined}>
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
    <section className="cl-samples" aria-labelledby="samples-title">
      <div className="cl-wrap">
        <div className="cl-free-head">
          <div>
            <h2 className="cl-h2" id="samples-title">
              Try Free Sample Recipes
            </h2>
            <p className="cl-lede" style={{ marginTop: "0.8rem" }}>
              Every recipe in this collection is laid out like these. Read, cook and print them now, with no account
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
      a: "All sales are final. That is why three complete recipes are free: cook one first and see whether our recipes suit your family.",
    },
    {
      q: "Do I need an account?",
      a: "Yes, to buy, so the collection waits for you on any device. You sign in with a code we email you; there is no password to remember.",
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
          {model.price} · {recipeCount(model.recipes.length)}
        </span>
      </p>
      <a className="cl-button" data-tone="cream" href="#buy">
        {model.offer ? "Get it" : "Details"}
        <ArrowRight className="cl-button-arrow" aria-hidden="true" />
      </a>
    </div>
  );
}
