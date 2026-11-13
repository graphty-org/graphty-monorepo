/**
 * The bundle entries of @graphty/graph-samples: the root barrel, the generators subpath and one
 * entry per bundled dataset (every src/datasets/<name>/index.ts). Shared by
 * scripts/build-bundle.js (which emits dist/<name>.js for each) and tools/build-bundle.mjs (which
 * writes the matching dist/<name>.d.ts shim); package.json "exports" maps "./datasets/*" onto
 * dist/datasets/*, which test/build-output.test.ts checks.
 *
 * Keys are the output names under dist/, values the source entry relative to the package root.
 */

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const datasets = readdirSync(path.join(packageRoot, "src/datasets"), { withFileTypes: true })
    .filter(
        (entry) => entry.isDirectory() && existsSync(path.join(packageRoot, "src/datasets", entry.name, "index.ts")),
    )
    .map((entry) => entry.name)
    .sort();

export const ENTRIES = Object.freeze({
    "graph-samples": "src/index.ts",
    generators: "src/generators/index.ts",
    ...Object.fromEntries(datasets.map((name) => [`datasets/${name}`, `src/datasets/${name}/index.ts`])),
});
