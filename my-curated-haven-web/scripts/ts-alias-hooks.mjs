// Node module hooks so scripts and tests can import app TypeScript that uses the `@/` alias
// (tsconfig paths) and extensionless relative imports. Node strips the types itself.
// Usage: import { register } from "node:module"; register("./ts-alias-hooks.mjs", import.meta.url);
import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = resolvePath(dirname(fileURLToPath(import.meta.url)), "../src");

/** The first existing file for an import path: as written if it has an extension, else .ts or index.ts. */
function candidate(base) {
  const paths = /\.[cm]?[jt]sx?$|\.json$/.test(base) ? [base] : [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`];
  const found = paths.find((path) => existsSync(path));
  return found ? pathToFileURL(found).href : null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const url = candidate(resolvePath(SRC, specifier.slice(2)));
    if (url) return { url, shortCircuit: true };
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const parent = fileURLToPath(context.parentURL);
    if (parent.startsWith(SRC)) {
      const url = candidate(resolvePath(dirname(parent), specifier));
      if (url) return { url, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}
