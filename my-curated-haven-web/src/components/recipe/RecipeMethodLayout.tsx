"use client";

import Image from "next/image";
import { Fragment, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import {
  DEFAULT_METHOD_AGE,
  METHOD_AGES,
  hasPerAgeContent,
  isMethodAge,
  methodTime,
  numberedSections,
  pickForAge,
  stepPhotoSrc,
  type MethodAge,
  type MethodStep,
  type RecipeMethod,
} from "@/lib/recipes/method";
import type { AllergenLine } from "@/lib/recipes/allergen-display";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

/** The parent's chosen age, remembered on this device only. */
const AGE_STORAGE_KEY = "mch:recipe-age";

const CARD = "w-full min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-8";

type Photo = NonNullable<MethodStep["photo"]>;

interface RecipeMethodLayoutProps {
  method: RecipeMethod;
  /** Worked out on the server with getAllergenDisplay, so every allergen review state reads as it does today. */
  allergenLine: AllergenLine;
}

/**
 * The method layout, from the age switch down to tips and storage. Rendered only for a recipe the visitor can
 * open and that has method content; every other recipe keeps the classic sections.
 */
export default function RecipeMethodLayout({ method, allergenLine }: RecipeMethodLayoutProps) {
  const uid = useId();
  const [age, setAge] = useState<MethodAge>(DEFAULT_METHOD_AGE);
  const [current, setCurrent] = useState<number | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [made, setMade] = useState(false);
  const [wiggles, setWiggles] = useState(0);
  const photoButton = useRef<HTMLButtonElement | null>(null);
  const showAges = hasPerAgeContent(method);
  // Step photos are served from Supabase Storage; without a project URL the steps show without them.
  const supabaseUrl = getSupabasePublicConfig()?.url ?? null;

  useEffect(() => {
    // The server renders the default age; this device's choice comes back once mounted.
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(AGE_STORAGE_KEY);
    } catch {
      // Storage can be blocked (private mode, in-app browsers); the default stands.
    }
    if (isMethodAge(saved)) setAge(saved);
  }, []);

  function chooseAge(next: MethodAge) {
    setAge(next);
    try {
      window.localStorage.setItem(AGE_STORAGE_KEY, next);
    } catch {
      // Not remembered on this device; the choice still applies to this visit.
    }
  }

  const closePhoto = useCallback(() => {
    setPhoto(null);
    photoButton.current?.focus();
  }, []);

  const safety = [...method.safety.all, method.safety.byAge[age]].filter((line): line is string => Boolean(line));
  const sections = numberedSections(method);
  const named = sections.some((section) => section.name);
  const { wait } = methodTime(method);
  let ingredientIndex = 0;

  return (
    <>
      {showAges ? (
        <section className="rm-ages no-print" aria-labelledby={`${uid}-age`}>
          <p id={`${uid}-age`} className="rm-ages-label">
            Your child’s age
          </p>
          <div className="rm-seg" role="group" aria-labelledby={`${uid}-age`}>
            {METHOD_AGES.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={age === option.id}
                onClick={() => chooseAge(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="rm-ages-hint">The toddler job, what to say and how to serve change with the age.</p>
        </section>
      ) : null}

      <section className="rm-safety" aria-labelledby="safety-heading">
        <h2 id="safety-heading">Safety for little ones</h2>
        {safety.length > 0 ? (
          <ul>
            {safety.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        <p className="rm-contains">
          {allergenLine.kind === "contains" ? (
            <>
              <b>Contains:</b> {allergenLine.text}
            </>
          ) : (
            allergenLine.text
          )}
        </p>
      </section>

      <section aria-labelledby="ingredients-heading" className={CARD}>
        <h2 id="ingredients-heading" className="mb-3 text-2xl font-bold text-foreground">
          Ingredients
        </h2>
        {method.ingredientGroups.map((group, groupIndex) => (
          <Fragment key={groupIndex}>
            {group.name ? <h3 className="rm-group-head">{group.name}</h3> : null}
            <ul className="rm-ing-list">
              {group.items.map((entry) => {
                const id = `${uid}-ing-${ingredientIndex++}`;
                return (
                  <li key={id} className="rm-ing">
                    <label htmlFor={id}>
                      <input type="checkbox" id={id} />
                      <span className="[overflow-wrap:anywhere]">
                        {entry.amount ? <span className="rm-amt">{entry.amount}</span> : null}
                        {entry.amount ? " " : null}
                        {entry.item}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </Fragment>
        ))}
        {method.tools.length > 0 ? (
          <div className="rm-tools">
            <h3 className="rm-kicker">You’ll need</h3>
            <ul>
              {method.tools.map((tool) => (
                <li key={tool}>{tool}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="instructions-heading" className={CARD}>
        <h2 id="instructions-heading" className="mb-3 text-2xl font-bold text-foreground">
          Method
        </h2>
        {wait ? <p className="rm-wait-note">{wait}</p> : null}
        {sections.map((section) => (
          <Fragment key={section.start}>
            {section.name ? <h3 className="rm-section-head">{section.name}</h3> : null}
            <ol className="rm-steps" role="list" start={section.start}>
              {section.steps.map((step, i) => {
                const number = section.start + i;
                return (
                  <StepItem
                    key={number}
                    number={number}
                    step={step}
                    age={age}
                    current={current === number}
                    headingLevel={named ? 4 : 3}
                    supabaseUrl={supabaseUrl}
                    onMark={() => setCurrent(number)}
                    onPhoto={(button) => {
                      photoButton.current = button;
                      setCurrent(number);
                      setPhoto(step.photo ?? null);
                    }}
                  />
                );
              })}
            </ol>
          </Fragment>
        ))}
        <p className="rm-hint no-print">Tap a step to mark where you are.</p>
      </section>

      {method.madeIt ? (
        <section className="rm-made no-print" aria-label="We made it">
          <span key={wiggles} className={`rm-ghost${wiggles > 0 ? " rm-wiggle" : ""}`} aria-hidden="true">
            <svg viewBox="0 0 64 72" width="56" height="63" focusable="false">
              <path className="gb" d="M8 66V32a24 24 0 0 1 48 0v34l-8-6-8 6-8-6-8 6-8-6-8 6z" />
              <circle className="gi" cx="24" cy="32" r="4" />
              <circle className="gi" cx="40" cy="32" r="4" />
              <ellipse className="gi" cx="32" cy="45" rx="4" ry="5" />
            </svg>
          </span>
          <div className="rm-made-body" aria-live="polite">
            <button
              type="button"
              onClick={() => {
                setMade(true);
                setWiggles((count) => count + 1);
              }}
            >
              {made ? "You made it!" : "We made it!"}
            </button>
            {made ? <p className="rm-made-msg">{withHandles(method.madeIt)}</p> : null}
          </div>
        </section>
      ) : null}

      <TipsAndStorage tips={method.tips} storage={method.storage} />

      {photo && supabaseUrl ? <PhotoViewer photo={photo} supabaseUrl={supabaseUrl} onClose={closePhoto} /> : null}
    </>
  );
}

function StepItem({
  number,
  step,
  age,
  current,
  headingLevel,
  supabaseUrl,
  onMark,
  onPhoto,
}: {
  number: number;
  step: MethodStep;
  age: MethodAge;
  current: boolean;
  headingLevel: 3 | 4;
  supabaseUrl: string | null;
  onMark: () => void;
  onPhoto: (button: HTMLButtonElement) => void;
}) {
  const Stage = headingLevel === 3 ? "h3" : "h4";
  const activity = step.wait ? pickForAge(step.wait.activity, age) : null;
  return (
    <li
      className="rm-step"
      tabIndex={0}
      aria-current={current ? "step" : undefined}
      onClick={onMark}
      onKeyDown={(event: KeyboardEvent<HTMLLIElement>) => {
        // Only the step itself: Enter or Space on a button inside it does that button's job.
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onMark();
        }
      }}
    >
      <span className="rm-n">{number}</span>
      <Stage className="rm-stage">{step.stage}</Stage>
      <div className="rm-body">
        <p>{step.text}</p>
        {step.photo && supabaseUrl ? (
          <button
            type="button"
            className="rm-shot no-print"
            onClick={(event: MouseEvent<HTMLButtonElement>) => onPhoto(event.currentTarget)}
          >
            <Image src={stepPhotoSrc(supabaseUrl, step.photo.file, 192)} alt="" width={84} height={84} loading="lazy" unoptimized />
            <span className="rm-shot-cap">
              <b>How it should look</b>
              <span>{step.photo.caption}</span>
            </span>
          </button>
        ) : null}
        <Line kind="ready" label="Ready when" text={step.ready ?? null} />
        <Line kind="toddler" label="Toddler job" text={pickForAge(step.toddler, age)} />
        <Line kind="say" label="Say it together" text={pickForAge(step.say, age)} />
        <Line kind="safe" label="Safety" text={pickForAge(step.safety, age)} />
        <Line kind="tip" label="Tip" text={step.tip ?? null} />
        {step.wait ? (
          <div className="rm-wait">
            <b>{step.wait.title}</b>
            {activity ? <p>{activity}</p> : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function Line({ kind, label, text }: { kind: string; label: string; text: string | null }) {
  if (!text) return null;
  return (
    <p className={`rm-line ${kind}`}>
      <span className="rm-lbl">{label}</span>
      {text}
    </p>
  );
}

function TipsAndStorage({ tips, storage }: { tips: string[]; storage: string }) {
  if (tips.length === 0 && !storage) return null;
  const both = tips.length > 0 && Boolean(storage);
  const title = both ? "Tips and storage" : tips.length > 0 ? "From our kitchen" : "Storage";
  return (
    <section aria-labelledby="storage-notes-heading" className={`${CARD} rm-after`}>
      <h2 id="storage-notes-heading" className="mb-3 text-xl font-bold text-foreground">
        {title}
      </h2>
      {tips.length > 0 ? (
        <>
          {both ? <h3 className="rm-kicker">From our kitchen</h3> : null}
          <ul>
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </>
      ) : null}
      {storage ? (
        <>
          {both ? <h3 className="rm-kicker">Storage</h3> : null}
          <p className="whitespace-pre-line">{storage}</p>
        </>
      ) : null}
    </section>
  );
}

/** "tag @tinysoho on Instagram" with the handle in bold. */
function withHandles(text: string) {
  return text.split(/(@[A-Za-z0-9_]+)/).map((part, i) => (part.startsWith("@") ? <b key={i}>{part}</b> : part));
}

/**
 * Full screen on a solid background, so no page text shows through. The 720px photo loads only now. Esc,
 * Close or a tap outside the photo closes it, and focus goes back to the photo button.
 */
function PhotoViewer({ photo, supabaseUrl, onClose }: { photo: Photo; supabaseUrl: string; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButton.current?.focus();
    const html = document.documentElement;
    const before = { html: html.style.overflow, body: document.body.style.overflow };
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "Tab") {
        // Close is the only control, so focus stays on it.
        event.preventDefault();
        closeButton.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = before.html;
      document.body.style.overflow = before.body;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="rm-viewer no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Step photo"
      onClick={(event) => {
        if (!(event.target as Element).closest("img, .rm-viewer-close")) onClose();
      }}
    >
      <button ref={closeButton} type="button" className="rm-viewer-close" onClick={onClose}>
        Close
      </button>
      <figure>
        <Image src={stepPhotoSrc(supabaseUrl, photo.file, 720)} alt="" width={720} height={720} loading="eager" unoptimized />
        <figcaption>{photo.caption}</figcaption>
      </figure>
    </div>,
    document.body
  );
}
