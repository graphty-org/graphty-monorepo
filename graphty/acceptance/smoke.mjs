#!/usr/bin/env node
/**
 * The production smoke test: promote.yml runs it on the candidate before anything moves, and again on
 * the live site once npm and the site serve the new version. It walks every dry-run route (routes.mjs,
 * with run.mjs's hands, readers and checks) in a software-drawn headless Chromium (SwiftShader, so any
 * machine runs it, a CI runner included) and adds two things a reader would notice: the page logs no
 * console error and throws nothing, and the drawing is on the canvas (it shows more than one color).
 * With --element it also loads graphty-element from its packed npm tarball into a blank page and checks
 * that the element draws a small graph there.
 *
 *   node graphty/acceptance/smoke.mjs --dist <dir>                    the routes on a built app (the candidate)
 *   node graphty/acceptance/smoke.mjs --url https://graphty.app        the routes on a served site
 *   node graphty/acceptance/smoke.mjs --element @graphty/graphty-element@3.39.0   and the packed element
 *   node graphty/acceptance/smoke.mjs --element graphty-element/dist/graphty.bundle.js   a built bundle instead
 *   node graphty/acceptance/smoke.mjs --no-routes --element <spec>    the element alone
 *   node graphty/acceptance/smoke.mjs --only t37a,t46                 routes whose id starts with one of these
 *
 * Runs one browser, one page at a time (a software-drawn graphty page uses about six CPU cores). It takes
 * no machine slot itself: on the developer's machine, run it inside design/ui/studio/tool/with-browser.sh.
 * Writes tmp/smoke/<item>.png, the screen each failed item ended on. Exit 0 when everything passed, 1 when
 * something failed, 2 on a usage error.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { PNG } from "pngjs";

import { eventually, hands, readersOf, select, serve } from "./run.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const OUT = join(repo, "tmp/smoke");
// SwiftShader: recent Chromium gives a page software WebGL only when asked for it unsafely.
const SOFTWARE_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
const NODES = 12;

/**
 * Whether a screenshot shows a drawing: more than one color. A canvas that never drew, or drew only its
 * clear color, is one color.
 * @param png the screenshot's PNG bytes
 * @returns true when two pixels differ
 */
export function hasDrawing(png) {
    const { data } = PNG.sync.read(png);
    for (let i = 4; i < data.length; i += 4) if (data.readUInt32BE(i) !== data.readUInt32BE(0)) return true;
    return false;
}

/**
 * Check that a canvas shows a drawing.
 * @param canvas a Playwright locator of the canvas
 */
async function drawn(canvas) {
    assert.ok(
        hasDrawing(await canvas.screenshot({ animations: "disabled" })),
        "the canvas shows no drawing (one color)",
    );
}

/**
 * Collect what the page reports as broken: console errors and uncaught script errors.
 * @param page the Playwright page
 * @returns the messages, growing as the page runs
 */
function watch(page) {
    const errors = [];
    page.on("console", (m) => {
        if (m.type() !== "error") return;
        const at = m.location().url;
        errors.push(`console: ${m.text().split("\n")[0]}${at ? ` (${at})` : ""}`);
    });
    page.on("pageerror", (e) => errors.push(`thrown: ${e.message.split("\n")[0]}`));
    return errors;
}

/**
 * Run one item in a fresh browser context (empty storage, as a first visit): fn walks it, then the page
 * must have logged no error.
 * @param browser the browser
 * @param id the item's name
 * @param fn (page, stage) => walks and checks; stage(text) names what it is doing for a failure
 * @returns the result: id, result ("pass" or "fail"), ms, reason
 */
async function item(browser, id, fn) {
    const started = Date.now();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    const errors = watch(page);
    let stage = "loading";
    try {
        // every wait is on a condition; the job's timeout-minutes is the hang guard
        await fn(page, (s) => (stage = s));
        stage = "reading the console";
        assert.deepEqual(errors, [], "the page logged errors");
        return { id, result: "pass", ms: Date.now() - started, reason: null };
    } catch (err) {
        await page.screenshot({ path: join(OUT, `${id}.png`) }).catch(() => {});
        const why = `${stage}: ${err.message.split("\n").slice(0, 6).join(" ").replaceAll(/\s+/g, " ")}`;
        const logged = errors.length ? ` (page errors: ${errors.join("; ")})` : "";
        return { id, result: "fail", ms: Date.now() - started, reason: why + logged };
    } finally {
        await context.close().catch(() => {});
    }
}

/**
 * One dry-run route on the site at origin, then its canvas.
 * @param route the route (routes.mjs)
 * @param origin the site
 * @returns the item's walk
 */
const routeWalk = (route, origin) => async (page, stage) => {
    await page.goto(origin);
    stage("walking the route");
    await route.walk(hands(page));
    const g = readersOf(page);
    for (const [name, check] of Object.entries(route.checks)) {
        stage(`checking "${name}"`);
        await eventually(check, g);
    }
    stage("looking for the drawing");
    await eventually(() => drawn(page.locator("graphty-element canvas").first()), g);
};

// The blank page: graphty-element from /bundle.js, a small graph on a grid, and window.smoke once it settled.
const BLANK = `<!doctype html>
<html><head><meta charset="utf-8"><title>graphty-element smoke</title><link rel="icon" href="data:,">
<style>html,body{margin:0;height:100%} graphty-element{display:block;width:100%;height:100%}</style>
</head><body><script type="module">
try {
    await import("/bundle.js");
    const el = document.createElement("graphty-element");
    const ids = Array.from({ length: ${NODES} }, (_, i) => "n" + i);
    el.layout = "fixed";
    el.nodeData = ids.map((id, i) => ({ id, position: { x: (i % 4) * 3, y: Math.floor(i / 4) * 3, z: 0 } }));
    el.edgeData = ids.map((id, i) => ({ source: id, target: ids[(i + 1) % ids.length] }));
    document.body.appendChild(el);
    await el.waitForSettled();
    window.smoke = { nodes: el.session.data.nodes().length };
} catch (err) {
    window.smoke = { error: String(err?.stack ?? err) };
}
</script></body></html>`;

/**
 * graphty-element's bundle: from npm (`npm pack <spec>`, the tarball a consumer installs), or a built
 * graphty.bundle.js when spec names one.
 * @param spec an npm spec, or a path ending in .js
 * @returns the bundle's bytes
 */
async function bundleOf(spec) {
    if (spec.endsWith(".js")) return readFile(resolve(spec));
    const dir = await mkdtemp(join(tmpdir(), "graphty-smoke-element-"));
    try {
        const out = execFileSync("npm", ["pack", spec, "--silent"], { cwd: dir, encoding: "utf8" }); // NOSONAR(S4036): the job's own npm
        const tarball = out.trim().split("\n").at(-1);
        execFileSync("tar", ["xzf", tarball, "package/dist/graphty.bundle.js"], { cwd: dir }); // NOSONAR(S4036): the job's own tar
        return await readFile(join(dir, "package/dist/graphty.bundle.js"));
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

/**
 * The blank page's walk: graphty-element loads, settles with the graph and draws it.
 * @param bundle the bundle's bytes
 * @returns the item's walk
 */
const elementWalk = (bundle) => async (page, stage) => {
    const http = createServer((req, res) => {
        if (req.url === "/bundle.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(bundle);
        if (req.url === "/") return res.writeHead(200, { "content-type": "text/html" }).end(BLANK);
        res.writeHead(404).end();
    });
    await new Promise((ok) => http.listen(0, "127.0.0.1", ok));
    try {
        await page.goto(`http://127.0.0.1:${http.address().port}/`); // NOSONAR(S5332): a loopback server
        stage("waiting for the element to settle");
        await page.waitForFunction(() => globalThis.smoke);
        const smoke = await page.evaluate(() => globalThis.smoke);
        assert.equal(smoke.error, undefined, "the page could not show a graph");
        assert.equal(smoke.nodes, NODES, "the graph's node count");
        stage("looking for the drawing");
        await eventually(() => drawn(page.locator("graphty-element canvas").first()), { page });
    } finally {
        http.close();
    }
};

function options(argv) {
    try {
        const { values: v } = parseArgs({
            args: argv,
            options: {
                dist: { type: "string" },
                url: { type: "string" },
                element: { type: "string" },
                only: { type: "string" },
                "no-routes": { type: "boolean", default: false },
            },
        });
        const routes = !v["no-routes"];
        if (routes && Boolean(v.dist) === Boolean(v.url))
            throw new Error("give the routes one site, --dist <dir> or --url <origin> (or --no-routes)");
        if (!routes && !v.element) throw new Error("--no-routes needs --element");
        return { ...v, routes, picked: routes ? select(v.only ? v.only.split(",").filter(Boolean) : null) : [] };
    } catch (err) {
        console.error(`${err.message}; see the comment at the top of ${fileURLToPath(import.meta.url)}`);
        process.exit(2);
    }
}

async function main(o) {
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
    const { chromium } = await import(join(repo, "node_modules/playwright/index.mjs"));
    const browser = await chromium.launch({ headless: true, args: SOFTWARE_ARGS });
    const results = [];
    const report = (r) => {
        results.push(r);
        console.log(
            `${r.result.padEnd(4)} ${`${(r.ms / 1000).toFixed(1)} s`.padStart(8)}  ${r.id}${r.reason ? `: ${r.reason}` : ""}`,
        );
    };
    let http = null;
    try {
        if (o.element) report(await item(browser, "graphty-element", elementWalk(await bundleOf(o.element))));
        if (o.routes) {
            http = o.dist ? await serve(resolve(o.dist)) : null;
            const origin = http ? `http://127.0.0.1:${http.address().port}/` : o.url; // NOSONAR(S5332): a loopback server
            console.log(`smoke test: ${o.picked.length} routes on ${origin}`);
            for (const route of o.picked) report(await item(browser, route.id, routeWalk(route, origin)));
        }
    } finally {
        http?.close();
        await browser.close();
    }
    const failed = results.filter((r) => r.result !== "pass");
    console.log(`\n${results.length - failed.length} of ${results.length} passed`);
    for (const r of failed) console.log(`FAILED ${r.id}: ${r.reason}`);
    return failed.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = await main(options(process.argv.slice(2)));
