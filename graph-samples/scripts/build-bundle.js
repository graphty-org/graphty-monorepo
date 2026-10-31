/**
 * Build Bundle Script
 *
 * One multi-entry vite library build (ES modules only) that emits, under dist/:
 * - graph-samples.js, the root entry package.json "exports" ["."] points at
 * - generators.js, the "./generators" subpath
 * - datasets/<name>.js for every bundled dataset ("./datasets/*"), so an application that imports
 *   one dataset never loads the others
 * - chunks/*.js, the code two or more entries share, emitted once
 *
 * Runtime dependencies (@graphty/graph-format) stay external so consumers install exactly one
 * copy. Run "npm run build" (tsc -p tsconfig.build.json) first so that dist/src/ exists;
 * scripts/bundle-types.js then writes one d.ts shim per entry that re-exports the declarations
 * under dist/src/.
 *
 * The build itself is tools/build-bundle.mjs, shared with the other multi-entry packages.
 */

import path from "node:path";
import { build } from "vite";

import { buildBundle } from "../../tools/build-bundle.mjs";
import { ENTRIES } from "./entries.js";

await buildBundle({ build, packageRoot: path.resolve(import.meta.dirname, ".."), entries: ENTRIES });
