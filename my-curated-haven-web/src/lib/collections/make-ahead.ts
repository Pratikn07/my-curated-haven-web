import type {
  MakeAheadPlan,
  MakeAheadPlanContent,
  MakeAheadPlanPreview,
  PlanTask,
  PlanText,
  PlanTier,
  PlanWhen,
  ShoppingAisle,
} from "@/lib/collections/make-ahead-types";

/**
 * Checks and joins a make-ahead plan. The paid half arrives as JSON from public.collection_extras (or, for the
 * load script, from a file), so every field is checked before it reaches a page; a plan that doesn't fit its
 * book's preview is refused whole. Error messages name the field, never its words.
 */

export type ParseResult = { ok: true; content: MakeAheadPlanContent } | { ok: false; errors: string[] };

const WHENS: readonly PlanWhen[] = ["freezer", "fridge", "fresh"];
const MAX_TEXT = 2000;
const TOP_KEYS = new Set(["version", "menuSub", "menu", "freeOf", "daysSub", "days", "shopping", "tiers"]);

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

/** A tick-box key that survives reordering: the item's words, lower case. */
export function shoppingItemId(item: string): string {
  return item.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function parseMakeAheadPlanContent(raw: unknown, preview: MakeAheadPlanPreview): ParseResult {
  const errors: string[] = [];
  const menuSlugs = new Set(preview.menu.map((dish) => dish.slug));

  const text = (value: unknown, path: string, { optional = false, empty = false } = {}): string => {
    if (value === undefined && optional) return "";
    if (typeof value !== "string" || (!empty && value.trim() === "") || value.length > MAX_TEXT) {
      errors.push(`${path} must be ${empty ? "a" : "a non-empty"} string under ${MAX_TEXT} characters`);
      return "";
    }
    return value;
  };
  const list = (value: unknown, path: string): unknown[] => {
    if (!Array.isArray(value) || value.length === 0) {
      errors.push(`${path} must be a non-empty list`);
      return [];
    }
    return value;
  };
  const when = (value: unknown, path: string): PlanWhen => {
    if (!WHENS.includes(value as PlanWhen)) errors.push(`${path} must be one of ${WHENS.join(", ")}`);
    return value as PlanWhen;
  };

  if (!isObject(raw)) return { ok: false, errors: ["the plan must be a JSON object"] };
  for (const key of Object.keys(raw)) if (!TOP_KEYS.has(key)) errors.push(`unknown field ${key}`);
  if (raw.version !== undefined && raw.version !== 1) errors.push("version must be 1");

  const menu = list(raw.menu, "menu").map((entry, i) => {
    const dish = isObject(entry) ? entry : {};
    const slug = text(dish.slug, `menu[${i}].slug`);
    if (slug && !menuSlugs.has(slug)) errors.push(`menu[${i}].slug is not one of the preview's dishes`);
    return { slug, when: when(dish.when, `menu[${i}].when`), label: text(dish.label, `menu[${i}].label`) };
  });
  const listed = new Set(menu.map((dish) => dish.slug));
  if (menu.length !== preview.menu.length || listed.size !== menu.length || ![...menuSlugs].every((slug) => listed.has(slug))) {
    errors.push(`menu must list each of the preview's ${preview.menu.length} dishes once`);
  }

  const step = (value: unknown, path: string): PlanText =>
    list(value, path).map((part, i) => {
      if (typeof part === "string") return text(part, `${path}[${i}]`);
      const link = isObject(part) ? part : {};
      const slug = text(link.slug, `${path}[${i}].slug`);
      if (slug && !menuSlugs.has(slug)) errors.push(`${path}[${i}].slug must be one of the preview's dishes`);
      return { slug, text: text(link.text, `${path}[${i}].text`) };
    });

  const days = list(raw.days, "days").map((entry, d) => {
    const day = isObject(entry) ? entry : {};
    const dom = text(day.dom, `days[${d}].dom`);
    if (preview.days[d] && dom !== preview.days[d].dom) errors.push(`days[${d}].dom must match the preview's day ${preview.days[d].dom}`);
    const tasks: PlanTask[] = list(day.tasks, `days[${d}].tasks`).map((item, t) => {
      const task = isObject(item) ? item : {};
      const path = `days[${d}].tasks[${t}]`;
      const toddler = text(task.toddler, `${path}.toddler`, { optional: true });
      const safety = text(task.safety, `${path}.safety`, { optional: true });
      return {
        when: text(task.when, `${path}.when`),
        steps: list(task.steps, `${path}.steps`).map((value, s) => step(value, `${path}.steps[${s}]`)),
        ...(toddler ? { toddler } : {}),
        ...(safety ? { safety } : {}),
      };
    });
    return { dom, tasks };
  });
  if (days.length !== preview.days.length) errors.push(`days must have the preview's ${preview.days.length} days`);

  const shoppingRaw = isObject(raw.shopping) ? raw.shopping : {};
  if (!isObject(raw.shopping)) errors.push("shopping must be an object");
  const aisles: ShoppingAisle[] = list(shoppingRaw.aisles, "shopping.aisles").map((entry, a) => {
    const aisle = isObject(entry) ? entry : {};
    return {
      aisle: text(aisle.aisle, `shopping.aisles[${a}].aisle`),
      items: list(aisle.items, `shopping.aisles[${a}].items`).map((value, i) => {
        const row = isObject(value) ? value : {};
        const path = `shopping.aisles[${a}].items[${i}]`;
        const item = text(row.item, `${path}.item`);
        return { id: shoppingItemId(item), item, amount: text(row.amount, `${path}.amount`, { empty: true }), forWhat: text(row.forWhat, `${path}.forWhat`) };
      }),
    };
  });
  const ids = aisles.flatMap((aisle) => aisle.items.map((item) => item.id));
  if (new Set(ids).size !== ids.length || ids.some((id) => !id)) errors.push("shopping items must have distinct names");

  const tiersRaw = isObject(raw.tiers) ? raw.tiers : {};
  if (!isObject(raw.tiers)) errors.push("tiers must be an object");
  const tiers: PlanTier[] = list(tiersRaw.items, "tiers.items").map((entry, i) => {
    const tier = isObject(entry) ? entry : {};
    return {
      pill: when(tier.pill, `tiers.items[${i}].pill`),
      title: text(tier.title, `tiers.items[${i}].title`),
      list: text(tier.list, `tiers.items[${i}].list`),
      also: text(tier.also, `tiers.items[${i}].also`, { optional: true, empty: true }),
    };
  });

  const content: MakeAheadPlanContent = {
    menuSub: text(raw.menuSub, "menuSub"),
    menu,
    freeOf: text(raw.freeOf, "freeOf"),
    daysSub: text(raw.daysSub, "daysSub"),
    days,
    shopping: {
      heading: text(shoppingRaw.heading, "shopping.heading"),
      sub: text(shoppingRaw.sub, "shopping.sub"),
      copyTitle: text(shoppingRaw.copyTitle, "shopping.copyTitle"),
      aisles,
    },
    tiers: { heading: text(tiersRaw.heading, "tiers.heading"), sub: text(tiersRaw.sub, "tiers.sub"), items: tiers },
  };
  return errors.length > 0 ? { ok: false, errors } : { ok: true, content };
}

/** The plan a buyer reads: the public preview with the paid half joined in, in the preview's order. */
export function joinMakeAheadPlan(preview: MakeAheadPlanPreview, content: MakeAheadPlanContent): MakeAheadPlan {
  const { menu, days, ...rest } = content;
  const byDish = new Map(menu.map((dish) => [dish.slug, dish]));
  return {
    ...preview,
    ...rest,
    menu: preview.menu.map((dish) => {
      const paid = byDish.get(dish.slug);
      return { ...dish, when: paid?.when ?? "fresh", label: paid?.label ?? "" };
    }),
    days: preview.days.map((day, index) => ({ ...day, tasks: days[index]?.tasks ?? [] })),
  };
}

/** The list as plain text for "Copy list": aisles in capitals, one "- item, amount" line each. */
export function shoppingListText(plan: Pick<MakeAheadPlan, "shopping">): string {
  const aisles = plan.shopping.aisles.map(
    (group) => `${group.aisle.toUpperCase()}\n${group.items.map((entry) => `- ${entry.item}${entry.amount ? `, ${entry.amount}` : ""}`).join("\n")}`
  );
  return `${plan.shopping.copyTitle}\n\n${aisles.join("\n\n")}`;
}
