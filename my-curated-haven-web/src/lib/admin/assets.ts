import "server-only";
import { Client } from "pg";
import type { Asset, Result, Revision } from "./contracts";
import { adminRpc } from "./rpc";
import { createClient } from "../supabase/server";
import { getAdminContext } from "./context";
import { parseRecipeAsset, RECIPE_PREVIEWS_BUCKET } from "./asset-path";

function databaseUrl(): string {
  const raw = process.env.COMMERCE_DATABASE_URL;
  if (!raw) throw new Error("Asset verification needs COMMERCE_DATABASE_URL.");
  return raw;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeAssets(data: unknown): Asset[] {
  if (!Array.isArray(data)) throw new Error("bad assets");
  return data as Asset[];
}

export async function listAdminAssets(): Promise<Result<Asset[]>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_recipe_assets"), decodeAssets);
}

export async function verifyAdminAsset(
  revision: Revision
): Promise<Result<{ objectId: string | null; checkedAt: string; available: boolean }>> {
  const reference = `admin-asset-${Math.random().toString(36).slice(2, 10)}`;
  const context = await getAdminContext();
  if (!context.ok) return context;
  if (context.value.assurance !== "aal2") {
    return { ok: false, code: "MFA_REQUIRED", reference };
  }
  if (!context.value.operator.permissions.includes("recipe.edit")) {
    return { ok: false, code: "DENIED", reference };
  }
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseOrigin) return { ok: false, code: "UNAVAILABLE", reference };
  const parsed = parseRecipeAsset(revision.snapshot.image.path, supabaseOrigin);
  if (!parsed.ok) return { ...parsed, reference };

  let identity: { id: string; version: string | null } | null = null;
  try {
    const pg = new Client({ connectionString: databaseUrl() });
    await pg.connect();
    try {
      const res = await pg.query(
        "SELECT id, version FROM storage.objects WHERE bucket_id = 'recipe-previews' AND name = $1",
        [parsed.value.objectName]
      );
      identity = res.rows[0] ?? null;
    } finally {
      await pg.end();
    }
  } catch {
    return { ok: false, code: "UNAVAILABLE", reference };
  }

  const encodedObject = parsed.value.objectName.split("/").map(encodeURIComponent).join("/");
  const validatedUrl = new URL(
    `/storage/v1/object/public/${RECIPE_PREVIEWS_BUCKET}/${encodedObject}`,
    supabaseOrigin
  );
  let available = false;
  try {
    const response = await fetch(validatedUrl, {
      method: "HEAD",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    available = response.ok;
  } catch {
    available = false;
  }

  const checkedAt = new Date().toISOString();
  try {
    const pg = new Client({ connectionString: databaseUrl() });
    await pg.connect();
    try {
      await pg.query("SELECT private.admin_record_asset_check($1,$2,$3,$4,$5,$6)", [
        revision.id,
        revision.digest,
        identity?.id ?? null,
        identity?.version ?? null,
        available && identity !== null,
        checkedAt,
      ]);
    } finally {
      await pg.end();
    }
  } catch {
    return { ok: false, code: "UNAVAILABLE", reference };
  }

  if (!isRecord(revision.snapshot)) return { ok: false, code: "INVALID", reference };
  return {
    ok: true,
    value: { objectId: identity?.id ?? null, checkedAt, available: available && identity !== null },
  };
}
