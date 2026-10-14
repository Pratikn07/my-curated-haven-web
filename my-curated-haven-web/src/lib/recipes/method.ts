/**
 * The new "Method" content of a recipe (`recipe_bodies.method`), its validator and the small helpers the
 * recipe page uses. The shape matches tests/fixtures/recipe-method-sample.json
 * without its `review` block.
 *
 * Kept free of imports so unit tests and the load script can read it directly with Node's type stripping.
 */

/** Ages a parent can pick: "1" is 1 year, "2" is 2 years, "3" is 3 to 4 years. */
export type MethodAge = "1" | "2" | "3";

export const METHOD_AGES: readonly { id: MethodAge; label: string }[] = [
  { id: "1", label: "1 year" },
  { id: "2", label: "2 years" },
  { id: "3", label: "3–4 years" },
];

export const DEFAULT_METHOD_AGE: MethodAge = "2";

/** One line for every age, or a line per age. A missing age shows nothing for that age. */
export type PerAge = string | Partial<Record<MethodAge, string>>;

export interface MethodIngredient {
  amount: string;
  item: string;
}

export interface MethodIngredientGroup {
  name: string | null;
  items: MethodIngredient[];
}

export interface MethodStep {
  stage: string;
  text: string;
  ready?: string;
  toddler?: PerAge;
  say?: PerAge;
  safety?: PerAge;
  tip?: string;
  wait?: { title: string; activity: PerAge };
  photo?: { file: string; caption: string };
}

export interface MethodSection {
  name: string | null;
  steps: MethodStep[];
}

export interface RecipeMethod {
  slug?: string;
  title?: string;
  shortName: string;
  handsOnMinutes: number;
  totalMinutes: number;
  /** Where the waiting happens, read after "in the": "freezer", "oven and fridge". Empty means no wait. */
  waitLabel: string;
  makes: string;
  safety: { all: string[]; byAge: Partial<Record<MethodAge, string>> };
  contains: string[];
  ingredientGroups: MethodIngredientGroup[];
  tools: string[];
  sections: MethodSection[];
  tips: string[];
  storage: string;
  madeIt: string;
}

const AGE_KEYS: readonly string[] = ["1", "2", "3"];
const MAX_TEXT = 4000;
const MAX_WAIT_LABEL = 60;
const MAX_MINUTES = 7 * 24 * 60;
/** A step photo name becomes part of an image address, so only plain lowercase names pass. */
const PHOTO_FILE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

class InvalidMethod extends Error {}

function fail(path: string): never {
  throw new InvalidMethod(path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== "string" || value.length > MAX_TEXT) fail(path);
  const trimmed = value.trim();
  if (!allowEmpty && !trimmed) fail(path);
  return trimmed;
}

/** Optional fields: absent and null both mean "not there". */
function optionalText(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return text(value, path);
}

function minutes(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_MINUTES) fail(path);
  return value;
}

function textList(value: unknown, path: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail(path);
  return value.map((entry, i) => text(entry, `${path}[${i}]`));
}

function byAge(value: unknown, path: string): Partial<Record<MethodAge, string>> {
  if (!isRecord(value)) fail(path);
  const out: Partial<Record<MethodAge, string>> = {};
  for (const [key, line] of Object.entries(value)) {
    if (!AGE_KEYS.includes(key)) fail(`${path}.${key}`);
    if (line === null || line === undefined) continue;
    out[key as MethodAge] = text(line, `${path}.${key}`);
  }
  return out;
}

function perAge(value: unknown, path: string): PerAge | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return text(value, path);
  return byAge(value, path);
}

function nonEmpty<T>(value: unknown, path: string, read: (entry: unknown, path: string) => T): T[] {
  if (!Array.isArray(value) || value.length === 0) fail(path);
  return value.map((entry, i) => read(entry, `${path}[${i}]`));
}

function heading(value: unknown, path: string): string | null {
  return value === null || value === undefined ? null : text(value, path);
}

function step(value: unknown, path: string): MethodStep {
  if (!isRecord(value)) fail(path);
  const out: MethodStep = { stage: text(value.stage, `${path}.stage`), text: text(value.text, `${path}.text`) };
  const ready = optionalText(value.ready, `${path}.ready`);
  if (ready) out.ready = ready;
  const tip = optionalText(value.tip, `${path}.tip`);
  if (tip) out.tip = tip;
  for (const key of ["toddler", "say", "safety"] as const) {
    const line = perAge(value[key], `${path}.${key}`);
    if (line !== undefined) out[key] = line;
  }
  if (value.wait !== undefined && value.wait !== null) {
    if (!isRecord(value.wait)) fail(`${path}.wait`);
    const activity = perAge(value.wait.activity, `${path}.wait.activity`);
    if (activity === undefined) fail(`${path}.wait.activity`);
    out.wait = { title: text(value.wait.title, `${path}.wait.title`), activity };
  }
  if (value.photo !== undefined && value.photo !== null) {
    if (!isRecord(value.photo)) fail(`${path}.photo`);
    const file = text(value.photo.file, `${path}.photo.file`);
    if (file.length > 120 || !PHOTO_FILE.test(file)) fail(`${path}.photo.file`);
    out.photo = { file, caption: text(value.photo.caption, `${path}.photo.caption`) };
  }
  return out;
}

/** Throws InvalidMethod naming the first bad field. Unknown keys, such as `review`, are ignored. */
export function validateRecipeMethod(raw: unknown): RecipeMethod {
  if (!isRecord(raw)) fail("method");
  const handsOnMinutes = minutes(raw.handsOnMinutes, "handsOnMinutes");
  const totalMinutes = minutes(raw.totalMinutes, "totalMinutes");
  if (totalMinutes === 0 || totalMinutes < handsOnMinutes) fail("totalMinutes");
  const waitLabel = raw.waitLabel === undefined || raw.waitLabel === null ? "" : text(raw.waitLabel, "waitLabel", true);
  if (waitLabel.length > MAX_WAIT_LABEL) fail("waitLabel");
  if (!isRecord(raw.safety)) fail("safety");
  const method: RecipeMethod = {
    shortName: text(raw.shortName, "shortName"),
    handsOnMinutes,
    totalMinutes,
    waitLabel,
    makes: text(raw.makes, "makes"),
    safety: {
      all: textList(raw.safety.all, "safety.all"),
      byAge: raw.safety.byAge === undefined || raw.safety.byAge === null ? {} : byAge(raw.safety.byAge, "safety.byAge"),
    },
    contains: textList(raw.contains, "contains"),
    ingredientGroups: nonEmpty(raw.ingredientGroups, "ingredientGroups", (group, path) => {
      if (!isRecord(group)) fail(path);
      return {
        name: heading(group.name, `${path}.name`),
        items: nonEmpty(group.items, `${path}.items`, (item, itemPath) => {
          if (!isRecord(item)) fail(itemPath);
          return {
            amount: item.amount === undefined || item.amount === null ? "" : text(item.amount, `${itemPath}.amount`, true),
            item: text(item.item, `${itemPath}.item`),
          };
        }),
      };
    }),
    tools: textList(raw.tools, "tools"),
    sections: nonEmpty(raw.sections, "sections", (section, path) => {
      if (!isRecord(section)) fail(path);
      return { name: heading(section.name, `${path}.name`), steps: nonEmpty(section.steps, `${path}.steps`, step) };
    }),
    tips: textList(raw.tips, "tips"),
    storage: raw.storage === undefined || raw.storage === null ? "" : text(raw.storage, "storage", true),
    madeIt: raw.madeIt === undefined || raw.madeIt === null ? "" : text(raw.madeIt, "madeIt", true),
  };
  if (raw.slug !== undefined && raw.slug !== null) method.slug = text(raw.slug, "slug");
  if (raw.title !== undefined && raw.title !== null) method.title = text(raw.title, "title");
  return method;
}

/** The method, or null when it is missing or malformed: the page then shows today's layout. */
export function parseRecipeMethod(raw: unknown): RecipeMethod | null {
  if (raw === null || raw === undefined) return null;
  try {
    return validateRecipeMethod(raw);
  } catch (error) {
    if (error instanceof InvalidMethod) return null;
    throw error;
  }
}

/** The first bad field's path, or null when the method is valid. For scripts and logs. */
export function methodProblem(raw: unknown): string | null {
  try {
    validateRecipeMethod(raw);
    return null;
  } catch (error) {
    if (error instanceof InvalidMethod) return error.message;
    throw error;
  }
}

/** 165 → "2 hr 45 min", 120 → "2 hr", 15 → "15 min". */
export function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

export function isMethodAge(value: unknown): value is MethodAge {
  return typeof value === "string" && AGE_KEYS.includes(value);
}

/** The line for this age. A plain string is the same for every age; a missing age gives null. */
export function pickForAge(value: PerAge | undefined, age: MethodAge): string | null {
  if (value === undefined) return null;
  if (typeof value === "string") return value || null;
  return value[age] || null;
}

/** True when anything on the page changes with the age, so the age switch is worth showing. */
export function hasPerAgeContent(method: RecipeMethod): boolean {
  if (Object.keys(method.safety.byAge).length > 0) return true;
  return method.sections.some((section) =>
    section.steps.some((s) => [s.toddler, s.say, s.safety, s.wait?.activity].some((line) => typeof line === "object"))
  );
}

export interface MethodTime {
  handsOn: string;
  total: string;
  /** Share of the bar filled as hands-on, 6 to 100. */
  handsOnPercent: number;
  sentence: string;
}

/** "15 min of work, then 2 hr 30 min in the freezer." or "All 15 min is hands-on. No waiting." */
export function methodTime(method: Pick<RecipeMethod, "handsOnMinutes" | "totalMinutes" | "waitLabel">): MethodTime {
  const wait = method.totalMinutes - method.handsOnMinutes;
  const handsOn = formatMinutes(method.handsOnMinutes);
  let sentence = `All ${handsOn} is hands-on. No waiting.`;
  if (wait > 0) {
    sentence = method.waitLabel
      ? `${handsOn} of work, then ${formatMinutes(wait)} in the ${method.waitLabel}.`
      : `${handsOn} of work, then ${formatMinutes(wait)} of waiting.`;
  }
  const share = Math.round((method.handsOnMinutes / method.totalMinutes) * 100);
  return {
    handsOn,
    total: formatMinutes(method.totalMinutes),
    handsOnPercent: wait <= 0 ? 100 : Math.min(100, Math.max(6, share)),
    sentence,
  };
}

/** Sections with the number of their first step: steps run 1 to n straight through every section. */
export function numberedSections(method: RecipeMethod): { name: string | null; start: number; steps: MethodStep[] }[] {
  let next = 1;
  return method.sections.map((section) => {
    const start = next;
    next += section.steps.length;
    return { name: section.name, start, steps: section.steps };
  });
}

/** Step photos live in Supabase Storage, in this public bucket and folder, never in the repo. */
export const STEP_PHOTO_FOLDER = "recipe-steps/halloween";

/**
 * A step photo's public address. `supabaseUrl` is the project URL from getSupabasePublicConfig(); it is passed in
 * so this file stays free of imports.
 */
export function stepPhotoSrc(supabaseUrl: string, file: string, size: 192 | 720): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${STEP_PHOTO_FOLDER}/${file}-${size}.webp`;
}

/** Schema.org steps: a HowToSection for a named section, plain HowToSteps otherwise. */
export function methodHowTo(method: RecipeMethod): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const section of method.sections) {
    const steps = section.steps.map((s) => ({ "@type": "HowToStep", name: s.stage, text: s.text }));
    if (section.name) out.push({ "@type": "HowToSection", name: section.name, itemListElement: steps });
    else out.push(...steps);
  }
  return out;
}

/** "3 pears" for schema.org's ingredient list. */
export function methodIngredientLines(method: RecipeMethod): string[] {
  return method.ingredientGroups.flatMap((group) =>
    group.items.map((entry) => [entry.amount, entry.item].filter(Boolean).join(" "))
  );
}
