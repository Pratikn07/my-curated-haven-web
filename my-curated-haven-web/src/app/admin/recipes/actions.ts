"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMIN_WRITE_MESSAGES } from "@/lib/admin/errors";
import { parseRecipeForm, publishProblems, type FieldErrors } from "@/lib/admin/recipe-input";
import {
  getAdminRecipe,
  publishAdminRecipe,
  saveAdminRecipe,
  withdrawAdminRecipe,
} from "@/lib/admin/recipes";
import { getAdminSession } from "@/lib/admin/session";
import { requireSupabasePublicConfig } from "@/lib/supabase/env";

export type EditorState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: FieldErrors; problems?: string[] };

const SESSION_ENDED: EditorState = { status: "error", message: ADMIN_WRITE_MESSAGES.not_admin };

function formText(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Photos come from this project's public storage, or are the photo the recipe already had. */
function isOwnStorageUrl(url: string): boolean {
  const { url: supabaseUrl } = requireSupabasePublicConfig();
  return url.startsWith(`${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/`);
}

function refreshRecipePages(slug: string) {
  revalidatePath(`/recipes/${slug}`);
  revalidatePath("/recipes");
  revalidatePath("/");
  revalidatePath("/admin/recipes");
}

export async function saveRecipeAction(_prev: EditorState, formData: FormData): Promise<EditorState> {
  const session = await getAdminSession();
  if (session.status !== "admin") return SESSION_ENDED;
  const { supabase } = session;

  const publish = formData.get("intent") === "publish";
  const recipeId = formText(formData, "recipeId");
  const version = formText(formData, "version");

  const parsed = parseRecipeForm(formData);
  if (!parsed.ok) {
    return { status: "error", message: ADMIN_WRITE_MESSAGES.invalid, fieldErrors: parsed.errors };
  }
  const recipe = parsed.value;

  if (recipe.imageUrl && !isOwnStorageUrl(recipe.imageUrl)) {
    const current = recipeId ? await getAdminRecipe(supabase, recipeId) : null;
    if (current?.input.imageUrl !== recipe.imageUrl) {
      return {
        status: "error",
        message: ADMIN_WRITE_MESSAGES.invalid,
        fieldErrors: { imageUrl: "Upload the photo again." },
      };
    }
  }

  const saved = await saveAdminRecipe(
    supabase,
    recipe,
    recipeId && version ? { id: recipeId, version } : null
  );
  if (!saved.ok) {
    return {
      status: "error",
      message: ADMIN_WRITE_MESSAGES[saved.error],
      fieldErrors: saved.error === "slug_taken" ? { slug: "This web address is taken." } : undefined,
    };
  }

  const { id, slug } = saved.value;
  refreshRecipePages(slug);
  const editUrl = `/admin/recipes/${id}`;

  if (!publish) redirect(`${editUrl}?done=saved`);

  const problems = publishProblems(recipe);
  if (problems.length > 0) redirect(`${editUrl}?done=saved-not-ready`);

  const published = await publishAdminRecipe(supabase, id, saved.value.version);
  if (!published.ok) redirect(`${editUrl}?done=saved&error=${published.error}`);

  refreshRecipePages(slug);
  redirect(`${editUrl}?done=published`);
}

export async function withdrawRecipeAction(_prev: EditorState, formData: FormData): Promise<EditorState> {
  const session = await getAdminSession();
  if (session.status !== "admin") return SESSION_ENDED;

  const recipeId = formText(formData, "recipeId");
  const version = formText(formData, "version");
  const slug = formText(formData, "slug");
  if (!recipeId || !version) return { status: "error", message: ADMIN_WRITE_MESSAGES.not_found };

  const result = await withdrawAdminRecipe(session.supabase, recipeId, version);
  if (!result.ok) return { status: "error", message: ADMIN_WRITE_MESSAGES[result.error] };

  if (slug) refreshRecipePages(slug);
  redirect(`/admin/recipes/${recipeId}?done=withdrawn`);
}
