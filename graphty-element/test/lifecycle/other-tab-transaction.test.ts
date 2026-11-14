/**
 * A tab that holds a read-write transaction on the autosave database and never finishes it -- a tab
 * the browser suspended in the middle of a write, as Safari does to a tab in the background -- does
 * not stop another tab from starting: `listAutosaves`, which a start screen awaits before it shows
 * anything, still answers, with nothing to offer, instead of waiting behind that transaction forever.
 * A live tab's own write watchdog ends a stalled write; a suspended tab's cannot run.
 */

import { rmSync } from "node:fs";

import type { BrowserContext } from "playwright";
import { afterAll, afterEach, assert, beforeAll, describe, it, onTestFailed } from "vitest";

import { ENGINES, launch, profile } from "./engines";
import { type Fixture, type LogEvent, startFixture } from "./fixture";

/** Opens the autosave database and keeps a read-write transaction on every store busy forever. */
const HOLD_DATABASE = `new Promise((resolve, reject) => {
    const req = indexedDB.open("graphty-autosave");
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction([...db.objectStoreNames], "readwrite");
        const store = tx.objectStore(db.objectStoreNames[0]);
        const spin = () => { store.count().onsuccess = spin; };
        spin();
        resolve();
    };
})`;

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

describe.each(ENGINES)("%s", (engine) => {
    it("lists the kept work while another tab holds the database in an unfinished write", async () => {
        const key = `other-tab-${engine}`;
        const dir = profile(engine);
        const context = await launch(engine, dir);
        open.push({ context, dir });
        onTestFailed(() => {
            console.log(`last reports: ${JSON.stringify(fx.log.filter((e) => e.tab.startsWith(key)).slice(-25))}`);
        });
        const report = (tab: string, type: string, mark: number): Promise<LogEvent> =>
            fx.waitFor((e) => e.seq >= mark && e.tab === tab && e.type === type);

        // Tab A writes once, then holds a read-write transaction on the database that it never
        // finishes, as a tab suspended mid-write does (its own write watchdog cannot run either).
        const a = await context.newPage();
        await a.goto(fx.url({ key, tab: `${key}.a` }));
        await a.evaluate("fixture.ready()");
        const first = await a.evaluate<number>("fixture.next()");
        await fx.waitFor((e) => e.tab === `${key}.a` && e.type === "saved" && (e.revision as number) >= first);
        await a.evaluate(HOLD_DATABASE);

        // Tab B lists the key's work before its element mounts, as a start screen does.
        const mark = fx.log.length;
        const b = await context.newPage();
        await b.goto(fx.url({ key, tab: `${key}.b`, list: 1 }), { waitUntil: "commit" });
        const listed = (await report(`${key}.b`, "listed", mark)) as LogEvent & { entries: unknown[] };
        assert.deepEqual(listed.entries, [], "nothing is offered while the database is held");
    });
});
