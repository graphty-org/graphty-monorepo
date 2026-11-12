/**
 * @file Runs one Vite build and, when the build writes nothing, prints its chunks as a JSON array.
 *
 * Usage: node vite-build.mjs '<inline Vite config as JSON>'
 *
 * bundle.test.ts runs its builds here rather than in its own test worker. A worker under `--coverage` counts every
 * block of every script it runs, Vite and Rollup included (vitest's v8 provider drops what is not in src/ only
 * afterwards), which slowed the builds by a third for numbers nobody reads. A child process is not instrumented.
 */

import process from "node:process";

import { build } from "vite";

const out = await build(JSON.parse(process.argv[2]));
if (!Array.isArray(out) && "output" in out) {
    const chunks = out.output
        .filter((o) => o.type === "chunk")
        .map(({ fileName, isEntry, code, dynamicImports }) => ({ fileName, isEntry, code, dynamicImports }));
    process.stdout.write(JSON.stringify(chunks));
}
