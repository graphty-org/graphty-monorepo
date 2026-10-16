/**
 * @file Counted-work scaling of selection: the selection style, the per-element selected state and
 * halo, how the selection hears about removals, and rebinding the `SelectionManager`. Each runs on
 * a graph of n and of 4n nodes, and the elements it visits (Map, Set and Array iterator steps and
 * array scans, see `visitsDuring`) may grow no faster than the call's own reach: a rebind about the
 * same at any size, a removal notification in proportion to the removal. Counted, never timed
 * (issue #1643). Selecting and deselecting one node is counted in `selection-mask-scaling.test.ts`.
 *
 * The render loop is stopped, as in `data-path-scaling.test.ts`, so no frame runs on its own. A
 * selection is not on screen until a frame's mask pass has drawn it, so each call is counted
 * together with that pass (`UpdateManager.syncViewMasks`), which is the part of a frame a
 * selection change starts; the rest of a frame walks every node whatever changed.
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import type { SelectionOwner } from "../../src/session/selection/SelectionApi";
import { assertScalesLinearly, type Growth, visitsDuring } from "../helpers/cost";

/** The two graph sizes: big enough that a walk of the graph is 4x, small enough to stay cheap. */
const SIZES = [400, 1600] as const;

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
 * Settle the graph and run the frame's mask pass, which is what puts a selection on screen.
 * @param element - The element.
 */
async function drawn(element: Graphty): Promise<void> {
    await settled(element.graph);
    element.getUpdateManager().syncViewMasks();
}

/**
 * Mount a graphty-element with its render loop stopped, a static layout, and a path of `size`
 * nodes drawn.
 * @param size - The node count.
 * @returns The element.
 */
async function mount(size: number): Promise<Graphty> {
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
    const ids = idsOf(size);
    await element.graph.addNodes(ids.map((id) => ({ id })));
    await element.graph.addEdges(ids.slice(1).map((target, at) => ({ source: ids[at], target })));
    await drawn(element);
    // The first halo builds the one source mesh every halo is an instance of, once per scene;
    // selecting and clearing a node here leaves it built, so each case counts a selection change
    // on a graph that has shown one before.
    await element.graph.select({ nodes: ["n0"] });
    await drawn(element);
    await element.graph.select({ nodes: [] });
    await drawn(element);
    return element;
}

/**
 * The nodes drawn as selected.
 * @param element - The element.
 * @returns Their ids.
 */
function haloed(element: Graphty): string[] {
    return [...element.graph.getDataManager().nodes.values()]
        .filter((node) => node.isSelected())
        .map((node) => String(node.id));
}

/** The work one call does, counted. */
interface Case {
    /** Every public method (`Owner.method`, as the cost-coverage registry spells it) the call covers. */
    readonly methods: readonly string[];
    /** `linear` when the call reaches every node, `constant` when it reaches one record. */
    readonly growth: Growth;
    /**
     * Build the state the call needs and return the call.
     * @param element - A mounted element holding a drawn path of `size` nodes.
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

const CASES: readonly Case[] = [
    {
        // Selecting half the graph sets half the nodes' and half the edges' selected state.
        methods: ["Node.setSelected", "Edge.setSelected"],
        growth: "linear",
        prepare: (element, size) => {
            const edges = [...element.graph.getDataManager().edges.keys()].slice(0, size / 2);
            return Promise.resolve(async () => {
                await element.graph.select({ nodes: idsOf(size / 2), edges });
                await drawn(element);
            });
        },
        check: (element, size) => {
            assert.strictEqual(haloed(element).length, size / 2);
            const selectedEdges = [...element.graph.getDataManager().edges.values()].filter((edge) =>
                edge.isSelected(),
            );
            assert.strictEqual(selectedEdges.length, size / 2);
        },
    },
    {
        // A project setting: one step through the history, then every node's halo is redrawn.
        methods: ["Graph.setSelectionStyle", "Node.refreshSelectionOverlay"],
        growth: "linear",
        prepare: async (element) => {
            element.graph.selectNode("n1");
            await drawn(element);
            return async () => {
                element.graph.setSelectionStyle({ color: "#ff0000" });
                await drawn(element);
            };
        },
        check: (element) => {
            assert.strictEqual(element.graph.styles.config.graph.selection?.color.toLowerCase(), "#ff0000");
            assert.deepStrictEqual(haloed(element), ["n1"]);
        },
    },
    {
        // A quarter of the graph selected and then removed: each removal takes its node out of
        // the selection.
        methods: ["SelectionManager.onNodeRemoved"],
        growth: "linear",
        prepare: async (element, size) => {
            const selection = element.getSelectionManager();
            const data = element.graph.getDataManager();
            for (const id of idsOf(size / 4)) {
                const node = data.getNode(id);
                assert.isDefined(node);
                selection.toggle(node);
            }

            await drawn(element);
            return async () => {
                await element.graph.removeNodes(idsOf(size / 4));
                await drawn(element);
            };
        },
        check: (element, size) => {
            assert.strictEqual(element.graph.getDataManager().nodes.size, size - size / 4);
            assert.deepStrictEqual(element.graph.getSession().selection.nodes, []);
            assert.deepStrictEqual(haloed(element), []);
        },
    },
    {
        // Rebinding the manager to the session's selection and the data manager, then reading
        // the selection back through it.
        methods: ["SelectionManager.bindSelection", "SelectionManager.setDataManager"],
        growth: "constant",
        prepare: async (element) => {
            element.graph.selectNode("n1");
            await drawn(element);
            const manager = element.getSelectionManager();
            const owner = element.graph.getSession().selection as SelectionOwner;
            const data = element.graph.getDataManager();
            return () => {
                manager.setDataManager(data);
                manager.bindSelection(owner);
                assert.strictEqual(manager.getSelectedNode()?.id, "n1");
                return Promise.resolve();
            };
        },
        check: (element) => {
            assert.deepStrictEqual(haloed(element), ["n1"]);
        },
    },
];

describe("selection does work in proportion to its reach", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    for (const { methods, growth, prepare, check } of CASES) {
        const reach = growth === "linear" ? "no more than linear in the graph" : "about the same at any size";
        it(`${methods.join(", ")}: ${reach}`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const element = await mount(size);
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
