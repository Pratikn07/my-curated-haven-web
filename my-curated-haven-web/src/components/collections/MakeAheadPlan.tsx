import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MakeAheadPlanEntry } from "@/config/halloween";
import type {
  MakeAheadPlan,
  MakeAheadPlanPreview,
  PlanDayHeading,
  PlanText,
  PlanWhen,
} from "@/lib/collections/make-ahead-types";

/**
 * The make-ahead plan page's parts (/collections/<slug>/plan), from the owner-approved mock of 2026-10-14.
 * Styles live in src/styles/make-ahead.css. The page decides who sees the whole plan (the database does, by RLS);
 * these components only render what they are given, and the preview components never receive paid content.
 */

const TODDLER_LABEL = "Toddler job";
const SAFETY_LABEL = "Safety";

/** A dish's main photo, the one on its recipe page. */
function dishPhoto(slug: string): string {
  return `/images/recipes/${slug}-1040.webp`;
}

function Pill({ when, children }: { when: PlanWhen; children: ReactNode }) {
  return (
    <span className="mp-pill" data-when={when}>
      {children}
    </span>
  );
}

function Rich({ text }: { text: PlanText }) {
  return (
    <>
      {text.map((part, index) =>
        typeof part === "string" ? (
          part
        ) : (
          <Link key={`${part.slug}-${index}`} href={`/recipes/${part.slug}`}>
            {part.text}
          </Link>
        )
      )}
    </>
  );
}

export function PlanHeader({ plan, bookSlug, bookTitle }: { plan: MakeAheadPlanPreview; bookSlug: string; bookTitle: string }) {
  return (
    <header>
      <nav aria-label="Breadcrumb" className="mp-nav">
        <ol className="mp-crumbs">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/collections">Collections</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/collections/${bookSlug}`}>{bookTitle}</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Make-ahead plan</li>
        </ol>
      </nav>
      <p className="mp-byline">{plan.byline}</p>
      <h1 className="mp-title">{plan.title}</h1>
      <p className="mp-lede">{plan.lede}</p>
    </header>
  );
}

/** The six dishes. The preview shows only photos and names; buyers also see when each is made. */
export function PlanMenu({ plan }: { plan: MakeAheadPlan | MakeAheadPlanPreview }) {
  const full = "menuSub" in plan ? plan : null;
  const dishes: readonly (MakeAheadPlanPreview["menu"][number] & Partial<MakeAheadPlan["menu"][number]>)[] = full
    ? full.menu
    : plan.menu;
  return (
    <section className="mp-card" aria-labelledby="mp-menu-h">
      <h2 className="mp-h2" id="mp-menu-h">
        {plan.menuHeading}
      </h2>
      {full ? <p className="mp-sub">{full.menuSub}</p> : null}
      <ul className="mp-menu" style={full ? undefined : { marginTop: "0.875rem" }}>
        {dishes.map((dish) => (
          <li key={dish.slug} className="mp-dish">
            <div className="mp-dish-photo">
              <Image src={dishPhoto(dish.slug)} alt={dish.name} fill sizes="(min-width: 560px) 14rem, 45vw" />
            </div>
            <span className="mp-dish-name">{dish.name}</span>
            {dish.when && dish.label ? <Pill when={dish.when}>{dish.label}</Pill> : null}
          </li>
        ))}
      </ul>
      {full ? <p className="mp-free-of">{full.freeOf}</p> : null}
    </section>
  );
}

function DayDate({ day }: { day: PlanDayHeading }) {
  return (
    <div className="mp-date">
      <span className="mp-dow">{day.dow}</span>
      <span className="mp-dom">{day.dom}</span>
      <span className="mp-mon">{day.mon}</span>
    </div>
  );
}

function DayHead({ day }: { day: PlanDayHeading }) {
  return (
    <div className="mp-day-head">
      <h3>{day.heading}</h3>
      <Pill when={day.pill}>{day.time}</Pill>
    </div>
  );
}

/** Thursday, Friday and Saturday on a rail, with each session's tasks. */
export function PlanDays({ plan }: { plan: MakeAheadPlan }) {
  return (
    <section className="mp-card" aria-labelledby="mp-days-h">
      <h2 className="mp-h2" id="mp-days-h">
        {plan.daysHeading}
      </h2>
      <p className="mp-sub">{plan.daysSub}</p>
      <ol className="mp-days">
        {plan.days.map((day) => (
          <li key={day.dom} className="mp-day">
            <DayDate day={day} />
            <div className="mp-rail">
              <DayHead day={day} />
              {day.tasks.map((task) => (
                <div key={task.when} className="mp-task">
                  <span className="mp-when">{task.when}</span>
                  <ol>
                    {task.steps.map((step, index) => (
                      <li key={index}>
                        <Rich text={step} />
                      </li>
                    ))}
                  </ol>
                  {task.toddler ? (
                    <p className="mp-toddler">
                      <b>{TODDLER_LABEL}</b>
                      {task.toddler}
                    </p>
                  ) : null}
                  {task.safety ? (
                    <p className="mp-safe">
                      <b>{SAFETY_LABEL}</b>
                      {task.safety}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The preview's three days: headings and times only. */
export function PlanDayHeadings({ plan }: { plan: MakeAheadPlanPreview }) {
  return (
    <section className="mp-card" aria-labelledby="mp-days-h">
      <h2 className="mp-h2" id="mp-days-h" style={{ marginBottom: "0.875rem" }}>
        {plan.daysHeading}
      </h2>
      <ol className="mp-days">
        {plan.days.map((day) => (
          <li key={day.dom} className="mp-day">
            <DayDate day={day} />
            <div className="mp-rail">
              <DayHead day={day} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PlanTiers({ plan }: { plan: MakeAheadPlan }) {
  return (
    <section className="mp-card" aria-labelledby="mp-tiers-h">
      <h2 className="mp-h2" id="mp-tiers-h">
        {plan.tiers.heading}
      </h2>
      <p className="mp-sub">{plan.tiers.sub}</p>
      <div>
        {plan.tiers.items.map((tier) => (
          <div key={tier.title} className="mp-tier">
            <Pill when={tier.pill}>{tier.title}</Pill>
            <p>{tier.list}</p>
            {tier.also ? <p className="mp-also">{tier.also}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/** The book page's card for buyers, near the top: it opens the plan. */
export function MakeAheadPlanCard({ entry }: { entry: MakeAheadPlanEntry }) {
  return (
    <Link className="mp-plan-card" href={entry.path}>
      <span className="mp-plan-card-title">{entry.card.title}</span>
      <span className="mp-plan-card-sub">{entry.card.subline}</span>
      <ArrowRight className="mp-plan-card-arrow" aria-hidden="true" />
    </Link>
  );
}
