import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { articulationPoints, bridges } from "../../../src/indexed/articulation.js";

/*
 * Expected values from networkx 2.8.8, python3:
 *
 *   sorted(nx.articulation_points(G)), sorted(sorted(b) for b in nx.bridges(G))
 *
 * with G = nx.karate_club_graph(), nx.convert_node_labels_to_integers(nx.florentine_families_graph()),
 * nx.barbell_graph(4, 2), nx.lollipop_graph(4, 3) and nx.balanced_tree(2, 3).
 */
const NETWORKX: Record<string, { nodeCount: number; edges: number[][]; points: number[]; bridges: number[][] }> = {
    karate: {
        nodeCount: 34,
        edges: [
            [0, 1],
            [0, 2],
            [0, 3],
            [0, 4],
            [0, 5],
            [0, 6],
            [0, 7],
            [0, 8],
            [0, 10],
            [0, 11],
            [0, 12],
            [0, 13],
            [0, 17],
            [0, 19],
            [0, 21],
            [0, 31],
            [1, 2],
            [1, 3],
            [1, 7],
            [1, 13],
            [1, 17],
            [1, 19],
            [1, 21],
            [1, 30],
            [2, 3],
            [2, 7],
            [2, 8],
            [2, 9],
            [2, 13],
            [2, 27],
            [2, 28],
            [2, 32],
            [3, 7],
            [3, 12],
            [3, 13],
            [4, 6],
            [4, 10],
            [5, 6],
            [5, 10],
            [5, 16],
            [6, 16],
            [8, 30],
            [8, 32],
            [8, 33],
            [9, 33],
            [13, 33],
            [14, 32],
            [14, 33],
            [15, 32],
            [15, 33],
            [18, 32],
            [18, 33],
            [19, 33],
            [20, 32],
            [20, 33],
            [22, 32],
            [22, 33],
            [23, 25],
            [23, 27],
            [23, 29],
            [23, 32],
            [23, 33],
            [24, 25],
            [24, 27],
            [24, 31],
            [25, 31],
            [26, 29],
            [26, 33],
            [27, 33],
            [28, 31],
            [28, 33],
            [29, 32],
            [29, 33],
            [30, 32],
            [30, 33],
            [31, 32],
            [31, 33],
            [32, 33],
        ],
        points: [0],
        bridges: [[0, 11]],
    },
    florentine: {
        nodeCount: 15,
        edges: [
            [0, 1],
            [1, 5],
            [1, 6],
            [1, 7],
            [1, 8],
            [1, 9],
            [2, 3],
            [2, 4],
            [2, 5],
            [3, 4],
            [3, 11],
            [4, 6],
            [4, 11],
            [6, 7],
            [7, 12],
            [8, 13],
            [8, 12],
            [9, 10],
            [11, 12],
            [12, 14],
        ],
        points: [1, 8, 9, 12],
        bridges: [
            [0, 1],
            [1, 9],
            [8, 13],
            [9, 10],
            [12, 14],
        ],
    },
    barbell: {
        nodeCount: 10,
        edges: [
            [0, 1],
            [0, 2],
            [0, 3],
            [1, 2],
            [1, 3],
            [2, 3],
            [3, 4],
            [4, 5],
            [5, 6],
            [6, 7],
            [6, 8],
            [6, 9],
            [7, 8],
            [7, 9],
            [8, 9],
        ],
        points: [3, 4, 5, 6],
        bridges: [
            [3, 4],
            [4, 5],
            [5, 6],
        ],
    },
    lollipop: {
        nodeCount: 7,
        edges: [
            [0, 1],
            [0, 2],
            [0, 3],
            [1, 2],
            [1, 3],
            [2, 3],
            [3, 4],
            [4, 5],
            [5, 6],
        ],
        points: [3, 4, 5],
        bridges: [
            [3, 4],
            [4, 5],
            [5, 6],
        ],
    },
    tree: {
        nodeCount: 15,
        edges: [
            [0, 1],
            [0, 2],
            [1, 3],
            [1, 4],
            [2, 5],
            [2, 6],
            [3, 7],
            [3, 8],
            [4, 9],
            [4, 10],
            [5, 11],
            [5, 12],
            [6, 13],
            [6, 14],
        ],
        points: [0, 1, 2, 3, 4, 5, 6],
        bridges: [
            [0, 1],
            [0, 2],
            [1, 3],
            [1, 4],
            [2, 5],
            [2, 6],
            [3, 7],
            [3, 8],
            [4, 9],
            [4, 10],
            [5, 11],
            [5, 12],
            [6, 13],
            [6, 14],
        ],
    },
};

function snapshot(nodeCount: number, edges: number[][], directed = false): GraphSnapshot {
    const b = new GraphBuilder({ directed });
    for (let i = 0; i < nodeCount; i++) {
        b.addNode(i);
    }
    for (const [u, v] of edges) {
        b.addEdge(u, v);
    }
    return b.freeze({ checksum: true });
}

/**
 * The bridges as sorted node pairs, so they compare with networkx's.
 * @param s - The snapshot
 * @returns One [low, high] pair per bridge, sorted
 */
function bridgePairs(s: GraphSnapshot): number[][] {
    return Array.from(bridges(s).edges, (e) => [s.edgeSource(e), s.edgeTarget(e)].sort((a, b) => a - b)).sort(
        (a, b) => a[0] - b[0] || a[1] - b[1],
    );
}

describe("articulationPoints and bridges", () => {
    for (const [name, fixture] of Object.entries(NETWORKX)) {
        it(`match networkx on ${name}`, () => {
            const s = snapshot(fixture.nodeCount, fixture.edges);
            expect([...articulationPoints(s).nodes]).toEqual(fixture.points);
            expect(bridgePairs(s)).toEqual(fixture.bridges);
            s.validate({ checksum: true });
        });
    }

    it("throws on a directed snapshot", () => {
        const s = snapshot(2, [[0, 1]], true);
        expect(() => articulationPoints(s)).toThrow("requires an undirected graph");
        expect(() => bridges(s)).toThrow("requires an undirected graph");
    });

    it("never calls a doubled edge a bridge, and ignores a self-loop", () => {
        // 0 = 1 - 2, with a loop on 2: only 1-2 is a bridge, and 1 the only cut point.
        const s = snapshot(3, [
            [0, 1],
            [0, 1],
            [1, 2],
            [2, 2],
        ]);
        expect(bridgePairs(s)).toEqual([[1, 2]]);
        expect([...articulationPoints(s).nodes]).toEqual([1]);
    });

    it("finds the cuts of every piece of a disconnected graph, and none in an empty one", () => {
        // A path 0-1-2 and a triangle 3-4-5, plus an isolated node 6.
        const s = snapshot(7, [
            [0, 1],
            [1, 2],
            [3, 4],
            [4, 5],
            [5, 3],
        ]);
        expect([...articulationPoints(s).nodes]).toEqual([1]);
        expect(bridgePairs(s)).toEqual([
            [0, 1],
            [1, 2],
        ]);
        const empty = snapshot(0, []);
        expect(articulationPoints(empty).nodes.length).toBe(0);
        expect(bridges(empty).edges.length).toBe(0);
    });

    it("walks a long path without recursion", () => {
        const n = 200_000;
        const edges = Array.from({ length: n - 1 }, (_, i) => [i, i + 1]);
        const s = snapshot(n, edges);
        expect(articulationPoints(s).nodes.length).toBe(n - 2);
        expect(bridges(s).edges.length).toBe(n - 1);
    });
});
