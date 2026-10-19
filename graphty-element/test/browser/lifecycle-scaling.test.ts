/**
 * @file Counted-work scaling of the element's lifecycle: connecting a `<graphty-element>` that
 * already holds n or 4n nodes, and tearing one down -- `Graph.dispose`, `Graph.shutdown`,
 * `Graphty.shutdown`, `disconnectedCallback` -- with n or 4n nodes drawn. The elements visited
 * (see `visitsDuring`) may grow no faster than the data: 4x, never 16x (issue #2745).
 *
 * Connecting an empty element has no size, so connect is measured with its data assigned
 * beforehand: the count covers the connect and first-update callbacks, `Graph.init`, every
 * manager's `init`, the opening layout engine's `init`, and loading the assigned data.
 *
 * Teardown frees everything, so it is linear in what the graph holds: the session, every
 * manager's `dispose`, the layout engine's `dispose`, the meshes and the scene.
 *
 * `DataManager.bindSession`, `DataManager.setGraphContext` and `LayoutManager.setGraphContext` are
 * not counted here: the graph calls them from its constructor, before it can hold data, and each
 * only stores a reference, so they visit nothing at any size and there is no count to compare.
 *
 * No frame runs while work is counted: a frame walks every node, and how many frames fit in an
 * await is a matter of time, not of work. Strict state is off, as it is for a consumer.
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/** The two graph sizes: big enough that a quadratic path is 16x, small enough to stay cheap. */
const SIZES = [100, 400] as const;

/**
 * An element, not yet connected, with `size` nodes and a path through them assigned.
 * @param size - The node count.
 * @returns The element.
 */
function withData(size: number): Graphty {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    element.layout = "random";
    element.nodeData = Array.from({ length: size }, (_, at) => ({ id: `n${String(at)}` }));
    element.edgeData = Array.from({ length: size - 1 }, (_, at) => ({
        source: `n${String(at)}`,
        target: `n${String(at + 1)}`,
    }));
    return element;
}

/**
 * Connect an element and wait until its graph is up and its data loaded, with the render loop
 * stopped the moment it starts, before any frame.
 * @param element - An element from {@link withData}.
 */
async function connect(element: Graphty): Promise<void> {
    const started = new Promise<void>((done) => {
        element.addEventListener("graph-started", () => {
            element.graph.engine.stopRenderLoop();
            done();
        });
    });
    document.body.appendChild(element);
    await element.updateComplete;
    await started;
    await operationQueueOf(element.graph).waitForCompletion();
    await dispatcherOf(element.graph.getSession()).lane.settled();
}

/**
 * How many nodes and edges the element's graph holds.
 * @param element - The element.
 * @returns The counts.
 */
function held(element: Graphty): { nodes: number; edges: number } {
    const data = element.graph.getDataManager();
    return { nodes: data.nodes.size, edges: data.edges.size };
}

/** A teardown call, counted on a connected element holding `size` nodes. */
interface Teardown {
    /** Every public method (`Owner.method`, as the cost-coverage registry spells it) it covers. */
    readonly methods: readonly string[];
    /** The call. */
    run(element: Graphty): void;
}

const TEARDOWNS: readonly Teardown[] = [
    {
        methods: [
            "Graph.dispose",
            "Graph.shutdown",
            "GraphSession.dispose",
            "Manager.dispose",
            "AlgorithmManager.dispose",
            "DataManager.dispose",
            "LayoutManager.dispose",
            "LayoutEngine.dispose",
            "RenderManager.dispose",
            "SelectionManager.dispose",
            "UpdateManager.dispose",
        ],
        run: (element) => {
            element.graph.dispose();
        },
    },
    {
        methods: ["Graphty.shutdown"],
        run: (element) => {
            element.shutdown();
        },
    },
    {
        methods: ["Graphty.disconnectedCallback"],
        run: (element) => {
            element.remove();
        },
    },
];

describe("the lifecycle does work in proportion to the data", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    const connectMethods = [
        "Graphty.connectedCallback",
        "Graphty.firstUpdated",
        "Graphty.asyncFirstUpdated",
        "Graph.init",
        "Manager.init",
        "AlgorithmManager.init",
        "DataManager.init",
        "LayoutManager.init",
        "LayoutEngine.init",
        "RenderManager.init",
        "SelectionManager.init",
        "UpdateManager.init",
    ];
    it(`${connectMethods.join(", ")}: no more than linear in the assigned data`, async () => {
        await assertScalesLinearly(
            async (size) => {
                const element = withData(size);
                try {
                    const visits = await visitsDuring(() => connect(element));
                    assert.isTrue(element.graph.initialized, "the element initialised its graph");
                    assert.deepStrictEqual(held(element), { nodes: size, edges: size - 1 });
                    return visits;
                } finally {
                    element.remove();
                }
            },
            { sizes: SIZES, counter: "elements visited connecting an element with its data assigned" },
        );
    });

    for (const { methods, run } of TEARDOWNS) {
        it(`${methods.join(", ")}: no more than linear in the graph`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const element = withData(size);
                    try {
                        await connect(element);
                        assert.deepStrictEqual(held(element), { nodes: size, edges: size - 1 });
                        const visits = await visitsDuring(() => {
                            run(element);
                        });
                        assert.isFalse(element.graph.initialized, "the graph was shut down");
                        assert.deepStrictEqual(held(element), { nodes: 0, edges: 0 }, "nothing is held");
                        return visits;
                    } finally {
                        element.remove();
                    }
                },
                { sizes: SIZES, counter: `elements visited by ${methods.join(", ")}` },
            );
        });
    }
});
