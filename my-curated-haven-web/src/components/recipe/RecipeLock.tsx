import type { CSSProperties } from "react";

/**
 * The locked recipe's fog: the real section names over placeholder lines that fade out under the buy card. It is
 * decoration only (aria-hidden, no headings) and carries no recipe content; the body is sent only to those with
 * access. Styles live in recipe-lock.css; motion stops for people who ask for reduced motion.
 */
const FOG = [
  { title: "Ingredients", lines: [0.2, 0.17, 0.14, 0.12] },
  { title: "Method & Instructions", lines: [0.12, 0.1, 0.08, 0.07] },
  { title: "Storage & Preparation Notes", lines: [0.06, 0.05] },
];
const WIDTHS = ["72%", "58%", "66%", "88%", "80%", "92%", "70%", "84%"];

/** A small ghost that peeks out of the fog now and then. Halloween recipes only. */
function Ghost() {
  return (
    <svg className="recipe-ghost" viewBox="0 0 40 46" aria-hidden="true">
      <path
        className="recipe-ghost-body"
        d="M20 2C10 2 4 9.5 4 19v23l5.5-4 5.2 4 5.3-4 5.3 4 5.2-4L36 42V19C36 9.5 30 2 20 2z"
      />
      <circle className="recipe-ghost-eye" cx="14.5" cy="19" r="2.6" />
      <circle className="recipe-ghost-eye" cx="25.5" cy="19" r="2.6" />
    </svg>
  );
}

export function RecipeFog({ ghost }: { ghost: boolean }) {
  return (
    <div className="recipe-fog" aria-hidden="true">
      {FOG.map((section, s) => (
        <div key={section.title} className="recipe-fog-card">
          <p className="recipe-fog-title">{section.title}</p>
          {section.lines.map((opacity, i) => (
            <span
              key={i}
              className="recipe-fog-line"
              style={{ "--o": opacity, "--w": WIDTHS[(s * 3 + i) % WIDTHS.length] } as CSSProperties}
            />
          ))}
        </div>
      ))}
      <div className="recipe-fog-mist">
        <i />
        <i />
        <i />
      </div>
      {ghost ? <Ghost /> : null}
    </div>
  );
}

/** A padlock whose shackle can swing open (the reveal turns it). */
export function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`recipe-lock-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path className="recipe-lock-shackle" d="M7 11V7a5 5 0 0 1 10 0v4" />
      <rect x="4" y="11" width="16" height="10" rx="2.2" />
    </svg>
  );
}

/**
 * Played once when a buyer opens the recipe from "You're in" (?opened=1): the fog and an open padlock sit over the
 * recipe, then lift as the recipe's sections fade in. Pure CSS, so it finishes even if scripts never run.
 */
export function RecipeRevealStage({ title, ghost }: { title: string; ghost: boolean }) {
  return (
    <div className="recipe-reveal-stage" aria-hidden="true">
      <RecipeFog ghost={ghost} />
      <div className="recipe-lock-card recipe-reveal-card rounded-[var(--radius-card)] border border-action/30 bg-surface p-6 sm:p-10 text-center shadow-sm">
        <div className="recipe-lock-badge mx-auto flex h-14 w-14 items-center justify-center rounded-full">
          <LockIcon className="h-7 w-7" />
        </div>
        <p className="mt-4 text-2xl font-bold text-foreground">It&apos;s yours</p>
        <p className="mt-2 text-base text-text-muted">Opening {title}&hellip;</p>
      </div>
    </div>
  );
}
