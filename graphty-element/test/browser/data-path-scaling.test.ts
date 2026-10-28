/**
 * @file Counted-work scaling of the data path: every public way to add, replace, update, remove,
 * clear or load nodes and edges -- on the `<graphty-element>` element, on `Graph`, on the
 * `DataManager` both of them reach, and on the session -- runs on a graph of n and of 4n nodes,
 * and the elements it visits (Map, Set and Array iterator steps and array scans, see
 * `visitsDuring`) may grow no faster than the call's own reach. A call that touches every node
 * may grow 4x, never 16x; a call that touches one record may grow at most 2x. Counted, never
 * timed (issue #1643).
 *
 * A call that adds or removes one element at a time is measured as the bulk path a consumer
 * writes with it -- n/4 calls in a loop -- so a cost per call that grows with the graph shows up
 * as a quadratic loop.
 *
 * A call whose work grows faster than its reach today is an expected failure naming the issue
 * that records it, so the fix turns it green and its methods move into the registry.
 *
 * The render loop is stopped, so no frame runs while a call is counted: a frame walks every node,
 * and how many frames fit in an await is a matter of time, not of work. Strict state is off, as it
 * is for a consumer: its checks walk the whole history on every write by design.
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import { assertScalesLinearly, type Growth, visitsDuring } from "../helpers/cost";

/** The two graph sizes: big enough that a quadratic path is 16x, small enough to stay cheap. */
const SIZES = [100, 400] as const;

type Graph = Graphty["graph"];

/**
 * The node records of a graph of `count` nodes, from `from` on.
 * @param count - How many.
 * @param from - The first node's number.
 * @returns The records.
 */
function nodesOf(count: number, from = 0): { id: string }[] {
    return Array.from({ length: count }, (_, at) => ({ id: `n${String(from + at)}` }));
}

/**
 * The edges of a path through nodes `n0` to `n<count - 1>`.
 * @param count - How many nodes the path visits.
 * @returns The records.
 */
function pathOf(count: number): { source: string; target: string }[] {
    return Array.from({ length: count - 1 }, (_, at) => ({ source: `n${String(at)}`, target: `n${String(at + 1)}` }));
}

/**
 * A graph of `size` nodes and a path through them, as an inline JSON document.
 * @param size - The node count.
 * @returns The document.
 */
function jsonOf(size: number): string {
    return JSON.stringify({ nodes: nodesOf(size), edges: pathOf(size) });
}

/**
 * Wait until every queued operation has run and the pass that derives it has drawn it.
 * @param graph - The graph.
 */
async function settled(graph: Graph): Promise<void> {
    await operationQueueOf(graph).waitForCompletion();
    await dispatcherOf(graph.getSession()).lane.settled();
}

/**
 * Mount a graphty-element, with its render loop stopped and a static layout.
 * @returns The element.
 */
async function mount(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    element.graph.engine.stopRenderLoop();
    await element.graph.setLayout("random");
    return element;
}

/**
 * Fill a mounted element's graph with `size` nodes and a path through them.
 * @param element - The element.
 * @param size - The node count.
 */
async function fill(element: Graphty, size: number): Promise<void> {
    await element.graph.addNodes(nodesOf(size));
    await element.graph.addEdges(pathOf(size));
    await settled(element.graph);
}

/** The work one call does, counted. */
interface Case {
    /** Every public method (`Owner.method`, as the cost-coverage registry spells it) the call covers. */
    readonly methods: readonly string[];
    /** `linear` when the call reaches every node, `constant` when it reaches one record. */
    readonly growth: Growth;
    /**
     * The issue recording that the call does more work than its reach today. Its test is expected
     * to fail until the issue is fixed, and its methods stay out of the registry.
     */
    readonly superlinear?: number;
    /**
     * The two graph sizes, when {@link SIZES} is too small for a per-call cost that grows with the
     * graph to stand out from the call's constant work.
     */
    readonly sizes?: readonly [number, number];
    /**
     * Build the state the call needs and return the call.
     * @param element - A freshly mounted element, its graph empty.
     * @param size - The graph size.
     * @returns The call to count; it resolves once its work is drawn.
     */
    prepare(element: Graphty, size: number): Promise<() => Promise<unknown>>;
    /**
     * Check the call did what it says, so a count of work that never happened cannot pass.
     * @param element - The element after the call.
     * @param size - The graph size.
     */
    check(element: Graphty, size: number): void;
}

/**
 * The ids of half the graph's edges.
 * @param graph - The graph.
 * @returns Every other edge id.
 */
function halfTheEdges(graph: Graph): string[] {
    return [...graph.getDataManager().edges.keys()].filter((_, at) => at % 2 === 0);
}

/**
 * Counts of what a graph draws.
 * @param element - The element.
 * @returns Its node and edge counts.
 */
function drawn(element: Graphty): { nodes: number; edges: number } {
    const data = element.graph.getDataManager();
    return { nodes: data.nodes.size, edges: data.edges.size };
}

const CASES: readonly Case[] = [
    {
        methods: ["Graph.addNodes", "DataManager.addNodes"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            return () => element.graph.addNodes(nodesOf(size, size));
        },
        check: (element, size) => {
            assert.strictEqual(drawn(element).nodes, 2 * size);
        },
    },
    {
        methods: ["Graphty.addNodes"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            return () => element.addNodes(nodesOf(size, size) as never);
        },
        check: (element, size) => {
            assert.strictEqual(drawn(element).nodes, 2 * size);
        },
    },
    {
        methods: ["Graph.addNode", "DataManager.addNode"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            return () => Promise.all(nodesOf(size / 4, size).map((node) => element.graph.addNode(node as never)));
        },
        check: (element, size) => {
            assert.strictEqual(drawn(element).nodes, size + size / 4);
        },
    },
    {
        methods: ["Graphty.addNode"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            return () => Promise.all(nodesOf(size / 4, size).map((node) => element.addNode(node as never)));
        },
        check: (element, size) => {
            assert.strictEqual(drawn(element).nodes, size + size / 4);
        },
    },
    {
        methods: ["Graph.addEdges", "DataManager.addEdges"],
        growth: "linear",
        prepare: async (element, size) => {
            await element.graph.addNodes(nodesOf(size));
            await settled(element.graph);
            return () => element.graph.addEdges(pathOf(size));
        },
        check: (element, size) => {
            assert.strictEqual(drawn(element).edges, size - 1);
        },
    },
    {
        methods: ["Graphty.addEdges"],
        growth: "linear",
        prepare: async (element, size) => {
            await element.graph.addNodes(nodesOf(size));
            await settled(element.graph);
            return () => element.addEdges(pathOf(size) as never);
        },
        check: (element, size) => {
            assert.strictEqual(drawn(element).edges, size - 1);
        },
    },
    {
        methods: ["Graphty.addEdge", "DataManager.addEdge"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            const chords = Array.from({ length: size / 4 }, (_, at) => ({
                source: `n${String(at)}`,
                target: `n${String(size - 1 - at)}`,
            }));
            return () => Promise.all(chords.map((edge) => element.addEdge(edge as never)));
        },
        check: (element, size) => {
            assert.strictEqual(drawn(element).edges, size - 1 + size / 4);
        },
    },
    {
        methods: ["Graph.setNodes", "DataManager.setNodes"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            // Half the nodes stay, half go with their edges, and as many new ones arrive.
            return () => element.graph.setNodes(nodesOf(size, size / 2));
        },
        check: (element, size) => {
            assert.strictEqual(drawn(element).nodes, size);
            assert.strictEqual(drawn(element).edges, size / 2 - 1);
        },
    },
    {
        methods: ["Graph.setEdges", "DataManager.setEdges"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            const skips = Array.from({ length: size - 2 }, (_, at) => ({
                source: `n${String(at)}`,
                target: `n${String(at + 2)}`,
            }));
            return () => element.graph.setEdges(skips);
        },
        check: (element, size) => {
            assert.strictEqual(drawn(element).edges, size - 2);
        },
    },
    {
        methods: ["Graph.removeNodes"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            return () => element.graph.removeNodes(nodesOf(size / 2).map(({ id }) => id));
        },
        check: (element, size) => {
            assert.strictEqual(drawn(element).nodes, size / 2);
        },
    },
    {
        methods: ["Graphty.removeNodes"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            return () => element.removeNodes(nodesOf(size / 2).map(({ id }) => id));
        },
        check: (element, size) => {
            assert.strictEqual(drawn(element).nodes, size / 2);
        },
    },
    {
        methods: ["DataManager.removeNodeAndIncidentEdges"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            const data = element.graph.getDataManager();
            return async () => {
                for (const { id } of nodesOf(size / 4)) {
                    data.removeNodeAndIncidentEdges(id);
                }

                await settled(element.graph);
            };
        },
        check: (element, size) => {
            assert.strictEqual(drawn(element).nodes, size - size / 4);
        },
    },
    {
        // With an edge selected, each removal finds the removed node's edges to deselect them:
        // its own edges, never a walk of every edge (issue #2788).
        methods: ["SelectionManager.onEdgesRemoved"],
        growth: "linear",
        // A removal does a few hundred visits of its own; a walk of every edge stands out from that
        // only once the graph holds more edges than that.
        sizes: [400, 1600],
        prepare: async (element, size) => {
            await fill(element, size);
            const data = element.graph.getDataManager();
            const ids = [...data.edges.keys()];
            // The first edge goes with n0, so the run deselects one edge while the far half of the
            // path stays selected.
            const kept = ids.slice(size / 2);
            const delta = await element.graph.getSession().selection.apply({ edges: [ids[0], ...kept] });
            assert.strictEqual(delta.edges, kept.length + 1, "the edges are selected");
            return async () => {
                for (const { id } of nodesOf(size / 4)) {
                    data.removeNodeAndIncidentEdges(id);
                }

                await settled(element.graph);
            };
        },
        check: (element, size) => {
            assert.strictEqual(drawn(element).nodes, size - size / 4);
            assert.strictEqual(drawn(element).edges, size - 1 - size / 4);
        },
    },
    {
        methods: ["Graph.removeEdges"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            const ids = halfTheEdges(element.graph);
            return () => element.graph.removeEdges(ids);
        },
        check: (element, size) => {
            assert.strictEqual(drawn(element).edges, Math.floor((size - 1) / 2));
        },
    },
    {
        methods: ["Graphty.removeEdges"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            const ids = halfTheEdges(element.graph);
            return () => element.removeEdges(ids);
        },
        check: (element, size) => {
            assert.strictEqual(drawn(element).edges, Math.floor((size - 1) / 2));
        },
    },
    {
        methods: ["Graph.updateNodes"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            return () => element.graph.updateNodes(nodesOf(size).map(({ id }, at) => ({ id, weight: at })));
        },
        check: (element) => {
            assert.strictEqual(element.graph.getDataManager().getNode("n3")?.data.weight, 3);
        },
    },
    {
        methods: ["Graphty.updateNodes"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            return () => element.updateNodes(nodesOf(size).map(({ id }, at) => ({ id, weight: at })));
        },
        check: (element) => {
            assert.strictEqual(element.graph.getDataManager().getNode("n3")?.data.weight, 3);
        },
    },
    {
        methods: ["Graph.updateEdges"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            const ids = [...element.graph.getDataManager().edges.keys()];
            return () => element.graph.updateEdges(ids.map((id, at) => ({ id, weight: at })));
        },
        check: (element) => {
            const [edge] = element.graph.getDataManager().edges.values();
            assert.strictEqual(edge.data.weight, 0);
        },
    },
    {
        methods: ["Graphty.updateEdges"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            const ids = [...element.graph.getDataManager().edges.keys()];
            return () => element.updateEdges(ids.map((id, at) => ({ id, weight: at })));
        },
        check: (element) => {
            const [edge] = element.graph.getDataManager().edges.values();
            assert.strictEqual(edge.data.weight, 0);
        },
    },
    {
        methods: ["Graph.clearData", "DataManager.clear"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            return async () => {
                element.graph.clearData();
                await settled(element.graph);
            };
        },
        check: (element) => {
            assert.deepStrictEqual(drawn(element), { nodes: 0, edges: 0 });
        },
    },
    {
        methods: ["Graphty.clearData"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            return async () => {
                element.clearData();
                await settled(element.graph);
            };
        },
        check: (element) => {
            assert.deepStrictEqual(drawn(element), { nodes: 0, edges: 0 });
        },
    },
    {
        methods: ["Graphty.setData"],
        growth: "linear",
        prepare: (element, size) =>
            Promise.resolve(async () => {
                element.setData({ nodes: nodesOf(size), edges: pathOf(size) });
                await settled(element.graph);
            }),
        check: (element, size) => {
            assert.deepStrictEqual(drawn(element), { nodes: size, edges: size - 1 });
        },
    },
    {
        methods: ["Graph.addDataFromSource", "DataManager.addDataFromSource"],
        growth: "linear",
        prepare: (element, size) =>
            Promise.resolve(() => element.graph.addDataFromSource("json", { data: jsonOf(size) })),
        check: (element, size) => {
            assert.deepStrictEqual(drawn(element), { nodes: size, edges: size - 1 });
        },
    },
    {
        methods: ["Graphty.addDataFromSource"],
        growth: "linear",
        prepare: (element, size) => Promise.resolve(() => element.addDataFromSource("json", { data: jsonOf(size) })),
        check: (element, size) => {
            assert.deepStrictEqual(drawn(element), { nodes: size, edges: size - 1 });
        },
    },
    {
        methods: ["SessionDataApi.import"],
        growth: "linear",
        prepare: (element, size) =>
            Promise.resolve(async () => {
                await element.graph.getSession().data.import({ type: "json", config: { data: jsonOf(size) } });
                await settled(element.graph);
            }),
        check: (element, size) => {
            assert.deepStrictEqual(drawn(element), { nodes: size, edges: size - 1 });
        },
    },
    {
        methods: ["LoadDraft.load"],
        growth: "linear",
        prepare: async (element, size) => {
            const draft = await element.graph
                .getSession()
                .data.prepare({ type: "json", config: { data: jsonOf(size) } });
            return async () => {
                await draft.load();
                await settled(element.graph);
            };
        },
        check: (element, size) => {
            assert.deepStrictEqual(drawn(element), { nodes: size, edges: size - 1 });
        },
    },
    {
        methods: ["Graph.loadFromFile"],
        growth: "linear",
        prepare: (element, size) =>
            Promise.resolve(() => element.graph.loadFromFile(new File([jsonOf(size)], "graph.json"))),
        check: (element, size) => {
            assert.deepStrictEqual(drawn(element), { nodes: size, edges: size - 1 });
        },
    },
    {
        methods: ["Graphty.loadFromFile"],
        growth: "linear",
        prepare: (element, size) => Promise.resolve(() => element.loadFromFile(new File([jsonOf(size)], "graph.json"))),
        check: (element, size) => {
            assert.deepStrictEqual(drawn(element), { nodes: size, edges: size - 1 });
        },
    },
    {
        methods: ["Graph.loadFromUrl"],
        growth: "linear",
        prepare: (element, size) => {
            const url = URL.createObjectURL(new Blob([jsonOf(size)], { type: "application/json" }));
            return Promise.resolve(() => element.graph.loadFromUrl(url, { format: "json" }));
        },
        check: (element, size) => {
            assert.deepStrictEqual(drawn(element), { nodes: size, edges: size - 1 });
        },
    },
    {
        methods: ["Graphty.loadFromUrl"],
        growth: "linear",
        prepare: (element, size) => {
            const url = URL.createObjectURL(new Blob([jsonOf(size)], { type: "application/json" }));
            return Promise.resolve(() => element.loadFromUrl(url, { format: "json" }));
        },
        check: (element, size) => {
            assert.deepStrictEqual(drawn(element), { nodes: size, edges: size - 1 });
        },
    },
    {
        methods: ["SessionDataApi.renameSource"],
        growth: "constant",
        prepare: async (element, size) => {
            await element.graph.getSession().data.import({ type: "json", config: { data: jsonOf(size) } });
            await settled(element.graph);
            // Settled too, so a repaint the rename defers to the derivation pass is counted (issue #2734).
            return async () => {
                await element.graph.getSession().data.renameSource("Renamed");
                await settled(element.graph);
            };
        },
        check: (element) => {
            assert.strictEqual(element.graph.getSession().data.source()?.name, "Renamed");
        },
    },
    {
        methods: ["SessionDataApi.removeSource"],
        growth: "linear",
        prepare: async (element, size) => {
            const { data } = element.graph.getSession();
            await data.import({ type: "json", config: { data: jsonOf(size) }, name: "first.json" });
            // A second load naming the first half again and as many new nodes.
            const second = JSON.stringify({ nodes: nodesOf(size, size / 2), edges: [] });
            await data.import({ type: "json", config: { data: second }, name: "second.json" }, { mode: "merge" });
            await settled(element.graph);
            return async () => {
                await data.removeSource(data.sources()[1].key);
                await settled(element.graph);
            };
        },
        check: (element, size) => {
            assert.deepStrictEqual(drawn(element), { nodes: size, edges: size - 1 });
        },
    },
    {
        methods: ["DataManager.reconcile"],
        growth: "linear",
        prepare: async (element, size) => {
            await fill(element, size);
            await element.graph.removeNodes(nodesOf(size / 2).map(({ id }) => id));
            // The undo puts half the graph back through the derivation lane's reconcile.
            return async () => {
                await element.graph.getSession().undo();
                await settled(element.graph);
            };
        },
        check: (element, size) => {
            assert.deepStrictEqual(drawn(element), { nodes: size, edges: size - 1 });
        },
    },
];

describe("the data path does work in proportion to its reach", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    for (const { methods, growth, superlinear, sizes, prepare, check } of CASES) {
        const reach = growth === "linear" ? "no more than linear in the graph" : "about the same at any size";
        // A call with an open superlinear issue is expected to fail, so the fix turns it green.
        const test = superlinear === undefined ? it : it.fails;
        const name = `${methods.join(", ")}: ${reach}`;
        test(superlinear === undefined ? name : `${name} (not yet: #${String(superlinear)})`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const element = await mount();
                    try {
                        const call = await prepare(element, size);
                        const visits = await visitsDuring(call);
                        check(element, size);
                        return visits;
                    } finally {
                        element.remove();
                    }
                },
                { sizes: sizes ?? SIZES, growth, counter: `elements visited by ${methods.join(", ")}` },
            );
        });
    }
});
