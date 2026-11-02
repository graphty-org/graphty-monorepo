/**
 * Build Bundle Script
 *
 * One multi-entry vite library build (ES modules only) that emits, under dist/:
 * - webgpu-graph-algorithms.js, the root entry package.json "exports" ["."] points at (the core: GpuContext,
 *   the kernels, the algorithms and the layouts)
 * - browser.js, the "./browser" subpath (navigator.gpu acquisition, spec 2.3)
 * - node.js, the "./node" subpath -- the ONLY bundle that names the "webgpu" (Dawn) module, and only inside a
 *   dynamic import(), so a browser bundle never resolves it (spec 2.5; test/build-output.test.ts)
 * - chunks/*.js, the code two or more entries share, emitted once
 *
 * Runtime dependencies stay external so consumers install exactly one copy of each: every name under
 * package.json "dependencies" and "peerDependencies" (@graphty/graph-format, @webgpu/types, webgpu,
 * the algorithms and layout packages), subpaths included. Run "npm run build" (tsc -p tsconfig.build.json)
 * first so that dist/src/ exists; scripts/bundle-types.js then writes one d.ts shim per entry that re-exports
 * the per-module declarations under dist/src/. At P0 the browser entry is `export {};`, so vite reports
 * "Generated an empty chunk: browser" -- a warning, not an error (contract 2.6).
 *
 * The build itself is tools/build-bundle.mjs, shared with the other multi-entry packages.
 */

import path from "node:path";
import { build } from "vite";

import { buildBundle } from "../../tools/build-bundle.mjs";
import { ENTRIES } from "./entries.js";

await buildBundle({ build, packageRoot: path.resolve(import.meta.dirname, ".."), entries: ENTRIES });
