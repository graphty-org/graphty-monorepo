/**
 * @file Counted-work scaling of the frame loop and the repaints: the update pass (`Graph.update`,
 * `UpdateManager.update`, `stepFrames`, `renderFrames`), the draw (`Graph.render`), the view
 * masks, the style sync, the arrangement redraw, the label animations, `styles.highlight()` and `styles.mark()`,
 * run on a graph of n and of 4n nodes. The elements each call visits (Map, Set and Array iterator
 * steps and array scans, see `visitsDuring`) may grow no faster than the graph. Counted, never
 * timed (issue #1643).
 *
 * A method that only records something for the next frame -- a flag, a binding, a configuration
 * -- is counted together with the one update pass that acts on it, because that pass is where its
 * cost lands. Every case also checks that the work happened: the pass ran, the frame was drawn,
 * the masks or the paint reached every element. A count of work that never happened cannot pass.
 *
 * The render loop is stopped and every frame is driven by hand, as `bulk-teardown.test.ts` does,
 * and strict state is off, as it is for a consumer (see `data-path-scaling.test.ts`).
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import type { UpdateManager } from "../../src/managers/UpdateManager";
import { RichTextLabel } from "../../src/meshes/RichTextLabel";
import { Node } from "../../src/Node";
import { dispatcherOf } from "../../src/session/GraphSession";
import { assertScalesLinearly, type Growth, visitsDuring } from "../helpers/cost";

/** The two graph sizes: big enough that a quadratic path is 16x, small enough to stay cheap. */
const SIZES = [100, 400] as const;

type Graph = Graphty["graph"];

/**
 * Mount a graphty-element with `size` nodes on a path, its render loop stopped, a static layout,
 * and every frame the load owes already drawn, so a counted frame starts from a graph at rest.
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
    const { graph } = element;
    graph.engine.stopRenderLoop();
    await graph.setLayout("random");
    const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
    await graph.addNodes(ids.map((id) => ({ id })));
    await graph.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
    await settled(graph);
    updateManagerOf(graph).renderFrames(3);
    return element;
}

/**
 * Wait until every queued operation has run and every style edit has been derived. With the
 * render loop stopped, what was derived reaches the meshes only on the next update pass.
 * @param graph - The graph.
 */
async function settled(graph: Graph): Promise<void> {
    await graph.waitForSettled();
    await operationQueueOf(graph).waitForCompletion();
    await dispatcherOf(graph.getSession()).lane.settled();
}

/**
 * The graph's update manager, which the graph keeps private and its frame loop runs through.
 * @param graph - The graph.
 * @returns Its manager.
 */
function updateManagerOf(graph: Graph): UpdateManager {
    return (graph as unknown as { updateManager: UpdateManager }).updateManager;
}

/** How many times a prototype method was called while a counter was installed. */
interface CallCount {
    /** Every call. */
    calls: number;
    /** Every call that returned `true`, for a setter that says whether it changed anything. */
    changed: number;
}

/**
 * Count the calls to a method on every instance of a class, until `restore` is called.
 * @param proto - The class prototype.
 * @param name - The method.
 * @returns The live count and the function that takes the counter off.
 */
function countCalls(proto: object, name: string): { count: CallCount; restore: () => void } {
    const target = proto as Record<string, (...args: unknown[]) => unknown>;
    const original = target[name];
    const count: CallCount = { calls: 0, changed: 0 };
    target[name] = function (this: unknown, ...args: unknown[]) {
        const result = original.apply(this, args);
        count.calls++;
        count.changed += result === true ? 1 : 0;
        return result;
    };
    return {
        count,
        restore: () => {
            target[name] = original;
        },
    };
}

/**
 * Count the frames the scene draws across `call`.
 * @param graph - The graph.
 * @param call - The call.
 * @returns How many frames were drawn.
 */
async function drawsDuring(graph: Graph, call: () => unknown): Promise<number> {
    let draws = 0;
    const watcher = graph.scene.onAfterRenderObservable.add(() => {
        draws++;
    });
    try {
        await call();
    } finally {
        graph.scene.onAfterRenderObservable.remove(watcher);
    }
    return draws;
}

/**
 * A call, and a check that it drew `frames` frames and ran `passes` update passes.
 * @param graph - The graph.
 * @param frames - The frames it should draw.
 * @param passes - The update passes it should run.
 * @param call - The call.
 * @param check - Anything more to assert afterwards.
 * @returns The call to count, and the check run after it.
 */
function drawing(
    graph: Graph,
    frames: number,
    passes: number,
    call: () => unknown,
    check: () => void = () => undefined,
): { call: () => Promise<void>; check: () => void } {
    const manager = updateManagerOf(graph);
    const before = manager.getRenderFrameCount();
    let drawn = -1;
    return {
        call: async () => {
            drawn = await drawsDuring(graph, call);
        },
        check: () => {
            assert.strictEqual(drawn, frames, "the frames drawn");
            assert.strictEqual(manager.getRenderFrameCount(), before + passes, "the update passes run");
            check();
        },
    };
}

/** One call under test. */
interface Case {
    /** Every public method (`Owner.method`, as the cost-coverage registry spells it) the call covers. */
    readonly methods: readonly string[];
    /** `linear` (the default) when the call reaches every element, `constant` when it reaches none. */
    readonly growth?: Growth;
    /**
     * Build the state the call needs and return the call, and the check that it did its work.
     * @param element - A mounted element at rest.
     * @param size - Its node count.
     * @returns The call to count, and the check run after it.
     */
    prepare(element: Graphty, size: number): Promise<{ call: () => unknown; check: () => void }>;
}

/**
 * Count calls to `name` on `proto` across `call`, and hand the count to `check`.
 * @param proto - The class prototype.
 * @param name - The method.
 * @param call - The call to count across.
 * @param check - Asserts on the count once the call is over.
 * @returns The call to count, and the check run after it.
 */
function counting(
    proto: object,
    name: string,
    call: () => unknown,
    check: (count: CallCount) => void,
): { call: () => Promise<void>; check: () => void } {
    let count: CallCount = { calls: 0, changed: 0 };
    return {
        call: async () => {
            const counter = countCalls(proto, name);
            try {
                await call();
            } finally {
                counter.restore();
            }
            ({ count } = counter);
        },
        check: () => {
            check(count);
        },
    };
}

/**
 * Hide the two ends of the path (the only nodes of degree 1), so the masks have moved.
 * @param graph - The graph.
 */
async function hideEnds(graph: Graph): Promise<void> {
    await graph.getSession().visibility.set({ kind: "degree", min: 2 });
    await settled(graph);
}

const CASES: readonly Case[] = [
    {
        // A frame on a graph at rest walks no edge; what it still visits is every node, to find
        // out whether one moved (`anyNodeMoved`), which is the floor the code documents.
        methods: ["Graph.update", "UpdateManager.update"],
        prepare: (element) =>
            Promise.resolve(
                counting(
                    Edge.prototype,
                    "update",
                    () => element.graph.update(),
                    (count) => {
                        assert.strictEqual(count.calls, 0, "a frame at rest walks no edge");
                        assert.isAbove(updateManagerOf(element.graph).getRenderFrameCount(), 3, "the pass ran");
                    },
                ),
            ),
    },
    {
        methods: ["UpdateManager.stepFrames"],
        prepare: (element) => {
            const manager = updateManagerOf(element.graph);
            return Promise.resolve(
                drawing(element.graph, 0, 3, () => {
                    manager.stepFrames(3);
                }),
            );
        },
    },
    {
        methods: ["UpdateManager.renderFrames"],
        prepare: (element) => {
            const manager = updateManagerOf(element.graph);
            return Promise.resolve(
                drawing(element.graph, 3, 3, () => {
                    manager.renderFrames(3);
                }),
            );
        },
    },
    {
        // A draw of a graph at rest reuses the frozen list of what is drawn, so it costs the same
        // at any size (see `settleActiveMeshFreeze`).
        methods: ["Graph.render"],
        growth: "constant",
        prepare: (element) =>
            Promise.resolve(
                drawing(element.graph, 1, 0, () => {
                    element.graph.render();
                }),
            ),
    },
    {
        methods: ["UpdateManager.forceEdgeWalk"],
        prepare: (element, size) => {
            const manager = updateManagerOf(element.graph);
            return Promise.resolve(
                counting(
                    Edge.prototype,
                    "update",
                    () => {
                        manager.forceEdgeWalk();
                        manager.update();
                    },
                    (count) => {
                        assert.strictEqual(count.calls, size - 1, "the next pass visited every edge");
                    },
                ),
            );
        },
    },
    {
        methods: ["UpdateManager.redrawArrangement"],
        prepare: (element, size) => {
            const manager = updateManagerOf(element.graph);
            return Promise.resolve(
                counting(
                    Node.prototype,
                    "update",
                    () => {
                        manager.redrawArrangement(true);
                    },
                    (count) => {
                        assert.strictEqual(count.calls, size, "every node was placed");
                    },
                ),
            );
        },
    },
    {
        methods: ["UpdateManager.invalidateViewMasks"],
        prepare: (element, size) => {
            const manager = updateManagerOf(element.graph);
            return Promise.resolve(
                counting(
                    Node.prototype,
                    "setRenderState",
                    () => {
                        manager.invalidateViewMasks();
                        manager.update();
                    },
                    (count) => {
                        assert.strictEqual(count.calls, size, "the next pass wrote the masks to every node");
                    },
                ),
            );
        },
    },
    {
        methods: ["UpdateManager.bindViewMasks"],
        prepare: async (element, size) => {
            await hideEnds(element.graph);
            const manager = updateManagerOf(element.graph);
            manager.update();
            const first = element.graph.getNode("n0");
            assert.strictEqual(first?.getRenderState(), "hidden", "the filter hid the end of the path");
            return counting(
                Node.prototype,
                "setRenderState",
                () => {
                    // Unbound, the whole graph is drawn: the next pass shows the hidden ends again.
                    manager.bindViewMasks(null);
                    manager.update();
                },
                (count) => {
                    assert.strictEqual(count.calls, size, "the next pass wrote every node");
                    assert.strictEqual(count.changed, 2, "and showed the two hidden ends");
                },
            );
        },
    },
    {
        methods: ["UpdateManager.syncViewMasks"],
        prepare: async (element, size) => {
            await hideEnds(element.graph);
            const manager = updateManagerOf(element.graph);
            return counting(
                Node.prototype,
                "setRenderState",
                () => {
                    manager.syncViewMasks();
                },
                (count) => {
                    assert.strictEqual(count.calls, size, "every node was given the mask's answer");
                    assert.strictEqual(count.changed, 2, "and the two ends were hidden");
                },
            );
        },
    },
    {
        methods: ["UpdateManager.syncStyles"],
        prepare: async (element, size) => {
            const { graph } = element;
            await graph
                .getSession()
                .styles.add({ name: "Red", selector: { match: "everything" }, set: { "node.color": "#ff0000" } });
            await settled(graph);
            const painter = graph.getStylePainter();
            assert.isTrue(painter.hasPending, "the repaint is waiting for the next pass");
            const manager = updateManagerOf(graph);
            return counting(
                Node.prototype,
                "applySessionPaint",
                () => {
                    manager.syncStyles();
                },
                (count) => {
                    assert.strictEqual(count.calls, size, "every node was repainted");
                    assert.isFalse(painter.hasPending, "and nothing is left to paint");
                },
            );
        },
    },
    {
        methods: ["UpdateManager.drawArrivedPaint"],
        prepare: async (element, size) => {
            const { graph } = element;
            await graph
                .getSession()
                .styles.add({ name: "Red", selector: { match: "everything" }, set: { "node.color": "#ff0000" } });
            await settled(graph);
            const painter = graph.getStylePainter();
            assert.isTrue(painter.hasPending, "the repaint is waiting for the next pass");
            const manager = updateManagerOf(graph);
            return counting(
                Node.prototype,
                "applySessionPaint",
                () => {
                    manager.drawArrivedPaint();
                },
                (count) => {
                    assert.strictEqual(count.calls, size, "every node was repainted");
                    assert.isFalse(painter.hasPending, "and nothing is left to paint");
                },
            );
        },
    },
    {
        methods: ["StylesApi.highlight"],
        prepare: async (element, size) => {
            const { graph } = element;
            const route = graph.run(
                "shortest-path",
                { source: "n0", target: `n${String(size - 1)}` },
                { style: false },
            );
            await route;
            await settled(graph);
            updateManagerOf(graph).update();
            let kinds: string[] = [];
            const painting = counting(
                Node.prototype,
                "applySessionPaint",
                async () => {
                    const layers = await graph.getSession().styles.highlight({ run: route.id });
                    kinds = layers.map((layer) => `${layer.target} ${layer.kind}`);
                    await settled(graph);
                    updateManagerOf(graph).update();
                },
                (count) => {
                    assert.deepStrictEqual(kinds, ["node highlight", "edge highlight"], "both halves highlighted");
                    assert.strictEqual(count.calls, size, "every node on the route was painted");
                },
            );
            return painting;
        },
    },
    {
        methods: ["StylesApi.mark"],
        prepare: async (element, size) => {
            const { graph } = element;
            const route = graph.run(
                "shortest-path",
                { source: "n0", target: `n${String(size - 1)}` },
                { style: false },
            );
            await route;
            await settled(graph);
            updateManagerOf(graph).update();
            let kinds: string[] = [];
            return counting(
                Node.prototype,
                "applySessionPaint",
                async () => {
                    const layers = await graph
                        .getSession()
                        .styles.mark({ run: route.id, set: { "node.color": "#D55E00", "edge.color": "#D55E00" } });
                    kinds = layers.map((layer) => `${layer.target} ${layer.kind}`);
                    await settled(graph);
                    updateManagerOf(graph).update();
                },
                (count) => {
                    assert.deepStrictEqual(kinds, ["node encoding", "edge encoding"], "both halves marked");
                    assert.strictEqual(count.calls, size, "every node on the route was painted");
                },
            );
        },
    },
    {
        methods: ["DataManager.startLabelAnimations"],
        prepare: async (element, size) => {
            const { graph } = element;
            await graph
                .getSession()
                .styles.add({ name: "Labels", selector: { match: "everything" }, set: { "node.label": "x" } });
            await settled(graph);
            updateManagerOf(graph).renderFrames(1);
            return counting(
                RichTextLabel.prototype,
                "startAnimation",
                () => {
                    graph.getDataManager().startLabelAnimations();
                },
                (count) => {
                    assert.strictEqual(count.calls, size, "every node's label was started");
                },
            );
        },
    },
    {
        methods: ["UpdateManager.meshesAdded"],
        prepare: async (element) => {
            const manager = updateManagerOf(element.graph);
            // The layout settles, and the shaders compile in the background, a few frames on.
            await vi.waitFor(() => {
                element.graph.update();
                element.graph.render();
                assert.isTrue(manager.frameIsStable, manager.whyFrameIsNotStable());
            });
            let stableAfterCall = true;
            return drawing(
                element.graph,
                1,
                1,
                () => {
                    manager.meshesAdded();
                    stableAfterCall = manager.frameIsStable;
                    manager.renderFrames(1);
                },
                () => {
                    assert.isFalse(stableAfterCall, "new meshes made the finished picture unfinished");
                },
            );
        },
    },
    {
        methods: ["UpdateManager.rebindScene"],
        prepare: (element) => {
            const { graph } = element;
            const manager = updateManagerOf(graph);
            const { observers } = graph.scene.onAfterRenderObservable;
            let added = 0;
            return Promise.resolve(
                drawing(
                    graph,
                    1,
                    1,
                    () => {
                        const watchers = observers.length;
                        manager.rebindScene(graph.camera);
                        added = observers.length - watchers;
                        manager.renderFrames(1);
                    },
                    () => {
                        assert.strictEqual(added, 1, "the manager watches the scene's draws");
                    },
                ),
            );
        },
    },
    {
        methods: ["UpdateManager.updateConfig"],
        prepare: (element) => {
            const manager = updateManagerOf(element.graph);
            return Promise.resolve(
                drawing(element.graph, 1, 1, () => {
                    manager.updateConfig({ layoutStepMultiplier: 2 });
                    manager.renderFrames(1);
                }),
            );
        },
    },
    {
        methods: ["DataManager.updateStyles"],
        prepare: (element) => {
            const { graph } = element;
            const data = graph.getDataManager();
            return Promise.resolve(
                drawing(
                    graph,
                    1,
                    1,
                    () => {
                        data.updateStyles(graph.styles);
                        updateManagerOf(graph).renderFrames(1);
                    },
                    () => {
                        assert.strictEqual((data as unknown as { styles: unknown }).styles, graph.styles);
                    },
                ),
            );
        },
    },
    {
        methods: ["LayoutManager.updateStyles"],
        prepare: (element) => {
            const { graph } = element;
            const layout = graph.getLayoutManager();
            return Promise.resolve(
                drawing(
                    graph,
                    1,
                    1,
                    () => {
                        layout.updateStyles(graph.styles);
                        updateManagerOf(graph).renderFrames(1);
                    },
                    () => {
                        assert.strictEqual((layout as unknown as { styles: unknown }).styles, graph.styles);
                    },
                ),
            );
        },
    },
    {
        // Lit renders nothing: the element's container is placed in the shadow root when it
        // connects (e63ee191b9) and the element's update skips Lit's template render, so an update
        // never moves it -- and the frame after the update draws the graph in that container.
        // render() still returns the container, as released.
        methods: ["Graphty.render", "Graphty.update"],
        prepare: (element) => {
            let rendered: unknown;
            let before: ChildNode[] = [];
            return Promise.resolve(
                drawing(
                    element.graph,
                    1,
                    1,
                    async () => {
                        rendered = element.render();
                        before = [...element.renderRoot.childNodes];
                        element.requestUpdate();
                        await element.updateComplete;
                        updateManagerOf(element.graph).renderFrames(1);
                    },
                    () => {
                        assert.instanceOf(rendered, Element, "render returns the graph container");
                        assert.isTrue(rendered.contains(element.graph.canvas));
                        const after = [...element.renderRoot.childNodes];
                        assert.isTrue(
                            after.length === before.length && after.every((node, i) => node === before[i]),
                            "an update adds, removes and moves nothing in the shadow root",
                        );
                        assert.isTrue(
                            element.renderRoot.contains(element.graph.canvas),
                            "the drawing stays in the shadow root",
                        );
                    },
                ),
            );
        },
    },
];

describe("the frame loop and the repaints do work in proportion to the graph", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    for (const { methods, growth = "linear", prepare } of CASES) {
        const reach = growth === "linear" ? "no more than linear in the graph" : "about the same at any size";
        it(`${methods.join(", ")}: ${reach}`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const element = await mount(size);
                    try {
                        const { call, check } = await prepare(element, size);
                        const visits = await visitsDuring(call);
                        check();
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

// A finished run's layer repaints every node, and applying 3,214 nodes' paint in one frame took
// 450 ms at a 6x CPU throttle. A frame now paints in batches and stops starting batches once its
// time is up. Given no time at all, each frame paints exactly one batch.
describe("a repaint of every node", () => {
    it("is drawn across several frames, one batch a frame when the frame has no time to spare", async () => {
        const size = 400;
        const element = await mount(size);
        try {
            const { graph } = element;
            await graph
                .getSession()
                .styles.add({ name: "Red", selector: { match: "everything" }, set: { "node.color": "#ff0000" } });
            await settled(graph);
            const painter = graph.getStylePainter();
            assert.isTrue(painter.hasPending, "the repaint is waiting for the next frame");
            const manager = updateManagerOf(graph);

            const perFrame: number[] = [];
            while (painter.hasPending && perFrame.length < size) {
                const counter = countCalls(Node.prototype, "applySessionPaint");
                try {
                    manager.syncStyles(0);
                } finally {
                    counter.restore();
                }
                perFrame.push(counter.count.calls);
            }

            assert.deepStrictEqual(perFrame, [128, 128, 128, 16], "every node once, one batch of 128 a frame");
            assert.isFalse(painter.hasPending, "and nothing is left to paint");
        } finally {
            element.remove();
        }
    });
});
