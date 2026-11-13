#!/usr/bin/env node
/**
 * The dry run: every route in routes.mjs walked in the built graphty app, in headless Chromium
 * drawn on this machine's NVIDIA card, with no model in the loop. A route is the clicks, keys and
 * uploads a user makes from the start page; its outcome checks read what the user would see through
 * graphty-element's public API or the accessibility tree. No pixels are compared here.
 *
 *   node graphty/acceptance/run.mjs                    every route, on up to 4 browsers
 *   node graphty/acceptance/run.mjs --only t39a,t46    routes whose id starts with one of these
 *   node graphty/acceptance/run.mjs --workers 1        one browser
 *   node graphty/acceptance/run.mjs --list             the routes, nothing run
 *   node graphty/acceptance/run.mjs --dist <dir>       another build (default graphty/dist)
 *
 * Writes tmp/dry-run/report.json (each route's result, time and reason) and, for a failed route,
 * tmp/dry-run/<route>.aria.txt: what the page offered a user when it failed, and tmp/dry-run/<route>.png
 * and <route>.ui.png: the screen each route ended on, as is and with what moves from run to run covered (the
 * drawing, the status bar), kept for the design studio and never compared here. Exit 0 when every route
 * passed, 1 when one failed, 2 on a usage error. See README.md beside this file.
 *
 * The run holds the machine's one GPU slot (tools/test-slots.mjs --gpu) and each browser one of the
 * shared browser slots (design/ui/studio/tool/with-browser.sh, cap 4).
 */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import * as readers from "./readers.mjs";
import { routes } from "./routes.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const gitArgs = ["-C", here, "rev-parse", "--path-format=absolute", "--git-common-dir"];
const commonDir = spawnSync("git", gitArgs, { encoding: "utf8" }); // NOSONAR(S4036): the developer's own git
const main = dirname(commonDir.stdout.trim());
const OUT = join(repo, "tmp/dry-run");
const FILES = join(repo, "design/ui/studio/tool/files");
// The GPU flags the design studio's tool proved on this machine (design/ui/studio/tool/real.mjs):
// ANGLE on Vulkan, with the extracted libEGL.so.1 in the main checkout's tmp/egl, without which
// these flags hang the first page instead of failing.
const EGL = process.env.DRY_RUN_EGL_DIR || join(main, "tmp/egl/root/usr/lib/x86_64-linux-gnu");
const GPU_ARGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-angle=vulkan",
    "--disable-vulkan-surface",
];
const ROUTE_MS = 180_000;
const CHECK_MS = 15_000;
const TYPES = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".wasm": "application/wasm",
    ".webmanifest": "application/manifest+json",
    ".gml": "text/plain",
    ".woff2": "font/woff2",
};

function options(argv) {
    let v;
    try {
        ({ values: v } = parseArgs({
            args: argv,
            options: {
                only: { type: "string" },
                workers: { type: "string", default: "4" },
                list: { type: "boolean", default: false },
                dist: { type: "string", default: join(repo, "graphty/dist") },
                worker: { type: "string" },
            },
        }));
    } catch (err) {
        console.error(`${err.message}; see the comment at the top of ${fileURLToPath(import.meta.url)}`);
        process.exit(2);
    }
    const o = {
        ...v,
        only: v.only ? v.only.split(",").filter(Boolean) : null,
        workers: Number(v.workers),
        dist: resolve(v.dist),
    };
    if (!Number.isInteger(o.workers) || o.workers < 1 || o.workers > 4) {
        console.error("--workers must be 1 to 4 (the machine's shared browser cap)");
        process.exit(2);
    }
    try {
        select(o.only);
    } catch (err) {
        console.error(err.message);
        process.exit(2);
    }
    return o;
}

/**
 * The routes a run takes.
 * @param only id prefixes, or null for every route
 * @returns the routes, in file order
 */
export function select(only) {
    if (!only) return routes;
    const picked = routes.filter((r) => only.some((p) => r.id.startsWith(p)));
    const unknown = only.filter((p) => !routes.some((r) => r.id.startsWith(p)));
    if (unknown.length) throw new Error(`no route starts with: ${unknown.join(", ")}`);
    return picked;
}

const fmt = (ms) => `${(ms / 1000).toFixed(1)} s`;

// The stops an agent or a terminal sends. Each child runs in its own process group (spawned
// detached), so a stop here reaches the whole tree under it: the slot holders, with-browser.sh, the
// workers and their browsers.
const STOPS = { SIGHUP: 1, SIGINT: 2, SIGTERM: 15 };

/**
 * Stop a child and everything it started.
 * @param child a child spawned detached
 * @param signal the signal
 */
function stopTree(child, signal = "SIGTERM") {
    if (child.exitCode !== null || child.signalCode !== null) return;
    try {
        process.kill(-child.pid, signal);
    } catch {
        // its group is gone already
    }
}

/**
 * On a stop, pass it on to every child's process group, then stop.
 * @param children the children, spawned detached
 */
function passStopsOn(children) {
    for (const [signal, number] of Object.entries(STOPS))
        process.on(signal, () => {
            for (const c of children) stopTree(c, signal);
            process.exit(128 + number);
        });
}

// ---------------------------------------------------------------- the run (the parent process)

async function runAll(o) {
    const picked = select(o.only);
    if (!existsSync(join(o.dist, "index.html"))) {
        console.error(`no built app at ${o.dist}: run pnpm exec nx run graphty:build first`);
        process.exit(2);
    }
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(join(OUT, "claims"), { recursive: true });
    mkdirSync(join(OUT, "results"), { recursive: true });
    const workers = Math.min(o.workers, picked.length);
    console.log(`dry run: ${picked.length} routes on ${workers} browser(s), build ${o.dist}`);
    const started = Date.now();
    const gate = join(repo, "design/ui/studio/tool/with-browser.sh");
    const ids = picked.map((r) => r.id).join(",");
    const children = Array.from({ length: workers }, (_, n) =>
        spawn(
            "bash", // NOSONAR(S4036): developer tooling runs the developer's own bash
            [
                gate,
                process.execPath,
                fileURLToPath(import.meta.url),
                "--worker",
                String(n + 1),
                "--only",
                ids,
                "--dist",
                o.dist,
            ],
            {
                stdio: "inherit",
                env: { ...process.env, BROWSER_SLOTS: "4", BROWSER_GPU: "", DRY_RUN_STARTED: String(started) },
                detached: true,
            },
        ),
    );
    passStopsOn(children);
    // Once every route has its result, a browser still waiting for a slot has nothing left to walk:
    // stop it rather than wait for a slot it would give straight back.
    const done = setInterval(() => {
        if (readdirSync(join(OUT, "results")).length < picked.length) return;
        for (const c of children) stopTree(c);
    }, 1000);
    const codes = await Promise.all(children.map((c) => new Promise((ok) => c.on("exit", (code) => ok(code)))));
    clearInterval(done);
    const results = picked.map((r) => {
        const f = join(OUT, "results", `${r.id}.json`);
        return existsSync(f)
            ? JSON.parse(readFileSync(f, "utf8"))
            : {
                  id: r.id,
                  feature: r.feature,
                  result: "not run",
                  ms: 0,
                  reason: `no worker reached it (worker exits: ${codes.join(", ")})`,
              };
    });
    const wall = Date.now() - started;
    const failed = results.filter((r) => r.result !== "pass");
    // how long the browsers waited for their slots: the first to start, and the last
    const waits = results.map((r) => r.slotWaitMs).filter((w) => w !== undefined);
    const slotWait = waits.length
        ? { firstMs: Math.min(...waits), lastMs: Math.max(...waits) }
        : { firstMs: 0, lastMs: 0 };
    const routeMs = results.reduce((t, r) => t + r.ms, 0);
    writeFileSync(
        join(OUT, "report.json"),
        JSON.stringify({ wallMs: wall, routeMs, slotWait, workers, results }, null, 1) + "\n",
    );
    rmSync(join(OUT, "claims"), { recursive: true, force: true });
    console.log("\nroute                                     result    time  feature");
    for (const r of results)
        console.log(`${r.id.padEnd(40)}  ${r.result.padEnd(8)} ${fmt(r.ms).padStart(7)}  ${r.feature}`);
    for (const r of failed) {
        console.log(`\n${r.id}: ${r.reason}`);
        if (r.aria) console.log(`  page at failure: ${r.aria}`);
    }
    console.log(
        `\n${results.length - failed.length} of ${results.length} routes passed in ${fmt(wall)} on ${workers} browser(s): ` +
            `${fmt(routeMs)} of routes, and ${fmt(slotWait.firstMs)} waiting for the first browser slot (${fmt(slotWait.lastMs)} for the last). ` +
            `Report: ${join(OUT, "report.json")}`,
    );
    process.exit(failed.length ? 1 : 0);
}

// ---------------------------------------------------------------- a worker (one browser slot)

function serve(dist) {
    const http = createServer(async (req, res) => {
        const url = new URL(req.url, "http://x"); // NOSONAR(S5332): parses the request's path; the server is loopback only
        const path = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, "");
        const f = join(dist, path);
        if (f !== dist && !f.startsWith(dist + sep)) return res.writeHead(403).end();
        // any path that is not a file is the app's own page
        const body = await readFile(f).catch(() => null);
        if (body)
            return res.writeHead(200, { "content-type": TYPES[extname(f)] ?? "application/octet-stream" }).end(body);
        if (extname(f)) return res.writeHead(404).end();
        res.writeHead(200, { "content-type": "text/html" }).end(await readFile(join(dist, "index.html")));
    });
    return new Promise((ok) => http.listen(0, "127.0.0.1", () => ok(http)));
}

// The browser profiles this worker made and has not removed: a stopped worker removes them as it exits.
const profiles = new Set();

/**
 * A browser on the GPU, or a loud failure: a software renderer is never used.
 * @param chromium Playwright's chromium
 * @returns a persistent context on a fresh profile, and its renderer
 */
async function launch(chromium) {
    if (!existsSync(join(EGL, "libEGL.so.1")))
        throw new Error(
            `the GPU flags need libEGL.so.1 in ${EGL} (without it they hang the first page): in the main checkout, mkdir -p tmp/egl && cd tmp/egl && apt-get download libegl1 libglvnd0 && dpkg -x libegl1_*.deb root && dpkg -x libglvnd0_*.deb root`,
        );
    const profile = await mkdtemp(join(tmpdir(), "graphty-dry-run-"));
    profiles.add(profile);
    const context = await chromium.launchPersistentContext(profile, {
        headless: true,
        // a stop ends the worker, whose exit closes the browser (passStopsOn, runWorker)
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
        args: GPU_ARGS,
        ignoreDefaultArgs: ["--hide-scrollbars"],
        env: { ...process.env, LD_LIBRARY_PATH: [EGL, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":") },
        viewport: { width: 1440, height: 900 },
        acceptDownloads: true,
    });
    const page = context.pages()[0] ?? (await context.newPage());
    const renderer = await page.evaluate(() => {
        const g = document.createElement("canvas").getContext("webgl2");
        const e = g?.getExtension("WEBGL_debug_renderer_info");
        return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : "no WebGL";
    });
    const close = () =>
        context.close().finally(async () => {
            await rm(profile, { recursive: true, force: true });
            profiles.delete(profile);
        });
    if (!/NVIDIA/i.test(renderer)) {
        await close();
        throw new Error(
            `the browser draws with "${renderer}", not the NVIDIA card: the dry run runs only on the GPU. Check that nvidia-smi sees the card and ${EGL} holds libEGL.so.1`,
        );
    }
    return { context, page, renderer, close };
}

/**
 * Retry a check until it passes or its time runs out: checks read state the app reaches on its own
 * time (a repaint, a run finishing), so each waits on its condition, never on a clock.
 * @param fn the check
 * @param g the readers
 * @returns what the check returned
 */
async function eventually(fn, g) {
    const until = Date.now() + CHECK_MS;
    for (;;) {
        try {
            return await fn(g);
        } catch (err) {
            if (Date.now() > until) throw err;
            await g.page.waitForTimeout(250);
        }
    }
}

// What a user could see, read through graphty-element's public API (readers.mjs), bound to the page.
const readersOf = (page) => ({
    page,
    ...Object.fromEntries(Object.entries(readers).map(([name, read]) => [name, (...args) => read(page, ...args)])),
});

// The user's hands: real clicks, keys and uploads on the page, as a person makes them.
function hands(page) {
    const u = {
        page,
        // the path of a data file in design/ui/studio/tool/files
        file: (name) => join(FILES, name),
        button: (name, opts = {}) => page.getByRole("button", { name, exact: true, ...opts }),
        click: async (target) => (typeof target === "string" ? u.button(target) : target).click(),
        // click a control that opens the browser's file chooser, and choose the file in it
        upload: async (target, name) => {
            const chooser = page.waitForEvent("filechooser");
            await u.click(target);
            await (await chooser).setFiles(u.file(name));
        },
        type: (text) => page.keyboard.type(text),
        key: (k) => page.keyboard.press(k),
    };
    return u;
}

async function runWorker(o) {
    // Stopped, the worker exits at once; Playwright kills its browser on exit, and this removes the
    // profiles left behind.
    process.on("exit", () => {
        for (const p of profiles) rmSync(p, { recursive: true, force: true, maxRetries: 3 });
    });
    for (const [signal, number] of Object.entries(STOPS)) process.on(signal, () => process.exit(128 + number));
    const { chromium } = await import(join(repo, "node_modules/playwright/index.mjs"));
    const picked = select(o.only);
    // how long this worker waited for its browser slot before it started
    const slotWaitMs = Date.now() - Number(process.env.DRY_RUN_STARTED || Date.now());
    const http = await serve(o.dist);
    const origin = `http://127.0.0.1:${http.address().port}/`;
    try {
        for (const route of picked) {
            // claim the route: the first worker to create its claim file walks it
            try {
                closeSync(openSync(join(OUT, "claims", route.id), "wx"));
            } catch {
                continue;
            }
            const result = { ...(await walk(chromium, route, origin)), slotWaitMs };
            writeFileSync(join(OUT, "results", `${route.id}.json`), JSON.stringify(result, null, 1) + "\n");
            const why = result.result === "pass" ? "" : `: ${result.reason}`;
            console.log(
                `[browser ${o.worker}] ${result.result.padEnd(4)} ${fmt(result.ms).padStart(7)}  ${route.id}${why}`,
            );
        }
    } finally {
        http.close();
    }
}

async function walk(chromium, route, origin) {
    const started = Date.now();
    const out = {
        id: route.id,
        feature: route.feature,
        from: route.from,
        result: "fail",
        ms: 0,
        reason: null,
        renderer: null,
    };
    let b = null;
    let stage = "launching the browser";
    const pageErrors = [];
    try {
        b = await launch(chromium);
        out.renderer = b.renderer;
        b.page.on("pageerror", (e) => pageErrors.push(e.message.split("\n")[0]));
        b.page.setDefaultTimeout(20_000);
        await b.page.goto(origin);
        const run = async () => {
            stage = "walking the route";
            await route.walk(hands(b.page));
            const g = readersOf(b.page);
            for (const [name, check] of Object.entries(route.checks)) {
                stage = `checking "${name}"`;
                await eventually(check, g);
            }
        };
        let timer;
        await Promise.race([
            run(),
            new Promise(
                (_, no) =>
                    (timer = setTimeout(() => no(new Error(`the route took over ${ROUTE_MS / 1000} s`)), ROUTE_MS)),
            ),
        ]).finally(() => clearTimeout(timer));
        assert.deepEqual(pageErrors, [], "the page threw script errors");
        out.result = "pass";
    } catch (err) {
        out.reason = `${stage}: ${err.message.split("\n").slice(0, 6).join(" ").replaceAll(/\s+/g, " ")}`;
        if (pageErrors.length) out.reason += ` (page errors: ${pageErrors.join("; ")})`;
        if (b) {
            const f = join(OUT, `${route.id}.aria.txt`);
            const tree = await b.page
                .locator("body")
                .ariaSnapshot({ timeout: 5000 })
                .catch((e) => `no tree: ${e.message}`);
            writeFileSync(f, tree + "\n");
            out.aria = f;
        }
    } finally {
        // the screen the route ended on, passed or failed, for the design studio's comparison
        // (design/ui/studio/tool/dry-run-pass.mjs); never compared here. The pointer leaves the last
        // control first, so no hover tooltip is caught half open. The .ui.png copy covers what changes
        // from run to run on one build: the drawing, which may still be settling when the checks pass
        // (what it shows is checked above), and the status bar, whose autosave chip says "saving..." or
        // "saved" (a different width, which moves the chips beside it) depending on when its write lands.
        await b?.page.mouse.move(0, 0).catch(() => {});
        const shot = (name, mask) =>
            b?.page.screenshot({ path: join(OUT, name), animations: "disabled", mask, maskColor: "#000" });
        await shot(`${route.id}.png`, []).catch(() => {});
        const moving = b ? [b.page.locator("canvas"), b.page.getByRole("contentinfo", { name: "Status" })] : [];
        await shot(`${route.id}.ui.png`, moving).catch(() => {});
        await b?.close().catch(() => {});
        out.ms = Date.now() - started;
    }
    return out;
}

// ---------------------------------------------------------------- entry

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const o = options(process.argv.slice(2));
    if (o.list) {
        for (const r of select(o.only))
            console.log(`${r.id.padEnd(40)} ${r.feature} (${r.from}; ${Object.keys(r.checks).length} checks)`);
    } else if (o.worker) {
        await runWorker(o);
    } else if (process.env.DRY_RUN_GPU_HELD !== "1") {
        // hold the machine's one GPU slot for the whole run, then run again inside it
        const child = spawn(
            process.execPath,
            [
                join(repo, "tools/test-slots.mjs"),
                "--gpu",
                process.execPath,
                fileURLToPath(import.meta.url),
                ...process.argv.slice(2),
            ],
            { stdio: "inherit", env: { ...process.env, DRY_RUN_GPU_HELD: "1" }, detached: true },
        );
        passStopsOn([child]);
        child.on("exit", (code) => process.exit(code ?? 1));
    } else {
        await runAll(o);
    }
}
