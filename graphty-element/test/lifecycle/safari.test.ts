/**
 * What only real Safari can show (macOS only; the macOS workflow sets GRAPHTY_LIFECYCLE_MACOS=1).
 *
 * Playwright's WebKit is WebKit, not Safari: Safari's own storage policy, its window handling and its
 * IndexedDB process are not in it. Through safaridriver (safaridriver.ts), in one session each:
 *
 * - a probe: does IndexedDB written in one safaridriver session survive into the next? Each session
 *   may start from a fresh profile, which is why the kill and relaunch rows run on Playwright's
 *   WebKit with a persistent profile instead. The answer is recorded, not asserted.
 * - the hide transition: an edit left pending, the window minimized, and a write committed after
 *   `visibilitychange` to hidden.
 * - stall detection: a write held behind another transaction is reported as `E_AUTOSAVE_STALLED`,
 *   and the next change commits once the database is free.
 * - `persist()`: the element's `status.persisted` agrees with `navigator.storage.persisted()`.
 */

import { appendFileSync } from "node:fs";

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { type Fixture, startFixture } from "./fixture";
import { type Safari, type SafariDriver, startSafariDriver } from "./safaridriver";

const MACOS = process.platform === "darwin" && process.env.GRAPHTY_LIFECYCLE_MACOS === "1";

/**
 * Record a finding in the log and the GitHub Actions job summary.
 * @param line - The finding.
 */
function note(line: string): void {
    console.log(`[safari] ${line}`);
    if (process.env.GITHUB_STEP_SUMMARY) {
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- Safari: ${line}\n`);
    }
}

describe.skipIf(!MACOS)("real Safari", () => {
    let fx: Fixture;
    let driver: SafariDriver;

    beforeAll(async () => {
        fx = await startFixture();
        driver = await startSafariDriver();
    });

    afterAll(async () => {
        await driver?.close();
        await fx?.close();
    });

    /**
     * Run a test body in a fresh Safari session.
     * @param body - The body.
     */
    async function inSession(body: (safari: Safari) => Promise<void>): Promise<void> {
        const safari = await driver.session();
        try {
            await body(safari);
        } finally {
            await safari.quit();
        }
    }

    it("probe: whether IndexedDB survives from one safaridriver session to the next (recorded)", async () => {
        const marker = `m${Date.now()}`;
        const store = `
            const open = () => new Promise((res, rej) => { const r = indexedDB.open("probe", 1); r.onupgradeneeded = () => r.result.createObjectStore("p"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });`;
        await inSession(async (safari) => {
            await safari.navigate(`${fx.origin}/away.html`);
            const wrote = await safari.execute<boolean>(
                `${store}
                const db = await open();
                await new Promise((res, rej) => { const t = db.transaction("p", "readwrite"); t.objectStore("p").put(arguments[0], "k"); t.oncomplete = res; t.onerror = rej; });
                db.close();
                return true;`,
                [marker],
            );
            assert.isTrue(wrote, "the first session wrote the marker");
        });
        await inSession(async (safari) => {
            await safari.navigate(`${fx.origin}/away.html`);
            const read = await safari.execute<string | null>(`${store}
                const db = await open();
                const value = await new Promise((res) => { const r = db.transaction("p").objectStore("p").get("k"); r.onsuccess = () => res(r.result ?? null); r.onerror = () => res(null); });
                db.close();
                return value;`);
            note(`IndexedDB persists across safaridriver sessions: ${read === marker ? "yes" : "no"}`);
        });
    });

    it("commits a pending write when the window is hidden", async () => {
        const key = "safari-hide";
        const tab = key;
        await inSession(async (safari) => {
            // Writes held back, so only the hide writes the edit.
            await safari.navigate(fx.url({ key, tab, delay: 600_000 }));
            await safari.execute("return fixture.ready()");
            const edit = await safari.execute<number>("return fixture.next()");
            assert.strictEqual((await safari.execute<{ state: string }>("return fixture.status()")).state, "pending");

            const how = await safari.minimize();
            const hidden = await fx.waitFor((e) => e.tab === tab && e.type === "visibility" && e.state === "hidden");
            const saved = await fx.waitFor(
                (e) => e.tab === tab && e.type === "saved" && (e.revision as number) >= edit,
            );
            assert.isAbove(saved.seq, hidden.seq, "the write committed after visibilitychange to hidden");
            note(`a pending write committed after the window was hidden (minimized through ${how})`);
            await safari.restore();
        });
    });

    it("reports a stalled database as E_AUTOSAVE_STALLED, and commits once it is free", async () => {
        const key = "safari-stall";
        const tab = key;
        await inSession(async (safari) => {
            await safari.navigate(fx.url({ key, tab }));
            await safari.execute("return fixture.ready()");
            const first = await safari.execute<number>("return fixture.next()");
            await fx.waitFor((e) => e.tab === tab && e.type === "saved" && (e.revision as number) >= first);

            await safari.execute("return fixture.hold()");
            await safari.execute("return fixture.next()");
            await fx.waitFor((e) => e.tab === tab && e.type === "status" && e.problem === "E_AUTOSAVE_STALLED");
            await safari.execute("return fixture.release()");
            const after = await safari.execute<number>("return fixture.next()");
            await fx.waitFor((e) => e.tab === tab && e.type === "saved" && (e.revision as number) >= after);
            note("a held write was reported as E_AUTOSAVE_STALLED, and the next change committed");
        });
    });

    it("reports persist() as the browser does", async () => {
        const key = "safari-persist";
        await inSession(async (safari) => {
            await safari.navigate(fx.url({ key, tab: key }));
            await safari.execute("return fixture.ready()");
            const result = await safari.execute<{ granted: boolean; status: boolean | null; browser: boolean }>(`
                const granted = await fixture.el.autosaver.requestPersistence();
                return { granted, status: fixture.status().persisted, browser: await navigator.storage.persisted() };`);
            assert.strictEqual(result.status, result.browser, "status.persisted is what the browser says");
            assert.strictEqual(result.granted, result.browser, "requestPersistence() resolves with it");
            note(`persist() in a Safari tab: ${result.browser ? "granted" : "not granted"}`);
        });
    });
});
