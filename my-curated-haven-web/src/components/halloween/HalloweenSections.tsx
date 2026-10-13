import { Fragment, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";
import {
  HALLOWEEN_BOOK,
  HALLOWEEN_CLOSING,
  HALLOWEEN_HERO,
  HALLOWEEN_MORNING,
  HALLOWEEN_NIGHT,
  HALLOWEEN_REASONS,
  HALLOWEEN_STORY,
  HALLOWEEN_STREET,
  HALLOWEEN_WALK,
  type HalloweenMoment,
} from "@/config/halloween";
import type { HalloweenBookData, HalloweenMenuItem, HalloweenTrickItem } from "@/lib/data/load-halloween";
import { BeforeAfter, GhostPeek, PumpkinCarve } from "./HalloweenClient";

/** The colour each part of the story hands to the sky behind the page, from morning to night. */
const SKY = { lastWeek: "#fbefd9", morning: "#fbe3bc", walk: "#4a2a45", night: "#23161c" } as const;

/** Twinkling stars at fixed places, so the server and the browser draw the same sky. */
const STARS = Array.from({ length: 34 }, (_, index) => ({
  left: (index * 37) % 100,
  top: (index * 53) % 100,
  delay: -((index * 7) % 30) / 10,
}));

export function HalloweenSky() {
  return (
    <div className="hw-sky" aria-hidden="true">
      <div className="hw-moon" />
      <div className="hw-stars">
        {STARS.map((star, index) => (
          <i key={index} style={{ left: `${star.left}%`, top: `${star.top}%`, animationDelay: `${star.delay}s` }} />
        ))}
      </div>
    </div>
  );
}

/** Each word rises from behind its own mask. The spaces sit between the masks, where inline blocks keep them. */
function Words({ text, start }: { text: string; start: number }) {
  return text.split(" ").map((word, index) => (
    <Fragment key={`${word}-${index}`}>
      <span className="hw-w">
        <span style={{ "--i": start + index } as CSSProperties}>{word}</span>
      </span>{" "}
    </Fragment>
  ));
}

function Meta({ item }: { item: HalloweenMenuItem }) {
  const parts = [
    item.freezes ? `Freezes ${item.freezes}` : null,
    item.allergens.length > 0 ? `Contains ${item.allergens.join(", ")}` : "No listed allergens",
  ].filter(Boolean);
  return <span className="hw-dish-meta">{parts.join(" · ")}</span>;
}

export function HalloweenHero({ menu, freeCount }: { menu: HalloweenMenuItem[]; freeCount: number }) {
  const { before, inserted, corrected, after } = HALLOWEEN_HERO.title;
  const beforeWords = before.split(" ").length;

  return (
    <section className="hw-hero" data-hw-clock="Sat 31 Oct · Halloween">
      <PumpkinCarve />
      <span className="hw-eyebrow">{HALLOWEEN_HERO.eyebrow}</span>
      <h1 className="hw-title" aria-label={`${before} ${inserted}${corrected} ${after}`}>
        <Words text={before} start={0} />
        <span className="hw-w hw-em-wrap">
          <em className="hw-fix" style={{ "--i": beforeWords } as CSSProperties}>
            <svg className="hw-caret" viewBox="0 0 20 18" aria-hidden="true">
              <path d="M2 16 L10 3 L18 16" pathLength={1} />
            </svg>
            <span className="hw-ins">{inserted}</span>
            <span className="hw-scary">
              {[...corrected].map((letter, index) => (
                <i key={index}>{letter}</i>
              ))}
            </span>
            <svg className="hw-marker" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true">
              <path d="M4 14 C 60 4, 140 4, 196 12" pathLength={1} />
            </svg>
          </em>
        </span>{" "}
        <Words text={after} start={beforeWords + 1} />
      </h1>
      <p className="hw-lede">{HALLOWEEN_HERO.lede}</p>

      <nav className="hw-menu" id="hw-menu" aria-label="Halloween menu" data-story-section="recipes">
        <div className="hw-menu-head">
          <h2>Halloween menu</h2>
        </div>
        {menu.map((item) => (
          <Link
            key={item.slug}
            className="hw-dish"
            href={item.href}
            data-story-action={item.free ? "campaign_recipe" : "collection"}
            data-story-placement="recipes"
            {...(item.recipeId ? { "data-recipe-id": item.recipeId } : {})}
            data-recipe-position={item.position}
          >
            <Image src={item.thumb.src} alt="" width={item.thumb.width} height={item.thumb.height} sizes="68px" priority={item.position === 1} />
            <span className="hw-dish-text">
              <span className="hw-dish-when">
                {item.when}
                {item.minutes && !item.hideMinutes ? ` · ${item.minutes} min` : ""}
                {/* Each dish says what a tap opens: the whole recipe, or its page in the book. */}
                {item.free ? (
                  <span className="hw-tag" data-kind="free">Free</span>
                ) : (
                  <span className="hw-tag" data-kind="book">
                    <Lock aria-hidden="true" />
                    In the book
                  </span>
                )}
              </span>
              <span className="hw-dish-alias">{item.alias}</span>
              <span className="hw-dish-name">{item.title}</span>
              <Meta item={item} />
            </span>
            <span className="hw-go" aria-hidden="true">→</span>
          </Link>
        ))}
        <p className="hw-menu-foot">
          {freeCount > 0
            ? "Free recipes open in full: ingredients, steps, allergens, print."
            : "These three are inside the Halloween collection."}
        </p>
      </nav>
    </section>
  );
}

/**
 * The book, straight after the menu, for the parents who came for the recipes and will not
 * scroll through the story. The full book section still closes the page.
 */
export function HalloweenBookCard({ book, menu }: { book: HalloweenBookData; menu: HalloweenMenuItem[] }) {
  const count = book.recipes.length;
  const named = menu.map((item) => item.alias.toLowerCase());
  const more = count - named.length;
  const contents = more > 0 ? `${named.join(", ")} and ${more} more.` : `${named.join(", ")}.`;
  return (
    <section className="hw-bookcard" id="hw-bookcard" aria-labelledby="hw-bookcard-title">
      <Image className="hw-bookcard-cover" src={HALLOWEEN_BOOK.cover.src} alt="" width={HALLOWEEN_BOOK.cover.width} height={HALLOWEEN_BOOK.cover.height} sizes="5.5rem" />
      <div className="hw-bookcard-body">
        <span className="hw-eyebrow">{HALLOWEEN_BOOK.eyebrow}</span>
        <h2 className="hw-bookcard-title" id="hw-bookcard-title">All {count} recipes in one book</h2>
        <p className="hw-bookcard-contents">{contents.charAt(0).toUpperCase() + contents.slice(1)}</p>
        <div className="hw-bookcard-row">
          <span className="hw-bookcard-price">{book.price}</span>
          <Link
            className="hw-cta hw-cta-small"
            href={book.onSale ? `${book.href}#buy` : book.href}
            data-story-action="collection"
            data-story-placement="card"
          >
            {book.onSale ? `Get all ${count}` : `See all ${count}`} <span aria-hidden="true">→</span>
          </Link>
        </div>
        <span className="hw-bookcard-note">{book.onSale ? "One-time purchase" : "Opening soon"}</span>
      </div>
    </section>
  );
}

export function HalloweenTricks({ tricks }: { tricks: HalloweenTrickItem[] }) {
  if (tricks.length === 0) return null;
  return (
    <section className="hw-tricks" id="hw-tricks" data-hw-clock="Sat 31 Oct · Halloween">
      <div className="hw-sec-head">
        <span className="hw-eyebrow">Small Halloween tricks</span>
        <h2>Make them Halloween</h2>
        <p>Ghost pops and mummy scrolls from the menu, with one small step at the end.</p>
      </div>
      {tricks.map((trick) => (
        <article className="hw-trick" key={trick.slug}>
          <BeforeAfter
            after={<Image src={trick.dressed.src} alt={trick.dressed.alt} width={trick.dressed.width} height={trick.dressed.height} sizes="(max-width: 30rem) 100vw, 30rem" />}
            before={<Image src={trick.everyday.src} alt={trick.everyday.alt} width={trick.everyday.width} height={trick.everyday.height} sizes="(max-width: 30rem) 100vw, 30rem" />}
          />
          <div className="hw-trick-body">
            <h3>{trick.alias}</h3>
            <p>{trick.how}</p>
            <Link
              className="hw-open"
              href={trick.href}
              data-story-action={trick.free ? "campaign_recipe" : "collection"}
              data-story-placement="card"
              {...(trick.recipeId ? { "data-recipe-id": trick.recipeId } : {})}
            >
              {trick.free ? `Open ${trick.title}` : "See it in the Halloween collection"} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}

function Stamp({ moment }: { moment: HalloweenMoment }) {
  return (
    <div className="hw-stamp">
      <span className={moment.period ? "hw-stamp-time" : "hw-stamp-time hw-stamp-phrase"}>{moment.time}</span>
      <small>{moment.period ? `${moment.period} · ${moment.place}` : moment.place}</small>
    </div>
  );
}

function Photo({ moment }: { moment: HalloweenMoment }) {
  if (!moment.image) return null;
  return (
    <figure className="hw-photo">
      <Image src={moment.image.src} alt={moment.image.alt} width={moment.image.width} height={moment.image.height} sizes="(max-width: 30rem) 100vw, 30rem" />
    </figure>
  );
}

export function HalloweenStory() {
  const [scare, ghosts] = HALLOWEEN_MORNING;
  return (
    <>
      <section className="hw-story-head" id="hw-story" data-story-section="story" data-hw-clock={scare.clock}>
        <span className="hw-eyebrow">{HALLOWEEN_STORY.kicker}</span>
        <h2>{HALLOWEEN_STORY.heading}</h2>
        <p>{HALLOWEEN_STORY.lede}</p>
      </section>

      <section className="hw-chapter" data-hw-clock={scare.clock} data-hw-sky={SKY.lastWeek}>
        <Photo moment={scare} />
        <div className="hw-card">
          <Stamp moment={scare} />
          <h3>{scare.heading}</h3>
          <p>{scare.text}</p>
        </div>
      </section>

      <section className="hw-chapter" data-hw-clock={ghosts.clock} data-hw-sky={SKY.morning}>
        <GhostPeek />
        <Photo moment={ghosts} />
        <div className="hw-card">
          <Stamp moment={ghosts} />
          <h3>{ghosts.heading}</h3>
          <p>{ghosts.text}</p>
        </div>
      </section>

      <section className="hw-chapter hw-late" id="hw-walk" data-hw-clock={HALLOWEEN_WALK.clock} data-hw-sky={SKY.walk}>
        <div className="hw-card hw-lamp">
          <Stamp moment={HALLOWEEN_WALK} />
          <h3>{HALLOWEEN_WALK.heading}</h3>
          <p>{HALLOWEEN_WALK.text}</p>
        </div>
        <HalloweenStreet />
        <p className="hw-street-note">Keep scrolling to walk the street</p>
      </section>

      <section className="hw-chapter hw-late" id="hw-night" data-story-section="story_end" data-hw-clock={HALLOWEEN_NIGHT.clock} data-hw-sky={SKY.night}>
        <Stamp moment={HALLOWEEN_NIGHT} />
        {HALLOWEEN_NIGHT.image ? (
          <figure className="hw-window">
            <Image src={HALLOWEEN_NIGHT.image.src} alt={HALLOWEEN_NIGHT.image.alt} width={HALLOWEEN_NIGHT.image.width} height={HALLOWEEN_NIGHT.image.height} sizes="(max-width: 30rem) 100vw, 30rem" />
          </figure>
        ) : null}
        <div className="hw-card hw-lamp">
          <h3>{HALLOWEEN_NIGHT.heading}</h3>
          <p>{HALLOWEEN_NIGHT.text}</p>
        </div>
      </section>
    </>
  );
}

/** Five rendered layers. Still, they show the middle house with every light on. */
function HalloweenStreet() {
  const { sky, housesOff, housesOn, walkers, fore, houses } = HALLOWEEN_STREET;
  return (
    <div className="hw-street" role="img" aria-label={HALLOWEEN_STREET.alt} data-houses={houses.join(",")}>
      <Image className="hw-s-sky" src={sky.src} alt="" width={sky.width} height={sky.height} unoptimized />
      <div className="hw-s-haze" />
      <div className="hw-s-ground" />
      <div className="hw-s-houses">
        <Image className="hw-s-off" src={housesOff.src} alt="" width={housesOff.width} height={housesOff.height} unoptimized />
        {houses.map((centre, index) => (
          <Image key={index} className="hw-s-on" data-i={index} src={housesOn.src} alt="" width={housesOn.width} height={housesOn.height} unoptimized />
        ))}
        {houses.map((centre, index) => (
          <span key={index} className="hw-s-pool" data-i={index} style={{ left: `${centre * 100}%` }} />
        ))}
      </div>
      <div className="hw-s-walkers">
        <span className="hw-s-lantern" />
        <span className="hw-s-shadow" />
        <div className="hw-s-bob">
          <Image src={walkers.src} alt="" width={walkers.width} height={walkers.height} unoptimized />
        </div>
      </div>
      <div className="hw-s-fore" style={{ backgroundImage: `url(${fore.src})` }} />
      <div className="hw-s-vignette" />
    </div>
  );
}

export function HalloweenReasons() {
  return (
    <section className="hw-reasons hw-late" data-hw-clock="Sat 31 Oct · night">
      <h2>Why we cook for Halloween</h2>
      <ol>
        {HALLOWEEN_REASONS.map((reason) => (
          <li key={reason.title}>
            <strong>{reason.title}</strong>
            <span>{reason.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function HalloweenBook({ book, freeCount }: { book: HalloweenBookData; freeCount: number }) {
  const lede =
    freeCount > 0
      ? `Pumpkin, cocoa and berries, in food a toddler can hold. The free ones on the menu are a taste; the book has all ${book.recipes.length}.`
      : `Pumpkin, cocoa and berries, in food a toddler can hold. The book has all ${book.recipes.length}.`;
  return (
    <section className="hw-book-sec hw-late" data-story-section="collection" data-hw-clock="Sat 31 Oct · night">
      <span className="hw-eyebrow hw-eyebrow-night">{HALLOWEEN_BOOK.eyebrow}</span>
      <h2>{HALLOWEEN_BOOK.heading}</h2>
      <p className="hw-lede">{lede}</p>
      <div className="hw-book">
        <div className="hw-book-cover">
          <div className="hw-book-front">
            <Image src={HALLOWEEN_BOOK.cover.src} alt={HALLOWEEN_BOOK.cover.alt} width={HALLOWEEN_BOOK.cover.width} height={HALLOWEEN_BOOK.cover.height} sizes="18rem" />
            <span className="hw-book-title">{book.title}</span>
          </div>
          <div className="hw-book-back" />
        </div>
        <div className="hw-book-page">
          <h3>Inside</h3>
          <ol>
            {book.recipes.map((recipe) => (
              <li key={recipe.slug}>
                {recipe.title}
                {recipe.free ? <b>Free</b> : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="hw-buy">
        <div className="hw-buy-row">
          <span className="hw-price">{book.price}</span>
          <span className="hw-count">{book.onSale ? `${book.recipes.length} recipes · all ages` : "Opening soon"}</span>
        </div>
        {book.refresh ? <p>{book.refresh}</p> : null}
        <Link className="hw-cta" href={book.href} data-story-action="collection" data-story-placement="collection">
          See the Halloween collection <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}

export function HalloweenClosing() {
  return (
    <section className="hw-closing hw-late" data-story-section="closing" data-hw-clock="Sat 31 Oct · night">
      <h2>{HALLOWEEN_CLOSING.heading}</h2>
      <p>{HALLOWEEN_CLOSING.signature}</p>
      <div className="hw-closing-links">
        <a className="hw-ghostlink" href="#hw-menu">Back to the menu</a>
        <Link className="hw-ghostlink" href="/recipes" data-story-action="recipes_index" data-story-placement="closing">
          Explore all recipes
        </Link>
      </div>
    </section>
  );
}
