import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { CampaignCollectionCopy, CampaignPackCopy } from "@/lib/campaigns/types";
import { recipeCountLabel } from "@/lib/campaigns/validate";
import type { CampaignOfferData } from "@/lib/data/load-campaign";
import { usableImageSrc } from "@/lib/recipes/format";
import { Kicker } from "./CampaignParts";

function Checklist({ items, tone }: { items: string[]; tone?: "light" }) {
  if (items.length === 0) return null;
  return (
    <ul className="cp-checklist" data-tone={tone}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** A recipe card from the offer: its photo if it has one, its name either way. */
function PreviewCard({ title, imagePath, sizes }: { title: string; imagePath: string; sizes: string }) {
  const src = usableImageSrc(imagePath);
  return (
    <>
      <span className="cp-preview-photo">
        {src ? <Image src={src} alt="" fill sizes={sizes} /> : <span className="cp-preview-initial" aria-hidden="true">{title.charAt(0)}</span>}
      </span>
      <span className="cp-preview-title">{title}</span>
    </>
  );
}

interface LadderProps {
  freeCount: number;
  pack: CampaignOfferData | null;
  collection: CampaignOfferData | null;
}

/** Free, pack or collection: the difference in one glance, with real counts and prices. */
export function OfferLadder({ freeCount, pack, collection }: LadderProps) {
  const steps = [
    {
      key: "free",
      name: "Free on this page",
      price: "$0",
      count: recipeCountLabel(freeCount),
      line: "Cook, print and keep them. No account.",
    },
    ...(pack
      ? [
          {
            key: "pack",
            name: pack.title,
            price: pack.formattedPrice,
            count: recipeCountLabel(pack.recipeCount),
            line: "A small set for this moment. One-time purchase.",
          },
        ]
      : []),
    ...(collection
      ? [
          {
            key: "collection",
            name: collection.title,
            price: collection.formattedPrice,
            count: `${recipeCountLabel(collection.recipeCount)} today`,
            line: "Everything in it now, plus what we add later. One-time purchase.",
          },
        ]
      : []),
  ];
  return (
    <div className="cp-ladder">
      <h3 className="cp-ladder-title">Free, pack or collection?</h3>
      <ol className="cp-ladder-steps" style={{ "--steps": steps.length } as CSSProperties}>
        {steps.map((step) => (
          <li key={step.key} data-step={step.key}>
            <span className="cp-ladder-name">{step.name}</span>
            <span className="cp-ladder-price">{step.price}</span>
            <span className="cp-ladder-count">{step.count}</span>
            <span className="cp-ladder-line">{step.line}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 4. The themed pack: an invitation after the free recipes and the story, never before them. */
export function CampaignPack({
  copy,
  offer,
  ladder,
}: {
  copy: CampaignPackCopy;
  offer: CampaignOfferData;
  ladder?: React.ReactNode;
}) {
  return (
    <section className="cp-pack" aria-labelledby="cp-pack-title" data-story-section="pack">
      <div className="cp-pack-inner">
        <div className="cp-pack-copy">
          <Kicker>{copy.eyebrow}</Kicker>
          <h2 id="cp-pack-title" className="cp-h2">
            {copy.heading}
          </h2>
          <p className="cp-lead">{copy.lead}</p>
          <div className="cp-ticket">
            <div className="cp-ticket-head">
              <h3 className="cp-ticket-name">{offer.title}</h3>
              <p className="cp-ticket-price">
                <b>{offer.formattedPrice}</b> <span>one-time</span>
              </p>
            </div>
            <p className="cp-ticket-count">{recipeCountLabel(offer.recipeCount)}</p>
            <Checklist items={copy.includes} />
            <Link
              href={`/collections/${offer.collectionSlug}`}
              prefetch={false}
              className="cp-button"
              data-magnetic
              data-story-action="pack"
              data-story-placement="pack"
            >
              See what’s inside <span className="cp-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        {offer.preview.length > 0 ? (
          <ul className="cp-fan" aria-label={`Some recipes in ${offer.title}`} style={{ "--cards": offer.preview.length } as CSSProperties}>
            {offer.preview.map((recipe, index) => (
              <li key={recipe.id} className="cp-fan-card" style={{ "--k": index } as CSSProperties}>
                <PreviewCard title={recipe.title} imagePath={recipe.previewImagePath} sizes="(min-width: 1024px) 15rem, 40vw" />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {ladder}
    </section>
  );
}

/** 5. The larger collection, only when one is on sale: what it is, how big, and what "added later" means. */
export function CampaignCollection({
  copy,
  offer,
  ladder,
}: {
  copy: CampaignCollectionCopy;
  offer: CampaignOfferData;
  ladder?: React.ReactNode;
}) {
  return (
    <section className="cp-collection" aria-labelledby="cp-collection-title" data-story-section="collection">
      <div className="cp-collection-inner">
        <div className="cp-collection-copy">
          <Kicker tone="light">{copy.eyebrow}</Kicker>
          <h2 id="cp-collection-title" className="cp-h2">
            {offer.title}
          </h2>
          <p className="cp-collection-lead">{copy.lead}</p>
          <p className="cp-collection-grows">{copy.growsLine}</p>
          <Checklist items={copy.includes} tone="light" />
          <div className="cp-collection-buy">
            <p>
              <b>{offer.formattedPrice}</b>
              <span>
                one-time · {recipeCountLabel(offer.recipeCount)} today
              </span>
            </p>
            <Link
              href={`/collections/${offer.collectionSlug}`}
              prefetch={false}
              className="cp-button"
              data-tone="light"
              data-magnetic
              data-story-action="collection"
              data-story-placement="collection"
            >
              See the collection <span className="cp-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <ul className="cp-shelf-wall" aria-label={`Some recipes in ${offer.title}`}>
          {offer.preview.map((recipe, index) => (
            <li key={recipe.id} style={{ "--k": index } as CSSProperties}>
              <PreviewCard title={recipe.title} imagePath={recipe.previewImagePath} sizes="(min-width: 1024px) 12rem, 30vw" />
            </li>
          ))}
          <li className="cp-shelf-later">
            <span aria-hidden="true">+</span>
            New recipes as we add them
          </li>
        </ul>
      </div>
      {ladder}
    </section>
  );
}
