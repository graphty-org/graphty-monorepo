/**
 * @file A rendered graph takes the direction a file declares whether or not the source-steps
 * experiment is on: an undirected GraphML file loads as an undirected graph either way.
 */
import { afterEach, assert, describe, test } from "vitest";

import { featuresFrom, Graph } from "../../src/Graph.js";

const UNDIRECTED =
    '<?xml version="1.0"?><graphml><graph edgedefault="undirected">' +
    '<node id="a"/><node id="b"/><edge source="a" target="b"/></graph></graphml>';

const graphs: Graph[] = [];

afterEach(() => {
    for (const graph of graphs.splice(0)) {
        graph.dispose();
    }
});

/**
 * Whether the graph reads as directed after the undirected file loads.
 * @param features - The experiments the graph runs with.
 * @returns The snapshot's direction.
 */
async function directedAfterLoad(features: readonly string[]): Promise<boolean> {
    document.body.innerHTML = '<canvas id="direction-canvas"></canvas>';
    const graph = new Graph(document.getElementById("direction-canvas") as HTMLCanvasElement);
    graphs.push(graph);
    featuresFrom(graph, () => features);
    const session = graph.getSession();
    await session.data.import({ type: "graphml", config: { data: UNDIRECTED }, name: "pair.graphml" });
    assert.strictEqual(session.data.steps().length, features.length, "with the experiment on, the load is a step");
    const snapshot = session.data.snapshot();
    assert.strictEqual(snapshot.edgeCount, 1, "the edge loaded");
    return snapshot.directed;
}

describe("the direction a file declares, on a rendered graph", () => {
    test("an undirected GraphML file loads undirected with the experiment off", async () => {
        assert.isFalse(await directedAfterLoad([]));
    });

    test("an undirected GraphML file loads undirected with source-steps on", async () => {
        assert.isFalse(await directedAfterLoad(["source-steps"]));
    });
});
