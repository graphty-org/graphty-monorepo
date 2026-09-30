import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { triangleCount } from "../../../src/index.js";
import { toSnapshot } from "../../helpers/to-snapshot.js";
import { gnm, undirectedFixtures } from "./port-fixtures.js";

function build(directed: boolean, edges: readonly (readonly [string, string])[], nodes: readonly string[] = []) {
    const b = new GraphBuilder({ directed, weighted: false });
    for (const id of nodes) {
        b.addNode(id);
    }
    for (const [u, v] of edges) {
        b.addEdge(u, v);
    }
    return b.freeze();
}

/** Every triple checked: the definition, O(n^3), for small graphs. */
function bruteForce(s: GraphSnapshot): { perNode: number[]; total: number } {
    const n = s.nodeCount;
    const adj = Array.from({ length: n }, () => new Set<number>());
    const views = s.directed ? [s, s.reverse()] : [s];
    for (const g of views) {
        for (let u = 0; u < n; u++) {
            for (let a = g.rowPtr[u]; a < g.rowPtr[u + 1]; a++) {
                const v = g.colIdx[a];
                if (v !== u) {
                    adj[u].add(v);
                    adj[v].add(u);
                }
            }
        }
    }
    const perNode = new Array<number>(n).fill(0);
    let total = 0;
    for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) {
            for (let c = b + 1; c < n; c++) {
                if (adj[a].has(b) && adj[b].has(c) && adj[a].has(c)) {
                    perNode[a]++;
                    perNode[b]++;
                    perNode[c]++;
                    total++;
                }
            }
        }
    }
    return { perNode, total };
}

describe("triangleCount", () => {
    it("counts karate's 45 triangles, with networkx's transitivity and average clustering", () => {
        const s = toSnapshot(undirectedFixtures()[7].graph);
        const result = triangleCount(s);
        expect(result.total).toBe(45);
        expect(Array.from(result.perNode)).toEqual(bruteForce(s).perNode);
        // networkx.transitivity(karate_club_graph()) and average_clustering(...)
        expect(result.transitivity).toBeCloseTo(0.2556818181818182, 12);
        const average = Array.from(result.coefficient).reduce((sum, c) => sum + c, 0) / s.nodeCount;
        expect(average).toBeCloseTo(0.5706384782076823, 12);
    });

    it("matches every triple checked on random graphs, directed and undirected", () => {
        for (const [directed, seed] of [
            [false, 3],
            [false, 5],
            [true, 7],
            [true, 9],
        ] as const) {
            const s = toSnapshot(gnm(40, 160, directed, seed));
            const expected = bruteForce(s);
            const result = triangleCount(s);
            expect(result.total, `seed ${seed}`).toBe(expected.total);
            expect(Array.from(result.perNode), `seed ${seed}`).toEqual(expected.perNode);
        }
    });

    it("reads the simple undirected graph: reciprocal arcs, parallel edges and self-loops change nothing", () => {
        const simple = triangleCount(
            build(false, [
                ["a", "b"],
                ["b", "c"],
                ["c", "a"],
            ]),
        );
        const messy = triangleCount(
            build(true, [
                ["a", "b"],
                ["b", "a"],
                ["b", "c"],
                ["b", "c"],
                ["a", "c"],
                ["a", "a"],
            ]),
        );
        for (const result of [simple, messy]) {
            expect(result.total).toBe(1);
            expect(Array.from(result.perNode)).toEqual([1, 1, 1]);
            expect(Array.from(result.coefficient)).toEqual([1, 1, 1]);
            expect(result.transitivity).toBe(1);
        }
    });

    it("gives a star, a lone edge and an empty graph zeros, not missing values", () => {
        const star = triangleCount(
            build(false, [
                ["hub", "a"],
                ["hub", "b"],
                ["hub", "c"],
            ]),
        );
        expect(star.total).toBe(0);
        expect(Array.from(star.coefficient)).toEqual([0, 0, 0, 0]);
        expect(star.transitivity).toBe(0);
        const edge = triangleCount(build(false, [["a", "b"]], ["c"]));
        expect(Array.from(edge.coefficient)).toEqual([0, 0, 0]);
        expect(edge.transitivity).toBe(0);
        const empty = triangleCount(build(false, []));
        expect(empty.total).toBe(0);
        expect(empty.perNode.length).toBe(0);
    });
});
