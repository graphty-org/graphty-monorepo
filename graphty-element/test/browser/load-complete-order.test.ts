/**
 * `data-loading-complete` and `data-loaded` say a load finished. They are heard once the load's
 * step is recorded and the pass that places and paints its nodes has run, and never for a load
 * that was withdrawn before its step was recorded (issue #3384).
 */
import { afterEach, assert, describe, test } from "vitest";

import { Graph } from "../../src/Graph.js";

const DATA = JSON.stringify({
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    edges: [
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
    ],
});

/** The graphs the running test made, disposed after it. */
const graphs: Graph[] = [];

afterEach(() => {
    for (const graph of graphs.splice(0)) {
        graph.dispose();
    }
    document.body.innerHTML = "";
});

async function emptyGraph(): Promise<Graph> {
    document.body.innerHTML = '<canvas id="test-canvas"></canvas>';
    const graph = new Graph(document.getElementById("test-canvas") as HTMLCanvasElement);
    graphs.push(graph);
    await graph.init();
    await graph.setLayout("circular", { scale: 2 });
    return graph;
}

function positions(graph: Graph): string[] {
    return [...graph.getDataManager().nodes.values()].map((node) => {
        const { x, y, z } = node.getPosition();
        return `${String(node.id)}:${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    });
}

describe("the load events of a load", () => {
    test("are heard after its step is recorded and its nodes are placed", async () => {
        const graph = await emptyGraph();
        const seen: { event: string; steps: number; positions: string[] }[] = [];
        for (const event of ["data-loading-complete", "data-loaded"] as const) {
            graph.addListener(event, () => {
                seen.push({ event, steps: graph.getSession().history.steps.length, positions: positions(graph) });
            });
        }

        await graph.loadFromFile(new File([DATA], "three.json"));

        const placed = positions(graph);
        assert.deepStrictEqual(
            seen.map(({ event }) => event),
            ["data-loading-complete", "data-loaded"],
        );
        for (const heard of seen) {
            assert.strictEqual(heard.steps, 1, `${heard.event}: the load's step was not recorded yet`);
            assert.deepStrictEqual(heard.positions, placed, `${heard.event}: the nodes were not placed yet`);
        }
    });

    test("announce a load that can no longer be withdrawn", async () => {
        const graph = await emptyGraph();
        const nodesWhenHeard: number[] = [];
        // A listener that acts on the news -- here by starting over, as a replacing load or
        // `clearData` does -- must find the load it was told about already in the graph and in
        // its history, not withdraw it after the fact.
        graph.addListener("data-loading-complete", () => {
            nodesWhenHeard.push(graph.getDataManager().nodes.size);
            graph.getDataManager().supersedeLoads();
        });

        let failure: unknown = null;
        await graph.loadFromFile(new File([DATA], "three.json")).catch((error: unknown) => {
            failure = error;
        });

        assert.deepStrictEqual(nodesWhenHeard, [3]);
        assert.isNull(failure, `the announced load was withdrawn: ${String(failure)}`);
        assert.strictEqual(graph.getDataManager().nodes.size, 3);
        assert.strictEqual(graph.getSession().history.steps.length, 1);
    });
});
