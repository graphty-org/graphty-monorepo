/**
 * What a real reload does with this tab's own entry beyond naming it: the tab names the entry as
 * soon as it starts, a reload waits for the lock of the page it replaces and gives up on a lock that
 * is never released, `keepCamera` puts the view back, and a reload that comes while a page is
 * reopening the tab's work still finds the work. A file of its own, so it has its own file
 * guard beside own-entry.test.ts's three-engine walk.
 */

import type { BrowserContext, Page } from "playwright";
import { assert, describe, it } from "vitest";

import { ENGINES, launch, profile } from "./engines";
import { owned, type PageCheck, useLifecycleFixture } from "./fixture";

const { fx, track, listedAt } = useLifecycleFixture();

describe.each(ENGINES)("%s", (engine) => {
    /**
     * A browser and its page open on a fixture, ready to edit.
     * @param key - The autosave key.
     * @param delay - The fixture's debounce; a large one leaves every write to the lifecycle events.
     * @param list - `1` lists the key before the element mounts, as a start screen does; `0` does not.
     * @returns The browser context and the page.
     */
    const opened = async (key: string, delay?: number, list = 1): Promise<{ context: BrowserContext; page: Page }> => {
        const dir = profile(engine);
        const context = await launch(engine, dir);
        track(() => context.close(), dir);
        const page = await context.newPage();
        await page.goto(fx.url({ key, tab: `${key}.a`, list, ...(delay === undefined ? {} : { delay }) }));
        await page.waitForFunction("window.fixture !== undefined");
        await page.evaluate("fixture.ready()");
        return { context, page };
    };

    /**
     * Makes an edit and waits until it is committed.
     * @param page - The page.
     * @param key - The autosave key.
     * @param tab - The page's tab label.
     * @returns The entry written.
     */
    const editSaved = async (page: Page, key: string, tab = `${key}.a`): Promise<string> => {
        const revision = await page.evaluate<number>("fixture.next()");
        await fx.waitFor((e) => e.tab === tab && e.type === "saved" && (e.revision as number) >= revision);
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

    /**
     * Makes the page's next end look like a Safari kill to the next load: session storage (with the
     * leaving mark and the per-load item) is gone, and window.name is what the element's own pagehide
     * left. That Safari keeps window.name when it ends a tab in the background is an assumption, not
     * observed: where it does not, the newest-unheld case below is the one that applies. The element's
     * listeners still run, so the leaving page lets its lock go as a killed one does.
     * @param page - The page.
     */
    const killedOnLeave = (page: Page): Promise<unknown> =>
        page.evaluate(`addEventListener("pagehide", () => { sessionStorage.clear(); });`);

    /**
     * A newer entry of the key that no tab holds, written by another page that then left: the guess
     * made with no record would take it, so only the tab's record reopens the older, own one.
     * @param context - The browser context.
     * @param key - The autosave key.
     * @returns The newer entry.
     */
    const newerLeft = async (context: BrowserContext, key: string): Promise<string> => {
        const other = await context.newPage();
        await other.goto(fx.url({ key, tab: `${key}.b`, list: 1 }));
        await other.waitForFunction("window.fixture !== undefined");
        await other.evaluate("fixture.ready()");
        const newer = await editSaved(other, key, `${key}.b`);
        await other.close();
        return newer;
    };

    /**
     * Reloads a page made to end as a killed one, and says whether the browser kept window.name:
     * Playwright's Firefox reloads as a new navigation, which drops it.
     * @param page - The page.
     * @param key - The autosave key.
     * @returns Where the reload's reports start, and whether it loaded as a new navigation.
     */
    const reloadKilled = async (page: Page, key: string): Promise<{ from: number; navigated: boolean }> => {
        await killedOnLeave(page);
        const from = fx.log.length;
        await page.reload();
        const boot = await fx.report(`${key}.a`, "boot", from);
        return { from, navigated: boot.navigationType === "navigate" };
    };

    it("a tab ended with no pagehide finds its own entry by its record, not a newer closed tab's (issue #9230)", async () => {
        const key = `own-killed-${engine}`;
        const { context, page } = await opened(key);
        const entry = await editSaved(page, key);
        const newer = await newerLeft(context, key);
        const { from, navigated } = await reloadKilled(page, key);
        const reloaded = await listedAt(`${key}.a`, from);
        assert.isNull(reloaded.item, "session storage names nothing");
        assert.includeMembers(reloaded.entries?.map((listed) => listed.id) ?? [], [entry, newer]);
        if (navigated) {
            // No record and a new navigation: a new tab's load, which takes nothing.
            assert.deepEqual(owned(reloaded.entries), [], "a navigation adopts nothing");
            return;
        }

        assert.deepEqual(owned(reloaded.entries), [entry], "the tab's record found its own entry");
        await page.waitForFunction("window.fixture !== undefined");
        await page.evaluate("fixture.ready()");
        const after = await page.evaluate<PageCheck>("fixture.check()");
        assert.strictEqual(after.restored?.entry, entry, "the element restored the entry itself");
        assert.isNull(after.restored?.copiedFrom ?? null, "not a copy");
    });

    it("a tab ended with no pagehide, whose element starts with no listing, restores its own entry by its record", async () => {
        const key = `own-killed-start-${engine}`;
        const { context, page } = await opened(key, undefined, 0);
        const entry = await editSaved(page, key);
        const newer = await newerLeft(context, key);
        const { navigated } = await reloadKilled(page, key);
        await page.waitForFunction("window.fixture !== undefined");
        await page.evaluate("fixture.ready()");
        const after = await page.evaluate<PageCheck>("fixture.check()");
        // With no own entry the element restores the newest one, as in a new tab.
        assert.strictEqual(after.restored?.entry, navigated ? newer : entry, "the element restored its own entry");
        assert.isNull(after.restored?.copiedFrom ?? null, "not a copy");
    });

    it("a reload that lost both session storage and the tab's record reopens the newest unheld entry (issue #9230)", async () => {
        const key = `own-lost-${engine}`;
        const { page } = await opened(key);
        const entry = await editSaved(page, key);
        // A browser that keeps neither: cleared after every other pagehide listener, so no mark the
        // leaving page writes is left either, and only the guess by the newest unheld entry is left.
        await page.evaluate(`addEventListener("pagehide", () => { sessionStorage.clear(); window.name = ""; })`);
        const beforeReload = fx.log.length;
        await page.reload();
        const reloaded = await listedAt(`${key}.a`, beforeReload);
        assert.isNull(reloaded.item, "session storage names nothing");
        const boot = await fx.report(`${key}.a`, "boot", beforeReload);
        if (boot.navigationType === "navigate") {
            // Playwright's Firefox reloads as a new navigation: that is a new tab's load, offered, so
            // on Firefox this case only checks that nothing is taken.
            assert.deepEqual(owned(reloaded.entries), [], "a navigation adopts nothing");
            return;
        }

        assert.deepEqual(owned(reloaded.entries), [entry], "the reloaded tab owns its entry");
        await page.waitForFunction("window.fixture !== undefined");
        await page.evaluate("fixture.ready()");
        const after = await page.evaluate<PageCheck>("fixture.check()");
        assert.strictEqual(after.restored?.entry, entry, "the element restored the entry itself");
        assert.isNull(after.restored?.copiedFrom ?? null, "not a copy");
    });

    it("puts the camera back after a real reload with keepCamera", async () => {
        const key = `own-camera-${engine}`;
        const dir = profile(engine);
        const context = await launch(engine, dir);
        track(() => context.close(), dir);
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

    it("puts the camera back with keepCamera after a reload that emptied session storage, as Safari's (issue #9663)", async () => {
        const key = `own-camera-lost-${engine}`;
        const dir = profile(engine);
        const context = await launch(engine, dir);
        track(() => context.close(), dir);
        const page = await context.newPage();
        await page.goto(fx.url({ key, tab: `${key}.a`, keepCamera: 1 }));
        await page.waitForFunction("window.fixture !== undefined");
        await page.evaluate("fixture.ready()");
        await editSaved(page, key);
        const placed = { position: { x: 12, y: 5, z: -30 }, target: { x: 0, y: 0, z: 0 } };
        await page.evaluate(`fixture.placeCamera(${JSON.stringify(placed)})`);
        const { navigated } = await reloadKilled(page, key);
        if (navigated) {
            // Playwright's Firefox reloads as a new navigation: a new tab's load, framed as usual.
            return;
        }

        await page.waitForFunction("window.fixture !== undefined");
        await page.evaluate("fixture.ready()");
        await page.waitForFunction(
            "Math.abs(fixture.camera().position.x - 12) < 0.01 && Math.abs(fixture.camera().position.z + 30) < 0.01",
        );
    });

    it("plays a saved tour on from its stop after a reload with keepCamera (issue #9663)", async () => {
        const key = `own-tour-${engine}`;
        const tab = `${key}.a`;
        const dir = profile(engine);
        const context = await launch(engine, dir);
        track(() => context.close(), dir);
        const page = await context.newPage();
        await page.goto(fx.url({ key, tab, keepCamera: 1 }));
        await page.waitForFunction("window.fixture !== undefined");
        await page.evaluate("fixture.ready()");
        await editSaved(page, key);
        let from = fx.log.length;
        await page.evaluate("fixture.playWalk()");
        await fx.report(tab, "tour", from, (e) => e.stop === 1 && e.phase === "hold");
        // The saved tour is the reader's change: wait until it is written.
        await fx.report(tab, "saved", from);

        from = fx.log.length;
        await page.reload();
        const resumed = await fx.report(tab, "tour", from);
        assert.deepInclude(resumed, { tour: "walk", stop: 1 }, "the tour plays on from the stop it was at");
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
