import Link from "next/link";
import { notFound } from "next/navigation";
import RecipeEditor from "@/components/admin/RecipeEditor";
import RecipeStateBadge, { describePlacement } from "@/components/admin/RecipeStateBadge";
import WithdrawButton from "@/components/admin/WithdrawButton";
import { ADMIN_WRITE_MESSAGES, type AdminWriteError } from "@/lib/admin/errors";
import { publishProblems } from "@/lib/admin/recipe-input";
import { getAdminRecipe } from "@/lib/admin/recipes";
import { requireAdminPage } from "@/lib/admin/session";

const DONE_MESSAGES: Record<string, string> = {
  saved: "Saved.",
  "saved-not-ready": "Saved as a draft. It isn't ready to go live yet; see the list below.",
  published: "Published. Parents can now open it.",
  withdrawn: "Taken off the site. Parents can no longer open it.",
};

export default async function EditRecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdminPage(`/admin/recipes/${id}`);
  const recipe = await getAdminRecipe(supabase, id);
  if (!recipe) notFound();

  const query = await searchParams;
  const done = typeof query.done === "string" ? DONE_MESSAGES[query.done] : undefined;
  const failure =
    typeof query.error === "string" && query.error in ADMIN_WRITE_MESSAGES
      ? ADMIN_WRITE_MESSAGES[query.error as AdminWriteError]
      : undefined;

  const isLive = recipe.publicationState === "published";
  const problems = isLive ? [] : publishProblems(recipe.input);

  return (
    <div className="grid gap-6">
      <header className="grid gap-3">
        <Link href="/admin/recipes" className="text-sm font-semibold text-action underline underline-offset-4">
          All recipes
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground [overflow-wrap:anywhere]">
            {recipe.input.title}
          </h1>
          <RecipeStateBadge state={recipe.publicationState} />
        </div>
        <p className="text-text-muted">
          {describePlacement(recipe.publicationState, recipe.freeSlot, recipe.collections)}
        </p>

        {done ? (
          <p role="status" className="rounded-xl border border-success bg-surface p-3 font-semibold text-success">
            {done}
          </p>
        ) : null}
        {failure ? (
          <p role="alert" className="rounded-xl border border-danger bg-surface p-3 font-semibold text-danger">
            {failure}
          </p>
        ) : null}

        {problems.length > 0 ? (
          <div className="rounded-xl border border-border bg-surface-muted p-4">
            <p className="font-semibold">Before it can go live:</p>
            <ul className="mt-2 list-disc pl-5 text-text-muted">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {isLive ? (
          <div className="flex flex-wrap items-start gap-3">
            <Link
              href={`/recipes/${recipe.input.slug}`}
              target="_blank"
              className="inline-flex min-h-12 items-center rounded-xl border border-border-control bg-surface px-5 font-semibold text-foreground hover:bg-surface-muted"
            >
              View on the site
            </Link>
            <WithdrawButton recipeId={recipe.id} version={recipe.version} slug={recipe.input.slug} />
          </div>
        ) : null}
      </header>

      <RecipeEditor
        key={recipe.version}
        recipeId={recipe.id}
        version={recipe.version}
        initial={recipe.input}
        isLive={isLive}
        slugLocked={recipe.publishedAt !== null}
      />
    </div>
  );
}
