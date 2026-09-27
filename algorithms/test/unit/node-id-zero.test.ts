/**
 * Regression tests for truthiness checks on node ids (issue #492 and PR #362). The number 0 is a
 * valid node id and is falsy, so `if (!node)` treats it as "no node". Every test here builds a
 * graph whose ids include 0 and checks a result that the falsy check used to corrupt.
 */
import { describe, expect, it } from "vitest";

import { betweennessCentrality, edgeBetweennessCentrality } from "../../src/algorithms/centrality/betweenness.js";
import { girvanNewman } from "../../src/algorithms/community/girvan-newman.js";
import { primMST } from "../../src/algorithms/mst/prim.js";
import { bellmanFord } from "../../src/algorithms/shortest-path/bellman-ford.js";
import { dijkstra, dijkstraPath } from "../../src/algorithms/shortest-path/dijkstra.js";
import { breadthFirstSearch, isBipartite } from "../../src/algorithms/traversal/bfs-unified.js";
import { depthFirstSearch } from "../../src/algorithms/traversal/dfs.js";
import { spectralClustering } from "../../src/clustering/spectral.js";
import { Graph } from "../../src/core/graph.js";

function graphOf(edges: [number, number][], directed = false): Graph {
    const graph = new Graph({ directed });
    for (const [u, v] of edges) {
        graph.addEdge(u, v);
    }

    return graph;
}

describe("node id 0 is a real node", () => {
    it("betweennessCentrality counts paths through node 0", () => {
        const scores = betweennessCentrality(graphOf([[1, 0], [0, 2]]));
        expect(scores["0"]).toBe(1);
    });

    it("edgeBetweennessCentrality matches the same graph relabelled away from 0", () => {
        const withZero = edgeBetweennessCentrality(graphOf([[1, 0], [0, 2], [2, 3]]));
        const withoutZero = edgeBetweennessCentrality(graphOf([[2, 1], [1, 3], [3, 4]]));
        const sorted = (m: Map<string, number>): number[] => Array.from(m.values()).sort((a, b) => a - b);
        expect(sorted(withZero)).toEqual(sorted(withoutZero));
    });

    it("girvanNewman finds both triangles when node 0 is the bridge between them", () => {
        const graph = graphOf([[1, 2], [2, 3], [3, 1], [4, 5], [5, 6], [6, 4], [3, 0], [0, 4]]);
        const levels = girvanNewman(graph, { maxCommunities: 2 });
        const sets = levels[1].communities.map((c) => [...c].sort()).sort((a, b) => Number(a[0]) - Number(b[0]));
        expect(sets).toEqual([[0], [1, 2, 3], [4, 5, 6]]);
    });

    it("primMST builds a tree when the first node is 0", () => {
        const result = primMST(graphOf([[0, 1], [1, 2]]));
        expect(result.edges).toHaveLength(2);
        expect(result.totalWeight).toBe(2);
    });

    it("primMST accepts 0 as an explicit start node", () => {
        const result = primMST(graphOf([[1, 0], [0, 2]]), 0);
        expect(result.edges).toHaveLength(2);
    });

    it("bellmanFord treats 0 as a target", () => {
        const result = bellmanFord(graphOf([[2, 1], [1, 0], [0, 3]]), 2, { target: 0 });
        expect(result.distances.get(0)).toBe(2);
    });

    it("dijkstra stops early at target 0 like any other target", () => {
        const results = dijkstra(graphOf([[2, 1], [1, 0], [0, 3], [3, 4]]), 2, { target: 0 });
        expect(results.get(0)?.distance).toBe(2);
        expect(results.has(4)).toBe(false);
    });

    it("bidirectional dijkstraPath returns the path when the search meets at target 0", () => {
        // More than 10 nodes, so dijkstraPath takes the bidirectional search.
        const graph = graphOf([[1, 2], [2, 0]]);
        for (let i = 10; i < 20; i++) {
            graph.addNode(i);
        }

        const result = dijkstraPath(graph, 1, 0);
        expect(result?.path).toEqual([1, 2, 0]);
        expect(result?.distance).toBe(2);
    });

    it("breadthFirstSearch stops at target node 0", () => {
        const result = breadthFirstSearch(graphOf([[2, 1], [1, 0], [0, 3]]), 2, { targetNode: 0 });
        expect(result.order).toEqual([2, 1, 0]);
    });

    it("isBipartite accepts a single edge from node 0", () => {
        expect(isBipartite(graphOf([[0, 1]]))).toBe(true);
    });

    it("depthFirstSearch stops at target node 0", () => {
        const graph = graphOf([[2, 1], [1, 0], [0, 3]]);
        expect(depthFirstSearch(graph, 2, { targetNode: 0 }).order).toEqual([2, 1, 0]);
    });

    it("recursive depthFirstSearch stops at target node 0", () => {
        const graph = graphOf([[2, 1], [1, 0], [0, 3]]);
        expect(depthFirstSearch(graph, 2, { targetNode: 0, recursive: true }).order).toEqual([2, 1, 0]);
    });

    it("spectralClustering assigns node 0 to a community", () => {
        const graph = graphOf([[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [2, 3]]);
        const result = spectralClustering(graph, { k: 2, seed: 42 });
        expect(result.clusterAssignments.has(0)).toBe(true);
        expect(result.communities.flat()).toContain(0);
        expect(result.clusterAssignments.get(0)).toBe(result.clusterAssignments.get(1));
    });
});
