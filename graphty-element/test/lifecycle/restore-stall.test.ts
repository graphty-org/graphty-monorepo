/**
 * Reopening kept work while another tab holds the autosave database in an unfinished write (issue
 * #8207): the listing reads only the entries, so it answers, but the reopen reads the entry's parts
 * and writes the attempt. `autosaver.restore` refuses with `E_AUTOSAVE_STALLED` instead of waiting
 * forever, and leaves the entry as it was, so once the other tab lets go the same reopen succeeds.
 */

import { rmSync } from "node:fs";

import type { BrowserContext, Page } from "playwright";
import { afterAll, afterEach, assert, beforeAll, describe, it, onTestFailed } from "vitest";

import { type Engine, ENGINES, launch, profile } from "./engines";
import { type Fixture, HOLD_PARTS, keptWork, type LogEvent, startFixture } from "./fixture";

let fx: Fixture;
const open: { context: BrowserContext; dir: string }[] = [];

beforeAll(async () => {
    fx = await startFixture();
});

afterAll(async () => {
    await fx.close();
});

afterEach(async () => {
    for (const { context, dir } of open.splice(0)) {
        await context.close().catch(() => undefined);
        rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
    }
});

/**
 * Launch the engine and have tab A keep work, then close, which frees its entry.
 * @param engine - The engine.
 * @param key - The autosave key, and the tab label's start.
 * @returns The context, the revision saved and its entry.
 */
async function keepWork(
    engine: Engine,
    key: string,
): Promise<{ context: BrowserContext; probe: number; entry: string }> {
    const dir = profile(engine);
    const context = await launch(engine, dir);
    open.push({ context, dir });
    onTestFailed(() => {
        console.log(`last reports: ${JSON.stringify(fx.log.filter((e) => e.tab.startsWith(key)).slice(-25))}`);
    });

    const a = await context.newPage();
    await a.goto(fx.url({ key, tab: `${key}.a`, webgl: "off" }));
    await a.evaluate("fixture.ready()");
    const probe = await a.evaluate<number>("fixture.next()");
    const saved = (await fx.waitFor(
        (e) => e.tab === `${key}.a` && e.type === "saved" && (e.revision as number) >= probe,
    )) as LogEvent & { entry: string };
    await a.close();
    return { context, probe, entry: saved.entry };
}

/**
 * A page of the same origin holds a read-write transaction on the parts and never finishes it.
 * @param context - The browser context.
 * @returns The holding page; `window.__release = true` in it lets go.
 */
async function holdParts(context: BrowserContext): Promise<Page> {
    const holder = await context.newPage();
    await holder.goto(`${fx.origin}/away.html`);
    await holder.evaluate(HOLD_PARTS);
    return holder;
}

describe.each(ENGINES)("%s", (engine) => {
    it("refuses a reopen the held database stalls, and reopens once it is let go", async () => {
        const key = `restore-stall-${engine}`;
        const { context, probe, entry } = await keepWork(engine, key);

        // Tab B starts with the restore left to the page, as an app reopening a tab's project does.
        const b = await context.newPage();
        await b.goto(fx.url({ key, tab: `${key}.b`, restore: "manual" }));
        await b.evaluate("fixture.ready()");

        const holder = await holdParts(context);
        const refused = await b.evaluate<{ code: string; details: { afterMs: number; step: string } } | null>(
            `fixture.el.autosaver.restore(${JSON.stringify(entry)}, { discard: true }).then(
                () => null,
                (e) => ({ code: e.code, details: e.details }),
            )`,
        );
        assert.isNotNull(refused, "the reopen was refused, not opened, while the database is held");
        assert.strictEqual(refused?.code, "E_AUTOSAVE_STALLED");
        assert.include(["read", "restore"], refused?.details.step);

        // Let go: the entry was left as it was and its lock is free, so the same reopen opens it.
        await holder.evaluate("window.__release = true");
        const check = await b.evaluate<{ restored: { entry: string } | null; probes: unknown[] }>(
            `fixture.restore(${JSON.stringify(entry)})`,
        );
        assert.strictEqual(check.restored?.entry, entry);
        assert.deepStrictEqual(check.probes, [probe], "the kept work came back");
    });

    it("refuses the restore at the start while another tab holds the database, and keeps the work (#4148)", async () => {
        // Safari on iOS: Safari reloads the old tab in the background as the reader opens the page
        // again, and suspends it in the middle of its listing, so the reopened page's restore stalls.
        const key = `start-stall-${engine}`;
        const { context, probe, entry } = await keepWork(engine, key);
        const holder = await holdParts(context);

        const mark = fx.log.length;
        const b = await context.newPage();
        await b.goto(fx.url({ key, tab: `${key}.b`, webgl: "off" }));
        const ready = await fx.waitFor((e) => e.seq >= mark && e.tab === `${key}.b` && e.type === "ready");
        assert.isNull(ready.restored, "the restore could not write its attempt, so it opened nothing");
        const kept = keptWork(ready, entry);
        assert.isAtLeast(kept.revision, probe, "the entry still holds the saved revision");
        await holder.evaluate("window.__release = true");
    });
});
