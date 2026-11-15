/**
 * @file How long `<graphty-element>` takes from being connected to the page to drawing a fixed graph (issue #8018),
 * outside any application, so a slowdown in the element shows on its own. Recorded, and judged only by
 * `node tools/load-time.mjs` against benchmarks/results/load-time.json: this file asserts that every run drew the
 * whole graph, never how long it took.
 *
 * A page loads the built script-tag bundle (dist/graphty.bundle.js: `npm run build` first) and waits for the tag to
 * be defined, so the script's download and parse are not timed. Then, RUNS times, each in a fresh page: the element
 * is created with a seeded 120-node, 240-edge graph and the default layout, connected, and timed from
 * `appendChild` to its `graph-first-frame` (nodes on screen) and to its first `graph-frame-stable` while
 * `isGraphDrawn` is true (the first frame of the finished picture; a stable frame of the canvas before the nodes are
 * drawn is not the graph settling), all of them the element's public API.
 *
 * Run with: npx vitest run --project=bench test/load/load-time.bench.test.ts. Writes
 * benchmarks/out/load-time-element.json at the repository root. LOAD_TIME_ELEMENT_BUNDLE=<file> times another build of
 * the bundle instead (an older commit's, to compare two commits).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type Browser, chromium } from "playwright";
import { afterAll, assert, beforeAll, it } from "vitest";

import { summarize, writeLoadTimes } from "../../../tools/load-time.mjs";
import { WAIT_GUARD_MS } from "../../../tools/test-wait-guard.mjs";

const RUNS = 15;
const NODES = 120;
const ORIGIN = "http://graphty-element.bench";
const BUNDLE = readFileSync(
    process.env.LOAD_TIME_ELEMENT_BUNDLE ??
        path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../dist/graphty.bundle.js"),
    "utf8",
);
const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;height:100%} graphty-element{display:block;width:100%;height:100%}</style>
</head><body><script type="module" src="/bundle.js"></script></body></html>`;

let browser: Browser;

beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
});

afterAll(async () => {
    await browser?.close();
});

/** What one run measured, in milliseconds since `appendChild`. */
interface Run {
    firstFrame: number;
    settled: number;
    nodes: number;
    edges: number;
}

/**
 * In the page: build the graph, connect the element and time it.
 * @param n - the node count
 * @returns the run
 */
async function connectAndTime(n: number): Promise<Run> {
    await customElements.whenDefined("graphty-element");
    // mulberry32: the same graph on every run and every machine.
    let seed = 8018;
    const random = (): number => {
        seed = Math.trunc(seed + 0x6d2b79f5);
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const nodes = Array.from({ length: n }, (_, i) => ({ id: `n${i}` }));
    const edges = nodes.flatMap((_, i) =>
        i === 0
            ? []
            : [
                  { source: `n${i}`, target: `n${Math.floor(random() * i)}` },
                  { source: `n${i}`, target: `n${Math.floor(random() * i)}` },
              ],
    );
    const el = document.createElement("graphty-element") as HTMLElement & {
        nodeData: unknown[];
        edgeData: unknown[];
        layoutConfig: Record<string, unknown>;
        isGraphDrawn: boolean;
        session: { data: { snapshot(): { nodeCount: number; edgeCount: number } } };
    };
    el.layoutConfig = { seed: 7 };
    el.nodeData = nodes;
    el.edgeData = edges;
    const firstFrame = new Promise<number>((resolve) => {
        el.addEventListener("graph-first-frame", () => resolve(performance.now()), { once: true });
    });
    const settled = new Promise<number>((resolve) => {
        const onStable = (): void => {
            if (el.isGraphDrawn) {
                el.removeEventListener("graph-frame-stable", onStable);
                resolve(performance.now());
            }
        };
        el.addEventListener("graph-frame-stable", onStable);
    });
    const start = performance.now();
    document.body.appendChild(el);
    const [first, stable] = await Promise.all([firstFrame, settled]);
    const { nodeCount, edgeCount } = el.session.data.snapshot();
    return { firstFrame: first - start, settled: stable - start, nodes: nodeCount, edges: edgeCount };
}

it("times <graphty-element> from connected to its first settled frame", async () => {
    const runs: Run[] = [];
    for (let i = 0; i < RUNS; i++) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        context.setDefaultTimeout(WAIT_GUARD_MS);
        await context.route(`${ORIGIN}/**`, (route) =>
            route.fulfill(
                route.request().url().endsWith("/bundle.js")
                    ? { contentType: "text/javascript", body: BUNDLE }
                    : { contentType: "text/html", body: PAGE },
            ),
        );
        const page = await context.newPage();
        // This project has no hang guard: a page that fails ends the run instead of leaving it waiting.
        const failed = new Promise<never>((_, reject) => {
            page.on("pageerror", (error) => reject(new Error(`page error: ${error.message}`)));
            page.on("crash", () => reject(new Error("the page crashed")));
        });
        await Promise.race([page.goto(`${ORIGIN}/`), failed]);
        // Started here, read by waitForFunction, which gives up after the context's default timeout (the repository's
        // one wait guard), so an element that never settles cannot hold the run forever.
        await page.evaluate(`void (${connectAndTime.toString()})(${NODES}).then((run) => { window.__run = run; })`);
        const ready = page.waitForFunction(() => (window as { __run?: Run }).__run ?? null);
        const run = (await (await Promise.race([ready, failed])).jsonValue()) as Run;
        await context.close();
        assert.strictEqual(run.nodes, NODES, "every node was loaded");
        assert.strictEqual(run.edges, 2 * (NODES - 1), "every edge was loaded");
        console.log(`[load-time] element run ${i + 1}: ${JSON.stringify(run)}`);
        runs.push(run);
    }
    const file = writeLoadTimes("element", [
        summarize(
            "element",
            "connected to first frame",
            runs.map((r) => r.firstFrame),
        ),
        summarize(
            "element",
            "connected to settled",
            runs.map((r) => r.settled),
        ),
    ]);
    console.log(`[load-time] wrote ${file}`);
});
