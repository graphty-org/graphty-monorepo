/**
 * Every session door that changes the graph goes through the one load entry, the session's load
 * line (issue #3547), and keeps to the ordering its row in `LOAD_ORDER` gives it:
 *
 * - the door list's ratchet: a session door that dispatches a graph op with no ordering fails, so
 *   a new door cannot skip the entry unnoticed;
 * - each ordered door, called while a load is held in line, takes its place when called and lands
 *   after the load (a clear cancels the load instead);
 * - the three bugs of the class: a clear that let a load still reading put its graph back
 *   (#3524), an open that a load still reading replaced (#3525), and edits that landed under a
 *   queued load (#3526).
 *
 * Every wait is on a promise a held read, the line or the door settles; nothing waits on time.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, defineSource, type GraphSession, registerSource } from "../../session";
import { type Door, DOOR_ROOTS, type DoorCall, LOAD_ORDER } from "../../src/session/commands/doors";
import { createElementSession, dispatcherOf } from "../../src/session/GraphSession";
import { loadLineOf } from "../../src/session/loadLine";
import { callOf } from "./history/door-harness";

/** The ops that write the graph's rows. */
const GRAPH_OPS = new Set([
    "data.apply",
    "data.import",
    "data.import-source",
    "data.expand",
    "data.source-expand",
    "data.collapse",
]);

/** Ordered rows the doors tests call no way, and the test that checks them instead. */
const CHECKED_ELSEWHERE: Readonly<Record<string, string>> = {
    "SessionDataApi.expand": "test/session/load-order-doors.test.ts (a load that adds to the graph)",
    "SessionDataApi.collapse": "test/session/sources/expand.test.ts; needs a node a source expanded",
};

/** The document the `LoadDraft` row of `doors.ts` prepares. */
const TINY_JSON = JSON.stringify({ nodes: [{ id: "j1" }, { id: "j2" }], edges: [{ src: "j1", dst: "j2" }] });

/** A three-node graph as inline JSON. */
const TRIANGLE = JSON.stringify({
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    edges: [{ source: "a", target: "b" }],
});

/** graph-samples' karate dataset, as graphty.app serves it. */
const KARATE = readFileSync(resolve(__dirname, "../../../graph-samples/dist/data/v1/karate.gsnp.gz"));

/** A read the test holds: `started` settles when the read reaches it, `open` lets it go on. */
interface Held {
    readonly started: Promise<void>;
    readonly open: () => void;
}

/** The reads held, by key. */
const holds = new Map<string, { gate: Promise<void>; start: () => void }>();

/**
 * Hold the read with this key until `open` is called.
 * @param key - The read's key.
 * @returns The hold.
 */
function hold(key: string): Held {
    let open = (): void => undefined;
    let start = (): void => undefined;
    const gate = new Promise<void>((done) => (open = done));
    const started = new Promise<void>((done) => (start = done));
    holds.set(key, { gate, start });
    return { started, open };
}

/**
 * Wait at a held read, if the test holds it.
 * @param key - The read's key.
 */
async function heldRead(key: string): Promise<void> {
    const held = holds.get(key);
    if (held !== undefined) {
        held.start();
        await held.gate;
    }
}

/** `size` nodes, `n0` to `n<size-1>`, with an edge from each to the next; the read waits at `size`. */
registerSource(
    defineSource({
        id: "held-entry",
        descriptor: {
            plainName: "Held",
            params: [{ name: "size", plainName: "Size", type: "number", required: true }],
        },
        async records(params: { size: number }) {
            await heldRead(String(params.size));
            const ids = Array.from({ length: params.size }, (_, i) => `n${String(i)}`);
            return {
                nodes: ids.map((id) => ({ id })),
                edges: ids.slice(1).map((id, i) => ({ source: ids[i], target: id })),
            };
        },
    }),
);

/** A Blob whose text is read only once the test opens the hold `open`. */
class HeldBlob extends Blob {
    override async text(): Promise<string> {
        await heldRead("open");
        return super.text();
    }
}

const sessions: GraphSession[] = [];

afterEach(() => {
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
    holds.clear();
    vi.unstubAllGlobals();
});

/**
 * A fresh session, disposed after the test.
 * @returns The session.
 */
function fresh(): GraphSession {
    const session = createGraphSession();
    sessions.push(session);
    return session;
}

/**
 * A load from the held source, with its read held until the test opens it.
 * @param session - The session.
 * @param size - How many nodes it loads; also the hold's key.
 * @returns The load and its hold, once the read has started.
 */
async function heldLoad(session: GraphSession, size: number): Promise<{ load: Promise<unknown>; read: Held }> {
    const read = hold(String(size));
    const load = session.data.import({ source: "held-entry", config: { size } });
    // Its rejection is asserted where it is expected.
    load.catch(() => undefined);
    await read.started;
    return { load, read };
}

/**
 * Assert that a promise rejects with `E_SUPERSEDED`.
 * @param promise - The promise.
 * @param label - What it is, for the message.
 */
async function assertSuperseded(promise: Promise<unknown>, label: string): Promise<void> {
    const outcome = await promise.then(
        () => "resolved",
        (error: unknown) => (error as { code?: string }).code ?? String(error),
    );
    assert.strictEqual(outcome, "E_SUPERSEDED", `${label} was not cancelled`);
}

/**
 * A saved project holding the triangle.
 * @returns Its text.
 */
async function triangleProject(): Promise<string> {
    const saved = fresh();
    await saved.data.import({ type: "json", config: { data: TRIANGLE } });
    return (await saved.project.save()).text;
}

/**
 * Every row, labelled `Root.member`.
 * @param half - Only the rows of this half, when given.
 * @returns The rows.
 */
function rowsOf(half?: "session" | "renderer"): [string, Door][] {
    return DOOR_ROOTS.filter((root) => half === undefined || root.half === half).flatMap((root) =>
        Object.entries(root.doors ?? {}).map(([member, door]): [string, Door] => [`${root.name}.${member}`, door]),
    );
}

/** The session's ordered rows, which this file calls; the renderer's are checked in the browser. */
const SESSION_ORDER: readonly [string, "load" | "edit" | "clear"][] = (() => {
    const session = new Set(rowsOf("session").map(([label]) => label));
    return Object.entries(LOAD_ORDER).flatMap(([label, order]): [string, "load" | "edit" | "clear"][] =>
        session.has(label) && typeof order === "string" ? [[label, order]] : [],
    );
})();

/**
 * The ops a row dispatches, or will.
 * @param door - The row.
 * @returns The ops.
 */
function opsOf(door: Door): string[] {
    if (door.kind === "dispatches" || door.kind === "partial") {
        return [door.op, ...door.expect.map((command) => (command as { op?: string }).op ?? "")];
    }

    return door.kind === "knownGap" && door.op !== undefined ? [door.op] : [];
}

describe("the load entry's ratchet", () => {
    it("orders every door, of either half, that dispatches a graph op", () => {
        const unordered = rowsOf()
            .filter(([label, door]) => opsOf(door).some((op) => GRAPH_OPS.has(op)) && !(label in LOAD_ORDER))
            .map(([label]) => label);

        assert.deepEqual(unordered, [], "doors that change the graph with no row in LOAD_ORDER (doors.ts)");
    });

    it("orders only doors the door list holds", () => {
        const labels = new Set(rowsOf().map(([label]) => label));
        const stray = Object.keys(LOAD_ORDER).filter((label) => !labels.has(label));

        assert.deepEqual(stray, []);
    });

    it("routes every session door through the entry, and names the issue of every renderer door that is not", () => {
        const session = new Set(rowsOf("session").map(([label]) => label));
        const wrong = Object.entries(LOAD_ORDER)
            .filter(([label, order]) => typeof order !== "string" && (session.has(label) || !(order.direct > 0)))
            .map(([label]) => label);

        assert.deepEqual(wrong, []);
    });

    it("calls every ordered door here, or names the test that checks it", () => {
        const doors = new Map(rowsOf("session"));
        const uncalled = SESSION_ORDER.map(([label]) => label).filter(
            (label) => callOf(doors.get(label) as Door) === undefined && !(label in EXTRA_CALLS),
        );

        assert.deepEqual(uncalled.sort(), Object.keys(CHECKED_ELSEWHERE).sort());
    });
});

/** Calls for ordered rows the door list does not call (an exempt row). */
const EXTRA_CALLS: Readonly<Record<string, (session: GraphSession) => Promise<DoorCall>>> = {
    "ProjectApi.open": async () => ({ kind: "call", args: [await triangleProject()] }),
};

/** How the test reaches the object an ordered row is a member of. */
const REACH: Readonly<Record<string, (session: GraphSession) => object | Promise<object>>> = {
    SessionDataApi: (session) => session.data,
    LoadDraft: (session) => session.data.prepare({ type: "json", config: { data: TINY_JSON } }),
    ProjectApi: (session) => session.project,
};

describe("every ordered door, called while a load is held in line", () => {
    const doors = new Map(rowsOf("session"));
    for (const [label, order] of SESSION_ORDER) {
        if (label in CHECKED_ELSEWHERE) {
            continue;
        }

        it(`${label} keeps to its ordering (${order})`, async () => {
            const [root, member] = label.split(".");
            const session = createElementSession();
            sessions.push(session);
            const door = doors.get(label) as Door;
            const extra = EXTRA_CALLS[label] as ((session: GraphSession) => Promise<DoorCall>) | undefined;
            const call = extra === undefined ? callOf(door) : await extra(session);
            assert.isDefined(call);
            assert.strictEqual(call.kind, "call");
            if (call.kind !== "call") {
                return;
            }

            const reach = REACH[root];
            const target = await reach(session);
            await call.around?.(target);
            const dispatcher = dispatcherOf(session);
            const line = loadLineOf(dispatcher);
            // A load still reading: it holds its place until the test lets it go.
            const reading = line.join();
            const before = line.size;
            const seen: unknown[] = [];
            const previous = dispatcher.events.dispatched;
            dispatcher.events.dispatched = (command) => {
                seen.push(command);
            };
            try {
                const args = typeof call.args === "function" ? call.args() : call.args;
                const method = (target as Record<string, (...values: unknown[]) => unknown>)[member];
                const result = Promise.resolve(method.apply(target, [...args]));
                result.catch(() => undefined);

                if (order === "clear") {
                    await assertSuperseded(reading.wait() ?? Promise.resolve(), `the load ahead of ${label}`);
                } else {
                    assert.strictEqual(line.size, before + 1, `${label} took no place in the load line when called`);
                    assert.deepEqual(seen, [], `${label} dispatched under the load still reading`);
                }

                reading.leave();
                await result;
                if (door.kind === "dispatches") {
                    assert.deepEqual(seen, door.expect, `${label} dispatched something other than its row expects`);
                } else {
                    assert.isNotEmpty(seen, `${label} dispatched nothing once the load ahead of it left`);
                }
            } finally {
                dispatcher.events.dispatched = previous;
            }
        });
    }
});

describe("a clear cancels a session load that is still reading (issue #3524)", () => {
    const READING: readonly {
        readonly name: string;
        readonly start: (session: GraphSession) => Promise<{ load: Promise<unknown>; read: Held }>;
    }[] = [
        { name: "import from a network source", start: (session) => heldLoad(session, 4) },
        {
            name: "loadSample",
            start: async (session) => {
                const read = hold("sample");
                const fetch = async (): Promise<Response> => {
                    await heldRead("sample");
                    return new Response(KARATE, { headers: { "content-type": "application/gzip" } });
                };
                const load = session.data.loadSample("graph-samples-karate", { fetch });
                load.catch(() => undefined);
                await read.started;
                return { load, read };
            },
        },
        {
            name: "loadDataset",
            start: async (session) => {
                const read = hold("dataset");
                vi.stubGlobal("fetch", async (): Promise<Response> => {
                    await heldRead("dataset");
                    return new Response(KARATE);
                });
                const load = session.data.loadDataset("karate", { baseUrl: "https://mirror.test/data/v1/" });
                load.catch(() => undefined);
                await read.started;
                return { load, read };
            },
        },
    ];

    for (const door of READING) {
        it(`${door.name}, still reading at the clear, rejects with E_SUPERSEDED and adds nothing`, async () => {
            const session = fresh();
            await session.data.import({ type: "json", config: { data: TRIANGLE } });
            const reading = await door.start(session);
            await session.data.clear();
            reading.read.open();
            await assertSuperseded(reading.load, door.name);
            assert.strictEqual(session.data.snapshot().nodeCount, 0, "the cleared graph came back");
        });
    }

    /** Loads that read nothing, each made ready first and asked for behind a load still reading. */
    const QUEUED: readonly {
        readonly name: string;
        readonly ready: (session: GraphSession) => Promise<() => Promise<unknown>>;
    }[] = [
        {
            name: "import of inline text",
            ready: (session) =>
                Promise.resolve(() => session.data.import({ type: "json", config: { data: TRIANGLE } })),
        },
        { name: "generate", ready: (session) => Promise.resolve(() => session.data.generate("cycle", { n: 7 })) },
        {
            name: "a prepared draft's load()",
            ready: async (session) => {
                const draft = await session.data.prepare({ type: "json", config: { data: TRIANGLE } });
                return () => draft.load();
            },
        },
    ];

    for (const door of QUEUED) {
        it(`${door.name}, queued behind a load still reading at the clear, adds nothing`, async () => {
            const session = fresh();
            const ask = await door.ready(session);
            const older = await heldLoad(session, 5);
            const queued = ask();
            queued.catch(() => undefined);
            await session.data.clear();
            older.read.open();
            await assertSuperseded(older.load, "the load still reading");
            await assertSuperseded(queued, door.name);
            assert.strictEqual(session.data.snapshot().nodeCount, 0, "a load asked for before the clear came back");
        });
    }

    it("a clear's own place lets a load asked for after it land", async () => {
        const session = fresh();
        const older = await heldLoad(session, 5);
        await session.data.clear();
        const newer = session.data.import({ type: "json", config: { data: TRIANGLE } });
        older.read.open();
        await newer;
        await assertSuperseded(older.load, "the load still reading");
        assert.strictEqual(session.data.snapshot().nodeCount, 3);
    });
});

describe("project.open takes its place in the load line when called (issue #3525)", () => {
    it("a load asked for before the open, still reading, never lands after it", async () => {
        const text = await triangleProject();
        const session = fresh();
        const older = await heldLoad(session, 5);
        const opened = session.project.open(text, { discard: true });
        older.read.open();
        await Promise.all([older.load, opened]);
        assert.sameMembers(
            session.data.nodes().map((node) => node.id),
            ["a", "b", "c"],
            "the load replaced the opened project",
        );
    });

    it("a load asked for after the open, while the open still reads, never lands before it", async () => {
        const text = await triangleProject();
        const session = fresh();
        const read = hold("open");
        const opened = session.project.open(new HeldBlob([text]), { discard: true });
        await read.started;
        // Nothing holds its own read: before the fix it landed at once, and the open replaced it.
        const newer = session.data.import({ source: "held-entry", config: { size: 2 } });
        read.open();
        await Promise.all([opened, newer]);
        assert.sameMembers(
            session.data.nodes().map((node) => node.id),
            ["n0", "n1"],
            "the opened project replaced a load asked for after it",
        );
    });
});

describe("session.data edits land after a load queued before them (issue #3526)", () => {
    /** The edits, each asked for while a replacing load of n0..n4 is still reading. */
    const EDITS: readonly {
        readonly name: string;
        readonly edit: (session: GraphSession) => Promise<unknown>;
        readonly check: (session: GraphSession) => void;
    }[] = [
        {
            name: "addNodes",
            edit: (session) => session.data.addNodes([{ id: "added" }]),
            check: (session) => {
                assert.isDefined(session.data.node("added"), "the added node was replaced by the load");
            },
        },
        {
            name: "addEdges",
            edit: (session) => session.data.addEdges([{ source: "n0", target: "n4" }]),
            check: (session) => {
                assert.strictEqual(session.data.snapshot().edgeCount, 5, "the added edge was replaced by the load");
            },
        },
        {
            name: "updateNodes",
            edit: (session) => session.data.updateNodes([{ id: "n0", values: { mark: 1 } }]),
            check: (session) => {
                assert.strictEqual(session.data.node("n0")?.mark, 1, "the update landed under the load");
            },
        },
        {
            name: "removeNodes",
            edit: (session) => session.data.removeNodes(["n0"]),
            check: (session) => {
                assert.isUndefined(session.data.node("n0"), "the removal landed under the load");
            },
        },
        {
            name: "clear",
            edit: (session) => session.data.clear(),
            check: (session) => {
                assert.strictEqual(session.data.snapshot().nodeCount, 0, "the clear landed under the load");
            },
        },
    ];

    for (const each of EDITS) {
        it(`${each.name}, asked for while a load reads, applies after it`, async () => {
            const session = fresh();
            const older = await heldLoad(session, 5);
            const edited = each.edit(session);
            older.read.open();
            await Promise.all([older.load.catch(() => undefined), edited]);
            each.check(session);
        });
    }

    it("updateEdges and removeEdges, asked for while a load reads, dispatch after it", async () => {
        for (const verb of ["updateEdges", "removeEdges"] as const) {
            const session = fresh();
            const dispatcher = dispatcherOf(session);
            const ops: string[] = [];
            dispatcher.events.dispatched = (command) => {
                ops.push((command as { op: string }).op);
            };
            const older = await heldLoad(session, 5);
            const edited =
                verb === "updateEdges"
                    ? session.data.updateEdges([{ id: "e0", values: { w: 1 } }])
                    : session.data.removeEdges(["e0"]);
            edited.catch(() => undefined);
            older.read.open();
            await older.load;
            await edited.catch(() => undefined);
            assert.deepEqual(ops, ["data.import-source", "data.apply"], `${verb} dispatched under the load`);
        }
    });
});

describe("the entry's edges", () => {
    it("an open that refuses its document gives its place up, so a later load lands", async () => {
        const session = fresh();
        const document = JSON.parse(await triangleProject()) as { version: number };
        const refused = session.project.open(JSON.stringify({ ...document, version: document.version + 1 }));
        const later = session.data.import({ type: "json", config: { data: TRIANGLE } });

        const outcome = await refused.then(
            () => "opened",
            (error: unknown) => (error as { code?: string }).code,
        );
        await later;

        assert.strictEqual(outcome, "E_UNSUPPORTED_VERSION");
        assert.strictEqual(session.data.snapshot().nodeCount, 3);
    });

    it("an edit inside a transaction dispatches into it at once, even while a load reads", async () => {
        const session = fresh();
        const older = await heldLoad(session, 5);
        await session.transaction("edit while a load reads", (tx) => tx.data.addNodes([{ id: "inside" }]));

        assert.isDefined(session.data.node("inside"), "the transaction's edit waited for the load");
        older.read.open();
        await older.load;
    });

    it("a clear asked for while an open writes lands after the open, not under it", async () => {
        const text = await triangleProject();
        const session = fresh();
        const dispatcher = dispatcherOf(session);
        let cleared: Promise<void> | undefined;
        dispatcher.events.dispatched = () => {
            // Asked for at the open's first write, from outside its transaction.
            cleared ??= Promise.resolve().then(() => session.data.clear());
        };
        await session.project.open(text, { discard: true });
        await cleared;

        assert.isDefined(cleared, "the open wrote nothing");
        assert.strictEqual(session.data.snapshot().nodeCount, 0, "the opened graph came back after the clear");
    });

    it("a clear cancels an edit still waiting behind a load, and lands without waiting", async () => {
        const session = fresh();
        await session.data.import({ type: "json", config: { data: TRIANGLE } });
        const older = await heldLoad(session, 5);
        const edit = session.data.addNodes([{ id: "waiting" }]);
        edit.catch(() => undefined);
        // Settles with the load still held: the clear waits for nothing.
        await session.data.clear();

        assert.strictEqual(session.data.snapshot().nodeCount, 0);
        await assertSuperseded(edit, "the waiting edit");
        older.read.open();
        await assertSuperseded(older.load, "the load still reading");
        assert.strictEqual(session.data.snapshot().nodeCount, 0);
    });

    it("a clear inside a transaction cancels nothing, since the transaction may roll back", async () => {
        const session = fresh();
        const older = await heldLoad(session, 5);
        await session.transaction("clear inside", (tx) => tx.data.clear());
        older.read.open();
        await older.load;

        assert.strictEqual(session.data.snapshot().nodeCount, 5, "the load the transaction's clear left alone");
    });
});
