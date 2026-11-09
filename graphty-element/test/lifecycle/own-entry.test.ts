/**
 * `listAutosaves` marks this tab's own entry (`own: true`) only when this tab holds the entry's lock:
 * after a reload of the same tab, yes; in a duplicated tab, which inherits the session storage naming
 * the entry while the original tab still writes it, no, and its element writes to a copy; in an
 * unrelated tab, no. Each page lists before its element mounts (`list=1`), as a start screen does.
 */

import { rmSync } from "node:fs";

import type { BrowserContext, Page } from "playwright";
import { afterAll, afterEach, assert, beforeAll, describe, it, onTestFailed } from "vitest";

import { duplicateTab, ENGINES, launch, profile } from "./engines";
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
    /**
     * A browser and its page open on a fixture, ready to edit.
     * @param key - The autosave key.
     * @param delay - The fixture's debounce; a large one leaves every write to the lifecycle events.
     * @returns The browser context and the page.
     */
    const opened = async (key: string, delay?: number): Promise<{ context: BrowserContext; page: Page }> => {
        const dir = profile(engine);
        const context = await launch(engine, dir);
        open.push({ context, dir });
        const page = await context.newPage();
        await page.goto(fx.url({ key, tab: `${key}.a`, list: 1, ...(delay === undefined ? {} : { delay }) }));
        await page.waitForFunction("window.fixture !== undefined");
        await page.evaluate("fixture.ready()");
        return { context, page };
    };

    /**
     * Makes an edit and waits until it is committed.
     * @param page - The page.
     * @param key - The autosave key.
     * @returns The entry written.
     */
    const editSaved = async (page: Page, key: string): Promise<string> => {
        const revision = await page.evaluate<number>("fixture.next()");
        await fx.waitFor((e) => e.tab === `${key}.a` && e.type === "saved" && (e.revision as number) >= revision);
        const { entry } = (await page.evaluate<PageCheck>("fixture.check()")).status;
        assert.isNotNull(entry);
        return entry;
    };

    it("names the entry in session storage when it starts, before its first commit", async () => {
        const key = `own-start-${engine}`;
        const { page } = await opened(key, 2_147_000_000);
        await page.evaluate("fixture.next()");
        const item = await page.evaluate<string | null>(`sessionStorage.getItem("graphty-autosave:own:${key}")`);
        assert.isNotNull(item, "the tab names its entry as soon as it has one");
        assert.isNull((await page.evaluate<PageCheck>("fixture.check()")).status.entry, "nothing is committed yet");

        const beforeReload = fx.log.length;
        await page.reload();
        const reloaded = await listedAt(`${key}.a`, beforeReload);
        assert.deepEqual(owned(reloaded.entries), [item], "the reloaded tab owns the entry its final write made");
    });

    it("puts the camera back after a real reload with keepCamera", async () => {
        const key = `own-camera-${engine}`;
        const dir = profile(engine);
        const context = await launch(engine, dir);
        open.push({ context, dir });
        const page = await context.newPage();
        await page.goto(fx.url({ key, tab: `${key}.a`, keepCamera: 1 }));
        await page.waitForFunction("window.fixture !== undefined");
        await page.evaluate("fixture.ready()");
        await editSaved(page, key);
        const placed = { position: { x: 12, y: 5, z: -30 }, target: { x: 0, y: 0, z: 0 } };
        await page.evaluate(`fixture.placeCamera(${JSON.stringify(placed)})`);
        await page.reload();
        await page.waitForFunction("window.fixture !== undefined");
        await page.evaluate("fixture.ready()");
        await page.waitForFunction(
            "fixture.camera().position.x === 12 && fixture.camera().position.y === 5 && fixture.camera().position.z === -30",
        );
    });

    it("waits out the lock of the page it replaces, and gets the entry", async () => {
        const key = `own-late-${engine}`;
        const { context, page } = await opened(key);
        const entry = await editSaved(page, key);
        const lock = `graphty-autosave:${key}:${entry}`;

        // Another page queues for the lock, so the reload finds it held after the old page lets go.
        const other = await context.newPage();
        await other.goto(`${fx.origin}/blank`);
        await other.evaluate(
            `window.heldLock = new Promise((granted) => {
                navigator.locks.request(${JSON.stringify(lock)}, () => {
                    granted(true);
                    return new Promise((release) => { window.releaseLock = release; });
                });
            })`,
        );
        const queued = async (holder: Page, wanted: number): Promise<void> => {
            await holder.waitForFunction(
                `navigator.locks.query().then((q) => (q.pending ?? []).filter((l) => l.name === ${JSON.stringify(lock)}).length >= ${String(wanted)})`,
            );
        };
        await queued(other, 1);

        const beforeReload = fx.log.length;
        await page.reload();
        await other.evaluate("window.heldLock");
        await queued(other, 1);
        await other.evaluate("window.releaseLock()");
        const reloaded = await listedAt(`${key}.a`, beforeReload);
        assert.deepEqual(owned(reloaded.entries), [entry], "the lock passed to the reloaded page");
    });

    it("gives up on a lock that is never released, and says not own", async () => {
        const key = `own-held-${engine}`;
        const { context, page } = await opened(key);
        const entry = await editSaved(page, key);
        const lock = `graphty-autosave:${key}:${entry}`;
        const other = await context.newPage();
        await other.goto(`${fx.origin}/blank`);
        await other.evaluate(
            `window.heldLock = new Promise((granted) => {
                navigator.locks.request(${JSON.stringify(lock)}, () => {
                    granted(true);
                    return new Promise(() => undefined);
                });
            })`,
        );
        const beforeReload = fx.log.length;
        await page.reload();
        await other.evaluate("window.heldLock");
        const reloaded = await listedAt(`${key}.a`, beforeReload);
        assert.deepEqual(owned(reloaded.entries), [], "a lock another page keeps is not this tab's");
    });

    it("marks the entry own in the reloaded tab, in exactly one of a tab and its duplicate, and in no unrelated tab", async () => {
        const key = `own-${engine}`;
        const tab = (name: string): string => `${key}.${name}`;
        const dir = profile(engine);
        const context = await launch(engine, dir);
        open.push({ context, dir });
        // Which page or browser went away, and how, for a failure that reports a closed target.
        const gone: string[] = [];
        context.on("close", () => gone.push("context closed"));
        context.on("page", (page) => {
            page.on("crash", () => gone.push(`crashed: ${page.url()}`));
            page.on("close", () => gone.push(`closed: ${page.url()}`));
        });
        onTestFailed(() => {
            console.log(`last reports: ${JSON.stringify(fx.log.filter((e) => e.tab.startsWith(key)).slice(-25))}`);
            console.log(`pages gone: ${JSON.stringify(gone)}`);
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
        const dup = await duplicateTab(context, a, fx.url({ key, tab: tab("dup"), list: 1 }));
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
