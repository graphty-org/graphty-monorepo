/**
 * The renderer's data doors -- `Graph`'s, `<graphty-element>`'s and the `DataManager`'s -- go
 * through the session's load line like `session.data`'s (issue #3604), and keep to the ordering
 * their row in `LOAD_ORDER` (`src/session/commands/doors.ts`) gives them:
 *
 * - each door, called while a load is held in line, takes its place when called and dispatches
 *   nothing until the load ahead of it leaves (a clear cancels the load instead);
 * - an edit asked for while a replacing load still reads lands on what the load loaded, rather
 *   than under it, where the load would replace it.
 *
 * `test/session/load-entry.test.ts` fails when a renderer row in `LOAD_ORDER` is missing from
 * `CALLS` here. Every wait is on a promise the line, the door or a held read settles, or on a
 * condition; nothing waits on time.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { defineSource, registerSource } from "../../session";
import { LOAD_ORDER } from "../../src/session/commands/doors";
import { dispatcherOf } from "../../src/session/GraphSession";
import { loadLineOf } from "../../src/session/loadLine";

/** A three-node graph as inline JSON. */
const TRIANGLE = JSON.stringify({
    nodes: [{ id: "t1" }, { id: "t2" }, { id: "t3" }],
    edges: [{ source: "t1", target: "t2" }],
});

/** Lets the held source's read go on; set by each read. */
let openHeldRead = (): void => undefined;
/** Called by the held source once its read has started. */
let heldReadStarts = (): void => undefined;

// A network source of five nodes whose read waits until the test lets it go.
registerSource(
    defineSource({
        id: "held-renderer-entry",
        descriptor: { plainName: "Held", params: [] },
        async records() {
            const gate = new Promise<void>((done) => (openHeldRead = done));
            heldReadStarts();
            await gate;
            const ids = ["n0", "n1", "n2", "n3", "n4"];
            return {
                nodes: ids.map((id) => ({ id })),
                edges: ids.slice(1).map((id, i) => ({ source: ids[i], target: id })),
            };
        },
    }),
);

// A network source that reads at once, for `loadFromSource`.
registerSource(
    defineSource({
        id: "instant-renderer-entry",
        descriptor: { plainName: "Instant", params: [] },
        records() {
            return Promise.resolve({ nodes: [{ id: "s1" }, { id: "s2" }] });
        },
    }),
);

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.parentElement?.remove();
    mounted = null;
});

/**
 * Mount a graphty-element holding the nodes a, b and c and the edge a-b.
 * @returns The element and the id of its edge.
 */
async function mount(): Promise<{ element: Graphty; edgeId: string }> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "100%";
    element.style.height = "100%";
    container.appendChild(element);
    mounted = element;
    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    await element.graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await element.graph.addEdges([{ source: "a", target: "b" }]);
    const [edgeId] = [...element.graph.getDataManager().edges.keys()];
    return { element, edgeId };
}

/** A door's call: what it is called on, given the element and its edge's id. */
type Call = (element: Graphty, edgeId: string) => unknown;

/** The calls on the members both `Graph` and `<graphty-element>` have, by member. */
const SHARED: Readonly<Record<string, (target: Graphty | Graphty["graph"], edgeId: string) => unknown>> = {
    addNode: (target) => target.addNode({ id: "x" }),
    addNodes: (target) => target.addNodes([{ id: "x" }]),
    addEdge: (target) => target.addEdge({ source: "a", target: "c" }),
    addEdges: (target) => target.addEdges([{ source: "a", target: "c" }]),
    removeNodes: (target) => target.removeNodes(["c"]),
    removeEdges: (target, edgeId) => target.removeEdges([edgeId]),
    updateNodes: (target) => target.updateNodes([{ id: "a", mark: 1 }]),
    updateEdges: (target, edgeId) => target.updateEdges([{ id: edgeId, mark: 1 }]),
    batchOperations: (target) => target.batchOperations((tx) => tx.data.addNodes([{ id: "x" }])),
    setData: (target) => {
        target.setData({ nodes: [{ id: "x" }], edges: [] });
    },
    addDataFromSource: (target) => target.addDataFromSource("json", { data: TRIANGLE }),
    loadFromFile: (target) => target.loadFromFile(new File([TRIANGLE], "triangle.json")),
    loadFromUrl: (target) =>
        target.loadFromUrl(URL.createObjectURL(new Blob([TRIANGLE], { type: "application/json" })), {
            format: "json",
        }),
    clearData: (target) => {
        target.clearData();
    },
};

/** Every renderer row of `LOAD_ORDER`, and how this file calls it. */
const CALLS: Readonly<Record<string, Call>> = {
    ...Object.fromEntries(
        Object.entries(SHARED).flatMap(([member, call]) => [
            [`Graph.${member}`, (element: Graphty, edgeId: string) => call(element.graph, edgeId)],
            [`Graphty.${member}`, (element: Graphty, edgeId: string) => call(element, edgeId)],
        ]),
    ),
    "Graph.setNodes": (element) => element.graph.setNodes([{ id: "a" }, { id: "b" }]),
    "Graph.setEdges": (element) => element.graph.setEdges([{ source: "b", target: "c" }]),
    "Graphty.loadFromSource": (element) => element.loadFromSource("instant-renderer-entry", {}),
    "Graphty.dataSource": (element) => {
        element.dataSourceConfig = { data: TRIANGLE };
        element.dataSource = "json";
    },
    "Graphty.dataSourceConfig": (element) => {
        element.dataSource = "json";
        element.dataSourceConfig = { data: TRIANGLE };
    },
    "Graphty.nodeData": (element) => {
        element.nodeData = [{ id: "a" }, { id: "b" }];
    },
    "Graphty.edgeData": (element) => {
        element.edgeData = [{ source: "b", target: "c" }];
    },
    "DataManager.addNode": (element) => {
        element.graph.getDataManager().addNode({ id: "x" });
    },
    "DataManager.addNodes": (element) => {
        element.graph.getDataManager().addNodes([{ id: "x" }]);
    },
    "DataManager.addEdge": (element) => {
        element.graph.getDataManager().addEdge({ source: "a", target: "c" });
    },
    "DataManager.addEdges": (element) => {
        element.graph.getDataManager().addEdges([{ source: "a", target: "c" }]);
    },
    "DataManager.removeEdge": (element, edgeId) => element.graph.getDataManager().removeEdge(edgeId),
    "DataManager.removeNodeAndIncidentEdges": (element) =>
        element.graph.getDataManager().removeNodeAndIncidentEdges("c"),
    "DataManager.setNodes": (element) => {
        element.graph.getDataManager().setNodes([{ id: "a" }, { id: "b" }]);
    },
    "DataManager.setEdges": (element) => {
        element.graph.getDataManager().setEdges([{ source: "b", target: "c" }]);
    },
    "DataManager.clear": (element) => {
        element.graph.getDataManager().clear();
    },
    "DataManager.addDataFromSource": (element) =>
        element.graph.getDataManager().addDataFromSource("json", { data: TRIANGLE }),
};

/** The renderer rows of `LOAD_ORDER`. */
const RENDERER_ROWS = Object.entries(LOAD_ORDER).filter(([label]) => /^(Graph|Graphty|DataManager)\./.test(label));

describe("every renderer door, called while a load is held in line", () => {
    it("has a call here for every renderer row", () => {
        assert.deepEqual(
            RENDERER_ROWS.map(([label]) => label).filter((label) => !(label in CALLS)),
            [],
        );
    });

    for (const [label, order] of RENDERER_ROWS) {
        it(`${label} keeps to its ordering (${order})`, async () => {
            const { element, edgeId } = await mount();
            const dispatcher = dispatcherOf(element.graph.getSession());
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
                const result = Promise.resolve(CALLS[label](element, edgeId));
                // A load the test's own clear of a held place may cancel; its outcome is not the point.
                result.catch(() => undefined);

                if (order === "clear") {
                    const outcome = await (reading.wait() ?? Promise.resolve()).then(
                        () => "resolved",
                        (error: unknown) => (error as { code?: string }).code,
                    );
                    assert.strictEqual(outcome, "E_SUPERSEDED", `the load ahead of ${label} was not cancelled`);
                } else {
                    assert.strictEqual(line.size, before + 1, `${label} took no place in the load line when called`);
                    assert.deepEqual(seen, [], `${label} dispatched under the load still reading`);
                }

                reading.leave();
                await result.catch(() => undefined);
                await vi.waitFor(() => {
                    assert.isNotEmpty(seen, `${label} dispatched nothing once the load ahead of it left`);
                });
            } finally {
                dispatcher.events.dispatched = previous;
            }
        });
    }
});

describe("a renderer edit asked for while a replacing load reads lands on what it loaded (issue #3604)", () => {
    /**
     * Start a replacing load from the held source, and wait for its read to start.
     * @param element - The element.
     * @returns The load, wrapped: an async function returning the promise itself would wait for it.
     */
    async function heldLoad(element: Graphty): Promise<{ load: Promise<unknown> }> {
        const started = new Promise<void>((done) => (heldReadStarts = done));
        const load = element.graph.getSession().data.import({ source: "held-renderer-entry", config: {} });
        // A load that fails before its read starts fails the test here rather than holding it.
        await Promise.race([started, load]);
        return { load };
    }

    const EDITS: readonly { readonly name: string; readonly edit: (element: Graphty) => unknown }[] = [
        { name: "Graph.addNodes", edit: (element) => element.graph.addNodes([{ id: "added" }]) },
        { name: "Graphty.addNodes", edit: (element) => element.addNodes([{ id: "added" }]) },
        {
            name: "Graphty.setData",
            edit: (element) => {
                element.setData({ nodes: [{ id: "added" }], edges: [] });
            },
        },
        {
            name: "DataManager.addNodes",
            edit: (element) => {
                element.graph.getDataManager().addNodes([{ id: "added" }]);
            },
        },
    ];

    for (const each of EDITS) {
        it(`${each.name} keeps its node`, async () => {
            const { element } = await mount();
            const dispatcher = dispatcherOf(element.graph.getSession());
            // Set before the edit: every door here dispatches its write as a data.apply or a batch.
            const ops: string[] = [];
            const previous = dispatcher.events.dispatched;
            dispatcher.events.dispatched = (command) => {
                ops.push((command as { op: string }).op);
            };
            try {
                const { load } = await heldLoad(element);
                const edited = Promise.resolve(each.edit(element));
                openHeldRead();
                await Promise.all([load, edited]);
                // Settles whether the edit landed under the load or after it: only where differs.
                await vi.waitFor(() => {
                    assert.isTrue(
                        ops.some((op) => op === "data.apply" || op === "batch"),
                        `${each.name} dispatched nothing`,
                    );
                });
                await dispatcher.lane.settled();
            } finally {
                dispatcher.events.dispatched = previous;
            }

            assert.isDefined(element.graph.getNode("added"), "the load replaced the added node");
            assert.isDefined(element.graph.getNode("n4"), "the load did not land");
        });
    }

    it("a DataManager write with no load waiting still lands before the call returns", async () => {
        const { element } = await mount();
        element.graph.getDataManager().addNodes([{ id: "now" }]);

        assert.isDefined(element.graph.getNode("now"));
    });
});
