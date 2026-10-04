#!/usr/bin/env node
/**
 * check-bundle-size.mjs -- a minified, gzipped size budget for every JavaScript entry point
 * graphty-element publishes.
 *
 * For each entry in graphty-element/package.json `exports` that points at a .js file, this measures
 * the entry file plus every file it statically imports from dist/ (the shared chunks under
 * dist/chunks/, followed transitively), minifies each file with esbuild (through Vite), gzips it,
 * and compares the sum with the entry's budget in graphty-element/size-budgets.json. The library
 * build is not minified, so measuring dist/ as it stands would count JSDoc and whitespace that a
 * bundler strips before any user downloads it; minifying first measures the code that ships.
 * Dynamic import() is not followed: a lazily loaded chunk is not part of what a consumer
 * downloads to load the entry. Bare imports (babylonjs, lit)
 * are external to dist/ and are not counted; the Node-safe entry points are kept free of those by
 * graphty-element/test/packaging/node-safe-entries.test.ts.
 *
 * It fails when an entry is over its budget, when an entry has no budget (a new entry point cannot
 * skip the gate), and when a budget names an entry that no longer exists.
 *
 * Each budget is the size measured when it was set plus the headroom stated in the budget file
 * (a percentage, with a floor in bytes so a near-empty entry is not failed by a one-byte change).
 * When growth is intended, `--update` rewrites every budget from the current dist/ with that
 * headroom; commit the result and say why in the commit message.
 *
 * Needs a build of graphty-element first.
 * Usage: node tools/check-bundle-size.mjs [--update]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { transformWithEsbuild } from "vite";

const pkgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "graphty-element");
const budgetFile = path.join(pkgDir, "size-budgets.json");
const { exports } = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
const budgets = JSON.parse(fs.readFileSync(budgetFile, "utf8"));

// `from "./x.js"` and the side-effect form `import "./x.js"`; `import("./x.js")` has a paren and is skipped.
const STATIC_IMPORT = /\b(?:from|import)\s*["'](\.{1,2}\/[^"']+)["']/g;

function closure(entry) {
    const seen = new Set();
    const visit = (file) => {
        if (seen.has(file)) {
            return;
        }
        seen.add(file);
        for (const [, spec] of fs.readFileSync(file, "utf8").matchAll(STATIC_IMPORT)) {
            visit(path.resolve(path.dirname(file), spec));
        }
    };
    visit(entry);
    return seen;
}

const measured = {};
for (const [name, target] of Object.entries(exports)) {
    const file = typeof target === "string" ? target : target.import;
    if (!file?.endsWith(".js")) {
        continue;
    }
    const entry = path.join(pkgDir, file);
    if (!fs.existsSync(entry)) {
        console.error(`${name}: ${file} does not exist. Build graphty-element first.`);
        process.exit(1);
    }
    let bytes = 0;
    for (const f of closure(entry)) {
        const { code } = await transformWithEsbuild(fs.readFileSync(f, "utf8"), f, { minify: true, format: "esm" });
        bytes += gzipSync(code, { level: 9 }).length;
    }
    measured[name] = bytes;
}

const kb = (n) => `${(n / 1024).toFixed(1)} KiB`;

if (process.argv.includes("--update")) {
    const factor = 1 + budgets.headroomPercent / 100;
    const budget = (v) => Math.ceil(Math.max(v * factor, v + budgets.minimumHeadroomBytes));
    budgets.entries = Object.fromEntries(Object.entries(measured).map(([k, v]) => [k, budget(v)]));
    fs.writeFileSync(budgetFile, `${JSON.stringify(budgets, null, 4)}\n`);
    console.log(`Rewrote ${path.relative(process.cwd(), budgetFile)} with ${budgets.headroomPercent}% headroom.`);
    process.exit(0);
}

let failed = 0;
for (const [name, bytes] of Object.entries(measured)) {
    const budget = budgets.entries[name];
    if (budget === undefined) {
        failed++;
        console.error(`${name}: ${kb(bytes)} minified+gzip, but size-budgets.json has no budget for this entry point`);
    } else if (bytes > budget) {
        failed++;
        console.error(`${name}: ${kb(bytes)} minified+gzip is ${kb(bytes - budget)} over its budget of ${kb(budget)}`);
    } else {
        console.log(`${name}: ${kb(bytes)} minified+gzip, budget ${kb(budget)} (${kb(budget - bytes)} left)`);
    }
}
for (const name of Object.keys(budgets.entries)) {
    if (!(name in measured)) {
        failed++;
        console.error(`${name}: size-budgets.json has a budget for an entry point package.json no longer exports`);
    }
}

if (failed > 0) {
    console.error(
        `\n${failed} bundle size problem(s) in graphty-element. If the growth is intended, run ` +
            "`node tools/check-bundle-size.mjs --update` and commit graphty-element/size-budgets.json.",
    );
    process.exit(1);
}
