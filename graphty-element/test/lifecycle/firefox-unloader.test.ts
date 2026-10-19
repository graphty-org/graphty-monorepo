/**
 * Firefox's low-memory tab unloader against the autosave unload guard.
 *
 * When the system runs low on memory, Firefox unloads background tabs through
 * `TabUnloader.unloadLeastRecentlyUsedTab()`. Before it unloads one, it asks the page with
 * `permitUnload("dontUnload")`: a `beforeunload` listener that cancels the event keeps the tab, with
 * no prompt. The element arms that listener only while a write is pending or failing
 * (design/work-protection/design.md, section 5.6), so a tab is never unloaded with unwritten work,
 * and once its work is saved the unloader may take it, and the reload restores it.
 *
 * Marionette's chrome context (marionette.ts) calls the unloader itself. A write is held pending by
 * a read-write transaction the page keeps open over the autosave database (fixture `hold()`), as a
 * stuck IndexedDB holds it; without that, the write the element starts when the tab is hidden
 * commits before any unloader runs.
 */

import { rmSync } from "node:fs";

import { afterAll, assert, beforeAll, describe, it, onTestFailed } from "vitest";

import { assertInvariant, profile } from "./engines";
import { type Fixture, type PageCheck, startFixture } from "./fixture";
import { launchMarionette, stockFirefox } from "./marionette";

/** The unloader, from wherever this Firefox keeps it, called with no minimum inactive time. */
const UNLOAD = `
    let module;
    try { module = ChromeUtils.importESModule("moz-src:///browser/components/tabbrowser/TabUnloader.sys.mjs"); }
    catch { module = ChromeUtils.importESModule("resource:///modules/TabUnloader.sys.mjs"); }
    return module.TabUnloader.unloadLeastRecentlyUsedTab(null);`;

/** The tabs of the window: whether each is loaded (a discarded tab has no panel) and selected. */
const TABS = `
    const { gBrowser } = Services.wm.getMostRecentWindow("navigator:browser");
    return gBrowser.tabs.map((tab) => ({ url: tab.linkedBrowser.currentURI?.spec ?? "", loaded: Boolean(tab.linkedPanel), selected: tab.selected }));`;

let fx: Fixture;
let executable: string;

beforeAll(async () => {
    fx = await startFixture();
    executable = await stockFirefox();
});

afterAll(async () => {
    await fx.close();
});

describe("Firefox low-memory tab unloader", () => {
    it("keeps a background tab while a write is pending, unloads it once saved, and restores the work on reselect", async () => {
        const key = "unloader-firefox";
        const tab = key;
        const dir = profile("firefox-unloader");
        const ff = await launchMarionette(dir, executable);
        onTestFailed(() => {
            console.log(`last reports: ${JSON.stringify(fx.log.slice(-25))}`);
        });
        try {
            await ff.send("WebDriver:Navigate", { url: fx.url({ key, tab }) });
            await ff.contentAsync("fixture.ready().then(arguments[0])");
            // Firefox honors a cancelled beforeunload only on a page the reader has interacted with.
            const element = await ff.send<Record<string, string>>("WebDriver:FindElement", {
                using: "css selector",
                value: "graphty-element",
            });
            await ff.send("WebDriver:ElementClick", { id: Object.values(element)[0] });

            const first = await ff.contentAsync<number>("fixture.next().then(arguments[0])");
            await fx.waitFor((e) => e.tab === tab && e.type === "saved" && (e.revision as number) >= first);
            await ff.contentAsync("fixture.hold().then(arguments[0])");
            const second = await ff.contentAsync<number>("fixture.next().then(arguments[0])");

            // A tab in front: the fixture is hidden, and its write on hide waits behind the held transaction.
            await ff.chrome(`
                const { gBrowser } = Services.wm.getMostRecentWindow("navigator:browser");
                gBrowser.selectedTab = gBrowser.addTab("about:blank", { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() });`);
            await fx.waitFor((e) => e.tab === tab && e.type === "visibility" && e.state === "hidden");
            const pending = await ff.content<{ state: string; guard: number; held: string | null }>(
                "return { state: fixture.status().state, guard: window.__unloadListeners.size, held: window.__held.ended }",
            );
            assert.isNull(pending.held, "the held transaction is still open");
            assert.include(["pending", "failing"], pending.state, "the write is still outstanding");
            assert.isAbove(pending.guard, 0, "the unload guard is armed");

            assert.isFalse(await ff.chrome<boolean>(UNLOAD), "the unloader unloaded nothing");
            const kept = await ff.chrome<{ url: string; loaded: boolean }[]>(TABS);
            assert.isTrue(kept.find((t) => t.url.includes(key))?.loaded, "the tab with a pending write stayed loaded");
            assert.isEmpty(fx.events(tab, "pagehide"), "the page was never hidden for an unload");

            // Let the write finish: once saved, the guard is off and the unloader may take the tab.
            await ff.content("return fixture.release()");
            const before = await ff.contentAsync<PageCheck>("fixture.check().then(arguments[0])");
            await fx.waitFor(
                (e) => e.tab === tab && e.type === "status" && e.state === "saved" && e.revision === second,
            );
            assert.strictEqual(await ff.content<number>("return window.__unloadListeners.size"), 0, "the guard is off");

            assert.isTrue(await ff.chrome<boolean>(UNLOAD), "the unloader unloaded a tab");
            const after = await ff.chrome<{ url: string; loaded: boolean }[]>(TABS);
            assert.isFalse(after.find((t) => t.url.includes(key))?.loaded, "the saved tab was unloaded");
            // The page's own pagehide report may be cut off by the unload, so the reload is found by order.
            const mark = fx.log.length;

            // Selecting the tab loads the page again, and it restores the saved work.
            await ff.chrome(`
                const { gBrowser } = Services.wm.getMostRecentWindow("navigator:browser");
                gBrowser.selectedTab = gBrowser.tabs.find((t) => t.linkedBrowser.currentURI.spec.includes(${JSON.stringify(key)}));`);
            const boot = await fx.waitFor((e) => e.tab === tab && e.type === "boot" && e.seq >= mark);
            await fx.waitFor((e) => e.tab === tab && e.type === "ready" && e.seq > boot.seq);
            const restored = await ff.contentAsync<PageCheck>("fixture.check().then(arguments[0])");
            assertInvariant(
                restored,
                fx,
                [tab],
                before.entries.map((entry) => entry.id),
            );
            assert.strictEqual(restored.restored?.revision, second, "both edits came back");
        } finally {
            await ff.close();
            rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
        }
    });
});
