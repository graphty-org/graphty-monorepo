/**
 * Autosave through Chrome's own page lifecycle: tab discarding (an extension, and the urgent discard
 * Chrome makes under memory pressure), freezing, renderer crashes and kills, a killed browser with
 * and without session restore, the back/forward cache, a full quota, cleared site data, a private
 * window, a change made while hidden and a memory purge.
 *
 * Chrome for Testing runs without Playwright's flags that switch these mechanisms off, driven over
 * the raw DevTools protocol (cdp-harness.ts). Every test first proves its trigger happened (the tab
 * was discarded, the renderer crashed, the page logged `freeze` or `hidden`), then asserts the
 * invariant of design/work-protection/design.md section 8.
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, watch, writeFileSync } from "node:fs";
import path from "node:path";

import { afterAll, afterEach, assert, beforeAll, describe, it, onTestFailed } from "vitest";

import { type Chrome, launchChrome, type Tab } from "./cdp-harness";
import { assertInvariant, kill, profile } from "./engines";
import { type Fixture, type LogEvent, type PageCheck, startFixture } from "./fixture";

/** 50,000 and 100,000 nodes run only on the release train. */
const FULL = process.env.GRAPHTY_LIFECYCLE_FULL === "1";

let fx: Fixture;
const running: { chrome: Chrome; dir: string }[] = [];

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

    for (const { chrome, dir } of running.splice(0)) {
        await chrome.close().catch(() => undefined);
        // Chrome's helpers may still be writing as the browser exits.
        rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
    }
});

/**
 * Launch Chrome for Testing on a profile, closed after the test.
 * @param dir - The profile; a new one when omitted.
 * @param args - More switches.
 * @returns The browser.
 */
async function start(dir = profile("chrome"), args: string[] = []): Promise<Chrome> {
    const chrome = await launchChrome(dir, args);
    running.push({ chrome, dir });
    onTestFailed(() => {
        console.log(`chrome ${chrome.mode}; last reports: ${JSON.stringify(fx.log.slice(-25))}`);
    });
    return chrome;
}

/**
 * Tab labels scoped to one test, so no test reads another's reports.
 * @param key - The test's autosave key.
 * @returns The labeller.
 */
function labels(key: string): (name: string) => string {
    return (name) => `${key}.${name}`;
}

/**
 * Wait for a report of a tab that arrived after `mark`.
 * @param tab - The tab label.
 * @param type - The report type.
 * @param mark - The log length to look after.
 * @param predicate - More conditions.
 * @returns The report.
 */
function report(
    tab: string,
    type: string,
    mark = 0,
    predicate: (e: LogEvent) => boolean = () => true,
): Promise<LogEvent> {
    return fx.waitFor((e) => e.seq >= mark && e.tab === tab && e.type === type && predicate(e));
}

/**
 * Open the fixture in a new tab and wait until its restore is decided.
 * @param chrome - The browser.
 * @param params - The fixture's parameters; `tab` is required.
 * @param options - Where to open it.
 * @returns The tab.
 */
async function openFixture(
    chrome: Chrome,
    params: Record<string, string | number> & { tab: string },
    options?: { background?: boolean; browserContextId?: string },
): Promise<Tab> {
    const mark = fx.log.length;
    const tab = await chrome.open(fx.url(params), options);
    await report(params.tab, "ready", mark);
    return tab;
}

/**
 * Attach again to the page of a tab label once it reported `ready` after `mark`.
 * @param chrome - The browser.
 * @param label - The tab label.
 * @param mark - The log length before the reload.
 * @returns The tab.
 */
async function reattach(chrome: Chrome, label: string, mark: number): Promise<Tab> {
    await report(label, "ready", mark);
    return chrome.waitPage(`tab=${encodeURIComponent(label)}`);
}

const next = (tab: Tab): Promise<number> => tab.evaluate<number>("fixture.next()");
const check = (tab: Tab): Promise<PageCheck> => tab.evaluate<PageCheck>("fixture.check()");
const saved = (label: string, revision: number, mark = 0): Promise<LogEvent> =>
    report(label, "saved", mark, (e) => (e.revision as number) >= revision);

/**
 * Edit with every write held back, then hide the tab by opening another in front of it, and prove
 * the edit was written because the page was hidden: its `saved` report comes after its `hidden`.
 * @param chrome - The browser.
 * @param key - The autosave key.
 * @param tab - The labeller.
 * @returns The hidden tab, the tab in front, and the hidden tab's entry.
 */
async function editThenHide(
    chrome: Chrome,
    key: string,
    tab: (name: string) => string,
): Promise<{ a: Tab; b: Tab; entryA: string }> {
    const a = await openFixture(chrome, { key, tab: tab("a"), delay: 600_000 });
    const edited = await next(a);
    assert.strictEqual((await check(a)).status.state, "pending", "the edit is not written while visible");
    const mark = fx.log.length;
    const b = await openFixture(chrome, { key, tab: tab("b") });
    const hidden = await report(tab("a"), "visibility", mark, (e) => e.state === "hidden");
    const written = await saved(tab("a"), edited, mark);
    assert.isAbove(written.seq, hidden.seq, "the write committed after the page was hidden");
    return { a, b, entryA: written.entry as string };
}

/**
 * The id the discard extension knows a tab by.
 * @param chrome - The browser.
 * @param label - The tab label.
 * @returns The tab id.
 */
async function tabId(chrome: Chrome, label: string): Promise<number> {
    const tabs = await chrome.extension<{ id: number; url: string }[]>(
        "chrome.tabs.query({}).then((ts) => ts.map((t) => ({ id: t.id, url: t.url ?? '' })))",
    );
    const found = tabs.find((t) => t.url.includes(`tab=${encodeURIComponent(label)}`));
    assert.isDefined(found, `the extension sees tab ${label}`);
    return found?.id ?? -1;
}

/**
 * After a discard: prove it happened, bring the tab back, and check what it restored.
 * @param chrome - The browser.
 * @param tab - The labeller.
 * @param entryA - The discarded tab's entry.
 */
async function reactivateDiscarded(chrome: Chrome, tab: (name: string) => string, entryA: string): Promise<void> {
    const id = await tabId(chrome, tab("a"));
    const discarded = await chrome.extension<boolean>(`chrome.tabs.get(${id}).then((t) => t.discarded)`);
    assert.isTrue(discarded, "Chrome reports the tab discarded");

    // Another tab writes a newer entry of the same key while this one is gone.
    const b = await chrome.waitPage(`tab=${encodeURIComponent(tab("b"))}`);
    const newer = await saved(tab("b"), await next(b));

    const mark = fx.log.length;
    await chrome.extension(`chrome.tabs.update(${id}, { active: true }).then(() => true)`);
    const boot = await report(tab("a"), "boot", mark);
    assert.isTrue(boot.wasDiscarded, "the page reports document.wasDiscarded");
    const a = await reattach(chrome, tab("a"), mark);
    const after = await check(a);
    assert.isTrue(after.restored?.wasDiscarded ?? false, "the restore says the tab was discarded");
    assert.strictEqual(after.restored?.entry, entryA, "the tab restored its own entry");
    assert.notStrictEqual(newer.entry, entryA, "although another tab wrote a newer entry");
    assertInvariant(after, fx, [tab("a")], [entryA]);
}

/**
 * Wait until some file under a directory contains a string: Chrome writes session state lazily.
 * @param dir - The directory.
 * @param needle - The text, looked for as Latin-1 and as UTF-16.
 */
async function untilWritten(dir: string, needle: string): Promise<void> {
    const forms = [Buffer.from(needle, "latin1"), Buffer.from(needle, "utf16le")];
    const found = (): boolean => {
        const walk = (d: string): boolean =>
            readdirSync(d).some((name) => {
                const file = path.join(d, name);
                try {
                    return statSync(file).isDirectory()
                        ? walk(file)
                        : forms.some((form) => readFileSync(file).includes(form));
                } catch {
                    return false;
                }
            });
        return walk(dir);
    };
    await new Promise<void>((resolve) => {
        const watcher = watch(dir, { recursive: true }, () => {
            if (found()) {
                watcher.close();
                resolve();
            }
        });
        if (found()) {
            watcher.close();
            resolve();
        }
    });
}

describe("Chrome for Testing, without Playwright's lifecycle flags", () => {
    it("restores a tab discarded through chrome.tabs.discard, from its own entry", async () => {
        const key = "discard-extension";
        const tab = labels(key);
        const chrome = await start();
        const { entryA } = await editThenHide(chrome, key, tab);
        const id = await tabId(chrome, tab("a"));
        const result = await chrome.extension<{ discarded: boolean } | null>(
            `chrome.tabs.discard(${id}).then((t) => t && { discarded: t.discarded })`,
        );
        assert.isTrue(result?.discarded ?? false, "chrome.tabs.discard discarded the tab");
        await reactivateDiscarded(chrome, tab, entryA);
    });

    it("restores a tab Chrome discarded urgently, as under memory pressure (chrome://discards)", async () => {
        const key = "discard-urgent";
        const tab = labels(key);
        const chrome = await start();
        const { a, entryA } = await editThenHide(chrome, key, tab);
        // Chrome refuses to discard a tab DevTools is attached to.
        await chrome.send("Target.detachFromTarget", { sessionId: a.sessionId });
        const discards = await chrome.open("chrome://discards", { background: true });
        const label = tab("a");
        const done = await discards.evaluate<boolean>(`(async () => {
            const { getOrCreateDetailsProvider } = await import("chrome://discards/discards.js");
            const { LifecycleUnitDiscardReason } = await import("chrome://discards/lifecycle_unit_state.mojom-webui.js");
            const provider = getOrCreateDetailsProvider();
            const { infos } = await provider.getTabDiscardsInfo();
            const info = infos.find((i) => i.tabUrl.includes(${JSON.stringify(`tab=${encodeURIComponent(label)}`)}));
            if (!info) return false;
            await provider.discardById(info.id, LifecycleUnitDiscardReason.URGENT);
            return true;
        })()`);
        assert.isTrue(done, "chrome://discards found the tab and discarded it");
        await reactivateDiscarded(chrome, tab, entryA);
    });

    it("keeps the work of a frozen tab whose renderer is then killed", async () => {
        const key = "freeze-kill";
        const tab = labels(key);
        const chrome = await start();
        const { a, entryA } = await editThenHide(chrome, key, tab);
        const mark = fx.log.length;
        await a.send("Page.setWebLifecycleState", { state: "frozen" });
        await report(tab("a"), "freeze", mark);

        const victims = chrome.renderers();
        kill(victims);
        await a.waitEvent("Inspector.targetCrashed");
        const reload = fx.log.length;
        await a.send("Page.navigate", { url: fx.url({ key, tab: tab("a") }) });
        const back = await reattach(chrome, tab("a"), reload);
        assert.isTrue(
            chrome.renderers().some((proc) => !victims.some((v) => v.pid === proc.pid)),
            "the page runs in a new renderer",
        );
        assertInvariant(await check(back), fx, [tab("a")], [entryA]);
    });

    it.each([1000, ...(FULL ? [50_000, 100_000] : [])])(
        "keeps the work at %i nodes when the renderer is killed with SIGKILL",
        async (n) => {
            const key = `kill-renderer-${n}`;
            const tab = labels(key);
            const chrome = await start();
            const a = await openFixture(chrome, { key, tab: tab("a"), n });
            await next(a);
            await saved(tab("a"), await next(a));
            const before = (await check(a)).entries.map((entry) => entry.id);
            await next(a);

            const victims = chrome.renderers();
            kill(victims);
            await a.waitEvent("Inspector.targetCrashed");
            const reload = fx.log.length;
            await a.send("Page.navigate", { url: fx.url({ key, tab: tab("a"), n }) });
            const back = await reattach(chrome, tab("a"), reload);
            assert.isTrue(
                chrome.renderers().some((proc) => !victims.some((v) => v.pid === proc.pid)),
                "the page runs in a new renderer",
            );
            const after = await check(back);
            assert.strictEqual(after.nodes, n);
            assertInvariant(after, fx, [tab("a")], before);
        },
    );

    it("keeps the work when the renderer crashes (Page.crash)", async () => {
        const key = "page-crash";
        const tab = labels(key);
        const chrome = await start();
        const a = await openFixture(chrome, { key, tab: tab("a") });
        await saved(tab("a"), await next(a));
        const before = (await check(a)).entries.map((entry) => entry.id);
        await next(a);
        // Page.crash never answers: the renderer is gone before it can.
        void a.send("Page.crash").catch(() => undefined);
        await a.waitEvent("Inspector.targetCrashed");
        const reload = fx.log.length;
        await a.send("Page.navigate", { url: fx.url({ key, tab: tab("a") }) });
        const back = await reattach(chrome, tab("a"), reload);
        assertInvariant(await check(back), fx, [tab("a")], before);
    });

    it("keeps the work when the browser is killed, restoring the newest entry on a plain relaunch", async () => {
        const key = "kill-browser";
        const tab = labels(key);
        const dir = profile("chrome");
        const chrome = await start(dir);
        const a = await openFixture(chrome, { key, tab: tab("a") });
        await saved(tab("a"), await next(a));
        const before = (await check(a)).entries.map((entry) => entry.id);
        await next(a);
        kill([{ pid: chrome.pid, ppid: 0, cmdline: "" }]);
        await chrome.exited;

        const again = await start(dir);
        const back = await openFixture(again, { key, tab: tab("a2") });
        assertInvariant(await check(back), fx, [tab("a")], before);
    });

    it("gives each tab its own entry back when a killed browser restores its last session", async () => {
        const key = "kill-browser-restore";
        const tab = labels(key);
        const dir = profile("chrome");
        // "Continue where you left off": the setting under which Chrome restores the tabs, and their
        // sessionStorage, after a crash instead of offering to.
        mkdirSync(path.join(dir, "Default"), { recursive: true });
        writeFileSync(path.join(dir, "Default", "Preferences"), '{ "session": { "restore_on_startup": 1 } }');
        const chrome = await start(dir);
        const a = await openFixture(chrome, { key, tab: tab("a") });
        await saved(tab("a"), await next(a));
        const b = await openFixture(chrome, { key, tab: tab("b") });
        const fromB = await saved(tab("b"), await next(b));
        const fromA = await saved(tab("a"), await next(a), fromB.seq);
        assert.notStrictEqual(fromA.entry, fromB.entry, "two tabs, two entries");
        // Chrome writes its session and each tab's sessionStorage lazily: wait until both are on disk.
        await untilWritten(path.join(dir, "Default", "Session Storage"), fromA.entry as string);
        await untilWritten(path.join(dir, "Default", "Session Storage"), fromB.entry as string);
        await untilWritten(path.join(dir, "Default", "Sessions"), encodeURIComponent(tab("b")));

        const mark = fx.log.length;
        kill([{ pid: chrome.pid, ppid: 0, cmdline: "" }]);
        await chrome.exited;
        const again = await start(dir, ["--restore-last-session"]);
        const ra = await reattach(again, tab("a"), mark);
        const rb = await reattach(again, tab("b"), mark);
        const [ca, cb] = [await check(ra), await check(rb)];
        assert.strictEqual(ca.restored?.entry, fromA.entry, "the restored tab a chose its own entry");
        assert.strictEqual(cb.restored?.entry, fromB.entry, "the restored tab b chose its own entry");
        assertInvariant(ca, fx, [tab("a")], []);
        assertInvariant(cb, fx, [tab("b")], []);
    });

    it.each(["saved", "pending"])("enters the back/forward cache and keeps the edit, %s", async (state) => {
        const key = `bfcache-${state}`;
        const tab = labels(key);
        const chrome = await start();
        const a = await openFixture(chrome, { key, tab: tab("a") });
        let edited = await next(a);
        const { entry } = await saved(tab("a"), edited);
        if (state === "pending") {
            edited = await next(a);
        }

        const mark = fx.log.length;
        const away = a.events.length;
        await a.send("Page.navigate", { url: `${fx.origin}/away.html` });
        await report(tab("a"), "pagehide", mark);
        await a.waitEvent("Page.loadEventFired", undefined, away);
        await a.evaluate("history.back()");
        const shown = await report(tab("a"), "pageshow", mark);
        const notUsed = a.events.filter((e, i) => i >= away && e.method === "Page.backForwardCacheNotUsed");
        assert.deepEqual(
            notUsed.map((e) => e.params),
            [],
            "nothing kept the page out of the back/forward cache",
        );
        assert.isTrue(shown.persisted, "pageshow.persisted: the page came back from the cache");
        const after = await check(a);
        assert.deepEqual(after.probes, [edited], "the edit is kept");
        await report(tab("a"), "status", shown.seq, (e) => e.state === "saved" && (e.revision as number) >= edited);
        assert.strictEqual((await check(a)).status.entry, entry, "the page kept its own entry");
    });

    it("reports E_AUTOSAVE_QUOTA when the quota is full, keeps the last good entry, and commits once there is room", async () => {
        const key = "quota-chrome";
        const tab = labels(key);
        const chrome = await start();
        const a = await openFixture(chrome, { key, tab: tab("a") });
        await a.send("Storage.overrideQuotaForOrigin", { origin: fx.origin, quotaSize: 30 * 1024 * 1024 });
        await saved(tab("a"), await next(a));
        let outcome: LogEvent | undefined;
        for (let round = 0; round < 5 && outcome?.state !== "failing"; round++) {
            await a.evaluate("fixture.fill()");
            const mark = fx.log.length;
            await a.evaluate("fixture.grow(256)");
            outcome = await report(tab("a"), "status", mark, (e) => ["saved", "failing"].includes(e.state as string));
        }

        assert.strictEqual(outcome?.state, "failing", "a write failed once the quota was full");
        assert.strictEqual(outcome?.problem, "E_AUTOSAVE_QUOTA", JSON.stringify(outcome?.params));
        const failing = await check(a);
        assert.isTrue(failing.guard, "the unload guard stays armed");
        assert.strictEqual(failing.entries.length, 1, "the last good entry is kept");
        await a.evaluate("fixture.unfill()");
        await saved(tab("a"), await next(a));
    });

    it("starts fresh without an error after the site's data is cleared, having warned first", async () => {
        const key = "cleared";
        const tab = labels(key);
        const chrome = await start();
        const a = await openFixture(chrome, { key, tab: tab("a") });
        await saved(tab("a"), await next(a));
        const risk = await report(tab("a"), "at-risk");
        assert.deepEqual(risk.params, { persisted: false, ephemeral: "unknown", unexported: true });
        await a.send("Storage.clearDataForOrigin", {
            origin: fx.origin,
            storageTypes: "indexeddb,local_storage,cache_storage,service_workers,file_systems",
        });
        const mark = fx.log.length;
        await a.send("Page.reload");
        const back = await reattach(chrome, tab("a"), mark);
        const after = await check(back);
        assert.isNull(after.restored, "nothing to restore");
        assert.isNull(after.status.problem, "no error");
        assert.deepEqual(after.entries, []);
        await saved(tab("a"), await next(back), mark);
    });

    it("reports a private window as ephemeral and warns once", async () => {
        const key = "private";
        const tab = labels(key);
        const chrome = await start();
        const { browserContextId } = (await chrome.send("Target.createBrowserContext")) as { browserContextId: string };
        const a = await openFixture(chrome, { key, tab: tab("a") }, { browserContextId });
        assert.strictEqual(fx.events(tab("a"), "ready")[0]?.ephemeral, "likely", "ephemeral is likely");
        await saved(tab("a"), await next(a));
        await saved(tab("a"), await next(a));
        assert.strictEqual(fx.events(tab("a"), "at-risk").length, 1, "the at-risk fact fired once");
    });

    it("writes a run that finishes while the page is hidden, with no debounce timer firing", async () => {
        const key = "hidden-run";
        const tab = labels(key);
        const chrome = await start();
        const a = await openFixture(chrome, { key, tab: tab("a") });
        const revision = await next(a);
        await saved(tab("a"), revision);
        const mark = fx.log.length;
        await openFixture(chrome, { key: `${key}-other`, tab: tab("b") });
        await report(tab("a"), "visibility", mark, (e) => e.state === "hidden");
        assert.strictEqual(await a.evaluate<string>("document.visibilityState"), "hidden");
        const before = await a.evaluate<number>("__timers.firedHidden");
        await a.evaluate("fixture.run()");
        await saved(tab("a"), revision + 1, mark);
        assert.strictEqual(
            await a.evaluate<number>("__timers.firedHidden"),
            before,
            "no debounce or maximum-wait timer fired while hidden",
        );
    });

    it.each([1000, ...(FULL ? [100_000] : [])])(
        "keeps the work when V8 memory is purged as by Chrome's out-of-memory intervention, at %i nodes",
        async (n) => {
            const key = `purge-${n}`;
            const tab = labels(key);
            const chrome = await start();
            const a = await openFixture(chrome, { key, tab: tab("a"), n });
            await saved(tab("a"), await next(a));
            const before = (await check(a)).entries.map((entry) => entry.id);
            await next(a);
            await a.send("Memory.forciblyPurgeJavaScriptMemory");
            // The trigger: the purge tears down the page's JavaScript, as the intervention does.
            const dead = await a.evaluate("1").then(
                () => null,
                (error: unknown) => String(error),
            );
            assert.match(dead ?? "", /execution context/, "the page's JavaScript is gone");
            const mark = fx.log.length;
            await a.send("Page.reload");
            const back = await reattach(chrome, tab("a"), mark);
            const after = await check(back);
            assert.strictEqual(after.nodes, n);
            assertInvariant(after, fx, [tab("a")], before);
        },
    );
});
