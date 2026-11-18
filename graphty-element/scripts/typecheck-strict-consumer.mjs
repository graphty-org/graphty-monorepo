#!/usr/bin/env node
// `node scripts/typecheck-strict-consumer.mjs <tsconfig>...`: compile each config (tsconfig.strict-consumer.json and
// the configs extending it) with skipLibCheck off, and fail on every error except those inside the declarations of
// Babylon.js and @webgpu/types.
//
// Why the exception: Babylon.js 9's own declarations do not compile with skipLibCheck off. They name WebGPU types
// that TypeScript 5's DOM library lacks, and with @webgpu/types (which the config adds, as a consumer on TypeScript 5
// must) the two disagree about a few limits; TAAJitterMaterialPlugin.getUniforms also fails
// exactOptionalPropertyTypes. Those are Babylon's to fix and every consumer meets them, so consumers keep skipLibCheck
// on (docs/guide/installation.md). graphty-element's own published declarations, and the consumer files compiled
// against them, are still checked in full.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tsc = require.resolve("typescript/bin/tsc");

/** An error in a file under one of these is a third party's, reported but not failed. */
const THIRD_PARTY = /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?(?:@babylonjs|@webgpu)\//;

let failed = false;
for (const config of process.argv.slice(2)) {
    const run = spawnSync(process.execPath, [tsc, "-p", config, "--pretty", "false"], { encoding: "utf8" });
    if (run.error !== undefined) {
        throw run.error;
    }

    // An error starts a line `<file>(<line>,<col>): error TS...`; the lines after it, indented, belong to it.
    const errors = [];
    for (const line of run.stdout.split("\n")) {
        if (/^\S.*: error TS\d+/.test(line)) {
            errors.push([line]);
        } else if (line.trim() !== "" && errors.length > 0) {
            errors.at(-1).push(line);
        }
    }

    const own = errors.filter(([first]) => !THIRD_PARTY.test(first));
    if (run.status !== 0 && errors.length === 0) {
        process.stderr.write(run.stdout + run.stderr);
        failed = true;
        continue;
    }

    for (const error of own) {
        process.stderr.write(`${error.join("\n")}\n`);
    }

    console.log(
        `${config}: ${own.length} error(s); ${errors.length - own.length} in Babylon.js or @webgpu/types declarations`,
    );
    failed ||= own.length > 0;
}

process.exit(failed ? 1 : 0);
