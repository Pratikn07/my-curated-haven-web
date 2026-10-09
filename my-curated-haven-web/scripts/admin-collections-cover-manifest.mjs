// Writes src/config/collection-covers.json: the approved collection covers an editor may choose.
// Each entry is a file already shipped in public/images/collections, with its real WebP size and
// SHA-256 digest. Run after adding or replacing a cover; tests/admin/collections-covers.test.mjs
// fails if the manifest and the files drift.
//   node scripts/admin-collections-cover-manifest.mjs [--check]
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

register("./ts-alias-hooks.mjs", import.meta.url);
const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = resolve(WEB, "public/images/collections");
const OUT = resolve(WEB, "src/config/collection-covers.json");

/** Width and height from a WebP header (VP8X, VP8 or VP8L). */
export function webpSize(bytes) {
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") throw new Error("not a WebP");
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  if (chunk === "VP8 ") return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const b = bytes.readUInt32LE(21);
    return { width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff) };
  }
  throw new Error(`unsupported WebP chunk ${chunk}`);
}

export async function buildCoverManifest() {
  const { SHOWROOM_COLLECTIONS } = await import("../src/config/collections.ts");
  const altBySrc = new Map(SHOWROOM_COLLECTIONS.filter((c) => c.cover).map((c) => [c.cover.src, c.cover.alt]));
  return readdirSync(DIR).filter((f) => /^cover-[a-z0-9-]+\.webp$/.test(f)).sort().map((file) => {
    const bytes = readFileSync(resolve(DIR, file));
    const src = `/images/collections/${file}`;
    return { src, ...webpSize(bytes), alt: altBySrc.get(src) ?? "",
      assetDigest: createHash("sha256").update(bytes).digest("hex") };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await buildCoverManifest();
  const text = `${JSON.stringify(manifest, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    const current = readFileSync(OUT, "utf8");
    if (current !== text) { console.error("collection-covers.json is out of date; rerun without --check"); process.exitCode = 1; }
  } else {
    writeFileSync(OUT, text);
    console.log(`${manifest.length} covers written to src/config/collection-covers.json`);
  }
}
