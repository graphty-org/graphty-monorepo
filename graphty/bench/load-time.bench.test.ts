/**
 * @file How long the built graphty app takes to load its landing page (issue #8018). Recorded, and judged only by
 * `node tools/load-time.mjs` against benchmarks/results/load-time.json: this file asserts that each run reached the
 * landing page and drew its graph, never how long that took.
 *
 * Serves graphty/dist (the production build: `pnpm exec nx run graphty:build` first) with `vite preview` on a
 * loopback port of its own, and opens `/` RUNS times in headless Chromium, each in a fresh context (empty cache and
 * storage, so every run is a first visit). Times are from the navigation's start to:
 *   - landing usable: the app's `graphty-boot` event says the loading screen can go and the start page shows;
 *   - graph first frame: graphty-element's `graph-first-frame`, the hero graph's nodes are on screen;
 *   - graph settled: graphty-element's first `graph-frame-stable` while its `isGraphDrawn` is true, the first frame
 *     of the finished picture. The element also turns stable once before the data arrives, on its empty canvas,
 *     which is not the graph settling.
 * The events are heard in the capture phase on the document by a script that runs before the page's own, so the
 * benchmark depends on nothing in the app but those public signals.
 *
 * Run with: npx vitest run --project=bench (in graphty/). Writes benchmarks/out/load-time-app.json at the root.
 * LOAD_TIME_APP_DIST=<dir> times another build instead (an older commit's graphty/dist, to compare two commits).
 */

import type { AddressInfo } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type Browser, chromium, type Page } from "playwright";
import { preview, type PreviewServer } from "vite";
import { afterAll, assert, beforeAll, it } from "vitest";

import { summarize, writeLoadTimes } from "../../tools/load-time.mjs";
import { WAIT_GUARD_MS } from "../../tools/test-wait-guard.mjs";

const RUNS = 15;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let server: PreviewServer;
let browser: Browser;

beforeAll(async () => {
    server = await preview({
        root,
        configFile: false,
        logLevel: "warn",
        build: { outDir: process.env.LOAD_TIME_APP_DIST ?? "dist" },
        preview: { host: "127.0.0.1", port: 0 },
    });
    browser = await chromium.launch({ headless: true });
});

afterAll(async () => {
    await browser?.close();
    await server?.close();
});

/**
 * Rejects when the page fails: an uncaught error, a crash, a file the server could not serve, or the boot screen
 * reporting a failed step. This project has no hang guard, so a page that fails must end the run, not leave it waiting
 * for a graph that never comes.
 * @param page - the page
 * @returns a promise that only ever rejects
 */
function failure(page: Page): Promise<never> {
    return new Promise<never>((_, reject) => {
        page.on("pageerror", (error) => reject(new Error(`page error: ${error.message}`)));
        page.on("crash", () => reject(new Error("the page crashed")));
        page.on("requestfailed", (request) =>
            reject(new Error(`request failed: ${request.url()} (${request.failure()?.errorText ?? "no reason"})`)),
        );
        page.on("response", (response) => {
            if (response.status() >= 400) {
                reject(new Error(`${response.status()} for ${response.url()}`));
            }
        });
        page.on("console", (message) => {
            if (message.text().startsWith("[load-time] boot error:")) {
                reject(new Error(message.text()));
            }
        });
    });
}

/** What the page heard, in milliseconds since its navigation started. */
interface Marks {
    landing: number;
    firstFrame: number;
    settled: number;
    graphs: number;
}

declare global {
    interface Window {
        __loadTime?: Marks;
    }
}

/** Runs in the page before any of its scripts: hears the three signals and sets `__loadTime` once all have come. */
function listen(): void {
    const at: Partial<Record<"landing" | "firstFrame" | "settled", number>> = {};
    const done = (marks: Marks): void => {
        window.__loadTime = marks;
    };
    const hear = (key: "landing" | "firstFrame" | "settled"): void => {
        at[key] ??= performance.now();
        if (at.landing !== undefined && at.firstFrame !== undefined && at.settled !== undefined) {
            const graphs = document.querySelectorAll("graphty-element[data-start-page]").length;
            done({ landing: at.landing, firstFrame: at.firstFrame, settled: at.settled, graphs });
        }
    };
    document.addEventListener(
        "graphty-boot",
        (e) => {
            const { detail } = e as CustomEvent<{ done?: boolean; error?: boolean; line?: string }>;
            if (detail.error === true) {
                console.error(`[load-time] boot error: ${detail.line ?? ""}`);
            }
            if (detail.done === true) {
                hear("landing");
            }
        },
        true,
    );
    document.addEventListener("graph-first-frame", () => hear("firstFrame"), true);
    document.addEventListener(
        "graph-frame-stable",
        (e) => {
            if ((e.target as { isGraphDrawn?: boolean }).isGraphDrawn === true) {
                hear("settled");
            }
        },
        true,
    );
}

it("times the landing page and its graph", async () => {
    const { port } = server.httpServer.address() as AddressInfo;
    const runs: Marks[] = [];
    for (let i = 0; i < RUNS; i++) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        context.setDefaultTimeout(WAIT_GUARD_MS);
        const page = await context.newPage();
        await page.addInitScript(listen);
        const failed = failure(page);
        await Promise.race([page.goto(`http://127.0.0.1:${port}/`), failed]);
        // waitForFunction, not an evaluate of a promise: it gives up after the context's default timeout, the
        // repository's one wait guard, so a page whose requests stall without failing (a server that stopped
        // answering) cannot hold the run, and the CI job, forever.
        const ready = page.waitForFunction(() => window.__loadTime ?? null);
        const marks = (await (await Promise.race([ready, failed])).jsonValue()) as Marks;
        await context.close();
        assert.strictEqual(marks.graphs, 1, "the landing page's graph is the one that drew");
        console.log(`[load-time] app run ${i + 1}: ${JSON.stringify(marks)}`);
        runs.push(marks);
    }
    const file = writeLoadTimes("app", [
        summarize(
            "app",
            "landing usable",
            runs.map((r) => r.landing),
        ),
        summarize(
            "app",
            "graph first frame",
            runs.map((r) => r.firstFrame),
        ),
        summarize(
            "app",
            "graph settled",
            runs.map((r) => r.settled),
        ),
    ]);
    console.log(`[load-time] wrote ${file}`);
});
