/**
 * Autosave across a reload, a close, a kill and a second tab, in Chromium, Firefox and WebKit.
 *
 * Each test launches its own browser on its own profile through Playwright's library API, opens the
 * fixture page (fixture.ts) served from the built `./bundle`, edits, then reloads, closes or kills
 * the page or the browser and reads what the reopened page restored. Every kill asserts the
 * invariant of design/work-protection/design.md section 8, and every test first proves its trigger
 * happened. Chromium's own lifecycle (discard, freeze, crash, the back/forward cache) is in
 * chromium.test.ts, under a launch without Playwright's flags.
 */

import { rmSync } from "node:fs";

import type { BrowserContext, Page } from "playwright";
import { afterAll, afterEach, assert, beforeAll, describe, it, onTestFailed } from "vitest";

import {
    assertInvariant,
    browserProcesses,
    type Engine,
    ENGINES,
    kill,
    launch,
    pageProcesses,
    profile,
} from "./engines";
import { type Fixture, type LogEvent, type PageCheck, startFixture } from "./fixture";

/** 50,000 and 100,000 nodes run only on the release train. */
const FULL = process.env.GRAPHTY_LIFECYCLE_FULL === "1";

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
 * @param prefs - More Firefox preferences.
 * @returns The context and its profile.
 */
async function start(
    engine: Engine,
    prefs?: Record<string, number>,
): Promise<{ context: BrowserContext; dir: string }> {
    const dir = profile(engine);
    const context = await launch(engine, dir, prefs);
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
 * @returns The page.
 */
async function openFixture(context: BrowserContext, params: Record<string, string | number>): Promise<Page> {
    const page = await context.newPage();
    await page.goto(fx.url(params));
    await page.evaluate("fixture.ready()");
    return page;
}

/**
 * Make the next probe edit.
 * @param page - The page.
 * @returns The probe value written.
 */
function next(page: Page): Promise<number> {
    return page.evaluate<number>("fixture.next()");
}

/**
 * What the page reports about its work and its entries.
 * @param page - The page.
 * @returns The check.
 */
function check(page: Page): Promise<PageCheck> {
    return page.evaluate<PageCheck>("fixture.check()");
}

/**
 * Wait until a tab logged a saved revision of at least `revision`.
 * @param tab - The tab label.
 * @param revision - The revision.
 */
async function saved(tab: string, revision: number): Promise<void> {
    await fx.waitFor((e) => e.tab === tab && e.type === "saved" && (e.revision as number) >= revision);
}

/**
 * Two edits saved and a third made, so a kill lands with work both committed and outstanding.
 * @param page - The page.
 * @param tab - Its tab label.
 * @returns The entry ids that exist before the kill.
 */
async function editAndLeaveOnePending(page: Page, tab: string): Promise<string[]> {
    await next(page);
    await saved(tab, await next(page));
    const before = await check(page);
    await next(page);
    return before.entries.map((entry) => entry.id);
}

describe.each(ENGINES)("%s", (engine) => {
    it("keeps the work when the whole browser is killed, and restores it on a relaunch of the profile", async () => {
        const key = `kill-browser-${engine}`;
        const tab = (name: string): string => `${key}.${name}`;
        const { context, dir } = await start(engine);
        const page = await openFixture(context, { key, tab: tab("a") });
        const before = await editAndLeaveOnePending(page, tab("a"));

        const victims = browserProcesses(dir);
        const closed = new Promise<void>((resolve) => context.once("close", () => resolve()));
        kill(victims);
        await closed;
        // The trigger: every process of that browser is gone.
        assert.deepEqual(
            victims.filter((proc) => browserProcesses(dir).some((left) => left.pid === proc.pid)),
            [],
            "every process of the killed browser is gone",
        );

        const relaunched = await launch(engine, dir);
        open.push({ context: relaunched, dir });
        const reopened = await openFixture(relaunched, { key, tab: tab("a2") });
        assertInvariant(await check(reopened), fx, [tab("a")], before);
    });

    it("keeps the work after close, reload and leaving the page, and asks before closing only while a write is pending", async () => {
        const key = `close-${engine}`;
        const tab = (name: string): string => `${key}.${name}`;
        const { context } = await start(engine);
        const dialogs: string[] = [];
        context.on("dialog", (dialog) => {
            dialogs.push(dialog.type());
            void dialog.accept();
        });

        // Closed after saved: no dialog.
        const first = await openFixture(context, { key, tab: tab("a") });
        await first.mouse.click(10, 10);
        await saved(tab("a"), await next(first));
        assert.isFalse((await check(first)).guard, "no unload guard once saved");
        const firstClosed = first.waitForEvent("close");
        await first.close({ runBeforeUnload: true });
        await firstClosed;
        assert.deepEqual(dialogs, [], "no dialog when the work is saved");

        // Closed while pending: the browser asks, and the page writes.
        const second = await openFixture(context, { key, tab: tab("b"), delay: 600_000 });
        await second.mouse.click(10, 10);
        await next(second);
        assert.isTrue((await check(second)).guard, "the unload guard is armed while a write is pending");
        const secondClosed = second.waitForEvent("close");
        await second.close({ runBeforeUnload: true });
        await secondClosed;
        assert.deepEqual(dialogs, ["beforeunload"], "one dialog, while the write was pending");

        // Reload: the restore after it is whole.
        const third = await openFixture(context, { key, tab: tab("c") });
        assertInvariant(await check(third), fx, [tab("a"), tab("b")], []);
        const before = await editAndLeaveOnePending(third, tab("c"));
        const reloaded = fx.log.length;
        await third.reload();
        await third.evaluate("fixture.ready()");
        // The page loaded again (Firefox reports a Playwright reload as a "navigate").
        await fx.waitFor((e) => e.seq >= reloaded && e.tab === tab("c") && e.type === "boot");
        assertInvariant(await check(third), fx, [tab("c")], before);

        // Leave the page and come back.
        const edited = await next(third);
        const left = fx.log.length;
        await third.goto(`${fx.origin}/away.html`);
        await third.goBack();
        await third.evaluate("fixture.ready()");
        const shown = await fx.waitFor((e) => e.tab === tab("c") && e.type === "pageshow" && e.seq >= left);
        const after = await check(third);
        if (shown.persisted === true) {
            // Back from the back/forward cache: the page never unloaded, so nothing was restored.
            assert.deepEqual(after.probes, [edited], "the edit is kept in the cached page");
        } else {
            // Unloaded and restored: a write started on pagehide may or may not land (design 5.4), so
            // the restore holds at least the last saved revision, whole.
            assertInvariant(after, fx, [tab("c")], before);
        }
    });

    it("keeps one entry per tab: no entry restored twice, an old tab keeps its own, a duplicate restores a copy", async () => {
        const key = `tabs-${engine}`;
        const tab = (name: string): string => `${key}.${name}`;
        const { context } = await start(engine);
        const a = await openFixture(context, { key, tab: tab("a") });
        await saved(tab("a"), await next(a));
        const b = await openFixture(context, { key, tab: tab("b") });
        await next(a);
        await next(b);
        await next(a);
        await saved(tab("b"), await next(b));
        await saved(tab("a"), 3);
        const entryOf = async (page: Page): Promise<string | null> => (await check(page)).status.entry;
        const [entryA, entryB] = [await entryOf(a), await entryOf(b)];
        assert.notStrictEqual(entryA, entryB, "two tabs write two entries");

        // Reloading together: each tab restores its own entry, none twice.
        await Promise.all([a.reload(), b.reload()]);
        const [ra, rb] = [(await check(a)).restored, (await check(b)).restored];
        assert.strictEqual(ra?.entry, entryA, "tab a restored its own entry");
        assert.strictEqual(rb?.entry, entryB, "tab b restored its own entry");

        // The old tab, brought to the front after the new one wrote, still writes its own entry.
        await saved(tab("b"), await next(b));
        await a.bringToFront();
        await saved(tab("a"), await next(a));
        assert.strictEqual(await entryOf(a), entryA, "the old tab still writes its own entry");
        assert.strictEqual(await entryOf(b), entryB, "the new tab's entry is untouched");

        // A duplicated tab (sessionStorage copied by window.open) restores a copy, never the original.
        const opened = context.waitForEvent("page");
        await a.evaluate(`window.open(${JSON.stringify(fx.url({ key, tab: tab("dup") }))})`);
        const dup = await opened;
        await dup.waitForFunction("window.fixture !== undefined");
        await dup.evaluate("fixture.ready()");
        const dupCheck = await check(dup);
        assert.isNotNull(dupCheck.restored?.copiedFrom ?? null, "the duplicate restored a copy");
        assert.notStrictEqual(dupCheck.restored?.entry, entryA, "the duplicate never shares the original entry");

        // Every entry that has not ended is restored by a tab or listed.
        const listed = new Set(dupCheck.entries.map((entry) => entry.id));
        for (const id of [entryA, entryB, dupCheck.restored?.entry]) {
            assert.isTrue(listed.has(id ?? ""), `entry ${id} is listed`);
        }
    });

    it.each(["early", "late"])(
        "keeps an edit when the page assigns its rows %s against the restore, with no new entry",
        async (rows) => {
            const key = `rows-${rows}-${engine}`;
            const tab = (name: string): string => `${key}.${name}`;
            const { context } = await start(engine);
            const page = await openFixture(context, { key, tab: tab("a"), rows });
            await next(page);
            await saved(tab("a"), await next(page));
            const before = await check(page);
            assert.strictEqual(before.entries.length, 1);
            await page.reload();
            await page.evaluate("fixture.ready()");
            const after = await check(page);
            assertInvariant(
                after,
                fx,
                [tab("a")],
                before.entries.map((entry) => entry.id),
            );
            assert.strictEqual(after.entries.length, 1, "the page's own load made no new entry");
            assert.deepEqual(after.probes, [2], "the edit is kept");
        },
    );
});

describe("WebKit web process killed", () => {
    it.each([1000, ...(FULL ? [50_000, 100_000] : [])])(
        "keeps the work at %i nodes when WebKitWebProcess is killed",
        async (n) => {
            const key = `kill-webprocess-${n}`;
            const tab = (name: string): string => `${key}.${name}`;
            const { context, dir } = await start("webkit");
            const page = await openFixture(context, { key, tab: tab("a"), n });
            const before = await editAndLeaveOnePending(page, tab("a"));
            const victims = pageProcesses("webkit", dir);
            const crashed = page.waitForEvent("crash");
            kill(victims);
            await crashed;

            const reopened = await openFixture(context, { key, tab: tab("a2"), n });
            const fresh = pageProcesses("webkit", dir).filter((proc) => !victims.some((v) => v.pid === proc.pid));
            assert.isNotEmpty(fresh, "the page runs in a new web process");
            const after = await check(reopened);
            assert.strictEqual(after.nodes, n);
            assertInvariant(after, fx, [tab("a")], before);
        },
    );
});

describe("Firefox quota full", () => {
    it("reports E_AUTOSAVE_QUOTA, keeps the last good entry and the guard, and commits once there is room", async () => {
        const key = "quota-firefox";
        const tab = (name: string): string => `${key}.${name}`;
        // A fixed 50 MiB global limit (KiB), so filling it is quick.
        const { context } = await start("firefox", { "dom.quotaManager.temporaryStorage.fixedLimit": 51_200 });
        const page = await openFixture(context, { key, tab: tab("a") });
        await saved(tab("a"), await next(page));
        // Fill the origin, then make an edit that needs more room; the store may still find room the
        // filler could not use, so fill and edit again until a write fails (at most five rounds).
        let outcome: LogEvent | undefined;
        for (let round = 0; round < 5 && outcome?.state !== "failing"; round++) {
            const filled = await page.evaluate<number>("fixture.fill()");
            assert.isAtLeast(filled, round === 0 ? 1 : 0, "the filler wrote until the quota refused it");
            const mark = fx.log.length;
            await page.evaluate("fixture.grow(256)");
            outcome = await fx.waitFor(
                (e) =>
                    e.seq >= mark &&
                    e.tab === tab("a") &&
                    e.type === "status" &&
                    ["saved", "failing"].includes(e.state as string),
            );
        }

        assert.strictEqual(outcome?.state, "failing", "a write failed once the quota was full");
        assert.deepEqual(
            { problem: outcome?.problem, params: outcome?.params },
            { problem: "E_AUTOSAVE_QUOTA", params: outcome?.params },
            `the failure is reported as the quota (${JSON.stringify(outcome?.params)})`,
        );
        const failing = await check(page);
        assert.strictEqual(failing.status.state, "failing");
        assert.isTrue(failing.guard, "the unload guard stays armed");
        assert.strictEqual(failing.entries.length, 1, "the last good entry is kept");
        assert.isAtLeast(failing.entries[0].revision, 1, "the last good entry is kept");

        await page.evaluate("fixture.unfill()");
        await saved(tab("a"), await next(page));
    });
});

describe("GPU context lost", () => {
    it("leaves the data and the entry unchanged, and the next edit commits", async () => {
        const key = "gpu-lost";
        const tab = (name: string): string => `${key}.${name}`;
        const { context } = await start("chromium");
        const page = await openFixture(context, { key, tab: tab("a") });
        await saved(tab("a"), await next(page));
        const before = await check(page);
        assert.isTrue(await page.evaluate("fixture.loseContext()"), "the WebGL context was lost");
        const after = await check(page);
        assert.deepEqual(after.probes, before.probes, "the data is unchanged");
        assert.deepEqual(after.entries, before.entries, "the entry is unchanged");
        await saved(tab("a"), await next(page));
    });
});
