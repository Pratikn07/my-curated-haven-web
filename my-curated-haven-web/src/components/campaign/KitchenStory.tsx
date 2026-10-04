import Image from "next/image";
import type { CSSProperties } from "react";
import type { CampaignMotif, KitchenStory as KitchenStoryData } from "@/lib/campaigns/types";
import { CampaignText, Kicker, Motif } from "./CampaignParts";
import KitchenStoryMotion from "./KitchenStoryMotion";

/**
 * 3. Bhagyashree and Anaika, cooking together, told as one scene.
 *
 * The markup is complete on its own: on phones (and with reduced motion, or
 * before any script runs) the moments are prints stacked by CSS, each sliding
 * over the last as the parent scrolls. On large screens KitchenStoryMotion pins
 * the stage and lets scroll move the camera from one moment to the next.
 */
export default function KitchenStory({ story, motif }: { story: KitchenStoryData; motif?: CampaignMotif }) {
  const count = story.moments.length;
  return (
    <section
      id="cp-story"
      className="cp-story"
      aria-labelledby="cp-story-title"
      data-story-section="story"
      style={{ "--cp-moments": count } as CSSProperties}
    >
      <div className="cp-story-track">
        <div className="cp-story-stage">
          <div className="cp-story-head">
            <Kicker>{story.kicker}</Kicker>
            <h2 id="cp-story-title" className="cp-h2 cp-story-title">
              <CampaignText text={story.heading} />
            </h2>
          </div>

          <ol className="cp-moments">
            {story.moments.map((moment, index) => (
              <li
                key={moment.image.src}
                className="cp-moment"
                style={{ "--i": index, "--origin": moment.origin } as CSSProperties}
              >
                <figure className="cp-moment-shot">
                  <Image
                    src={moment.image.src}
                    alt={moment.image.alt}
                    fill
                    sizes="(min-width: 1024px) 44rem, (min-width: 768px) 32rem, 92vw"
                    placeholder={moment.image.blurDataURL ? "blur" : "empty"}
                    blurDataURL={moment.image.blurDataURL}
                    style={moment.image.focus ? { objectPosition: moment.image.focus } : undefined}
                  />
                </figure>
                <div className="cp-moment-text">
                  <p className="cp-moment-step">
                    <span>{String(index + 1).padStart(2, "0")}</span> {moment.label}
                  </p>
                  <p className="cp-moment-line" data-last={index === count - 1 ? "true" : undefined}>
                    {moment.line}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="cp-story-progress" aria-hidden="true">
            <span className="cp-story-progress-fill" />
            {story.moments.map((moment, index) => (
              <span key={moment.label} className="cp-story-tick" data-active={index === 0 ? "true" : undefined}>
                {moment.label}
              </span>
            ))}
          </div>
          <Motif motif={motif} placement="story" />
        </div>
        {/* Reached when the last moment has been seen, in either layout. */}
        <span className="cp-story-sentinel" data-story-section="story_end" aria-hidden="true" />
      </div>

      <figure className="cp-story-note">
        <blockquote>
          {story.note.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </blockquote>
        <figcaption>
          <span className="cp-signature">{story.note.signature}</span>
          {story.note.with ? <span className="cp-signature-with">{story.note.with}</span> : null}
        </figcaption>
      </figure>

      <KitchenStoryMotion />
    </section>
  );
}
