/**
 * Every `session.data` door that loads lands in the order it was asked for, in both completion
 * orders: the older load's read finishing after the newer one's, and before it (issue #3382).
 *
 * The older load is a network-source read the test holds; each newer door is asked for while it
 * is held. A door that adds to the graph (`more`, `expand`, `runPendingSourceLoad`) is checked as
 * the older load instead, with a replacing load asked for after it: its rows must land under that
 * load, never on top of the graph that load replaced. Every wait is on a promise the source or
 * the fetch settles; nothing waits on time.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { replayFetch } from "@graphty/graph-io";
import { afterEach, assert, describe, it } from "vitest";

import { createGraphSession, defineSource, type GraphSession, registerSource } from "../../session";
import { loadRecordedSeed, PEOPLE_RECORDINGS } from "../../stories/fixtures/expand/source";

/** A read the test holds: `started` settles when the read reaches it, `open` lets it go on. */
interface Held {
    readonly started: Promise<void>;
    readonly done: Promise<void>;
    readonly open: () => void;
}

/** The reads held, by key. */
const holds = new Map<string, { gate: Promise<void>; start: () => void; finish: () => void }>();

/**
 * Hold the read with this key until `open` is called.
 * @param key - The read's key.
 * @returns The hold.
 */
function hold(key: string): Held {
    let open = (): void => undefined;
    let start = (): void => undefined;
    let finish = (): void => undefined;
    const gate = new Promise<void>((done) => (open = done));
    const started = new Promise<void>((done) => (start = done));
    const done = new Promise<void>((settle) => (finish = settle));
    holds.set(key, { gate, start, finish });
    return { started, done, open };
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
        held.finish();
    }
}

/** `size` nodes a page, `pages` pages; each read of a page waits at the hold `size:page`. */
registerSource(
    defineSource({
        id: "held-door",
        descriptor: {
            plainName: "Held",
            params: [
                { name: "size", plainName: "Size", type: "number", required: true },
                { name: "pages", plainName: "Pages", type: "number", required: true },
            ],
        },
        async *records(params: { size: number; pages: number }, ctx) {
            for (let page = Number(ctx.cursor?.page ?? 0); page < params.pages; page++) {
                await heldRead(`${String(params.size)}:${String(page)}`);
                yield {
                    nodes: Array.from({ length: params.size }, (_, i) => ({ id: `p${String(page)}-${String(i)}` })),
                    next: page + 1 < params.pages ? { page: page + 1 } : null,
                };
            }
        },
    }),
);

/** graph-samples' karate dataset, as graphty.app serves it. */
const KARATE = readFileSync(resolve(__dirname, "../../../graph-samples/dist/data/v1/karate.gsnp.gz"));

/** A three-node graph as inline JSON. */
const TRIANGLE = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }, { id: "c" }], edges: [] });

/**
 * A fetch whose every answer waits at the hold `key`.
 * @param key - The hold.
 * @param answer - What it answers.
 * @returns The fetch.
 */
function heldFetch(key: string, answer: () => Promise<Response>): typeof globalThis.fetch {
    return async () => {
        await heldRead(key);
        return answer();
    };
}

const sessions: GraphSession[] = [];

afterEach(() => {
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
    holds.clear();
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

/** A load door asked for while an older load is held, and what it leaves. */
interface Door {
    readonly name: string;
    /** How many nodes the graph holds once it has landed. */
    readonly nodes: number;
    /**
     * Ask for the load.
     * @param session - The session.
     * @returns The load, and its own held read when it has one.
     */
    start(session: GraphSession): Promise<{ load: Promise<unknown>; read?: Held }>;
}

const DOORS: readonly Door[] = [
    {
        name: "import of inline text",
        nodes: 3,
        start: (session) =>
            Promise.resolve({ load: session.data.import({ type: "json", config: { data: TRIANGLE } }) }),
    },
    {
        name: "generate",
        nodes: 7,
        start: (session) => Promise.resolve({ load: session.data.generate("cycle", { n: 7 }) }),
    },
    {
        name: "import from a network source",
        nodes: 2,
        start: (session) => {
            const read = hold("2:0");
            return Promise.resolve({
                load: session.data.import({ source: "held-door", config: { size: 2, pages: 1 } }),
                read,
            });
        },
    },
    {
        name: "loadSample",
        nodes: 34,
        start: (session) => {
            const read = hold("sample");
            const fetch = heldFetch("sample", () =>
                Promise.resolve(new Response(KARATE, { headers: { "content-type": "application/gzip" } })),
            );
            return Promise.resolve({ load: session.data.loadSample("graph-samples-karate", { fetch }), read });
        },
    },
    {
        name: "a prepared draft's load()",
        nodes: 3,
        start: async (session) => {
            const draft = await session.data.prepare({ type: "json", config: { data: TRIANGLE } });
            return { load: draft.load() };
        },
    },
];

/**
 * The older load: five nodes from the held source, its read held until the test opens it.
 * @param session - The session.
 * @returns The load and its hold, once the read has started.
 */
async function olderLoad(session: GraphSession): Promise<{ load: Promise<unknown>; read: Held }> {
    const read = hold("5:0");
    const load = session.data.import({ source: "held-door", config: { size: 5, pages: 1 } });
    await read.started;
    return { load, read };
}

describe("every session.data load door takes its turn in call order", () => {
    for (const door of DOORS) {
        it(`${door.name}, asked for while an older read runs, lands last when that read finishes last`, async () => {
            const session = fresh();
            const older = await olderLoad(session);
            const newer = await door.start(session);
            newer.read?.open();
            await newer.read?.done;
            older.read.open();
            await Promise.all([older.load, newer.load]);
            assert.strictEqual(session.data.snapshot().nodeCount, door.nodes, "the load asked for last");
            await session.undo();
            assert.strictEqual(session.data.snapshot().nodeCount, 5, "the older load, under it");
        });

        it(`${door.name}, asked for while an older read runs, lands last when that read finishes first`, async () => {
            const session = fresh();
            const older = await olderLoad(session);
            const newer = await door.start(session);
            older.read.open();
            await older.load;
            newer.read?.open();
            await newer.load;
            assert.strictEqual(session.data.snapshot().nodeCount, door.nodes, "the load asked for last");
            await session.undo();
            assert.strictEqual(session.data.snapshot().nodeCount, 5, "the older load, under it");
        });
    }
});

/** A door that adds to the graph, asked for first, and the graph it leaves once it has landed. */
interface AddingDoor {
    readonly name: string;
    /** How many nodes the graph holds once it has landed, before the replacing load. */
    readonly nodes: number;
    /**
     * Load what it adds to, then ask for the door with its read held.
     * @param session - The session.
     * @returns The load and its held read.
     */
    start(session: GraphSession): Promise<{ load: Promise<unknown>; read: Held }>;
}

const ADDING: readonly AddingDoor[] = [
    {
        name: "more",
        nodes: 6,
        start: async (session) => {
            await session.data.import(
                { source: "held-door", config: { size: 3, pages: 2 } },
                { limits: { maxNodes: 3, onLimit: "stop" } },
            );
            const read = hold("3:1");
            const load = session.data.more();
            await read.started;
            return { load, read };
        },
    },
    {
        name: "runPendingSourceLoad",
        nodes: 3,
        start: async (session) => {
            const saved = fresh();
            await saved.data.import(
                { source: "held-door", config: { size: 3, pages: 2 } },
                { limits: { maxNodes: 3, onLimit: "stop" } },
            );
            const { text } = await saved.project.save();
            await session.project.open(text);
            const [pending] = session.data.pendingSourceLoads();
            const read = hold("3:0");
            const load = session.data.runPendingSourceLoad(pending.id);
            await read.started;
            return { load, read };
        },
    },
    {
        name: "expand",
        nodes: 5,
        start: async (session) => {
            await loadRecordedSeed(session, "context");
            const read = hold("expand");
            const replay = replayFetch(PEOPLE_RECORDINGS);
            const fetch = async (input: string | URL | Request, init?: RequestInit) => {
                await heldRead("expand");
                return replay(input, init);
            };
            const load = session.data.expand(["valjean"], { fetch });
            await read.started;
            return { load, read };
        },
    },
];

describe("a load that adds to the graph, then a replacing load asked for after it", () => {
    for (const door of ADDING) {
        it(`${door.name} lands under the replacing load when its read finishes last`, async () => {
            const session = fresh();
            const older = await door.start(session);
            const newerRead = hold("2:0");
            const newer = session.data.import({ source: "held-door", config: { size: 2, pages: 1 } });
            newerRead.open();
            await newerRead.done;
            older.read.open();
            await Promise.all([older.load, newer]);
            assert.strictEqual(session.data.snapshot().nodeCount, 2, "only the replacing load");
            await session.undo();
            assert.strictEqual(session.data.snapshot().nodeCount, door.nodes, `${door.name} landed first`);
        });

        it(`${door.name} lands under the replacing load when its read finishes first`, async () => {
            const session = fresh();
            const older = await door.start(session);
            const newerRead = hold("2:0");
            const newer = session.data.import({ source: "held-door", config: { size: 2, pages: 1 } });
            older.read.open();
            await older.load;
            newerRead.open();
            await newer;
            assert.strictEqual(session.data.snapshot().nodeCount, 2, "only the replacing load");
            await session.undo();
            assert.strictEqual(session.data.snapshot().nodeCount, door.nodes, `${door.name} landed first`);
        });
    }
});
