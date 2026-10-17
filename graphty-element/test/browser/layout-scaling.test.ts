/**
 * @file Counted-work scaling of layout, positions and pinning: every public way to switch a layout
 * or what it runs over, step a live one, hand it a restored arrangement, place a node and pin or
 * release one -- on the `<graphty-element>` element, on `Graph`, on the managers and the layout
 * engine they reach, and on the session -- runs on a graph of n and of 4n nodes, and the elements it
 * visits (Map, Set and Array iterator steps and array scans, see `visitsDuring`) may grow no faster
 * than the call's own reach. A layout switch or a step touches every node and may grow 4x, never
 * 16x. Counted, never timed (issue #1643).
 *
 * A call that places, pins or releases one node is measured as the bulk path a consumer writes
 * with it -- n/4 calls in a loop -- so a cost per call that grows with the graph shows up as a
 * quadratic loop.
 *
 * A call whose work grows faster than its reach today is an expected failure naming the issue
 * that records it, so the fix turns it green and its methods move into the registry.
 *
 * The render loop is stopped, so no frame runs while a call is counted, and strict state is off,
 * as it is for a consumer (see `data-path-scaling.test.ts`).
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { ElementPositions } from "../../src/data/positions";
import { operationQueueOf } from "../../src/Graph";
import { layoutEngineInternals } from "../../src/layout/LayoutEngine";
import { dispatcherOf } from "../../src/session/GraphSession";
import { assertScalesLinearly, type Growth, visitsDuring } from "../helpers/cost";

/** The two graph sizes: big enough that a quadratic path is 16x, small enough to stay cheap. */
const SIZES = [100, 400] as const;

type Graph = Graphty["graph"];

/**
 * The ids of nodes `n<from>` to `n<from + count - 1>`.
 * @param count - How many.
 * @param from - The first node's number.
 * @returns The ids.
 */
function idsOf(count: number, from = 0): string[] {
    return Array.from({ length: count }, (_, at) => `n${String(from + at)}`);
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
 * Mount a graphty-element with its render loop stopped, holding `size` nodes on a path under the
 * given layout.
 * @param size - The node count.
 * @param layout - The layout engine to run.
 * @returns The element.
 */
async function mount(size: number, layout: string): Promise<Graphty> {
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
    await element.graph.setLayout(layout);
    const ids = idsOf(size);
    await element.graph.addNodes(ids.map((id) => ({ id })));
    await element.graph.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
    await settled(element.graph);
    return element;
}

/**
 * The graph's nodes, in id order.
 * @param graph - The graph.
 * @param ids - The ids.
 * @returns The nodes.
 */
function nodesNamed(graph: Graph, ids: readonly string[]): NonNullable<ReturnType<Graph["getNode"]>>[] {
    return ids.map((id) => {
        const node = graph.getNode(id);
        assert.isDefined(node, `the graph holds ${id}`);
        return node;
    });
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
    /** The layout engine the graph runs before the call; `random` when absent. */
    readonly layout?: string;
    /**
     * Build the state the call needs and return the call.
     * @param element - A mounted element holding a path of `size` nodes.
     * @param size - The graph size.
     * @returns The call to count; it resolves once its work is drawn.
     */
    prepare(element: Graphty, size: number): Promise<() => Promise<unknown>> | (() => Promise<unknown>);
    /**
     * Check the call did what it says, so a count of work that never happened cannot pass.
     * @param element - The element after the call.
     * @param size - The graph size.
     */
    check(element: Graphty, size: number): void;
}

/**
 * How many of the graph's nodes are pinned.
 * @param element - The element.
 * @returns The count.
 */
function pinnedCount(element: Graphty): number {
    return element.graph.getSession().positions.pinned.size;
}

/**
 * Run a call and wait for its work to be drawn.
 * @param element - The element.
 * @param call - The call.
 * @returns The call, waiting for the graph to settle after it.
 */
function andSettle(element: Graphty, call: () => unknown): () => Promise<void> {
    return async () => {
        await call();
        await settled(element.graph);
    };
}

/** Where node `n1` sat before a call, per element, for a check that the call moved it. */
const before = new WeakMap<Graphty, { x: number; y: number; z: number }>();

/**
 * Where node `n1` is published.
 * @param element - The element.
 * @returns Its coordinates.
 */
function firstNodeAt(element: Graphty): { x: number; y: number; z: number } {
    const [node] = nodesNamed(element.graph, ["n1"]);
    const out = { x: 0, y: 0, z: 0 };
    assert.isTrue(element.graph.getLayoutManager().layoutEngine?.readNodePosition(node, out), "n1 has a place");
    return out;
}

const CASES: readonly Case[] = [
    {
        methods: [
            "Graph.setLayout",
            "DataManager.setLayoutEngine",
            "LayoutEngine.addNodes",
            "LayoutEngine.addNode",
            "LayoutEngine.addEdges",
            "LayoutEngine.addEdge",
        ],
        growth: "linear",
        prepare: (element) => andSettle(element, () => element.graph.setLayout("circular")),
        check: (element) => {
            assert.strictEqual(element.graph.getLayoutManager().layoutType, "circular");
        },
    },
    {
        methods: ["Graphty.setLayout"],
        growth: "linear",
        prepare: (element) => andSettle(element, () => element.setLayout("circular")),
        check: (element) => {
            assert.strictEqual(element.graph.getLayoutManager().layoutType, "circular");
        },
    },
    {
        methods: ["SessionLayout.set"],
        growth: "linear",
        prepare: (element) => andSettle(element, () => element.graph.getSession().layout.set("circular")),
        check: (element) => {
            assert.strictEqual(element.graph.getSession().layout.id, "circular");
        },
    },
    {
        methods: ["SessionLayout.setDimension"],
        growth: "linear",
        prepare: (element) => andSettle(element, () => element.graph.getSession().layout.setDimension("2d")),
        check: (element) => {
            assert.strictEqual(element.graph.getSession().layout.dimension, "2d");
        },
    },
    {
        methods: ["Graph.setLayoutBehavior"],
        growth: "constant",
        prepare: (element) =>
            andSettle(element, () => {
                element.graph.setLayoutBehavior({ layout: { preSteps: 7 } });
            }),
        check: (element) => {
            assert.strictEqual(element.graph.getSession().config.layoutBehavior.preSteps, 7);
        },
    },
    {
        methods: ["Graph.setLayoutScope", "LayoutEngine.setHoldMask"],
        growth: "linear",
        layout: "ngraph",
        prepare: (element, size) => andSettle(element, () => element.graph.setLayoutScope({ nodes: idsOf(size / 2) })),
        check: (element) => {
            assert.isNotNull(element.graph.getLayoutManager().layoutEngine?.holdMask ?? null, "the rest is held");
        },
    },
    {
        methods: ["LayoutManager.step", "LayoutManager.stepBatch", "LayoutEngine.step"],
        growth: "linear",
        layout: "ngraph",
        prepare: (element) => {
            const manager = element.graph.getLayoutManager();
            manager.running = true;
            before.set(element, firstNodeAt(element));
            return () => {
                for (let at = 0; at < 5; at++) {
                    manager.stepBatch();
                }

                return Promise.resolve();
            };
        },
        check: (element) => {
            assert.notDeepEqual(firstNodeAt(element), before.get(element), "the steps moved a node");
        },
    },
    {
        // A host hands the engine an array of its own and has it publish every node into it.
        methods: ["LayoutEngine.attachPositions", "LayoutEngine.publishPositions", "LayoutEngine.writeNodePosition"],
        growth: "linear",
        layout: "circular",
        prepare: (element) => {
            const engine = element.graph.getLayoutManager().layoutEngine;
            assert.isDefined(engine);
            return () => {
                layoutEngineInternals.attachPositions(engine, new ElementPositions(0));
                engine.publishPositions();
                return Promise.resolve();
            };
        },
        check: (element, size) => {
            const positions = element.graph.getLayoutManager().layoutEngine?.nodePositions;
            assert.isAtLeast(positions?.count ?? 0, size, "every node was published into the attached array");
            assert.isTrue(positions?.isPlaced(size - 1), "the last node has a place");
        },
    },
    {
        methods: ["LayoutManager.loadArrangement", "LayoutEngine.loadArrangement", "LayoutEngine.setNodePosition"],
        growth: "linear",
        layout: "ngraph",
        prepare: (element) => () => {
            element.graph.getLayoutManager().loadArrangement(true);
            return Promise.resolve();
        },
        check: (element, size) => {
            assert.strictEqual([...element.graph.getLayoutManager().nodes].length, size);
        },
    },
    {
        methods: ["LayoutManager.updatePositions", "LayoutEngine.updatePositions"],
        growth: "linear",
        layout: "ngraph",
        prepare: (element, size) => {
            const nodes = nodesNamed(element.graph, idsOf(size / 4));
            return () => element.graph.getLayoutManager().updatePositions(nodes);
        },
        check: (element) => {
            assert.isTrue(element.graph.getLayoutManager().running, "the layout runs again");
        },
    },
    {
        methods: ["Graphty.pin"],
        growth: "linear",
        prepare: (element, size) =>
            andSettle(element, () => {
                for (const id of idsOf(size / 4)) {
                    element.pin(id);
                }
            }),
        check: (element, size) => {
            assert.strictEqual(pinnedCount(element), size / 4);
        },
    },
    {
        methods: ["Graphty.unpin"],
        growth: "linear",
        prepare: async (element, size) => {
            element.pin(idsOf(size / 4));
            await settled(element.graph);
            return andSettle(element, () => {
                for (const id of idsOf(size / 4)) {
                    element.unpin(id);
                }
            });
        },
        check: (element) => {
            assert.strictEqual(pinnedCount(element), 0);
        },
    },
    {
        methods: ["Node.pin", "LayoutEngine.pin"],
        growth: "linear",
        layout: "ngraph",
        prepare: (element, size) => {
            const nodes = nodesNamed(element.graph, idsOf(size / 4));
            return andSettle(element, () => {
                for (const node of nodes) {
                    node.pin();
                }
            });
        },
        check: (element, size) => {
            assert.strictEqual(pinnedCount(element), size / 4);
        },
    },
    {
        methods: ["Node.unpin", "LayoutEngine.unpin"],
        growth: "linear",
        layout: "ngraph",
        prepare: async (element, size) => {
            element.pin(idsOf(size / 4));
            await settled(element.graph);
            const nodes = nodesNamed(element.graph, idsOf(size / 4));
            return andSettle(element, () => {
                for (const node of nodes) {
                    node.unpin();
                }
            });
        },
        check: (element) => {
            assert.strictEqual(pinnedCount(element), 0);
        },
    },
    {
        methods: ["SessionPositions.pin"],
        growth: "linear",
        prepare: (element, size) =>
            andSettle(element, () =>
                Promise.all(idsOf(size / 4).map((id) => element.graph.getSession().positions.pin([id]))),
            ),
        check: (element, size) => {
            assert.strictEqual(pinnedCount(element), size / 4);
        },
    },
    {
        methods: ["SessionPositions.unpin"],
        growth: "linear",
        prepare: async (element, size) => {
            const { positions } = element.graph.getSession();
            await positions.pin(idsOf(size / 4));
            await settled(element.graph);
            return andSettle(element, () => Promise.all(idsOf(size / 4).map((id) => positions.unpin([id]))));
        },
        check: (element) => {
            assert.strictEqual(pinnedCount(element), 0);
        },
    },
    {
        methods: ["SessionPositions.set"],
        growth: "linear",
        prepare: (element, size) =>
            andSettle(element, () =>
                Promise.all(
                    idsOf(size / 4).map((id, at) =>
                        element.graph.getSession().positions.set([{ id, x: at, y: 1, z: 2 }]),
                    ),
                ),
            ),
        check: (element) => {
            const out = { x: 0, y: 0, z: 0 };
            const node = element.graph.getNode("n3");
            assert.isDefined(node);
            assert.isTrue(element.graph.getLayoutManager().layoutEngine?.readNodePosition(node, out));
            assert.deepStrictEqual(out, { x: 3, y: 1, z: 2 });
        },
    },
];

describe("layout, positions and pinning do work in proportion to their reach", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    for (const { methods, growth, superlinear, layout, prepare, check } of CASES) {
        const reach = growth === "linear" ? "no more than linear in the graph" : "about the same at any size";
        // A call with an open superlinear issue is expected to fail, so the fix turns it green.
        const test = superlinear === undefined ? it : it.fails;
        const name = `${methods.join(", ")}: ${reach}`;
        test(superlinear === undefined ? name : `${name} (not yet: #${String(superlinear)})`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const element = await mount(size, layout ?? "random");
                    try {
                        const call = await prepare(element, size);
                        const visits = await visitsDuring(call);
                        check(element, size);
                        return visits;
                    } finally {
                        element.remove();
                    }
                },
                { sizes: SIZES, growth, counter: `elements visited by ${methods.join(", ")}` },
            );
        });
    }
});
