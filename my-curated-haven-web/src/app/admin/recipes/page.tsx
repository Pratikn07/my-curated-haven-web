import Image from "next/image";
import Link from "next/link";
import RecipeStateBadge, { describePlacement } from "@/components/admin/RecipeStateBadge";
import { listAdminRecipes, type PublicationState } from "@/lib/admin/recipes";
import { requireAdminPage } from "@/lib/admin/session";

const FILTERS: { label: string; state: PublicationState | null }[] = [
  { label: "All", state: null },
  { label: "Drafts", state: "draft" },
  { label: "Live", state: "published" },
  { label: "Taken down", state: "withdrawn" },
];

function parseState(raw: string | string[] | undefined): PublicationState | null {
  return raw === "draft" || raw === "published" || raw === "withdrawn" ? raw : null;
}

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function AdminRecipesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await requireAdminPage("/admin/recipes");
  const state = parseState((await searchParams).state);
  const recipes = await listAdminRecipes(supabase, state);

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Recipes</h1>
          <p className="mt-1 text-text-muted">Add a recipe, fix one, or put it live.</p>
        </div>
        <Link
          href="/admin/recipes/new"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-action px-5 font-semibold text-action-foreground hover:bg-action-hover"
        >
          New recipe
        </Link>
      </header>

      <nav aria-label="Filter recipes" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = filter.state === state;
          return (
            <Link
              key={filter.label}
              href={filter.state ? `/admin/recipes?state=${filter.state}` : "/admin/recipes"}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
                active
                  ? "border-action bg-action text-action-foreground"
                  : "border-border-control bg-surface text-foreground hover:bg-surface-muted"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {recipes.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-border bg-surface p-6 text-text-muted">
          No recipes here yet.
        </p>
      ) : (
        <ul className="grid gap-3">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/admin/recipes/${recipe.id}`}
                className="flex items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-3 hover:border-action sm:p-4"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                  {/^https?:\/\//.test(recipe.previewImagePath) ? (
                    <Image src={recipe.previewImagePath} alt="" fill sizes="64px" unoptimized className="object-cover" />
                  ) : null}
                </div>
                <div className="grid min-w-0 flex-1 gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground [overflow-wrap:anywhere]">{recipe.title}</span>
                    <RecipeStateBadge state={recipe.publicationState} />
                  </div>
                  <p className="text-sm text-text-muted">
                    {describePlacement(recipe.publicationState, recipe.freeSlot, recipe.collections)}
                  </p>
                  <p className="text-xs text-text-muted">Updated {dateFormat.format(new Date(recipe.updatedAt))}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
