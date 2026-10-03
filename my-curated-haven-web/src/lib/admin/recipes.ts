import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../types/database";
import { classifyAdminError, type AdminWriteError } from "./errors";
import { inputFromStored, toSavePayload, type AdminRecipeInput } from "./recipe-input";

type Client = SupabaseClient<Database>;

export type PublicationState = "draft" | "published" | "withdrawn";

export interface AdminRecipeListItem {
  id: string;
  slug: string;
  title: string;
  publicationState: PublicationState;
  previewImagePath: string;
  updatedAt: string;
  freeSlot: number | null;
  collections: string[];
}

export type AdminWriteResult<T> = { ok: true; value: T } | { ok: false; error: AdminWriteError };

export interface AdminRecipe {
  id: string;
  publicationState: PublicationState;
  publishedAt: string | null;
  version: string;
  freeSlot: number | null;
  collections: string[];
  input: AdminRecipeInput;
}

function asRecord(value: Json | null): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asState(value: unknown): PublicationState {
  return value === "published" || value === "withdrawn" ? value : "draft";
}

export async function isRecipeAdmin(client: Client): Promise<boolean> {
  const { data, error } = await client.rpc("is_recipe_admin");
  if (error) throw new Error(`Admin check failed: ${error.message}`);
  return data === true;
}

export async function listAdminRecipes(
  client: Client,
  state: PublicationState | null
): Promise<AdminRecipeListItem[]> {
  const { data, error } = await client.rpc("admin_list_recipes", state ? { p_state: state } : {});
  if (error || !data) {
    throw new Error(`Failed to list recipes: ${error?.message ?? "empty response"}`);
  }
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    publicationState: asState(row.publication_state),
    previewImagePath: row.preview_image_path,
    updatedAt: row.updated_at,
    freeSlot: row.free_slot ?? null,
    collections: row.collections ?? [],
  }));
}

export async function getAdminRecipe(client: Client, id: string): Promise<AdminRecipe | null> {
  const { data, error } = await client.rpc("admin_get_recipe", { p_recipe_id: id });
  if (error) {
    if (error.code === "22P02") return null;
    throw new Error(`Failed to load recipe: ${error.message}`);
  }
  const stored = asRecord(data);
  if (!stored) return null;
  return {
    id: String(stored.id),
    publicationState: asState(stored.publicationState),
    publishedAt: typeof stored.publishedAt === "string" ? stored.publishedAt : null,
    version: String(stored.version),
    freeSlot: typeof stored.freeSlot === "number" ? stored.freeSlot : null,
    collections: Array.isArray(stored.collections) ? stored.collections.map(String) : [],
    input: inputFromStored(stored),
  };
}

export async function saveAdminRecipe(
  client: Client,
  recipe: AdminRecipeInput,
  existing: { id: string; version: string } | null
): Promise<AdminWriteResult<{ id: string; slug: string; version: string }>> {
  const { data, error } = await client.rpc("admin_save_recipe", {
    p_recipe: toSavePayload(recipe),
    ...(existing ? { p_recipe_id: existing.id, p_expected_version: existing.version } : {}),
  });
  const saved = asRecord(data);
  if (error || !saved) return { ok: false, error: classifyAdminError(error) };
  return {
    ok: true,
    value: { id: String(saved.id), slug: String(saved.slug), version: String(saved.version) },
  };
}

async function changeState(
  client: Client,
  fn: "admin_publish_recipe" | "admin_withdraw_recipe",
  id: string,
  version: string
): Promise<AdminWriteResult<{ version: string }>> {
  const { data, error } = await client.rpc(fn, { p_recipe_id: id, p_expected_version: version });
  const result = asRecord(data);
  if (error || !result) return { ok: false, error: classifyAdminError(error) };
  return { ok: true, value: { version: String(result.version) } };
}

export function publishAdminRecipe(client: Client, id: string, version: string) {
  return changeState(client, "admin_publish_recipe", id, version);
}

export function withdrawAdminRecipe(client: Client, id: string, version: string) {
  return changeState(client, "admin_withdraw_recipe", id, version);
}
