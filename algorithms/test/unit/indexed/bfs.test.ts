import { INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { breadthFirstSearch as legacyBfs } from "../../../src/algorithms/traversal/bfs-unified.js";
import { Graph } from "../../../src/core/graph.js";
import { breadthFirstSearch } from "../../../src/indexed/bfs.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";

// Built in EXACTLY this order: the assertions below are written in the index space toSnapshot
// produces, which follows the legacy graph's node-insertion order (invariant I14).
function pathPlusIsolated(directed: boolean): Graph {
    const g = new Graph({ directed });
    g.addEdge("a", "b"); // creates a (index 0) then b (index 1)
    g.addEdge("b", "c"); // c is index 2
    g.addEdge("c", "d"); // d is index 3
    g.addNode("z"); // isolated, index 4 -- added LAST on purpose
    return g;
}

describe("indexed.breadthFirstSearch", () => {
    it("walks a path and leaves the isolated node unvisited", () => {
        const s = checksummedSnapshot(pathPlusIsolated(false));
        const result = breadthFirstSearch(s, 0);
        expect([...result.depth]).toEqual([0, 1, 2, 3, INVALID_INDEX]);
        expect([...result.parent]).toEqual([INVALID_INDEX, 0, 1, 2, INVALID_INDEX]);
        expect([...result.order]).toEqual([0, 1, 2, 3]);
        expect(result.visitedCount).toBe(4);
        s.validate({ checksum: true });
    });

    it("stops expanding at maxDepth", () => {
        const s = checksummedSnapshot(pathPlusIsolated(false));
        const result = breadthFirstSearch(s, 0, { maxDepth: 1 });
        expect(result.visitedCount).toBe(2);
        expect([...result.order]).toEqual([0, 1]);
        expect(result.depth[2]).toBe(INVALID_INDEX);
        s.validate({ checksum: true });
    });

    it("runs an in-neighbour BFS over reverse() on a directed snapshot", () => {
        const s = checksummedSnapshot(pathPlusIsolated(true));
        expect(breadthFirstSearch(s, 3).visitedCount).toBe(1);
        const inward = breadthFirstSearch(s.reverse(), 3);
        expect(inward.visitedCount).toBe(4);
        expect([...inward.depth]).toEqual([3, 2, 1, 0, INVALID_INDEX]);
        s.validate({ checksum: true });
    });

    it("visits the same SET as the legacy breadthFirstSearch", () => {
        // Sets, not orders: the legacy BFS iterates the adjacency Map in insertion order while the
        // port iterates colIdx in ascending index order (invariant I4).
        for (const directed of [false, true]) {
            const graph = pathPlusIsolated(directed);
            graph.addEdge("a", "c");
            graph.addEdge("d", "a");
            const s = checksummedSnapshot(graph);
            const result = breadthFirstSearch(s, 0);
            const visited = new Set<string>();
            for (let i = 0; i < result.visitedCount; i++) {
                visited.add(String(s.ids.idOf(result.order[i])));
            }
            const legacy = new Set([...legacyBfs(graph, "a").visited].map((id) => String(id)));
            expect(visited).toEqual(legacy);
            s.validate({ checksum: true });
        }
    });
});
