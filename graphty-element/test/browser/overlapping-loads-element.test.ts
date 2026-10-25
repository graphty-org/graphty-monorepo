/**
 * @file Loads through the element's own doors and through `session.data` share one line, so they
 * land in the order they were asked for, whichever finishes reading first (issue #3382). Every
 * element door is asked for while an older `session.data` load's read is held, in both completion
 * orders: the older read finishing after the newer load's, and before it. An element door is also
 * the older load, with a `session.data` load asked for after it. Every wait is on a promise the
 * source, the file or the history settles; nothing waits on time.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { defineSource, type Graphty, registerSource } from "../../index.js";

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

registerSource(
    defineSource({
        id: "held-element-load",
        descriptor: {
            plainName: "Held",
            params: [{ name: "size", plainName: "Size", type: "number", required: true }],
        },
        async records(params: { size: number }) {
            await heldRead(`source:${String(params.size)}`);
            return { nodes: Array.from({ length: params.size }, (_, i) => ({ id: `n${String(i)}` })) };
        },
    }),
);

/** A three-node graph as inline JSON. */
const TRIANGLE = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }, { id: "c" }], edges: [] });

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
    holds.clear();
});

/**
 * An element connected with no data, once its first update has run.
 * @returns The element.
 */
async function page(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;
    return element;
}

/**
 * Settle once the history holds `count` steps and nothing is pending: for a door that hands back
 * no promise (an attribute, a property).
 * @param element - The element.
 * @param count - How many steps to wait for.
 * @returns Settles when it does.
 */
function stepsRecorded(element: Graphty, count: number): Promise<void> {
    const { session } = element;
    const done = (): boolean => session.history.pending.length === 0 && session.history.steps.length >= count;
    if (done()) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const off = session.on("history:changed", () => {
            if (done()) {
                off();
                resolve();
            }
        });
    });
}

/**
 * A file of `data` whose read waits at the hold `key`.
 * @param data - The file's text.
 * @param key - The hold.
 * @returns The file.
 */
function heldFile(data: string, key: string): File {
    const file = new File([data], "held.json");
    const read = file.arrayBuffer.bind(file);
    file.arrayBuffer = async () => {
        await heldRead(key);
        return read();
    };
    return file;
}

/** An element door asked for while an older load is held. */
interface Door {
    readonly name: string;
    /**
     * Ask for the load.
     * @param element - The element.
     * @returns The load, settled once its step is recorded, and its own held read when it has one.
     */
    start(element: Graphty): { load: Promise<unknown>; read?: Held };
}

const DOORS: readonly Door[] = [
    {
        name: "addDataFromSource",
        start: (element) => ({ load: element.addDataFromSource("json", { data: TRIANGLE }, { replace: true }) }),
    },
    {
        name: "loadFromFile",
        start: (element) => {
            const read = hold("file");
            return { load: element.loadFromFile(heldFile(TRIANGLE, "file"), { replace: true }), read };
        },
    },
    {
        name: "loadFromUrl",
        start: (element) => ({
            load: element.loadFromUrl(`data:application/json,${encodeURIComponent(TRIANGLE)}`, {
                format: "json",
                replace: true,
            }),
        }),
    },
    {
        name: "the data-source attributes",
        start: (element) => {
            element.setAttribute("data-source", "json");
            element.setAttribute("data-source-config", JSON.stringify({ data: TRIANGLE }));
            return { load: stepsRecorded(element, 2) };
        },
    },
    {
        name: "nodeData",
        start: (element) => {
            element.nodeData = [{ id: "a" }, { id: "b" }, { id: "c" }];
            return { load: stepsRecorded(element, 2) };
        },
    },
];

/**
 * The older load: five nodes from the held source through `session.data`, its read held.
 * @param element - The element.
 * @returns The load and its hold, once the read has started.
 */
async function olderLoad(element: Graphty): Promise<{ load: Promise<unknown>; read: Held }> {
    const read = hold("source:5");
    const load = element.session.data.import({ source: "held-element-load", config: { size: 5 } });
    await read.started;
    return { load, read };
}

describe("every element load door takes its turn behind a session.data load asked for earlier", () => {
    for (const door of DOORS) {
        it(`${door.name} lands last when the older read finishes last`, async () => {
            const element = await page();
            const older = await olderLoad(element);
            const newer = door.start(element);
            if (newer.read !== undefined) {
                newer.read.open();
            }
            older.read.open();
            await Promise.all([older.load, newer.load]);
            assert.strictEqual(element.session.data.nodes().length, 3, "the load asked for last");
            await element.session.undo();
            assert.strictEqual(element.session.data.nodes().length, 5, "the older load, under it");
        });

        it(`${door.name} lands last when the older read finishes first`, async () => {
            const element = await page();
            const older = await olderLoad(element);
            const newer = door.start(element);
            older.read.open();
            await older.load;
            newer.read?.open();
            await newer.load;
            assert.strictEqual(element.session.data.nodes().length, 3, "the load asked for last");
            await element.session.undo();
            assert.strictEqual(element.session.data.nodes().length, 5, "the older load, under it");
        });
    }

    it("pairs the two data-source attributes assigned while an older pair still reads", async () => {
        const element = await page();
        const read = hold("source:5");
        element.setAttribute("data-source", "held-element-load");
        element.setAttribute("data-source-config", JSON.stringify({ size: 5 }));
        await read.started;
        element.setAttribute("data-source", "json");
        element.setAttribute("data-source-config", JSON.stringify({ data: TRIANGLE }));
        assert.strictEqual(element.dataSource, "json", "the type as assigned, while it waits");
        read.open();
        await stepsRecorded(element, 2);
        assert.strictEqual(element.session.data.nodes().length, 3, "the pair assigned last");
        assert.strictEqual(element.session.data.source()?.type, "json");
    });
});

describe("a session.data load asked for after an element load whose read is held", () => {
    it("lands last when the element's read finishes last", async () => {
        const element = await page();
        const read = hold("file");
        const older = element.loadFromFile(heldFile(TRIANGLE, "file"), { replace: true });
        await read.started;
        const newer = element.session.data.generate("cycle", { n: 7 });
        read.open();
        await Promise.all([older, newer]);
        assert.strictEqual(element.session.data.nodes().length, 7, "the load asked for last");
        await element.session.undo();
        assert.strictEqual(element.session.data.nodes().length, 3, "the file, under it");
    });

    it("lands last when the element's read finishes first", async () => {
        const element = await page();
        const read = hold("file");
        const older = element.loadFromFile(heldFile(TRIANGLE, "file"), { replace: true });
        await read.started;
        const newerRead = hold("source:2");
        const newer = element.session.data.import({ source: "held-element-load", config: { size: 2 } });
        read.open();
        await older;
        newerRead.open();
        await newer;
        assert.strictEqual(element.session.data.nodes().length, 2, "the load asked for last");
        await element.session.undo();
        assert.strictEqual(element.session.data.nodes().length, 3, "the file, under it");
    });
});
