// Minimal Node ESM resolver hook that maps the "@/" import alias (defined in
// tsconfig.json for Next.js/webpack) to the project root, so plain `node
// --test` can load app source files without pulling in a bundler. Zero new
// dependencies — uses only Node's built-in module customization hooks.
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const projectRoot = pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..") + path.sep).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    let rest = specifier.slice(2);
    if (!path.extname(rest)) rest += ".ts";
    return nextResolve(new URL(rest, projectRoot).href, context);
  }
  return nextResolve(specifier, context);
}
