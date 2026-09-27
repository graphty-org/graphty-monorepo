/**
 * @file Graph additions on a real `Graph`: what undo, redo and a forward add do besides the rows.
 *
 * A command that adds rows starts the layout, frames the camera and runs the on-load algorithms,
 * once. Undo and redo move the rows and the render objects and announce it, with the cause, but
 * start nothing: no layout, no run, no camera move. A load through a data source is the same: one
 * step, with the same forward effects once. The session half is
 * `test/session/history/graph-add.test.ts`.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import type { ElementsRemovedEvent, GraphDataAddedEvent } from "../../src/events";
import { Graph, operationQueueOf } from "../../src/Graph";

/** Per-test budget: each builds a real Babylon scene. */
const TEST_TIMEOUT_MS = 30_000;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** The private parts of a `Graph` these tests watch. */
interface Watched {
    autoFrame(): void;
    runOnLoad(entry: unknown): Promise<void>;
    statsManager: { startLayoutSession(): void };
}

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
 * Spy on what a forward add starts.
 * @param graph - The graph.
 * @returns The three spies.
 */
function watch(graph: Graph): { layout: ReturnType<typeof vi.fn>; frame: ReturnType<typeof vi.fn>; run: ReturnType<typeof vi.fn> } {
    const watched = graph as unknown as Watched;
    return {
        layout: vi.spyOn(watched.statsManager, "startLayoutSession") as unknown as ReturnType<typeof vi.fn>,
        frame: vi.spyOn(watched, "autoFrame") as unknown as ReturnType<typeof vi.fn>,
        run: vi.spyOn(watched, "runOnLoad").mockResolvedValue(undefined) as unknown as ReturnType<typeof vi.fn>,
    };
}

/**
 * Collect the element's data events from here on.
 * @param graph - The graph.
 * @returns What arrived.
 */
function events(graph: Graph): { added: GraphDataAddedEvent[]; removed: ElementsRemovedEvent[] } {
    const seen = { added: [] as GraphDataAddedEvent[], removed: [] as ElementsRemovedEvent[] };
    const manager = graph.getEventManager();
    manager.addListener("data-added", (event) => {
        seen.added.push(event as GraphDataAddedEvent);
    });
    manager.addListener("elements-removed", (event) => {
        seen.removed.push(event as ElementsRemovedEvent);
    });
    return seen;
}

describe("graph additions on a renderer", () => {
    it(
        "a forward add starts the layout, frames the camera and runs the on-load algorithms once",
        async () => {
            const graph = await loadedGraph();
            await graph.getSession().config.set({ runAlgorithmsOnLoad: true, data: { algorithms: ["degree"] } });
            const spies = watch(graph);
            const seen = events(graph);

            await graph.addNodes([{ id: "n4" }, { id: "n5" }]);

            assert.isAbove(spies.layout.mock.calls.length, 0, "the layout started");
            assert.isAbove(spies.frame.mock.calls.length, 0, "the camera framed");
            assert.strictEqual(spies.run.mock.calls.length, 1, "one on-load run for one command");
            assert.deepEqual(
                seen.added.map((event) => event.cause),
                ["command"],
            );
            assert.isDefined(graph.getDataManager().getNode("n4"));
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "undo removes the render objects and says so with cause undo, starting nothing",
        async () => {
            const graph = await loadedGraph();
            await graph.getSession().config.set({ runAlgorithmsOnLoad: true, data: { algorithms: ["degree"] } });
            await graph.addNodes([{ id: "n4" }]);
            await graph.addEdges([{ src: "n3", dst: "n4" }]);
            // The on-load runs are deferred members of each add: finished, they are part of its
            // step, where still going, the first undo would cancel them instead.
            await operationQueueOf(graph).waitForCompletion();
            const spies = watch(graph);
            const seen = events(graph);
            const data = graph.getDataManager();

            await graph.getSession().undo();
            await graph.getSession().undo();

            assert.isUndefined(data.getNode("n4"));
            assert.strictEqual(data.edges.size, 2);
            assert.deepEqual(
                seen.removed.map((event) => [event.cause, event.nodes, event.edges]),
                [
                    ["undo", [], ["2"]],
                    ["undo", ["n4"], []],
                ],
            );
            assert.strictEqual(spies.layout.mock.calls.length, 0, "no layout started");
            assert.strictEqual(spies.frame.mock.calls.length, 0, "the camera did not move");
            assert.strictEqual(spies.run.mock.calls.length, 0, "no run started");

            await graph.getSession().redo();
            await graph.getSession().redo();

            assert.isDefined(data.getNode("n4"));
            assert.strictEqual(data.edges.size, 3);
            assert.isDefined(data.getEdge("2"), "the edge came back under its own id");
            assert.deepEqual(
                seen.added.map((event) => [event.cause, event.dataType]),
                [
                    ["redo", "nodes"],
                    ["redo", "edges"],
                ],
            );
            assert.strictEqual(spies.layout.mock.calls.length + spies.frame.mock.calls.length, 0);
            assert.strictEqual(spies.run.mock.calls.length, 0);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "Node.data reads the record the graph holds, across an edit, its undo and its redo",
        async () => {
            const graph = await loadedGraph();
            const node = graph.getDataManager().getNode("n1");
            assert.isDefined(node);

            await graph.updateNodes([{ id: "n1", name: "one" }]);
            assert.strictEqual(node.data.name, "one");
            await graph.getSession().undo();
            assert.isUndefined(node.data.name);
            await graph.getSession().redo();
            assert.strictEqual(node.data.name, "one");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "a data-source load is one step: it starts the layout, frames and runs the on-load algorithms once, and its undo starts nothing",
        async () => {
            const graph = await loadedGraph();
            await graph.getSession().config.set({ runAlgorithmsOnLoad: true, data: { algorithms: ["degree"] } });
            await graph.addNodes([{ id: "before" }]);
            await new Promise((resolve) => {
                setTimeout(resolve, 0);
            });
            const steps = graph.getSession().history.steps.length;
            const spies = watch(graph);
            const seen = events(graph);

            await graph.addDataFromSource("json", {
                data: JSON.stringify({ nodes: [{ id: "j1" }, { id: "j2" }], edges: [{ src: "j1", dst: "j2" }] }),
            });

            assert.isDefined(graph.getDataManager().getNode("j1"));
            assert.isDefined(graph.getDataManager().getNode("before"), "added to the graph, not replacing it");
            assert.isAbove(spies.layout.mock.calls.length, 0);
            assert.isAbove(spies.frame.mock.calls.length, 0);
            assert.strictEqual(spies.run.mock.calls.length, 1, "the on-load algorithm ran once");
            assert.isTrue(seen.added.every((event) => event.cause === "command"));
            assert.lengthOf(graph.getSession().history.steps, steps + 1, "the load is one step");

            const started = spies.layout.mock.calls.length + spies.frame.mock.calls.length;
            await graph.getSession().undo();
            assert.isUndefined(graph.getDataManager().getNode("j1"));
            assert.isDefined(graph.getDataManager().getNode("before"));
            assert.strictEqual(spies.layout.mock.calls.length + spies.frame.mock.calls.length, started);
            assert.strictEqual(spies.run.mock.calls.length, 1, "undo runs nothing");
        },
        TEST_TIMEOUT_MS,
    );
});
