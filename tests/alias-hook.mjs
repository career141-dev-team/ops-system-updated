/**
 * The `@/...` alias and extensionless imports, which Next does when it builds
 * and Node does not. Tests then load the very modules the app ships.
 */
import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const EXTS = [".ts", ".tsx", "/index.ts", "/index.tsx", ".js"];

function firstFile(base) {
  for (const ext of ["", ...EXTS]) {
    try {
      if (statSync(base + ext).isFile()) return base + ext;
    } catch {
      /* next */
    }
  }
  return null;
}

export async function resolve(specifier, context, next) {
  if (specifier === "server-only") {
    return { shortCircuit: true, url: "data:text/javascript,export default {};" };
  }
  if (specifier.startsWith("@/")) {
    const hit = firstFile(path.join(SRC, specifier.slice(2)));
    if (hit) return next(pathToFileURL(hit).href, context);
    throw new Error("alias hook: cannot resolve " + specifier + " under " + SRC);
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier)) {
    const parent = context.parentURL && context.parentURL.startsWith("file:") ? fileURLToPath(context.parentURL) : null;
    if (parent) {
      const hit = firstFile(path.resolve(path.dirname(parent), specifier));
      if (hit) return next(pathToFileURL(hit).href, context);
    }
  }
  return next(specifier, context);
}
