import type { Result } from "./contracts";

export const RECIPE_PREVIEWS_BUCKET = "recipe-previews";
const OBJECT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,300}$/;

function fail(reason: string): { ok: false; code: "INVALID"; reference: string } {
  return { ok: false, code: "INVALID", reference: `admin-asset-${reason}` };
}

export function parseRecipeAsset(path: string, supabaseOrigin: string): Result<{ objectName: string }> {
  const trimmed = (path ?? "").trim();
  if (!trimmed) return fail("empty");
  let origin: URL;
  try {
    origin = new URL(supabaseOrigin);
  } catch {
    return fail("origin");
  }
  if (/^https?:\/\//i.test(trimmed)) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return fail("url");
    }
    if (parsed.origin !== origin.origin) return fail("origin");
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
      return fail("extras");
    }
    const prefix = `/storage/v1/object/public/${RECIPE_PREVIEWS_BUCKET}/`;
    if (!parsed.pathname.startsWith(prefix)) return fail("bucket");
    const objectName = decodeURIComponent(parsed.pathname.slice(prefix.length));
    if (!OBJECT_PATTERN.test(objectName) || objectName.includes("..")) return fail("name");
    return { ok: true, value: { objectName } };
  }
  const bucketPrefix = `${RECIPE_PREVIEWS_BUCKET}/`;
  const objectName = trimmed.startsWith(bucketPrefix) ? trimmed.slice(bucketPrefix.length) : trimmed;
  if (trimmed.startsWith("/") || trimmed.includes("\\")) return fail("absolute");
  if (!OBJECT_PATTERN.test(objectName) || objectName.includes("..")) return fail("name");
  return { ok: true, value: { objectName } };
}
