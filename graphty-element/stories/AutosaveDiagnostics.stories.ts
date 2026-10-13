// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../index.ts";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

/**
 * Autosave diagnostics: a page for checking, by hand on a real device, what happens to autosaved
 * work when the browser hides, freezes, discards or kills the page. The iPad checklist that uses it
 * is design/work-protection/ipad-protocol.md.
 *
 * The page turns autosave on (key `diagnostics`) and logs every lifecycle event, every status the
 * element reports (state, revision, problem code), `document.wasDiscarded` and the restore report:
 *
 * - to its own IndexedDB database (`graphty-autosave-diagnostics`), so the next load of the page
 *   shows what happened before it, including a load the browser killed;
 * - and, when the page's URL has `collector=<origin>`, to that collector
 *   (`scripts/autosave-collector.mjs`, started through servherd) with `navigator.sendBeacon`, so the
 *   record survives even when the browser deletes this site's storage.
 *
 * The buttons make an edit, make one and leave the page at once, import 100,000 nodes, and ask for
 * persistent storage. The log shows load numbers, never times, so the visual capture is the same on
 * every run; the collector stamps each line with the time it arrived.
 */
const meta: Meta = {
    title: "Autosave/Diagnostics",
    parameters: { controls: { disable: true } },
};
export default meta;

type Story = StoryObj;

/** The diagnostics log's database. */
const LOG_DB = "graphty-autosave-diagnostics";

/** One logged line. */
interface Line {
    readonly load: number;
    readonly type: string;
    readonly detail: Record<string, unknown>;
    readonly at: string;
}

/**
 * Open the log database.
 * @returns The database.
 */
function openLog(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(LOG_DB, 1);
        request.onupgradeneeded = () => request.result.createObjectStore("log", { autoIncrement: true });
        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = () => {
            reject(request.error ?? new Error("the diagnostics log did not open"));
        };
    });
}

/**
 * Every line logged so far, by any load of this page.
 * @param db - The log database.
 * @returns The lines, oldest first.
 */
function readLog(db: IDBDatabase): Promise<Line[]> {
    return new Promise((resolve) => {
        const request = db.transaction("log").objectStore("log").getAll();
        request.onsuccess = () => {
            resolve(request.result as Line[]);
        };
        request.onerror = () => {
            resolve([]);
        };
    });
}

/**
 * A ring of nodes.
 * @param n - How many.
 * @param probe - The `probe` value each node carries.
 * @returns The nodes and the edges.
 */
function ring(n: number, probe: number): { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] } {
    const nodes = Array.from({ length: n }, (_, i) => ({ id: `n${i}`, probe }));
    const edges = nodes.map((node, i) => ({ source: node.id, target: `n${(i + 1) % n}` }));
    return { nodes, edges };
}

/**
 * The diagnostics page.
 * @returns Its root.
 */
function diagnostics(): HTMLElement {
    const root = document.createElement("div");
    root.style.cssText = "display:grid;grid-template-rows:auto 1fr auto;height:100vh;font:13px/1.4 monospace";
    const bar = document.createElement("div");
    bar.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;padding:6px";
    const graph = document.createElement("graphty-element");
    graph.style.cssText = "display:block;min-height:240px";
    const log = document.createElement("pre");
    log.style.cssText = "margin:0;padding:6px;max-height:40vh;overflow:auto;white-space:pre-wrap;background:#f4f4f4";
    root.append(bar, graph, log);

    const collector = new URLSearchParams(location.search).get("collector");
    const shown: string[] = [];
    const show = (line: Line): void => {
        shown.push(`#${line.load} ${line.type} ${JSON.stringify(line.detail)}`);
        log.textContent = shown.join("\n");
    };
    let load = 1;
    const queued: { type: string; detail: Record<string, unknown> }[] = [];
    let db: IDBDatabase | null = null;
    const record = (type: string, detail: Record<string, unknown> = {}): void => {
        if (db === null) {
            queued.push({ type, detail });
            return;
        }

        const line: Line = { load, type, detail, at: new Date().toISOString() };
        try {
            db.transaction("log", "readwrite").objectStore("log").add(line);
        } catch {
            // The log is best effort; the collector still has the line.
        }

        if (collector !== null) {
            navigator.sendBeacon(`${collector}/log`, JSON.stringify({ ...line, agent: navigator.userAgent }));
        }

        show(line);
    };

    void openLog().then(async (opened) => {
        const before = await readLog(opened);
        before.forEach(show);
        load = Math.max(0, ...before.map((line) => line.load)) + 1;
        db = opened;
        queued.splice(0).forEach(({ type, detail }) => {
            record(type, detail);
        });
    });

    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    record("boot", {
        navigationType: nav?.type ?? null,
        wasDiscarded: (document as { wasDiscarded?: boolean }).wasDiscarded ?? null,
        visibility: document.visibilityState,
        standalone: matchMedia("(display-mode: standalone)").matches,
    });
    document.addEventListener("visibilitychange", () => {
        record("visibility", { state: document.visibilityState });
    });
    document.addEventListener("freeze", () => {
        record("freeze");
    });
    document.addEventListener("resume", () => {
        record("resume");
    });
    addEventListener("pagehide", (event) => {
        record("pagehide", { persisted: event.persisted });
    });
    addEventListener("pageshow", (event) => {
        record("pageshow", { persisted: event.persisted });
    });

    graph.setAttribute("autosave", "diagnostics");
    graph.layout = "circular";
    const start = ring(30, 0);
    graph.nodeData = start.nodes;
    graph.edgeData = start.edges;
    let lastSaved = -1;
    graph.addEventListener("graphty-autosave-status", (event) => {
        const status = event.detail;
        record("status", { state: status.state, revision: status.revision, problem: status.problem?.code ?? null });
        if (status.state === "saved" && status.revision > lastSaved) {
            lastSaved = status.revision;
        }
    });
    graph.addEventListener("graphty-autosave-at-risk", (event) => {
        record("at-risk", (event as CustomEvent<{ params: Record<string, unknown> }>).detail.params);
    });
    graph.addEventListener("graphty-autosave-available", (event) => {
        record("available", { reason: (event as CustomEvent<{ reason: string }>).detail.reason });
    });
    void graph.autosaver.ready.then((restored) => {
        const { status } = graph.autosaver;
        record("ready", {
            restored: restored === null ? null : { revision: restored.revision, wasDiscarded: restored.wasDiscarded },
            nodes: graph.session.data.snapshot().nodeCount,
            probes: [...new Set(Array.from(graph.session.data.nodes(), (node) => node.probe ?? null))],
            persisted: status.persisted,
            ephemeral: status.ephemeral,
        });
    });

    /** The next probe edit sets every node's `probe` to the revision it will save as. */
    const edit = async (): Promise<number> => {
        const probe = graph.autosaver.status.revision + 1;
        const ids = graph.session.data.snapshot().ids.toArray();
        await graph.session.data.updateNodes(ids.map((id) => ({ id, values: { probe } })));
        record("edit", { probe });
        return probe;
    };
    const button = (label: string, action: () => Promise<unknown>): void => {
        const element = document.createElement("button");
        element.textContent = label;
        element.addEventListener("click", () => {
            void action().catch((error: unknown) => {
                record("error", { action: label, error: String(error) });
            });
        });
        bar.append(element);
    };
    button("Edit", edit);
    button("Edit and leave", async () => {
        await edit();
        location.href = "about:blank";
    });
    button("Import 100,000 nodes", async () => {
        const big = ring(100_000, graph.autosaver.status.revision + 1);
        record("import", { nodes: big.nodes.length });
        graph.nodeData = big.nodes;
        graph.edgeData = big.edges;
        await Promise.resolve();
    });
    button("Request persistence", async () => {
        record("persist", { granted: await graph.autosaver.requestPersistence() });
    });
    button("Clear log", async () => {
        db?.close();
        db = null;
        await new Promise((resolve) => {
            const request = indexedDB.deleteDatabase(LOG_DB);
            request.onsuccess = request.onerror = request.onblocked = resolve;
        });
        shown.length = 0;
        log.textContent = "";
        db = await openLog();
    });
    return root;
}

export const Diagnostics: Story = { render: diagnostics };
