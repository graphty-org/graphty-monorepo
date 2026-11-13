/**
 * What a real reload does with this tab's own entry beyond naming it: the tab names the entry as
 * soon as it starts, a reload waits for the lock of the page it replaces and gives up on a lock that
 * is never released, `keepCamera` puts the view back, and a reload that comes while a page is
 * reopening the tab's work still finds the work. A file of its own, so it has its own file
 * guard beside own-entry.test.ts's three-engine walk.
 */

import { rmSync } from "node:fs";

import type { BrowserContext, Page } from "playwright";
import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

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
        assert.strictEqual(reloaded.item, item, "the reloaded tab still names the entry");
        // Whether the final write beat the page's end varies by engine; when it did, the entry is this tab's.
        assert.deepEqual(
            reloaded.entries.filter((entry) => entry.id === item && entry.own !== true),
            [],
            "the entry the tab named is its own",
        );
    });

    it("a reload while the page reopens the work, after the page wrote its own setup, still finds the work (issue #6484)", async () => {
        const key = `own-reopening-${engine}`;
        const { page } = await opened(key);
        const entry = await editSaved(page, key);
        const { probes } = await page.evaluate<PageCheck>("fixture.check()");

        // A reload into a page that reopens kept work as an app does: it lists the key first, loads
        // no data of its own, sets itself up while autosave starts (which writes an entry of the
        // page's own), and restores by hand. It has not restored the work yet.
        const reopening = fx.url({ key, tab: `${key}.a`, list: 1, n: 0, rows: "none", restore: "manual", setup: 1 });
        let from = fx.log.length;
        await page.goto(reopening);
        assert.deepEqual(owned((await listedAt(`${key}.a`, from)).entries), [entry]);
        await page.waitForFunction(
            `window.fixture !== undefined && ![null, ${JSON.stringify(entry)}].includes(fixture.status().entry)`,
        );

        // The second reload, before the work was reopened, still names the work as this tab's.
        from = fx.log.length;
        await page.reload();
        assert.deepEqual(owned((await listedAt(`${key}.a`, from)).entries), [entry]);
        await page.waitForFunction("window.fixture !== undefined");
        const reopened = await page.evaluate<PageCheck>(`fixture.restore(${JSON.stringify(entry)})`);
        assert.deepEqual(reopened.probes, probes, "the newest work came back");
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
            "Math.abs(fixture.camera().position.x - 12) < 0.01 && Math.abs(fixture.camera().position.z + 30) < 0.01",
        );
    });

    it("waits out the lock of the page it replaces, and gets the entry", async () => {
        const key = `own-late-${engine}`;
        const { context, page } = await opened(key);
        const entry = await editSaved(page, key);
        const lock = `graphty-autosave:${key}:${entry}`;

        // Another page queues for the lock, so the reload finds it held after the old page lets go.
        const other = await context.newPage();
        await other.goto(`${fx.origin}/away.html`);
        // Held until the reloaded page's own request is queued behind it: that event, in the page
        // holding the lock, is what lets go, so no round trip stands between it and the reader's wait.
        await other.evaluate(
            `(() => {
                const lock = ${JSON.stringify(lock)};
                const pending = () => navigator.locks.query().then((q) => (q.pending ?? []).some((l) => l.name === lock));
                const whenQueued = () => pending().then((yes) => (yes ? true : whenQueued()));
                window.queued = whenQueued();
                window.heldLock = new Promise((granted) => {
                    navigator.locks.request(lock, () => {
                        granted(true);
                        return whenQueued();
                    });
                });
            })()`,
        );
        await other.evaluate("window.queued");

        const beforeReload = fx.log.length;
        await page.reload();
        await other.evaluate("window.heldLock");
        const reloaded = await listedAt(`${key}.a`, beforeReload);
        assert.deepEqual(owned(reloaded.entries), [entry], "the lock passed to the reloaded page");
    });

    it("gives up on a lock that is never released, and says not own", async () => {
        const key = `own-held-${engine}`;
        const { context, page } = await opened(key);
        const entry = await editSaved(page, key);
        const lock = `graphty-autosave:${key}:${entry}`;
        const other = await context.newPage();
        await other.goto(`${fx.origin}/away.html`);
        // In a function, so evaluate does not wait for the promise: it settles only after the reload.
        await other.evaluate(
            `(() => {
                window.heldLock = new Promise((granted) => {
                    navigator.locks.request(${JSON.stringify(lock)}, () => {
                        granted(true);
                        return new Promise(() => undefined);
                    });
                });
            })()`,
        );
        const beforeReload = fx.log.length;
        await page.reload();
        await other.evaluate("window.heldLock");
        const reloaded = await listedAt(`${key}.a`, beforeReload);
        assert.deepEqual(owned(reloaded.entries), [], "a lock another page keeps is not this tab's");
    });
});
