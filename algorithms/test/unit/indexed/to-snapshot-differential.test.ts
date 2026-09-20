import { describe, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import { assertSnapshotMatchesGraph } from "../../helpers/snapshot-differential.js";

function build(directed: boolean, edges: [string | number, string | number, number][], isolated: (string | number)[] = []): Graph {
    const g = new Graph({ directed });
    for (const id of isolated) {
        g.addNode(id);
    }
    for (const [u, v, w] of edges) {
        g.addEdge(u, v, w);
    }
    return g;
}

const KARATE_EDGES: [number, number, number][] = [
    [1, 2, 1], [1, 3, 1], [1, 4, 1], [2, 3, 1], [2, 4, 1], [3, 4, 1], [1, 5, 1], [1, 6, 1],
    [1, 7, 1], [5, 7, 1], [6, 7, 1], [1, 8, 1], [2, 8, 1], [3, 8, 1], [4, 8, 1], [1, 9, 1],
    [3, 9, 1], [3, 10, 1], [1, 11, 1], [5, 11, 1], [6, 11, 1], [1, 12, 1], [1, 13, 1], [4, 13, 1],
];

describe("A1 differential harness (graph-format design 14.6 row A1)", () => {
    it("empty graph", () => {
        assertSnapshotMatchesGraph(new Graph({ directed: false }));
    });

    it("isolated nodes only", () => {
        assertSnapshotMatchesGraph(build(false, [], ["a", "b", "c"]));
    });

    it("undirected triangle, unit weights", () => {
        assertSnapshotMatchesGraph(build(false, [["a", "b", 1], ["b", "c", 1], ["c", "a", 1]]));
    });

    it("directed triangle, distinct weights", () => {
        assertSnapshotMatchesGraph(build(true, [["a", "b", 1.5], ["b", "c", 2.25], ["c", "a", 3.75]]));
    });

    it("directed graph with a self-loop", () => {
        assertSnapshotMatchesGraph(build(true, [["a", "a", 2], ["a", "b", 1]]));
    });

    it("undirected graph with a self-loop", () => {
        assertSnapshotMatchesGraph(build(false, [["a", "a", 2], ["a", "b", 1], ["b", "c", 1]]));
    });

    it("numeric ids mixed with an isolated node", () => {
        assertSnapshotMatchesGraph(build(true, [[1, 2, 1], [2, 3, 1]], [99]));
    });

    it("f64 weights that are not f32-exact", () => {
        assertSnapshotMatchesGraph(build(true, [["a", "b", 0.1 + 0.2], ["b", "c", 1 / 3]]));
    });

    it("disconnected components and dust", () => {
        assertSnapshotMatchesGraph(build(false, [["a", "b", 1], ["c", "d", 1], ["d", "e", 1]], ["z"]));
    });

    it("karate-shaped undirected fixture", () => {
        assertSnapshotMatchesGraph(build(false, KARATE_EDGES));
    });

    it("a path after a removal (the graph's own index space is unchanged; the snapshot's is fresh)", () => {
        const g = build(false, [["a", "b", 1], ["b", "c", 1], ["c", "d", 1]]);
        g.removeEdge("b", "c");
        assertSnapshotMatchesGraph(g);
        g.removeNode("a");
        assertSnapshotMatchesGraph(g);
    });
});
