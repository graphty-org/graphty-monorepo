#!/usr/bin/env node
/**
 * The graphty app's size budget (issue #8018), like graphty-element's tools/check-bundle-size.mjs: what the built app
 * (dist/, after `npm run build`) asks a browser to download, against size-budgets.json beside package.json.
 *
 *   landing page        gzip of index.html and every script it loads before any dynamic import (landing-files.mjs):
 *                       what a first visit downloads before the start page can show
 *   all JavaScript      gzip of every .js file in the build, lazy chunks included
 *   all other files     bytes of everything else (samples, images, fonts, wasm), as served; source maps are left
 *                       out, since a browser fetches one only when its developer tools are open
 *   landing page files  how many files the landing page part is: a count, not bytes, so a split into many small
 *                       chunks (each a request) shows even when the bytes hold (issue #8225)
 *
 * Fails when a part is over its budget. Each budget is the size measured when it was set plus headroomPercent, and
 * at least minimumHeadroomBytes. When growth is intended, `node scripts/check-size.mjs --update` rewrites every budget
 * from the current build; commit size-budgets.json and say why in the commit message.
 *
 * Usage (from graphty/): node scripts/check-size.mjs [--update]
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { landingFiles } from "./landing-files.mjs";

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(pkg, "dist");
const budgetFile = join(pkg, "size-budgets.json");
if (!existsSync(join(dist, "index.html"))) {
    console.error("no built app in graphty/dist: run `pnpm exec nx run graphty:build` first");
    process.exit(1);
}

const gzip = (file) => gzipSync(readFileSync(file), { level: 9 }).length;
const all = readdirSync(dist, { recursive: true })
    .map((name) => join(dist, String(name)))
    .filter((file) => statSync(file).isFile() && !file.endsWith(".map"));
const landing = [join(dist, "index.html"), ...landingFiles(dist)];
const COUNTS = new Set(["landing page files"]);
const measured = {
    "landing page": landing.reduce((sum, f) => sum + gzip(f), 0),
    "landing page files": landing.length,
    "all JavaScript": all.filter((f) => f.endsWith(".js")).reduce((sum, f) => sum + gzip(f), 0),
    "all other files": all.filter((f) => !f.endsWith(".js")).reduce((sum, f) => sum + statSync(f).size, 0),
};

const budgets = JSON.parse(readFileSync(budgetFile, "utf8"));
const kb = (n) => `${(n / 1024).toFixed(1)} KiB`;
const show = (name, n) => (COUNTS.has(name) ? `${n} files` : kb(n));

if (process.argv.includes("--update")) {
    const factor = 1 + budgets.headroomPercent / 100;
    budgets.parts = Object.fromEntries(
        Object.entries(measured).map(([k, v]) => [
            k,
            Math.ceil(COUNTS.has(k) ? v * factor : Math.max(v * factor, v + budgets.minimumHeadroomBytes)),
        ]),
    );
    writeFileSync(budgetFile, `${JSON.stringify(budgets, null, 4)}\n`);
    console.log(`Rewrote graphty/size-budgets.json with ${budgets.headroomPercent}% headroom.`);
    process.exit(0);
}

let failed = 0;
for (const [name, bytes] of Object.entries(measured)) {
    const budget = budgets.parts[name];
    if (typeof budget !== "number") {
        failed++;
        console.error(`${name}: ${show(name, bytes)}, but size-budgets.json has no budget for it`);
    } else if (bytes > budget) {
        failed++;
        console.error(
            `${name}: ${show(name, bytes)} is ${show(name, bytes - budget)} over its budget of ${show(name, budget)}`,
        );
    } else {
        console.log(`${name}: ${show(name, bytes)}, budget ${show(name, budget)} (${show(name, budget - bytes)} left)`);
    }
}
if (failed > 0) {
    console.error(
        `\n${failed} size problem(s) in the graphty app. If the growth is intended, run ` +
            "`node scripts/check-size.mjs --update` in graphty/ and commit graphty/size-budgets.json.",
    );
    process.exit(1);
}
