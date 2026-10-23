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
 */

import { rmSync } from "node:fs";

import type { BrowserContext, Page } from "playwright";
import { afterAll, beforeAll, describe, it } from "vitest";

import { ENGINES, launch, profile } from "./engines";
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
        const context = await launch(engine, dir);
        try {
            const page = await open(context, { key: `bench-${n}`, tab: `bench-${engine}-${n}`, n });
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
