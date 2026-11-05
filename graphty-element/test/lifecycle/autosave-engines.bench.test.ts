/**
 * @file The autosave benchmark in Chromium, Firefox and WebKit, through the lifecycle fixture page:
 * what a write costs in each engine, and how often the write the element starts on `pagehide`
 * lands. Recorded, never asserted (design/work-protection/design.md, sections 5.4 and 9): every
 * row prints as `[autosave-bench]` and as a `bench-row`. It gates nothing; run it with
 * `npx vitest run --project=bench test/lifecycle/autosave-engines.bench.test.ts` after `npm run build`.
 *
 * Write cost: the page makes one change and forces its write (`flush()`), three times per size, and
 * the row says whether the write committed or which problem it reported; the
 * figure is from the change to the commit, rendering included, so it is an upper bound of the
 * main-thread cost that the `browser-bench` row (autosave-write.bench.test.ts) measures exactly.
 *
 * The `pagehide` write: the page is opened with every write held back (`delay`), so its one edit is
 * written only by a lifecycle event; then the page navigates away, or is closed. Reopened, the
 * edit is either restored (the write on `pagehide` landed) or not.
 *
 * Every step of a write-cost test (launch, load, ready, each write) also prints as an
 * `[autosave-bench-step]` line when it ends, with the machine's available memory, swap in use, load
 * and the browser's resident memory, so a test that stalls says in which step and in what state
 * (#4554: a WebKit run at 50,000 nodes spent 8 minutes before its first write in CI).
 */

import { readFileSync, rmSync } from "node:fs";
import { loadavg } from "node:os";

import type { BrowserContext, Page } from "playwright";
import { afterAll, beforeAll, describe, it } from "vitest";

import { browserProcesses, ENGINES, launch, profile } from "./engines";
import { type Fixture, type PageCheck, startFixture } from "./fixture";

const SIZES = [10_000, 50_000, 100_000];
const RUNS = 3;
const LANDING_TRIALS = 5;

let fx: Fixture;

beforeAll(async () => {
    fx = await startFixture();
});

afterAll(async () => {
    await fx.close();
});

/**
 * Print one row.
 * @param row - The row.
 */
function record(row: Record<string, unknown>): void {
    console.log(`[autosave-bench] ${JSON.stringify(row)}`);
    console.log(`bench-row ${JSON.stringify({ date: new Date().toISOString(), runner: "node", ...row })}`);
}

/**
 * A field of /proc/meminfo in MB, or null off Linux.
 * @param text - The file.
 * @param field - The field.
 * @returns The value.
 */
function meminfo(text: string, field: string): number | null {
    const match = new RegExp(`^${field}:\\s+(\\d+) kB`, "m").exec(text);
    return match ? Math.round(Number(match[1]) / 1024) : null;
}

/**
 * Print that a step of a write-cost test ended, with the machine's state.
 * @param test - The engine and size.
 * @param test.engine - The engine.
 * @param test.nodes - The size.
 * @param test.dir - The browser's profile, which finds its processes.
 * @param test.start - When the test started (`Date.now()`).
 * @param step - The step.
 */
function step(test: { engine: string; nodes: number; dir: string; start: number }, step: string): void {
    let mem = "";
    try {
        mem = readFileSync("/proc/meminfo", "utf8");
    } catch {
        // Not Linux: no memory figures.
    }

    let rssPages = 0;
    for (const proc of browserProcesses(test.dir)) {
        try {
            rssPages += Number(readFileSync(`/proc/${proc.pid}/statm`, "utf8").split(" ")[1]);
        } catch {
            // Gone.
        }
    }

    const swapTotal = meminfo(mem, "SwapTotal");
    const swapFree = meminfo(mem, "SwapFree");
    const row = {
        engine: test.engine,
        nodes: test.nodes,
        step,
        ms: Date.now() - test.start,
        memAvailableMB: meminfo(mem, "MemAvailable"),
        swapUsedMB: swapTotal === null || swapFree === null ? null : swapTotal - swapFree,
        load1: Math.round(loadavg()[0] * 10) / 10,
        browserRssMB: Math.round((rssPages * 4096) / 1e6),
    };
    console.log(`[autosave-bench-step] ${JSON.stringify(row)}`);
}

/**
 * Open the fixture and wait until it is ready.
 * @param context - The browser.
 * @param params - The fixture's parameters.
 * @returns The page.
 */
async function open(context: BrowserContext, params: Record<string, string | number>): Promise<Page> {
    const page = await context.newPage();
    await page.goto(fx.url(params));
    await page.evaluate("fixture.ready()");
    return page;
}

describe.each(ENGINES)("%s (recorded, never asserted)", (engine) => {
    it.each(SIZES)("write cost at %i nodes", async (n) => {
        const dir = profile(`bench-${engine}`);
        const test = { engine, nodes: n, dir, start: Date.now() };
        const context = await launch(engine, dir);
        step(test, "launched");
        try {
            const page = await context.newPage();
            await page.goto(fx.url({ key: `bench-${n}`, tab: `bench-${engine}-${n}`, n }));
            step(test, "loaded");
            await page.evaluate("fixture.ready()");
            step(test, "ready");
            for (let run = 1; run <= RUNS; run++) {
                type Cost = { ms: number; state: string; problem: string | null };
                const data = await page.evaluate<Cost>('fixture.cost("data")');
                const ordinary = await page.evaluate<Cost>('fixture.cost("ordinary")');
                record({
                    name: "autosave write (fixture)",
                    engine,
                    nodes: n,
                    run,
                    dataMs: Math.round(data.ms),
                    dataState: data.problem ?? data.state,
                    ordinaryMs: Math.round(ordinary.ms),
                    ordinaryState: ordinary.problem ?? ordinary.state,
                });
                step(test, `run ${run}`);
            }
        } finally {
            await context.close();
            rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
        }
    });

    it.each(["navigate", "close"] as const)("how often the pagehide write lands (%s)", async (how) => {
        const dir = profile(`landing-${engine}`);
        const context = await launch(engine, dir);
        let landed = 0;
        try {
            for (let trial = 1; trial <= LANDING_TRIALS; trial++) {
                const key = `landing-${how}-${trial}`;
                const tab = `${engine}-${key}`;
                // Every write held back: only a lifecycle event writes the edit.
                const held = await open(context, { key, tab, n: 1000, delay: 600_000 });
                const edit = await held.evaluate<number>("fixture.next()");
                if (how === "navigate") {
                    await held.goto(`${fx.origin}/away.html`);
                }

                await held.close();

                const reopened = await open(context, { key, tab: `${tab}.reopened`, n: 1000 });
                const check = await reopened.evaluate<PageCheck>("fixture.check()");
                if (check.restored?.revision === edit) {
                    landed += 1;
                }

                await reopened.close();
            }

            record({ name: "autosave pagehide write landed", engine, how, landed, trials: LANDING_TRIALS });
        } finally {
            await context.close();
            rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
        }
    });
});
