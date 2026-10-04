import Image from "next/image";
import Link from "next/link";
import { BRAND_LINKS } from "@/config/kitchen-story";
import type { CampaignPageData } from "@/lib/data/load-campaign";

/** 8. The page ends on who made it, not on a price. */
export default function CampaignClosing({ data }: { data: CampaignPageData }) {
  const { campaign, story, pack, collection } = data;
  const portrait = story.moments[story.moments.length - 1]?.image;
  const instagram = BRAND_LINKS.instagram;
  // The way back only makes sense once the DM tool answers the keyword and something is on sale.
  const wayBack = campaign.wayBackKeyword && (pack || collection) ? campaign.wayBackKeyword : null;

  return (
    <section className="cp-closing" aria-labelledby="cp-closing-title" data-story-section="closing">
      {portrait ? (
        <div className="cp-closing-photo">
          <Image src={portrait.src} alt={portrait.alt} fill sizes="10rem" style={{ objectPosition: "50% 30%" }} />
        </div>
      ) : null}
      <h2 id="cp-closing-title" className="cp-closing-title">
        Made in our kitchen. <em>Shared with yours.</em>
      </h2>
      <p className="cp-closing-sign">
        {story.note.signature}
        {story.note.with ? ` ${story.note.with}` : ""} · Tiny Soho
      </p>

      <nav className="cp-closing-links" aria-label="Keep exploring">
        <Link
          href="/recipes"
          className="cp-button"
          data-magnetic
          data-story-action="recipes_index"
          data-story-placement="closing"
        >
          Explore all recipes <span className="cp-arrow" aria-hidden="true">→</span>
        </Link>
        {instagram ? (
          <a
            href={instagram.url}
            className="cp-link"
            rel="noopener"
            data-story-action="instagram"
            data-story-placement="closing"
          >
            Back to {instagram.handle} on Instagram
          </a>
        ) : null}
        <Link href="/" className="cp-link" data-story-action="home" data-story-placement="closing">
          Visit My Curated Haven
        </Link>
      </nav>

      {wayBack ? (
        <p className="cp-wayback">
          <b>Not today?</b> Comment <span className="cp-keyword">{wayBack}</span> on any of our posts and we’ll send you
          the link.
        </p>
      ) : null}
    </section>
  );
}
