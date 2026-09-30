import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { breadthFirstSearch, degreeCentrality, depthFirstSearch, dijkstra, pageRank } from "../../src/index.js";

/**
 * Freeze an undirected graph from its edges.
 * @param edges - Source, target and optional weight per edge
 * @returns The snapshot
 */
function undirected(edges: [string, string, number?][]): GraphSnapshot {
    const builder = new GraphBuilder({ directed: false });
    for (const [source, target, weight] of edges) {
        builder.addEdge(source, target, weight ?? 1);
    }
    return builder.freeze();
}

describe("the algorithms in a browser", () => {
    it("freezes a snapshot", () => {
        const s = undirected([
            ["a", "b"],
            ["b", "c"],
            ["c", "d"],
        ]);

        expect(s.nodeCount).toBe(4);
        expect(s.edgeCount).toBe(3);
    });

    it("runs breadth-first and depth-first search", () => {
        const s = undirected([
            ["a", "b"],
            ["a", "c"],
            ["b", "d"],
        ]);
        const a = s.ids.requireIndex("a");

        const bfs = breadthFirstSearch(s, a);
        expect(Array.from(bfs.order.subarray(0, bfs.visitedCount), (i) => s.ids.idOf(i))).toEqual(["a", "b", "c", "d"]);
        const dfs = depthFirstSearch(s, a);
        expect(Array.from(dfs.order.subarray(0, dfs.visitedCount), (i) => s.ids.idOf(i))).toEqual(["a", "b", "d", "c"]);
    });

    it("computes degree centrality", () => {
        const s = undirected([
            ["center", "a"],
            ["center", "b"],
            ["center", "c"],
        ]);

        expect(Array.from(degreeCentrality(s))).toEqual([3, 1, 1, 1]);
    });

    it("finds a weighted shortest path with Dijkstra", () => {
        const s = undirected([
            ["a", "b", 1],
            ["b", "c", 2],
            ["a", "c", 4],
        ]);
        const c = s.ids.requireIndex("c");

        const result = dijkstra(s, s.ids.requireIndex("a"));
        expect(result.dist[c]).toBe(3);
        expect(Array.from(result.pathTo(c), (i) => s.ids.idOf(i))).toEqual(["a", "b", "c"]);
    });

    it("runs PageRank over a 100-node chain", () => {
        const edges: [string, string][] = [];
        for (let i = 0; i < 99; i++) {
            edges.push([`n${i}`, `n${i + 1}`]);
        }
        const s = undirected(edges);

        const { scores } = pageRank(s);
        expect(scores).toHaveLength(100);
        expect(scores.reduce((sum, x) => sum + x, 0)).toBeCloseTo(1, 6);
    });
});
