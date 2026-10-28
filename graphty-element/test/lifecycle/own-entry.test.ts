/**
 * `listAutosaves` marks this tab's own entry (`own: true`) only when this tab holds the entry's lock:
 * after a reload of the same tab, yes; in a duplicated tab, which inherits the session storage naming
 * the entry while the original tab still writes it, no, and its element writes to a copy; in an
 * unrelated tab, no. Each page lists before its element mounts (`list=1`), as a start screen does.
 */

import { rmSync } from "node:fs";

import type { BrowserContext, Page } from "playwright";
import { afterAll, afterEach, assert, beforeAll, describe, it, onTestFailed } from "vitest";

import { ENGINES, launch, profile } from "./engines";
import { type Fixture, type LogEvent, type PageCheck, startFixture } from "./fixture";

/** One entry as the fixture's `listed` reports it. */
interface Listed {
    readonly id: string;
    readonly own: boolean | undefined;
    readonly live: boolean;
}

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
 * The `listed` report a tab made at or after `from`.
 * @param tab - The tab label.
 * @param from - The log position to start at.
 * @returns The report.
 */
function listedAt(tab: string, from: number): Promise<LogEvent & { item: string | null; entries: Listed[] }> {
    return fx.waitFor((e) => e.seq >= from && e.tab === tab && e.type === "listed") as Promise<
        LogEvent & { item: string | null; entries: Listed[] }
    >;
}

/**
 * The ids a listing marks as this tab's own.
 * @param entries - The listing.
 * @returns The ids.
 */
function owned(entries: readonly Listed[]): string[] {
    return entries.filter((entry) => entry.own === true).map((entry) => entry.id);
}

describe.each(ENGINES)("%s", (engine) => {
    it("marks the entry own in the reloaded tab, in exactly one of a tab and its duplicate, and in no unrelated tab", async () => {
        const key = `own-${engine}`;
        const tab = (name: string): string => `${key}.${name}`;
        const dir = profile(engine);
        const context = await launch(engine, dir);
        open.push({ context, dir });
        onTestFailed(() => {
            console.log(`last reports: ${JSON.stringify(fx.log.filter((e) => e.tab.startsWith(key)).slice(-25))}`);
        });
        const check = (page: Page): Promise<PageCheck> => page.evaluate<PageCheck>("fixture.check()");
        const listed = (page: Page): Promise<Listed[]> => page.evaluate<Listed[]>("fixture.listed()");
        const ready = async (page: Page): Promise<void> => {
            await page.waitForFunction("window.fixture !== undefined");
            await page.evaluate("fixture.ready()");
        };
        const saved = (name: string, revision: number): Promise<LogEvent> =>
            fx.waitFor((e) => e.tab === tab(name) && e.type === "saved" && (e.revision as number) >= revision);

        // Open, edit, reload the same tab: the entry is this tab's own.
        const a = await context.newPage();
        await a.goto(fx.url({ key, tab: tab("a"), list: 1 }));
        await ready(a);
        await saved("a", await a.evaluate<number>("fixture.next()"));
        const entryA = (await check(a)).status.entry;
        assert.isNotNull(entryA);
        const beforeReload = fx.log.length;
        await a.reload();
        const reloaded = await listedAt(tab("a"), beforeReload);
        assert.strictEqual(reloaded.item, entryA, "session storage names the entry after the reload");
        assert.deepEqual(owned(reloaded.entries), [entryA], "the reloaded tab owns its entry");
        await ready(a);
        const afterReload = await check(a);
        assert.strictEqual(afterReload.restored?.entry, entryA, "the element restored the entry itself");
        assert.isNull(afterReload.restored?.copiedFrom ?? null, "not a copy");

        // Duplicate the tab (window.open copies session storage): the original keeps the entry.
        const beforeDup = fx.log.length;
        const opened = context.waitForEvent("page");
        await a.evaluate(`window.open(${JSON.stringify(fx.url({ key, tab: tab("dup"), list: 1 }))})`);
        const dup = await opened;
        const dupListed = await listedAt(tab("dup"), beforeDup);
        assert.strictEqual(dupListed.item, entryA, "the duplicate inherited the session storage item");
        assert.deepEqual(owned(dupListed.entries), [], "the duplicate owns nothing at load");
        await ready(dup);
        const dupCheck = await check(dup);
        assert.strictEqual(dupCheck.restored?.copiedFrom ?? null, entryA, "the duplicate works on a copy");
        const entryDup = dupCheck.status.entry ?? dupCheck.restored?.entry ?? null;
        assert.isNotNull(entryDup);
        assert.notStrictEqual(entryDup, entryA);

        // Exactly one tab owns each entry, and each writes only its own.
        assert.deepEqual(owned(await listed(a)), [entryA], "the original owns its entry");
        await saved("dup", await dup.evaluate<number>("fixture.next()"));
        await saved("a", await a.evaluate<number>("fixture.next()"));
        assert.deepEqual(owned(await listed(dup)), [entryDup], "the duplicate owns only its copy");
        assert.strictEqual((await check(a)).status.entry, entryA, "the original still writes its entry");
        assert.strictEqual((await check(dup)).status.entry, entryDup, "the duplicate still writes its copy");

        // An unrelated tab owns nothing.
        const beforeOther = fx.log.length;
        const other = await context.newPage();
        await other.goto(fx.url({ key, tab: tab("other"), list: 1 }));
        const otherListed = await listedAt(tab("other"), beforeOther);
        assert.isNull(otherListed.item, "a new tab has no session storage item");
        assert.deepEqual(owned(otherListed.entries), [], "an unrelated tab owns nothing");
    });
});
