/**
 * The lifecycle tests' page and its server.
 *
 * The page loads graphty-element from the built `./bundle` (dist/graphty.bundle.js) the way a page
 * with a `<script>` tag does, turns autosave on, and reports everything that matters to a kill test
 * to this server as it happens: every lifecycle event, every `saved` revision, the restore. A report
 * posted before the page was killed survives the kill, which a log kept in the page would not.
 *
 * Edit number i sets the node attribute `probe` to i on every node, so after a restore every node's
 * `probe` must equal the restored revision (design/work-protection/design.md, section 8).
 */

import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE = path.resolve(here, "../../dist/graphty.bundle.js");

/** One report from a page. */
export interface LogEvent {
    /** The tab label the page was opened with. */
    readonly tab: string;
    /** What happened. */
    readonly type: string;
    /** The order the server received it in. */
    readonly seq: number;
    /** Anything else the page sent. */
    readonly [field: string]: unknown;
}

/** What `fixture.check()` returns from a page. */
export interface PageCheck {
    readonly status: { state: string; revision: number; entry: string | null; problem: { code: string } | null };
    readonly restored: {
        revision: number;
        entry: string;
        wasDiscarded: boolean | null;
        copiedFrom: string | null;
    } | null;
    readonly nodes: number;
    /** Every distinct `probe` value, with null for a node that has none. */
    readonly probes: readonly (number | null)[];
    readonly entries: readonly { id: string; revision: number; live: boolean; ended?: string; dirty: boolean }[];
    readonly guard: boolean;
}

/** The running fixture server. */
export interface Fixture {
    /** The origin, `http://127.0.0.1:<port>`. */
    readonly origin: string;
    /** Every report received so far, in arrival order. */
    readonly log: LogEvent[];
    /**
     * The fixture page's URL.
     * @param params - `key`, `tab`, `n` (nodes, 30 by default), `rows` (`early`, the default, or `late`),
     *   `delay` (the debounce in ms; a large one leaves a write to the lifecycle events), and for a page
     *   that drives itself, `auto` (edits to make and save) and `tail` (`1`: one more edit, left pending);
     *   `build` loads one of the `bundles` given to `startFixture` instead of the built ./bundle.
     */
    url(params: Record<string, string | number>): string;
    /** The reports of one tab. */
    events(tab: string, type?: string): LogEvent[];
    /** The highest revision a tab logged as `saved`, or 0. */
    lastSaved(tab: string): number;
    /** Wait until a report matching `predicate` has arrived. */
    waitFor(predicate: (event: LogEvent) => boolean): Promise<LogEvent>;
    close(): Promise<void>;
}

/**
 * The page. It reads its settings from the query string and exposes `window.fixture` for the test.
 */
const PAGE = String.raw`<!doctype html>
<html><head><meta charset="utf-8"><title>autosave lifecycle fixture</title>
<style>html,body{margin:0;height:100%} graphty-element{display:block;width:100%;height:100%}</style>
</head><body>
<script>
// An error before or while the module below runs (the bundle failing to load or to evaluate) leaves no
// window.fixture: report it, and keep the first one in window.__pageError for a test that waits.
window.__pageError = null;
const pageError = (message) => {
    window.__pageError ??= message;
    const tab = new URLSearchParams(location.search).get("tab") ?? "t";
    try { fetch("/log", { method: "POST", body: JSON.stringify({ tab, type: "page-error", message }), keepalive: true }); } catch {}
};
window.addEventListener("error", (e) => pageError(String(e.error ?? e.message)));
window.addEventListener("unhandledrejection", (e) => pageError("unhandled rejection: " + String(e.reason)));
document.addEventListener("error", (e) => { if (e.target instanceof HTMLScriptElement) pageError("script failed to load: " + (e.target.src || "inline module")); }, true);
// webgl=off: a browser that gives the page no WebGL context (a GPU process that crashed too often,
// a blocklisted driver): every WebGL getContext returns null, as the browser's would.
if (new URLSearchParams(location.search).get("webgl") === "off") {
    const nativeGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        return /webgl/i.test(type) ? null : nativeGetContext.call(this, type, ...rest);
    };
}
// Before the bundle: count the timers that fire while the page is hidden, for the hidden-run test.
window.__timers = { firedHidden: 0 };
const nativeSetTimeout = window.setTimeout.bind(window);
window.setTimeout = (fn, ms, ...rest) => nativeSetTimeout((...a) => {
    if (document.visibilityState === "hidden" && (ms === 500 || ms === 2000)) window.__timers.firedHidden++;
    return typeof fn === "function" ? fn(...a) : undefined;
}, ms, ...rest);
// With delay=<ms>, a page that never goes idle (a graph drawn without pause, or Safari, which has no
// idle callback): writes that carry the data wait for their maximum wait like every other write.
if (new URLSearchParams(location.search).has("delay")) {
    window.requestIdleCallback = (fn, options) => nativeSetTimeout(() => fn({ didTimeout: true, timeRemaining: () => 0 }), options?.timeout ?? 2 ** 31 - 1);
    window.cancelIdleCallback = (handle) => clearTimeout(handle);
}
// Track the page's beforeunload listeners, so a test reads whether the unload guard is armed
// without firing it (firing it starts a write).
window.__unloadListeners = new Set();
const nativeAdd = window.addEventListener.bind(window), nativeRemove = window.removeEventListener.bind(window);
window.addEventListener = (type, fn, ...rest) => { if (type === "beforeunload") window.__unloadListeners.add(fn); return nativeAdd(type, fn, ...rest); };
window.removeEventListener = (type, fn, ...rest) => { if (type === "beforeunload") window.__unloadListeners.delete(fn); return nativeRemove(type, fn, ...rest); };
// The autosave database's read-write transactions. window.__nextTx arms the next one: "tear" aborts
// it after its first write has been applied, as a crash between two writes of one transaction would
// leave it; "hold" keeps it open after its first write (so it never commits) and reports "tx-held",
// so a kill test lands while a write is in flight.
window.__nextTx = null;
window.__torn = 0;
const nativeTransaction = IDBDatabase.prototype.transaction;
IDBDatabase.prototype.transaction = function (stores, mode, ...rest) {
    const tx = nativeTransaction.call(this, stores, mode, ...rest);
    const how = window.__nextTx;
    if (this.name !== "graphty-autosave" || mode !== "readwrite" || how === null) return tx;
    window.__nextTx = null;
    const nativePut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
        const req = nativePut.apply(this, args);
        if (this.transaction !== tx) return req;
        IDBObjectStore.prototype.put = nativePut;
        req.addEventListener("success", () => {
            if (how === "tear") { window.__torn++; tx.abort(); return; }
            const store = tx.objectStore(tx.objectStoreNames[0]);
            const spin = () => { store.count().onsuccess = spin; };
            spin();
            const tab = new URLSearchParams(location.search).get("tab") ?? "t";
            try { fetch("/log", { method: "POST", body: JSON.stringify({ tab, type: "tx-held" }), keepalive: true }); } catch {}
        });
        return req;
    };
    return tx;
};
</script>
<script type="module">
import "/bundle.js";
const params = new URLSearchParams(location.search);
const tab = params.get("tab") ?? "t";
const n = Number(params.get("n") ?? 30);
const LIFECYCLE = new Set(["visibility", "pagehide", "freeze", "resume"]);
const report = (type, fields = {}) => {
    const body = JSON.stringify({ tab, type, ...fields });
    try { fetch("/log", { method: "POST", body, keepalive: body.length < 60000 }); } catch {}
    // A lifecycle report also goes as a beacon, which the browser delivers even when it suspends the
    // page right after the event (Safari on iOS on an app switch); "via" says which one arrived.
    if (LIFECYCLE.has(type)) try { navigator.sendBeacon?.("/log", JSON.stringify({ tab, type, via: "beacon", ...fields })); } catch {}
};
const nav = performance.getEntriesByType("navigation")[0];
report("boot", { navigationType: nav?.type ?? null, wasDiscarded: document.wasDiscarded ?? null, visibility: document.visibilityState });
document.addEventListener("visibilitychange", () => report("visibility", { state: document.visibilityState }));
document.addEventListener("freeze", () => report("freeze"));
document.addEventListener("resume", () => report("resume"));
window.addEventListener("pagehide", (e) => report("pagehide", { persisted: e.persisted }));
window.addEventListener("pageshow", (e) => report("pageshow", { persisted: e.persisted }));

const ids = Array.from({ length: n }, (_, i) => "n" + i);
// On a grid, as a laid-out graph is: with no position every node sits at the origin, and the camera
// fitted to that one point fills the canvas with n spheres stacked on each other, which a software
// GPU shades n times over (seconds a frame at 1,000 nodes, half a minute at 5,000). The page's
// main thread waits for each frame, and every step of a write waits for the main thread.
const side = Math.ceil(Math.sqrt(n));
const nodes = ids.map((id, i) => ({ id, position: { x: (i % side) * 3, y: Math.floor(i / side) * 3, z: 0 } }));
const edges = ids.map((id, i) => ({ source: id, target: ids[(i + 1) % n] }));
const el = document.createElement("graphty-element");
el.setAttribute("autosave", params.get("key"));
el.layout = "fixed";
// A page that renders without pause rarely goes idle, so a write that carries the data waits for
// dataMaxWaitMs (10 s by default); 1 s keeps a test short without changing what is written.
// delay=<ms> holds every write back, so only a lifecycle event writes an edit.
const delay = params.has("delay") ? Number(params.get("delay")) : undefined;
el.autosaveOptions = delay === undefined ? { dataMaxWaitMs: 1000 } : { delayMs: delay, maxWaitMs: delay, dataMaxWaitMs: delay };
let lastSaved = 0;
el.addEventListener("graphty-autosave-status", (e) => {
    const s = e.detail;
    report("status", { state: s.state, revision: s.revision, entry: s.entry, problem: s.problem?.code ?? null, params: s.problem?.params ?? null });
    if (s.state === "saved" && s.revision > lastSaved) {
        lastSaved = s.revision;
        report("saved", { revision: s.revision, entry: s.entry });
    }
});
el.addEventListener("graphty-autosave-at-risk", (e) => report("at-risk", { params: e.detail.params }));
// Every entry not restored, and why: the ready report carries them, so a test reads the page's
// whole decision from one report whatever order the reports arrive in.
const available = [];
el.addEventListener("graphty-autosave-available", (e) => {
    available.push({ reason: e.detail.reason, id: e.detail.entry.id });
    report("available", { reason: e.detail.reason, id: e.detail.entry.id });
});
const rows = () => { el.nodeData = nodes; el.edgeData = edges; };
if (params.get("rows") !== "late") rows();
document.body.appendChild(el);
const summary = (r) => r && { revision: r.revision, entry: r.entry.id, wasDiscarded: r.wasDiscarded, copiedFrom: r.copiedFrom, others: r.others };
// Ready once both halves of the page's load (nodes, then edges) are in, so a test's first edit
// does not land between them, where the edges load would replace it as a new project.
const ready = el.autosaver.ready.then(async (restored) => {
    if (params.get("rows") === "late") rows();
    for (let f = 0; f < 6000 && (el.session.data.snapshot().nodeCount < n || el.session.data.snapshot().edgeCount < n); f++) await new Promise((r) => setTimeout(r, 10));
    const s = el.autosaver.status;
    const probes = [...new Set(Array.from(el.session.data.nodes(), (node) => node.probe ?? null))];
    // The key's entries as stored, for a page that restored nothing: what the tab that holds the work has.
    const entries = restored ? null : (await el.autosaver.list()).map((e) => ({ id: e.id, revision: e.revision, live: e.live }));
    report("ready", { restored: summary(restored), probes, state: s.state, revision: s.revision, ephemeral: s.ephemeral, persisted: s.persisted, quota: s.storage?.quota ?? null, problem: s.problem?.code ?? null, available, entries });
    return restored;
});
let edits = 0;
window.fixture = {
    el,
    ready: () => ready.then(summary),
    async edit(i) {
        await ready;
        await el.session.data.updateNodes(ids.map((id) => ({ id, values: { probe: i } })));
        return i;
    },
    // The next probe edit: the restored revision plus the edits made in this page, plus one.
    async next() {
        const restored = await ready;
        return this.edit((restored?.revision ?? 0) + ++edits);
    },
    // An edit that makes the saved work bigger by about 'kb' KiB of text no engine can compress.
    async grow(kb) {
        await ready;
        const bytes = new Uint8Array(kb * 768);
        for (let o = 0; o < bytes.length; o += 65536) crypto.getRandomValues(bytes.subarray(o, Math.min(bytes.length, o + 65536)));
        let text = "";
        for (let o = 0; o < bytes.length; o += 8192) text += String.fromCharCode(...bytes.subarray(o, o + 8192));
        const pad = btoa(text);
        await el.session.data.updateNodes([{ id: ids[0], values: { pad } }]);
    },
    async run() {
        await ready;
        await el.session.runs.start("degree", undefined, { as: "hidden-run", style: false });
    },
    status: () => el.autosaver.status,
    async check() {
        await ready;
        const probes = new Set();
        for (const node of el.session.data.nodes()) probes.add(node.probe ?? null);
        const entries = (await el.autosaver.list()).map((e) => ({ id: e.id, revision: e.revision, live: e.live, ended: e.ended, dirty: e.dirty }));
        return { status: el.autosaver.status, restored: summary(el.autosaver.restored), nodes: el.session.data.snapshot().nodeCount, probes: [...probes], entries, guard: window.__unloadListeners.size > 0 };
    },
    flush: () => el.autosaver.flush(),
    loseContext() {
        const canvas = el.shadowRoot?.querySelector("canvas") ?? el.querySelector("canvas");
        const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
        const ext = gl?.getExtension("WEBGL_lose_context");
        if (!ext) return false;
        ext.loseContext();
        return gl.isContextLost();
    },
    // Fill the origin's quota with a filler database until a write is refused even at 1 KiB. Random
    // bytes, since Firefox compresses what it stores.
    async fill() {
        const db = await new Promise((res, rej) => { const r = indexedDB.open("filler", 1); r.onupgradeneeded = () => r.result.createObjectStore("b"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        let size = 8 * 1024 * 1024, written = 0, i = 0;
        while (size >= 1024) {
            const ok = await new Promise((res) => { try { const t = db.transaction("b", "readwrite"); const v = new Uint8Array(size); for (let o = 0; o < size; o += 65536) crypto.getRandomValues(v.subarray(o, Math.min(size, o + 65536))); t.objectStore("b").put(v, i); t.oncomplete = () => res(true); t.onabort = () => res(false); t.onerror = () => res(false); } catch { res(false); } });
            if (ok) { written += size; i++; } else { size = Math.floor(size / 2); }
        }
        db.close();
        return written;
    },
    unfill: () => new Promise((res) => { const r = indexedDB.deleteDatabase("filler"); r.onsuccess = r.onerror = () => res(true); }),
    // Hold a read-write transaction over the autosave database open, so the element's next write
    // queues behind it and stays pending, as a stuck IndexedDB leaves it; release() lets it finish.
    async hold() {
        const db = await new Promise((res, rej) => { const r = indexedDB.open("graphty-autosave"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const tx = db.transaction(["entries", "parts", "blobs"], "readwrite");
        const held = (window.__held = { on: true, spins: 0, ended: null });
        tx.oncomplete = () => { held.ended = "complete"; db.close(); };
        tx.onabort = () => { held.ended = "abort " + (tx.error?.name ?? ""); db.close(); };
        // Resolves once the transaction runs, so every write the element starts later queues behind it.
        return new Promise((started) => {
            const spin = () => { held.spins++; started(true); if (held.on) tx.objectStore("entries").count().onsuccess = spin; };
            tx.objectStore("entries").count().onsuccess = spin;
        });
    },
    release() { if (window.__held) window.__held.on = false; return true; },
    // Abort the element's next write after its first record is written, or hold it open there
    // (see __nextTx above).
    tear() { window.__nextTx = "tear"; return true; },
    holdNextWrite() { window.__nextTx = "hold"; return true; },
    torn: () => window.__torn,
    // For the benchmark: one change ("data", a probe edit, or "ordinary", a settings change), then
    // a forced write; the milliseconds from the change to the commit.
    async cost(kind) {
        await ready;
        const start = performance.now();
        if (kind === "data") await this.next(); else await el.session.config.set({ name: "bench " + start });
        await el.autosaver.flush();
        const status = el.autosaver.status;
        return { ms: performance.now() - start, state: status.state, problem: status.problem?.code ?? null };
    },
};
report("loaded");
// Self-driving, for a browser no test can script (the iOS Simulator): auto=<n> makes n edits, waits
// until they are saved and reports "auto-saved"; tail=1 then makes one more edit and leaves it to the
// write schedule or to the page being hidden.
if (params.has("auto")) {
    (async () => {
        let revision = 0;
        for (let i = 0; i < Number(params.get("auto")); i++) revision = await window.fixture.next();
        await el.autosaver.flush();
        report("auto-saved", { revision, state: el.autosaver.status.state });
        if (params.get("tail") === "1") report("auto-tail", { revision: await window.fixture.next() });
    })();
}
</script></body></html>`;

/**
 * Read a request's body.
 * @param request - The request.
 * @returns The body text.
 */
function bodyOf(request: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        request.on("data", (chunk: Buffer) => chunks.push(chunk));
        request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        request.on("error", reject);
    });
}

/**
 * Start the fixture server on a free loopback port.
 * @param options - `bundles`: more builds of graphty-element by name (a path to each one's
 *   `graphty.bundle.js`); the page loads one instead of the built ./bundle with the URL parameter
 *   `build=<name>`, from the same origin, so it sees the same storage.
 * @param options.bundles - The builds by name.
 * @returns The fixture.
 */
export async function startFixture(options: { bundles?: Record<string, string> } = {}): Promise<Fixture> {
    const bundle = readFileSync(BUNDLE);
    const builds = new Map(Object.entries(options.bundles ?? {}).map(([name, file]) => [name, readFileSync(file)]));
    const log: LogEvent[] = [];
    const waiters = new Set<() => void>();
    const server = createServer((request: IncomingMessage, response: ServerResponse) => {
        const url = new URL(request.url ?? "/", "http://x");
        if (url.pathname === "/log" && request.method === "POST") {
            void bodyOf(request).then(
                (text) => {
                    try {
                        log.push({
                            ...(JSON.parse(text) as { tab: string; type: string }),
                            seq: log.length,
                            at: Date.now(),
                        });
                    } catch {
                        // A report cut off by a kill: nothing to record.
                    }

                    waiters.forEach((wake) => wake());
                    response.writeHead(204).end();
                },
                () => {
                    // The page or its browser was killed mid-report: Node aborts the request
                    // ("aborted", ECONNRESET) and there is no one left to answer.
                },
            );
            return;
        }

        if (url.pathname === "/bundle.js") {
            response.writeHead(200, { "content-type": "text/javascript", "cache-control": "max-age=3600" }).end(bundle);
            return;
        }

        const build = /^\/bundle-(.+)\.js$/.exec(url.pathname)?.[1];
        if (build !== undefined && builds.has(build)) {
            response
                .writeHead(200, { "content-type": "text/javascript", "cache-control": "max-age=3600" })
                .end(builds.get(build));
            return;
        }

        if (url.pathname === "/fixture.html") {
            const named = url.searchParams.get("build");
            const page =
                named !== null && builds.has(named)
                    ? PAGE.replace('import "/bundle.js";', `import "/bundle-${named}.js";`)
                    : PAGE;
            response
                .writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" })
                .end(page);
            return;
        }

        if (url.pathname === "/away.html") {
            // A second page of the same origin, for leaving and coming back.
            response
                .writeHead(200, { "content-type": "text/html" })
                .end("<!doctype html><title>away</title><p>away</p>");
            return;
        }

        response.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const fixture: Fixture = {
        origin,
        log,
        url: (params) =>
            `${origin}/fixture.html?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()}`,
        events: (tab, type) => log.filter((event) => event.tab === tab && (type === undefined || event.type === type)),
        lastSaved: (tab) => Math.max(0, ...fixture.events(tab, "saved").map((event) => event.revision as number)),
        waitFor: (predicate) =>
            new Promise((resolve) => {
                const check = (): void => {
                    const found = log.find(predicate);
                    if (found !== undefined) {
                        waiters.delete(check);
                        resolve(found);
                    }
                };
                waiters.add(check);
                check();
            }),
        close: () =>
            new Promise((resolve) => {
                server.closeAllConnections();
                server.close(() => resolve());
            }),
    };
    return fixture;
}
