#!/usr/bin/env node
/**
 * The built app's smoke check: the landing page loads, its graph draws, one sample opens and draws,
 * and nothing went wrong on the way. CI runs it on every build of the app (the Lint job), because a
 * build once threw "nn is not a function" on its landing page and every test passed (#9616, #9633).
 * No GPU is needed: a software renderer draws the graph.
 *
 *   node graphty/acceptance/smoke.mjs --dist graphty/dist
 *
 * Fails (exit 1) on any uncaught page error, console error, crash, or same-origin request that
 * failed or answered 400 or more, and prints each. Exit 2 when there is no build at --dist. Every
 * wait waits on its condition; only the repository's one hang guard (tools/test-wait-guard.mjs)
 * ends a wait that never comes.
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

import { WAIT_GUARD_MS } from "../../tools/test-wait-guard.mjs";
import { serve } from "./run.mjs";

const { values: args } = parseArgs({ options: { dist: { type: "string", default: "graphty/dist" } } });
const dist = resolve(args.dist);
if (!existsSync(join(dist, "index.html"))) {
    console.error(`no built app at ${dist}: run pnpm exec nx run graphty:build first`);
    process.exit(2);
}

const http = await serve(dist);
const origin = `http://127.0.0.1:${http.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(WAIT_GUARD_MS);

const problems = [];
// The first problem ends the run at once, rather than leaving it to wait for a graph that never draws.
let fail;
const failed = new Promise((_, reject) => (fail = reject));
// handled by the Promise.race below; this only keeps an early rejection from counting as unhandled
failed.catch(() => {}); // eslint-disable-line unicorn/prefer-top-level-await -- not a chain to await: awaiting it would end the run
const report = (line) => {
    problems.push(line);
    fail(new Error(line));
};
const ours = (url) => url.startsWith(origin);
// Each site's deploy adds its site.json (graphty/src/siteConfig.ts); a build has none, and the app reads
// that as every experiment off, as on production. Its 404 is the one expected.
const expected = (url) => url === `${origin}/site.json`;
page.on("pageerror", (e) => report(`page error: ${e.stack ?? e.message}`));
page.on("crash", () => report("the page crashed"));
page.on("console", (m) => m.type() === "error" && !expected(m.location().url) && report(`console error: ${m.text()}`));
page.on(
    "requestfailed",
    (r) => ours(r.url()) && !expected(r.url()) && report(`request failed: ${r.url()} (${r.failure()?.errorText})`),
);
page.on(
    "response",
    (r) => ours(r.url()) && !expected(r.url()) && r.status() >= 400 && report(`${r.status()} for ${r.url()}`),
);

// Runs in the page: the graph in `selector` has drawn its nodes.
const drawn = (selector) =>
    page.waitForFunction((s) => {
        const el = document.querySelector(s);
        return el?.isGraphDrawn === true && el.session?.data.nodes().length > 0;
    }, selector);

const steps = [
    ["load the landing page", () => page.goto(`${origin}/`)],
    ["draw the landing page's graph", () => drawn("graphty-element[data-start-page]")],
    [
        "open the Les Miserables sample",
        () => page.getByRole("button", { name: /^Open the Les Miserables sample/ }).click(),
    ],
    ["draw the sample", () => drawn("graphty-element:not([data-start-page])")],
];
let step = "launch";
try {
    for (const [name, run] of steps) {
        step = name;
        const began = Date.now();
        await Promise.race([run(), failed]);
        console.log(`ok   ${((Date.now() - began) / 1000).toFixed(1).padStart(5)} s  ${name}`);
    }
} catch (err) {
    if (!problems.length) problems.push(`${step}: ${err.message.split("\n")[0]}`);
    console.log(`FAIL at "${step}"`);
} finally {
    await browser.close();
    http.close();
}
for (const p of problems) console.log(`\n${p}`);
console.log(problems.length ? `\nthe built app at ${dist} failed its smoke check` : "\nno page errors");
process.exit(problems.length ? 1 : 0);
