/**
 * Build Bundle Script
 *
 * One multi-entry vite library build (ES modules only) that emits, under dist/:
 * - graph-io.js, the root entry package.json "exports" ["."] points at
 * - <format>.js for every per-format subpath (gexf, graphml, gml, dot, pajek, csv, json, neo4j),
 *   so an application that imports only "@graphty/graph-io/csv" never loads the XML formats
 * - chunks/*.js, the code two or more entries share (the common helpers, the io types), emitted
 *   once so every entry sees one ImportError class and one LOSS table
 *
 * Runtime dependencies (@graphty/graph-format) stay external so
 * consumers install exactly one copy of each. Run "npm run build" (tsc -p tsconfig.build.json)
 * first so that dist/src/ exists; scripts/bundle-types.js then writes one d.ts shim per entry
 * that re-exports the per-module declarations under dist/src/.
 *
 * The build itself is tools/build-bundle.mjs, shared with the other multi-entry packages.
 */

import path from "node:path";
import { build } from "vite";

import { buildBundle } from "../../tools/build-bundle.mjs";
import { ENTRIES } from "./entries.js";

await buildBundle({ build, packageRoot: path.resolve(import.meta.dirname, ".."), entries: ENTRIES });
