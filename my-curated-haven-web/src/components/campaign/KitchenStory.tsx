import Image from "next/image";
import type { CSSProperties } from "react";
import type { CampaignMotif, KitchenStory as KitchenStoryData } from "@/lib/campaigns/types";
import { InkText, Kicker, Motif, SplitTitle } from "./CampaignParts";

/** One size list for the moments and their filmstrip, so the strip reuses the photos already loaded. */
const MOMENT_SIZES = "(min-width: 1024px) 44rem, (min-width: 768px) 32rem, 92vw";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * 3. Bhagyashree and Anaika, cooking together, told as one scene.
 *
 * The markup is complete on its own: on phones (and with reduced motion, or
 * before any script runs) the moments are prints stacked by CSS, each sliding
 * over the last as the parent scrolls. On large screens CampaignMotion pins the
 * stage and lets scroll move the camera from one moment to the next; a big
 * counter rolls with it and the filmstrip under the photo jumps to any moment.
 * Then Bhagyashree's note, whose words darken as it is read.
 */
export default function KitchenStory({ story, motif, index }: { story: KitchenStoryData; motif?: CampaignMotif; index?: string }) {
  const count = story.moments.length;
  const noteWords = story.note.paragraphs.map((paragraph) => paragraph.split(/\s+/).filter(Boolean).length);
  const totalWords = noteWords.reduce((sum, words) => sum + words, 0);
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
            <Kicker index={index}>{story.kicker}</Kicker>
            <h2 id="cp-story-title" className="cp-h2 cp-story-title" data-reveal="words">
              <SplitTitle text={story.heading} />
            </h2>
          </div>

          <div className="cp-story-counter" aria-hidden="true">
            <span className="cp-story-counter-window">
              <span className="cp-story-counter-reel">
                {story.moments.map((moment, momentIndex) => (
                  <span key={moment.label}>{pad(momentIndex + 1)}</span>
                ))}
              </span>
            </span>
            <span className="cp-story-counter-total">/ {pad(count)}</span>
          </div>

          <ol className="cp-moments">
            {story.moments.map((moment, momentIndex) => (
              <li
                key={moment.image.src}
                className="cp-moment"
                style={{ "--i": momentIndex, "--origin": moment.origin } as CSSProperties}
              >
                <figure className="cp-moment-shot">
                  <Image
                    src={moment.image.src}
                    alt={moment.image.alt}
                    fill
                    sizes={MOMENT_SIZES}
                    placeholder={moment.image.blurDataURL ? "blur" : "empty"}
                    blurDataURL={moment.image.blurDataURL}
                    style={moment.image.focus ? { objectPosition: moment.image.focus } : undefined}
                  />
                </figure>
                <div className="cp-moment-text">
                  <p className="cp-moment-step">
                    <span>{pad(momentIndex + 1)}</span> {moment.label}
                  </p>
                  <p className="cp-moment-line" data-last={momentIndex === count - 1 ? "true" : undefined}>
                    {moment.line}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="cp-story-progress">
            <span className="cp-story-progress-fill" aria-hidden="true" />
            <ol className="cp-story-reel" aria-label="Moments of the story">
              {story.moments.map((moment, momentIndex) => (
                <li key={moment.label}>
                  <button
                    type="button"
                    className="cp-story-tick"
                    data-moment={momentIndex}
                    data-active={momentIndex === 0 ? "true" : undefined}
                    aria-current={momentIndex === 0 ? "step" : undefined}
                    aria-label={`Moment ${momentIndex + 1} of ${count}: ${moment.label}`}
                  >
                    <span className="cp-story-thumb" aria-hidden="true">
                      <Image src={moment.image.src} alt="" fill sizes={MOMENT_SIZES} loading="lazy" />
                    </span>
                    <span className="cp-story-tick-label" aria-hidden="true">
                      {moment.label}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <Motif motif={motif} placement="story" />
        </div>
        {/* Reached when the last moment has been seen, in either layout. */}
        <span className="cp-story-sentinel" data-story-section="story_end" aria-hidden="true" />
      </div>

      <figure className="cp-story-note" data-reveal="rise">
        <p className="cp-note-kicker" aria-hidden="true">
          A note from the kitchen
        </p>
        <blockquote>
          {story.note.paragraphs.map((paragraph, paragraphIndex) => (
            <p key={paragraph}>
              <InkText
                text={paragraph}
                offset={noteWords.slice(0, paragraphIndex).reduce((sum, words) => sum + words, 0)}
                total={totalWords}
              />
            </p>
          ))}
        </blockquote>
        <figcaption>
          <span className="cp-signature">{story.note.signature}</span>
          {story.note.with ? <span className="cp-signature-with">{story.note.with}</span> : null}
          <svg className="cp-signature-flourish" viewBox="0 0 220 24" aria-hidden="true" focusable="false">
            <path d="M3 15c28-9 52-11 74-4 17 5 26 9 44 4 20-6 33-10 52-6 15 3 25 6 44 1" />
          </svg>
        </figcaption>
      </figure>
    </section>
  );
}
