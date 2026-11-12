/**
 * @file Counted-work scaling of one selection change and the frame's mask pass that draws it
 * (`UpdateManager.syncViewMasks`), on a path of n and of 4n nodes. Selecting or deselecting one
 * node should cost about the same at any graph size; the mask pass used to walk every node and
 * every edge whenever the selection moved (issue #2899). Counted, never timed: see `visitsDuring`.
 *
 * The render loop is stopped, so no frame runs on its own; each call is counted together with the
 * mask pass, which is the part of a frame a selection change starts.
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

const SIZES = [400, 1600] as const;

/**
 * Settle the graph and run the frame's mask pass, which is what puts a selection on screen.
 * @param element - The element.
 */
async function drawn(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await dispatcherOf(element.graph.getSession()).lane.settled();
    element.getUpdateManager().syncViewMasks();
}

/**
 * Mount a graphty-element with its render loop stopped and a drawn path of `size` nodes, which
 * has shown one halo already (the first halo in a scene builds the shared halo source once).
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
    const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
    await element.graph.addNodes(ids.map((id) => ({ id })));
    await element.graph.addEdges(ids.slice(1).map((target, at) => ({ source: ids[at], target })));
    await drawn(element);
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

/**
 * The edges drawn as selected.
 * @param element - The element.
 * @returns Their ids.
 */
function selectedEdges(element: Graphty): string[] {
    return [...element.graph.getDataManager().edges.values()].filter((edge) => edge.isSelected()).map((e) => e.id);
}

interface Case {
    /** Every public method (`Owner.method`) the call covers. */
    readonly methods: readonly string[];
    /**
     * Build the state the call needs and return the call.
     * @param element - The mounted element.
     * @returns The call, which resolves once its work is drawn.
     */
    prepare(element: Graphty): Promise<() => Promise<unknown>>;
    /** The nodes drawn as selected afterwards. */
    readonly after: readonly string[];
}

/**
 * Select n1 and draw it, then hand back `call`.
 * @param element - The element.
 * @param call - The call to count.
 * @returns The call.
 */
async function afterSelectingN1(element: Graphty, call: () => unknown): Promise<() => Promise<unknown>> {
    element.graph.selectNode("n1");
    await drawn(element);
    return async () => {
        call();
        await drawn(element);
    };
}

const CASES: readonly Case[] = [
    {
        methods: ["Graph.select"],
        prepare: (element) =>
            Promise.resolve(async () => {
                await element.graph.select({ nodes: ["n1"] });
                await drawn(element);
            }),
        after: ["n1"],
    },
    {
        methods: ["Graphty.select"],
        prepare: (element) =>
            Promise.resolve(async () => {
                await element.select({ nodes: ["n1"] });
                await drawn(element);
            }),
        after: ["n1"],
    },
    {
        methods: ["Graph.selectNode", "SelectionManager.selectById", "SelectionManager.select"],
        // From one selected node to another: the old halo goes, the new one comes.
        prepare: (element) => afterSelectingN1(element, () => element.graph.selectNode("n2")),
        after: ["n2"],
    },
    {
        methods: ["Graphty.selectNode"],
        prepare: (element) =>
            Promise.resolve(async () => {
                assert.isTrue(element.selectNode("n1"));
                await drawn(element);
            }),
        after: ["n1"],
    },
    {
        methods: ["Graph.deselectNode", "SelectionManager.deselect"],
        prepare: (element) => afterSelectingN1(element, () => element.graph.deselectNode()),
        after: [],
    },
    {
        methods: ["Graphty.deselectNode"],
        prepare: (element) => afterSelectingN1(element, () => element.deselectNode()),
        after: [],
    },
];

describe("one selection change and the mask pass that draws it", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    for (const { methods, prepare, after } of CASES) {
        it(`${methods.join(", ")}: about the same work at any graph size`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const element = await mount(size);
                    try {
                        const call = await prepare(element);
                        const visits = await visitsDuring(call);
                        assert.deepStrictEqual(haloed(element), [...after]);
                        return visits;
                    } finally {
                        element.remove();
                    }
                },
                { sizes: SIZES, growth: "constant", counter: `elements visited by ${methods.join(", ")}` },
            );
        });
    }

    it("draws an edge selection change and its undoing with the same states a full pass draws", async () => {
        const element = await mount(20);
        try {
            const edges = [...element.graph.getDataManager().edges.keys()].slice(2, 5);
            await element.graph.select({ nodes: ["n3", "n4"], edges });
            await drawn(element);
            assert.deepStrictEqual(haloed(element), ["n3", "n4"]);
            assert.deepStrictEqual(selectedEdges(element), edges);

            await element.graph.select({ nodes: ["n4", "n9"], edges: edges.slice(1) });
            await drawn(element);
            assert.deepStrictEqual(haloed(element), ["n4", "n9"]);
            assert.deepStrictEqual(selectedEdges(element), edges.slice(1));

            // A full pass from scratch must agree with the delta.
            element.getUpdateManager().invalidateViewMasks();
            await drawn(element);
            assert.deepStrictEqual(haloed(element), ["n4", "n9"]);
            assert.deepStrictEqual(selectedEdges(element), edges.slice(1));

            await element.graph.select({ nodes: [] });
            await drawn(element);
            assert.deepStrictEqual(haloed(element), []);
            assert.deepStrictEqual(selectedEdges(element), []);
        } finally {
            element.remove();
        }
    });
});
