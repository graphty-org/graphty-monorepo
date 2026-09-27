/**
 * @file Runs as steps on a real `Graph`: the doors that run algorithms for the reader --
 * `runAlgorithm` with its suggested styles, the on-load algorithms of a command that adds rows,
 * and the template's algorithms -- each record one step, and undo takes it back whole. The session
 * half is `test/session/history/runs.test.ts`.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

/** Per-test budget: each builds a real Babylon scene. */
const TEST_TIMEOUT_MS = 30_000;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A real `Graph` holding `n1 -> n2 -> n3`, with an empty history.
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
    await graph.addNodes([{ id: "n1" }, { id: "n2" }, { id: "n3" }]);
    await graph.addEdges([
        { src: "n1", dst: "n2" },
        { src: "n2", dst: "n3" },
    ]);
    await operationQueueOf(graph).waitForCompletion();
    graph.getSession().history.clear();
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    return graph;
}

/**
 * Wait until the queue is empty and every pass has run.
 * @param graph - The graph.
 */
async function settled(graph: Graph): Promise<void> {
    await operationQueueOf(graph).waitForCompletion();
    await graph.getSession().styles.settled();
}

/**
 * The layers bound to runs of one algorithm.
 * @param graph - The graph.
 * @param algorithm - The algorithm.
 * @returns Their ids.
 */
function runLayers(graph: Graph, algorithm: string): string[] {
    return graph
        .getSession()
        .styles.list()
        .filter((layer) => layer.source.by === "run" && layer.source.algorithm === algorithm)
        .map((layer) => layer.id);
}

/**
 * Spy on the on-load algorithm entries a graph starts, letting them run.
 * @param graph - The graph.
 * @returns The spy.
 */
function watchOnLoad(graph: Graph): ReturnType<typeof vi.fn> {
    return vi.spyOn(graph as unknown as { runOnLoad(entry: unknown): Promise<void> }, "runOnLoad") as unknown as ReturnType<
        typeof vi.fn
    >;
}

describe("runs as steps on a renderer", () => {
    it(
        "runAlgorithm with applySuggestedStyles is one step, and one undo removes the run and its layers",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();

            await graph.runAlgorithm("graphty", "degree", { applySuggestedStyles: true });
            await settled(graph);

            assert.lengthOf(session.history.steps, 1);
            assert.lengthOf(session.runs.list(), 1);
            assert.isNotEmpty(runLayers(graph, "degree"));

            await session.undo();

            assert.lengthOf(session.runs.list(), 0);
            assert.deepEqual(runLayers(graph, "degree"), []);
            assert.isFalse(session.canUndo);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "addNodes with algorithms on load is one step: the on-load runs merge into it as deferred members",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();
            await session.config.set({ runAlgorithmsOnLoad: true, data: { algorithms: ["degree"] } });
            const steps = session.history.steps.length;
            const onLoad = watchOnLoad(graph);

            await graph.addNodes([{ id: "n4" }]);
            await settled(graph);

            assert.strictEqual(onLoad.mock.calls.length, 1, "started once");
            assert.lengthOf(session.history.steps, steps + 1, "the add and its run are one step");
            assert.lengthOf(session.runs.list(), 1);

            await session.undo();

            assert.isUndefined(graph.getDataManager().getNode("n4"));
            assert.lengthOf(session.runs.list(), 0, "one undo takes the run with the rows");
            assert.deepEqual(runLayers(graph, "degree"), []);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a replacing import starts the on-load algorithms once, and undoing a removal starts none",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();
            await session.config.set({ runAlgorithmsOnLoad: true, data: { algorithms: ["degree"] } });
            const onLoad = watchOnLoad(graph);

            await session.data.import({
                type: "json",
                config: {
                    data: JSON.stringify({ nodes: [{ id: "j1" }, { id: "j2" }], edges: [{ src: "j1", dst: "j2" }] }),
                },
            });
            await settled(graph);
            assert.strictEqual(onLoad.mock.calls.length, 1, "one import, one start");

            await graph.removeNodes(["j1"]);
            await settled(graph);
            await session.undo();
            await settled(graph);

            assert.isDefined(graph.getDataManager().getNode("j1"));
            assert.strictEqual(onLoad.mock.calls.length, 1, "undoing the removal started nothing");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "runAlgorithmsFromTemplate is one step",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();
            // Set without adding rows, so nothing has run them yet.
            await session.config.set({ runAlgorithmsOnLoad: true, data: { algorithms: ["degree", "pagerank"] } });
            const steps = session.history.steps.length;

            await graph.runAlgorithmsFromTemplate();
            await settled(graph);

            assert.lengthOf(session.history.steps, steps + 1);
            assert.lengthOf(session.runs.list(), 2);

            await session.undo();
            assert.lengthOf(session.runs.list(), 0);
        },
        TEST_TIMEOUT_MS,
    );
});
