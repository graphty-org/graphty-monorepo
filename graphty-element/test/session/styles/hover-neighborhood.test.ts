import { GraphBuilder } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { createHoverSource } from "../../../src/session/styles/hover";

function neighborhoodOf(directed: boolean, hovered: string): { nodes: string[]; edges: number[] } {
    const builder = new GraphBuilder({ directed });
    builder.addEdge("a", "b");
    builder.addEdge("c", "b");
    builder.addEdge("b", "d");
    builder.addEdge("d", "e");
    builder.addEdge("b", "b");
    const graph = builder.freeze();
    const hover = createHoverSource(
        () => graph,
        () => graph.ids.requireIndex(hovered),
    )();
    assert.isNotNull(hover);
    const nodes = [...hover.neighbors.keys()]
        .filter((i) => hover.neighbors[i] === 1)
        .map((i) => String(graph.ids.idOf(i)));
    const edges = [...hover.edges.keys()].filter((e) => hover.edges[e] === 1);
    return { nodes: nodes.sort(), edges };
}

describe("hover neighborhood", () => {
    it("counts in-neighbors and out-neighbors of a directed graph, and only the edges touching the node", () => {
        assert.deepEqual(neighborhoodOf(true, "b"), { nodes: ["a", "b", "c", "d"], edges: [0, 1, 2, 4] });
        assert.deepEqual(neighborhoodOf(true, "d"), { nodes: ["b", "d", "e"], edges: [2, 3] });
    });

    it("gives the same neighborhood for an undirected graph", () => {
        assert.deepEqual(neighborhoodOf(false, "b"), { nodes: ["a", "b", "c", "d"], edges: [0, 1, 2, 4] });
        assert.deepEqual(neighborhoodOf(false, "e"), { nodes: ["d", "e"], edges: [3] });
    });
});
