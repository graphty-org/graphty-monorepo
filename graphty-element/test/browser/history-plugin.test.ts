/**
 * @file A plugin algorithm with no catalogue descriptor, run on a real `Graph`, is one undoable
 * step: what it writes onto node and edge records and `graphResults`, the doors it calls on the
 * graph it was handed, and the suggested styles asked for with it, are recorded together, and
 * one undo takes them all back. The plugins are in `test/helpers/legacyPlugins.ts`.
 */

import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { LEGACY_NAMESPACE } from "../helpers/legacyPlugins";

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
 * What a node's or edge's record says the plugin wrote.
 * @param data - The record.
 * @returns Its `algorithmResults`, or undefined.
 */
function resultsOf(data: object): unknown {
    return (data as { algorithmResults?: unknown }).algorithmResults;
}

describe("a plugin algorithm without a descriptor is one step", () => {
    it(
        "writing nested results on nodes and edges and a graph value is one step, and undo removes all three",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();
            const data = graph.getDataManager();
            const before = graph.getNode("n1")?.data;

            await graph.runAlgorithm(LEGACY_NAMESPACE, "write-everywhere");

            assert.lengthOf(session.history.steps, 1);
            assert.deepEqual(resultsOf(graph.getNode("n1")?.data ?? {}), {
                fixture: { "write-everywhere": { seen: true, id: "n1" } },
            });
            const [edge] = data.edges.values();
            assert.deepEqual(resultsOf(edge.data), { fixture: { "write-everywhere": { seen: true } } });
            assert.deepEqual(data.graphResults as unknown, { fixture: { "write-everywhere": { nodes: 3 } } });
            assert.deepEqual(
                session.data.node("n1") as unknown,
                graph.getNode("n1")?.data as unknown,
                "the session reads the same record",
            );
            assert.isUndefined(resultsOf(before ?? {}), "the record the graph held before was never written");

            await session.undo();

            assert.isUndefined(resultsOf(graph.getNode("n1")?.data ?? {}));
            assert.isUndefined(resultsOf(edge.data));
            assert.isUndefined(data.graphResults);

            await session.redo();

            assert.deepEqual(resultsOf(graph.getNode("n2")?.data ?? {}), {
                fixture: { "write-everywhere": { seen: true, id: "n2" } },
            });
            assert.deepEqual(data.graphResults as unknown, { fixture: { "write-everywhere": { nodes: 3 } } });
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a nested write copies only its own subtree and keeps its siblings",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();
            await graph.runAlgorithm(LEGACY_NAMESPACE, "write-everywhere");
            const first = graph.getNode("n1")?.data;

            await graph.runAlgorithm(LEGACY_NAMESPACE, "write-nested");

            assert.lengthOf(session.history.steps, 2);
            assert.deepEqual(resultsOf(graph.getNode("n1")?.data ?? {}), {
                fixture: { "write-everywhere": { seen: true, id: "n1" }, nested: { depth: 2 } },
            });
            assert.deepEqual(resultsOf(first ?? {}), { fixture: { "write-everywhere": { seen: true, id: "n1" } } });

            await session.undo();
            assert.deepEqual(resultsOf(graph.getNode("n1")?.data ?? {}), {
                fixture: { "write-everywhere": { seen: true, id: "n1" } },
            });
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a plugin whose run calls addNodes and styles.add yields exactly one step",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();
            const layers = session.styles.list().length;

            await graph.runAlgorithm(LEGACY_NAMESPACE, "calls-doors");
            await operationQueueOf(graph).waitForCompletion();
            await session.styles.settled();

            assert.lengthOf(session.history.steps, 1);
            assert.isDefined(graph.getNode("from-plugin"));
            assert.lengthOf(session.styles.list(), layers + 1);

            await session.undo();

            assert.isUndefined(graph.getNode("from-plugin"));
            assert.lengthOf(session.styles.list(), layers);
            assert.isFalse(session.canUndo);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "runAlgorithm with applySuggestedStyles for a descriptor-less plugin is one step",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();

            await graph.runAlgorithm(LEGACY_NAMESPACE, "write-everywhere", { applySuggestedStyles: true });
            await session.styles.settled();

            assert.lengthOf(session.history.steps, 1);

            await session.undo();
            assert.isUndefined(resultsOf(graph.getNode("n1")?.data ?? {}));
            assert.isFalse(session.canUndo);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a plugin that fails leaves nothing behind and records no step",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();

            let failed: unknown;
            try {
                await graph.runAlgorithm(LEGACY_NAMESPACE, "writes-then-fails");
            } catch (error) {
                failed = error;
            }

            assert.instanceOf(failed, Error);
            assert.lengthOf(session.history.steps, 0);
            assert.isUndefined(graph.getNode("doomed"));
            assert.isUndefined((graph.getNode("n1")?.data as { marked?: unknown }).marked);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "an edit made while a plugin runs is a step of its own",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();

            const running = graph.runAlgorithm(LEGACY_NAMESPACE, "calls-doors");
            await session.styles.add({
                name: "Meanwhile",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "#ff0000" },
            });
            await running;
            await operationQueueOf(graph).waitForCompletion();

            assert.lengthOf(session.history.steps, 2);
            await session.undo();
            await session.undo();
            assert.isUndefined(graph.getNode("from-plugin"));
            assert.notInclude(
                session.styles.list().map((layer) => layer.name),
                "Meanwhile",
            );
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a data edit made while a plugin runs cancels the run, as a data edit cancels any run in progress, and is a step of its own",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();

            const running = graph.runAlgorithm(LEGACY_NAMESPACE, "calls-doors");
            await session.data.updateNodes([{ id: "n1", values: { weight: 5 } }]);
            const cancelled = await Promise.resolve(running).then(
                () => false,
                (error: unknown) => (error as { name?: string }).name === "AbortError",
            );
            await operationQueueOf(graph).waitForCompletion();

            assert.isTrue(cancelled, "the run was cancelled");
            assert.isUndefined(graph.getNode("from-plugin"), "and wrote nothing");
            assert.lengthOf(session.history.steps, 1);
            await session.undo();
            assert.isUndefined((graph.getNode("n1")?.data as { weight?: unknown }).weight);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "outside a plugin run, graphResults cannot be written",
        async () => {
            const graph = await loadedGraph();
            assert.throws(() => {
                (graph.getDataManager() as { graphResults?: unknown }).graphResults = { nope: true };
            }, /graphResults/);
        },
        TEST_TIMEOUT_MS,
    );
});
