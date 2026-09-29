/**
 * @file The load-time algorithm list starts each algorithm once per load, not once per chunk.
 *
 * A data source hands its records over in chunks, and `data-added` fires for every chunk and for
 * every kind (nodes, then edges). Starting the list off that event ran every configured algorithm
 * once per chunk -- over a graph that was still arriving -- and froze a snapshot for each run.
 */

import "../../src/algorithms";

import { ActionManager } from "@babylonjs/core";
import { afterEach, assert, describe, test, vi } from "vitest";

import { type Graph, operationQueueOf } from "../../src/Graph.js";
import { sessionRunsOf } from "../../src/session/GraphSession";

const NODES = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}` }));
const EDGES = NODES.slice(1).map((node, i) => ({ source: `n${i}`, target: node.id }));

let graph: Graph | null = null;

/**
 * A graph whose load-time list names two algorithms, counting how often each is asked to start.
 *
 * Counted where every start goes, `startVia`, rather than off the run notifications: the run registry reuses a run
 * already under way for the same result, so the notifications alone cannot tell one request from
 * seven -- but each extra request still freezes a snapshot and may re-run over a graph that is
 * still arriving.
 * @returns the graph and the request count per algorithm
 */
async function makeGraph(): Promise<{ graph: Graph; starts: Map<string, number> }> {
    document.body.innerHTML = '<canvas id="on-load-canvas"></canvas>';
    const { Graph: GraphClass } = await import("../../src/Graph.js");
    const made = new GraphClass(document.getElementById("on-load-canvas") as HTMLCanvasElement);
    await made.getSession().config.set({ runAlgorithmsOnLoad: true, data: { algorithms: ["degree", "pagerank"] } });

    const starts = new Map<string, number>();
    const runs = sessionRunsOf(made.getSession());
    const startVia = runs.startVia.bind(runs);
    vi.spyOn(runs, "startVia").mockImplementation((dispatch, algorithm, params, options) => {
        starts.set(algorithm, (starts.get(algorithm) ?? 0) + 1);
        return startVia(dispatch, algorithm, params, options);
    });

    graph = made;
    return { graph: made, starts };
}

/**
 * Wait until the queue is empty and no run is still waiting or running.
 * @param target - the graph to wait on
 */
async function settle(target: Graph): Promise<void> {
    for (let round = 0; round < 50; round++) {
        await operationQueueOf(target).waitForCompletion();
        const busy = target
            .getSession()
            .runs.list()
            .some((run) => run.status === "queued" || run.status === "running");

        if (!busy) {
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, 20));
    }

    throw new Error("the runs never finished");
}

describe("the load-time algorithm list", () => {
    afterEach(() => {
        graph?.dispose();
        graph = null;
    });

    test("starts each algorithm once for a load that arrives in many chunks", async () => {
        const { graph: made, starts } = await makeGraph();

        await made.addDataFromSource("json", { data: JSON.stringify({ nodes: NODES, edges: EDGES }), chunkSize: 2 });
        await settle(made);

        assert.deepStrictEqual(Object.fromEntries(starts), { degree: 1, pagerank: 1 });
    });

    test("starts each algorithm once for pushes made as one step, and again for a later push", async () => {
        // The on-load runs are deferred members of the step that added the rows, so undoing the
        // add takes them with it: one step, one start, however many adds the step holds.
        const { graph: made, starts } = await makeGraph();

        await made.getSession().transaction("Added a graph", async (tx) => {
            await tx.execute({ op: "data.apply", mutation: { kind: "add-nodes", records: NODES.slice(0, 5) } });
            await tx.execute({ op: "data.apply", mutation: { kind: "add-nodes", records: NODES.slice(5) } });
            await tx.execute({ op: "data.apply", mutation: { kind: "add-edges", records: EDGES } });
        });
        await settle(made);

        assert.deepStrictEqual(Object.fromEntries(starts), { degree: 1, pagerank: 1 });

        await made.addEdges([{ source: "n0", target: "n9" }]);
        await settle(made);

        assert.deepStrictEqual(Object.fromEntries(starts), { degree: 2, pagerank: 2 });
    });

    test("starts each algorithm again when double-clicking a node expands its neighbourhood", async () => {
        const { graph: made, starts } = await makeGraph();
        made.setLayoutBehavior({
            fetchEdges: () => new Set([{ source: "n0", target: "x1" }]),
            fetchNodes: () => [{ id: "x1" }],
        });

        await made.addNodes([{ id: "n0" }]);
        await settle(made);
        assert.deepStrictEqual(Object.fromEntries(starts), { degree: 1, pagerank: 1 });

        const node = made.getDataManager().getNode("n0");
        assert.isDefined(node);
        const action = node.mesh.actionManager?.actions.find((a) => a.trigger === ActionManager.OnDoublePickTrigger);
        assert.isDefined(action, "double-clicking a node does something");
        (action as unknown as { execute: () => void }).execute();
        await settle(made);

        assert.isDefined(made.getDataManager().getNode("x1"), "the expansion added the fetched node");
        assert.deepStrictEqual(Object.fromEntries(starts), { degree: 2, pagerank: 2 });
    });
});
