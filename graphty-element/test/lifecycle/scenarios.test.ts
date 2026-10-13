/**
 * Autosave after a long time in the background, a page killed while a write is in flight, and a
 * write torn midway, in Chromium, Firefox and WebKit. A freeze and resume needs a hidden tab, which
 * only Chrome for Testing gives a test: it is in chromium.test.ts.
 *
 * Like engines.test.ts, each test launches its own browser on its own profile through Playwright's
 * library API and drives the fixture page (fixture.ts). Every test first proves its trigger
 * happened, then asserts the invariant of design/work-protection/design.md section 8.
 */

import { rmSync } from "node:fs";

import type { BrowserContext, Page } from "playwright";
import { afterAll, afterEach, assert, beforeAll, describe, it, onTestFailed } from "vitest";

import { assertInvariant, type Engine, ENGINES, kill, launch, pageProcesses, profile } from "./engines";
import { type Fixture, type LogEvent, type PageCheck, startFixture } from "./fixture";

/** 50,000 nodes run only on the release train. */
const FULL = process.env.GRAPHTY_LIFECYCLE_FULL === "1";

/** How long the page is left alone in the long-background test: a night. */
const NIGHT_MS = 10 * 60 * 60 * 1000;

let fx: Fixture;
const open: { context: BrowserContext; dir: string }[] = [];

beforeAll(async () => {
    fx = await startFixture();
});

afterAll(async () => {
    await fx.close();
});

afterEach(async () => {
    if (process.env.LIFECYCLE_DEBUG === "1") {
        const t0 = (fx.log[0]?.at as number) ?? 0;
        console.log(fx.log.map((e) => `${(e.at as number) - t0} ${JSON.stringify(e)}`).join("\n"));
    }

    for (const { context, dir } of open.splice(0)) {
        await context.close().catch(() => undefined);
        rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
    }
});

/**
 * Launch an engine on a fresh profile, closed after the test.
 * @param engine - The engine.
 * @returns The context and its profile.
 */
async function start(engine: Engine): Promise<{ context: BrowserContext; dir: string }> {
    const dir = profile(engine);
    const context = await launch(engine, dir);
    const entry = { context, dir };
    open.push(entry);
    onTestFailed(() => {
        console.log(`last reports: ${JSON.stringify(fx.log.slice(-25))}`);
    });
    return entry;
}

/**
 * Open the fixture in a new page and wait until its restore is decided and its rows are in.
 * @param context - The browser context.
 * @param params - The fixture's parameters.
 * @param clock - Install Playwright's clock before the page loads, so a test can move time.
 * @returns The page.
 */
async function openFixture(
    context: BrowserContext,
    params: Record<string, string | number>,
    clock = false,
): Promise<Page> {
    const page = await context.newPage();
    if (clock) {
        await page.clock.install();
    }

    await page.goto(fx.url(params));
    await page.evaluate("fixture.ready()");
    return page;
}

const next = (page: Page): Promise<number> => page.evaluate<number>("fixture.next()");
const check = (page: Page): Promise<PageCheck> => page.evaluate<PageCheck>("fixture.check()");
const report = (
    tab: string,
    type: string,
    mark = 0,
    predicate: (e: LogEvent) => boolean = () => true,
): Promise<LogEvent> => fx.waitFor((e) => e.seq >= mark && e.tab === tab && e.type === type && predicate(e));
const saved = (tab: string, revision: number, mark = 0): Promise<LogEvent> =>
    report(tab, "saved", mark, (e) => (e.revision as number) >= revision);

/**
 * Reload a page and wait until the reloaded page has decided its restore.
 * @param page - The page.
 * @param tab - Its tab label.
 */
async function reload(page: Page, tab: string): Promise<void> {
    const mark = fx.log.length;
    await page.reload();
    await page.evaluate("fixture.ready()");
    await report(tab, "boot", mark);
}

describe.each(ENGINES)("%s", (engine) => {
    it("keeps the work after a night in the background", async () => {
        const key = `night-${engine}`;
        const tab = `${key}.a`;
        const { context } = await start(engine);
        // The write schedule's longest wait is 10 minutes, so only the time passing writes the edit.
        const page = await openFixture(context, { key, tab, delay: 600_000 }, true);
        await page.evaluate("fixture.flush()");
        const edited = await next(page);
        assert.strictEqual((await check(page)).status.state, "pending");
        const mark = fx.log.length;
        const t0 = await page.evaluate<number>("Date.now()");

        // The night passes: Date jumps, and every timer due in it fires once.
        await page.clock.fastForward(NIGHT_MS);
        assert.isAtLeast((await page.evaluate<number>("Date.now()")) - t0, NIGHT_MS, "a night passed for the page");
        await saved(tab, edited, mark);

        // The next morning the page still writes, to the same entry, and a reload restores it whole.
        const morning = await next(page);
        await page.evaluate("fixture.flush()");
        await saved(tab, morning, mark);
        const after = await check(page);
        assert.strictEqual(after.status.state, "saved");
        assert.isNull(after.status.problem, "no problem reported after the night");
        assert.lengthOf(after.entries, 1, "the page kept its own entry");
        await reload(page, tab);
        assertInvariant(
            await check(page),
            fx,
            [tab],
            after.entries.map((entry) => entry.id),
        );
    });

    it(`keeps the work at ${FULL ? 50_000 : 5_000} nodes when the page process is killed while a write is in flight`, async () => {
        const n = FULL ? 50_000 : 5_000;
        const key = `kill-mid-write-${engine}`;
        const tab = `${key}.a`;
        const { context, dir } = await start(engine);
        const page = await openFixture(context, { key, tab, n });
        await next(page);
        await saved(tab, await next(page));
        const before = (await check(page)).entries.map((entry) => entry.id);

        // The next write's transaction is held open once its first record is written: kill then.
        await page.evaluate("fixture.holdNextWrite()");
        const mark = fx.log.length;
        await next(page);
        await report(tab, "tx-held", mark);
        const victims = pageProcesses(engine, dir);
        const crashed = page.waitForEvent("crash");
        kill(victims);
        await crashed;

        const reopened = await openFixture(context, { key, tab: `${key}.a2`, n });
        const after = await check(reopened);
        assert.strictEqual(after.nodes, n);
        assertInvariant(after, fx, [tab], before);
    });

    it("writes a torn write again by itself, and restores it whole", async () => {
        const key = `torn-${engine}`;
        const tab = `${key}.a`;
        const { context } = await start(engine);
        const page = await openFixture(context, { key, tab });
        await saved(tab, await next(page));
        const before = (await check(page)).entries.map((entry) => entry.id);

        await page.evaluate("fixture.tear()");
        const mark = fx.log.length;
        const torn = await next(page);
        // Written by the write schedule alone, with no further change.
        await saved(tab, torn, mark);
        assert.strictEqual(
            await page.evaluate<number>("fixture.torn()"),
            1,
            "one write was aborted after its first record",
        );

        // A reload restores it whole, never a mix of the two commits.
        await reload(page, tab);
        const after = await check(page);
        assertInvariant(after, fx, [tab], before);
        assert.deepEqual(after.probes, [torn], "the torn edit is kept");
    });
});
