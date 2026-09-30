/**
 * @file The layout and the dimension as undoable steps, on a real `Graph`.
 *
 * Choosing a layout keeps the engine that was chosen and its options, so undo brings back d3, not
 * the catalogue's default engine for the same layout. Switching between 2D and 3D, and undoing
 * the switch, leaves every reading of the dimension agreeing with the `layout` slice: the graph
 * context, the engine, the scene's record and the merged configuration. A layout whose pre-steps
 * are still computing when it is undone or replaced publishes nothing, and the nodes go back to
 * where they were. A transaction whose layout settles before it closes is undone to where the
 * nodes were before it. A failed entry into VR from 2D records nothing and stays 2D. And the
 * element's `layout` and `layoutConfig`, assigned in one tick, are one step.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import { laneOf } from "../../src/session/GraphSession";
import type { GraphSession } from "../../src/session/types";

/** Per-test budget: each builds a real Babylon scene. */
const TEST_TIMEOUT_MS = 30_000;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }

    vi.restoreAllMocks();
});

/**
 * A real `Graph` holding a small graph, laid out in one pass.
 * @returns The graph.
 */
async function loadedGraph(): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    await graph.setLayout("circular");
    await graph.addNodes([{ id: "n1" }, { id: "n2" }, { id: "n3" }, { id: "n4" }]);
    await graph.addEdges([
        { src: "n1", dst: "n2" },
        { src: "n2", dst: "n3" },
        { src: "n3", dst: "n4" },
    ]);
    await operationQueueOf(graph).waitForCompletion();
    await atRest(graph);
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    return graph;
}

/**
 * Settles once the layout has come to rest and a frame has been drawn since.
 * @param graph - The graph.
 */
async function atRest(graph: Graph): Promise<void> {
    await graph.waitForSettled();
    for (let wait = 0; wait < 1000 && graph.getLayoutManager().running; wait++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
    }

    for (let frame = 0; frame < 2; frame++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }
}

/**
 * A copy of the positions lane.
 * @param session - The session.
 * @returns The coordinates, stride 3.
 */
function lane(session: GraphSession): number[] {
    return [...laneOf(session).view(session.snapshot().nodeCount)];
}

/**
 * Every reading of the dimension agrees with the `layout` slice.
 * @param graph - The graph.
 * @param dimension - What the slice should hold.
 * @param what - For the messages.
 */
function agrees(graph: Graph, dimension: "2d" | "3d", what: string): void {
    const twoD = dimension === "2d";
    const context = (graph as unknown as { graphContext: { is2D(): boolean } }).graphContext;
    assert.strictEqual(graph.getSession().layout.dimension, dimension, `${what}: the slice`);
    assert.strictEqual(context.is2D(), twoD, `${what}: GraphContext.is2D`);
    assert.strictEqual(graph.getLayoutManager().dimension, twoD ? 2 : 3, `${what}: the engine's dimension`);
    assert.strictEqual(graph.getScene().metadata?.twoD, twoD, `${what}: scene.metadata.twoD`);

    assert.strictEqual(graph.styles.config.graph.twoD, twoD, `${what}: Styles.config.graph.twoD`);
    assert.strictEqual(graph.styles.config.graph.viewMode, dimension, `${what}: Styles.config.graph.viewMode`);
}

/**
 * Hold every simulation pre-step chunk at a gate until it is opened, the way a GPU readback
 * that has not landed yet holds one, and count what simulations publish meanwhile.
 * @returns The gate: whether a chunk is waiting, how to open it, and the publish count.
 */
function gatePreSteps(): { waiting: () => boolean; open: () => void; published: () => number } {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    let waiting = false;
    let published = 0;
    const step = SimulationLayoutEngine.prototype.stepAsync;
    vi.spyOn(SimulationLayoutEngine.prototype, "stepAsync").mockImplementation(async function (
        this: SimulationLayoutEngine,
        iterations: number,
    ) {
        waiting = true;
        await gate;
        return step.call(this, iterations);
    });
    const publish = SimulationLayoutEngine.prototype.publishPositions;
    vi.spyOn(SimulationLayoutEngine.prototype, "publishPositions").mockImplementation(function (
        this: SimulationLayoutEngine,
    ) {
        published++;
        publish.call(this);
    });
    return { waiting: () => waiting, open: release, published: () => published };
}

describe("the layout as a step", () => {
    it(
        "undo brings back the alternate engine that was chosen, with its options",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();

            await session.layout.set("force", { engine: "d3", options: { alphaMin: 0.2 } });
            await session.layout.set("circular");
            assert.strictEqual(graph.getLayoutManager().layoutType, "circular");

            await session.undo();
            assert.strictEqual(session.layout.id, "force");
            assert.strictEqual(session.layout.engine, "d3");
            assert.deepEqual(session.layout.options, { alphaMin: 0.2 });
            assert.strictEqual(graph.getLayoutManager().layoutType, "d3", "the engine itself came back");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "3D to 2D and back, and each undone, leaves every reading of the dimension agreeing",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();
            agrees(graph, "3d", "opening");

            await session.layout.setDimension("2d");
            agrees(graph, "2d", "3D to 2D");
            await session.undo();
            agrees(graph, "3d", "3D to 2D undone");
            await session.redo();
            agrees(graph, "2d", "3D to 2D redone");

            await session.layout.setDimension("3d");
            agrees(graph, "3d", "2D to 3D");
            await session.undo();
            agrees(graph, "2d", "2D to 3D undone");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "undo while the pre-steps are in flight publishes nothing and puts the nodes back",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();
            await session.config.set({ layoutBehavior: { preSteps: 600 } });
            const before = lane(session);
            const gate = gatePreSteps();

            const set = session.layout.set("force", { engine: "spring" });
            const refused = set.then(
                () => null,
                (error: unknown) => (error as { name?: string }).name,
            );
            await vi.waitFor(() => {
                assert.isTrue(gate.waiting(), "a pre-step chunk is in flight");
            });

            const undone = session.undo();
            gate.open();
            await undone;

            assert.strictEqual(await refused, "AbortError");
            assert.strictEqual(gate.published(), 0, "nothing the cancelled layout computed was published");
            assert.strictEqual(session.layout.engine, "circular");
            assert.strictEqual(graph.getLayoutManager().layoutType, "circular");
            assert.deepEqual(lane(session), before, "the nodes are where they were before the layout");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a second layout while the first one's pre-steps are in flight: the first publishes nothing",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();
            await session.config.set({ layoutBehavior: { preSteps: 600 } });
            const steps = session.history.steps.length;
            const gate = gatePreSteps();

            const first = session.layout.set("force", { engine: "spring" }).then(
                () => null,
                (error: unknown) => (error as { name?: string }).name,
            );
            await vi.waitFor(() => {
                assert.isTrue(gate.waiting(), "a pre-step chunk is in flight");
            });

            const second = session.layout.set("spiral");
            gate.open();
            await second;

            assert.strictEqual(await first, "AbortError", "the first layout was replaced");
            assert.strictEqual(gate.published(), 0, "nothing the replaced layout computed was published");
            assert.strictEqual(session.layout.engine, "spiral");
            assert.strictEqual(graph.getLayoutManager().layoutType, "spiral");
            assert.lengthOf(session.history.steps, steps + 1, "only the second layout is a step");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a layout that settles inside a transaction is undone to where the nodes were before it",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();
            const before = lane(session);

            await session.transaction("Laid out again", async (tx) => {
                await tx.layout.set("spiral");
                // The new layout comes to rest while the transaction is still open.
                await atRest(graph);
            });
            assert.notDeepEqual(lane(session), before, "the layout moved the nodes");

            await session.undo();
            await atRest(graph);
            assert.deepEqual(lane(session), before);
            assert.strictEqual(session.layout.engine, "circular");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a failed entry into VR from 2D records nothing and stays 2D",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();
            await graph.setViewMode("2d");
            const steps = session.history.steps.length;

            // This browser has no WebXR, so entry fails.
            await graph.setViewMode("vr");

            assert.lengthOf(session.history.steps, steps, "no step for a switch the reader never got");
            assert.strictEqual(graph.getViewMode(), "2d");
            agrees(graph, "2d", "after the failed entry");
        },
        TEST_TIMEOUT_MS,
    );
});

describe("the layout behaviour's layout type", () => {
    it(
        "chooses the layout it names, in the same step as the settings beside it",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();
            const steps = session.history.steps.length;

            graph.setLayoutBehavior({ layout: { type: "spiral", preSteps: 3 } });
            await vi.waitFor(() => {
                assert.lengthOf(session.history.pending, 0);
                assert.strictEqual(session.layout.engine, "spiral");
            });

            assert.lengthOf(session.history.steps, steps + 1);
            assert.strictEqual(session.config.layoutBehavior.preSteps, 3);

            await session.undo();
            assert.strictEqual(session.layout.engine, "circular");
            assert.notStrictEqual(session.config.layoutBehavior.preSteps, 3);
        },
        TEST_TIMEOUT_MS,
    );
});

describe("the element's layout properties", () => {
    it(
        "layout then layoutConfig in one tick is one step",
        async () => {
            const element = document.createElement("graphty-element");
            element.style.display = "block";
            element.style.width = "400px";
            element.style.height = "300px";
            document.body.appendChild(element);
            cleanups.push(() => {
                element.remove();
            });
            await element.updateComplete;
            await operationQueueOf(element.graph).waitForCompletion();
            await element.graph.addNodes([{ id: "n1" }, { id: "n2" }]);
            const { session } = element;
            const steps = session.history.steps.length;

            element.layout = "circular";
            element.layoutConfig = { scale: 2 };
            await vi.waitFor(() => {
                assert.lengthOf(session.history.pending, 0);
            });

            assert.lengthOf(session.history.steps, steps + 1);
            assert.strictEqual(session.layout.engine, "circular");
            assert.deepEqual(session.layout.options, { scale: 2 });
            assert.strictEqual(element.layout, "circular");
            assert.deepEqual(element.layoutConfig, { scale: 2 });

            await session.undo();
            assert.strictEqual(element.layout, undefined, "one undo takes both back to the default");
        },
        TEST_TIMEOUT_MS,
    );
});
