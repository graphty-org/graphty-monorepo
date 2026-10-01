/**
 * The P8 traversal oracles (test/oracle/traversal.ts) and the traversal check helpers
 * (test/helpers/traversal-check.ts) checked against answers computable by hand, so a bug in an oracle is caught
 * before it is trusted to judge a kernel (spec 11.3 "Algorithm differential"; P8-T2 Step 4). The check helpers are
 * watched FAILING here on hand-built wrong answers -- the cyclic predecessor chain of the 2026-09-23 rule among
 * them (PD-27) -- because a helper nobody has seen go red proves nothing. No device: nothing here imports
 * test/setup/ or src/ (the `[gpu] adapter` line the run prints is the node project's setupFiles, which acquires
 * the worker's adapter for every file of the project).
 */

import { INVALID_INDEX } from "@graphty/graph-format";

import { completeEdges, type EdgeSpec, gridEdges, pathEdges, snapshotOf, starEdges } from "../helpers/graphs.js";
import {
    expectLevelConsistent,
    expectOrderGroupedByLevel,
    expectPredArcAttains,
    expectPredChainReachesSource,
    expectSmallestPredecessor,
    expectTriangleInequality,
} from "../helpers/traversal-check.js";
import { bellmanFordOracle, bfsOracle, closenessOracle, dijkstraOracle } from "./traversal.js";

/**
 * xorshift32 in [0, 1) (the generator of test/helpers/graphs.ts, which does not export it).
 * @param seed - the seed
 * @returns a function returning uniform numbers in [0, 1)
 */
function xorshift(seed: number): () => number {
    let state = seed >>> 0 || 1;
    return () => {
        state ^= state << 13;
        state >>>= 0;
        state ^= state >>> 17;
        state ^= state << 5;
        state >>>= 0;
        return state / 4294967296;
    };
}

describe("bfsOracle (FIFO breadth-first search)", () => {
    it("path(6) from 0: depth i at node i, parent i - 1, FIFO order 0..5", () => {
        const s = snapshotOf(pathEdges(6));
        const r = bfsOracle(s, 0);
        expect(Array.from(r.depth)).toEqual([0, 1, 2, 3, 4, 5]);
        expect(Array.from(r.parent)).toEqual([INVALID_INDEX, 0, 1, 2, 3, 4]);
        expect(Array.from(r.order)).toEqual([0, 1, 2, 3, 4, 5]);
        expect(r.visitedCount).toBe(6);
        expectLevelConsistent(r, s, 0);
        expectSmallestPredecessor(r, s);
        expectOrderGroupedByLevel(r);
    });

    it("star(5) from leaf 3: the hub at depth 1, every other leaf at depth 2", () => {
        const s = snapshotOf(starEdges(5));
        const r = bfsOracle(s, 3);
        expect(Array.from(r.depth)).toEqual([1, 2, 2, 0, 2, 2]);
        expect(r.visitedCount).toBe(6);
        expect(Array.from(r.parent)).toEqual([3, 0, 0, INVALID_INDEX, 0, 0]);
        expectLevelConsistent(r, s, 3);
        expectSmallestPredecessor(r, s);
    });

    it("grid(5, 4) from the corner: depth of (x, y) is x + y", () => {
        const w = 5;
        const h = 4;
        const s = snapshotOf(gridEdges(w, h));
        const r = bfsOracle(s, 0);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                expect(r.depth[y * w + x]).toBe(x + y);
            }
        }
        expect(r.visitedCount).toBe(w * h);
        expectLevelConsistent(r, s, 0);
        expectSmallestPredecessor(r, s);
    });

    it("complete(7) from 2: every other node at depth 1", () => {
        const s = snapshotOf(completeEdges(7));
        const r = bfsOracle(s, 2);
        expect(Array.from(r.depth)).toEqual([1, 1, 0, 1, 1, 1, 1]);
        expect(r.visitedCount).toBe(7);
        expectLevelConsistent(r, s, 2);
    });

    it("maxDepth 2 on star(4) from leaf 1: visitedCount k + 1 and nothing at depth 3", () => {
        const k = 4;
        const s = snapshotOf(starEdges(k));
        const r = bfsOracle(s, 1, 2);
        expect(r.visitedCount).toBe(k + 1);
        expect(Array.from(r.depth).some((d) => d === 3)).toBe(false);
    });

    it("maxDepth 2 on path(6) from 0: a node AT maxDepth is reached and not expanded", () => {
        const s = snapshotOf(pathEdges(6));
        const r = bfsOracle(s, 0, 2);
        expect(Array.from(r.depth)).toEqual([0, 1, 2, INVALID_INDEX, INVALID_INDEX, INVALID_INDEX]);
        expect(r.visitedCount).toBe(3);
        expect(Array.from(r.order)).toEqual([0, 1, 2]);
        expect(Array.from(r.parent)).toEqual([INVALID_INDEX, 0, 1, INVALID_INDEX, INVALID_INDEX, INVALID_INDEX]);
        expectLevelConsistent(r, s, 0);
        expectOrderGroupedByLevel(r);
    });

    it("an isolated node is unreached: depth and parent are INVALID_INDEX, visitedCount excludes it", () => {
        const s = snapshotOf(pathEdges(3), { nodeCount: 4 });
        const r = bfsOracle(s, 0);
        expect(r.depth[3]).toBe(INVALID_INDEX);
        expect(r.parent[3]).toBe(INVALID_INDEX);
        expect(r.visitedCount).toBe(3);
        expectLevelConsistent(r, s, 0);
    });
});

describe("the BFS check helpers go red on a wrong answer", () => {
    // The diamond 0 - 1, 0 - 2, 1 - 3, 2 - 3: node 3 has two depth-1 predecessors, 1 and 2.
    const diamond: EdgeSpec[] = [
        [0, 1],
        [0, 2],
        [1, 3],
        [2, 3],
    ];

    it("expectSmallestPredecessor: parent[3] = 2 is a valid predecessor but not the smallest", () => {
        const s = snapshotOf(diamond);
        const depth = Uint32Array.of(0, 1, 1, 2);
        const good = { depth, parent: Uint32Array.of(INVALID_INDEX, 0, 0, 1) };
        const bad = { depth, parent: Uint32Array.of(INVALID_INDEX, 0, 0, 2) };
        expectLevelConsistent(good, s, 0);
        expectLevelConsistent(bad, s, 0);
        expectSmallestPredecessor(good, s);
        expect(() => {
            expectSmallestPredecessor(bad, s);
        }).toThrow();
    });

    it("expectLevelConsistent: a parent whose depth is not one less, and a parent with no arc", () => {
        const s = snapshotOf(diamond);
        const depth = Uint32Array.of(0, 1, 1, 2);
        expect(() => {
            expectLevelConsistent({ depth, parent: Uint32Array.of(INVALID_INDEX, 0, 0, 0) }, s, 0);
        }).toThrow();
        // 1 -> 2 is not an arc of the diamond, though depth[1] + 1 == depth[2] would hold on a depth of 2.
        expect(() => {
            expectLevelConsistent({ depth: Uint32Array.of(0, 1, 2, 2), parent: Uint32Array.of(INVALID_INDEX, 0, 1, 1) }, s, 0);
        }).toThrow();
        // The source must carry the sentinel.
        expect(() => {
            expectLevelConsistent({ depth, parent: Uint32Array.of(0, 0, 0, 1) }, s, 0);
        }).toThrow();
    });

    it("expectOrderGroupedByLevel: grouped and ascending within a depth passes; a swap within a depth fails", () => {
        const depth = Uint32Array.of(0, 1, 1, 2);
        expectOrderGroupedByLevel({ depth, order: Uint32Array.of(0, 1, 2, 3), visitedCount: 4 });
        expect(() => {
            expectOrderGroupedByLevel({ depth, order: Uint32Array.of(0, 2, 1, 3), visitedCount: 4 });
        }).toThrow();
        expect(() => {
            expectOrderGroupedByLevel({ depth, order: Uint32Array.of(0, 1, 3, 2), visitedCount: 4 });
        }).toThrow();
        // A duplicate is not a permutation of the reached set.
        expect(() => {
            expectOrderGroupedByLevel({ depth, order: Uint32Array.of(0, 1, 1, 3), visitedCount: 4 });
        }).toThrow();
        // The length is visitedCount.
        expect(() => {
            expectOrderGroupedByLevel({ depth, order: Uint32Array.of(0, 1, 2), visitedCount: 4 });
        }).toThrow();
    });
});

describe("dijkstraOracle (binary heap, f64 and f32)", () => {
    it("weighted path(5) with cutoff 2: the nodes beyond it stay at +Infinity", () => {
        const s = snapshotOf(pathEdges(5), { weighted: true });
        for (const precision of ["f64", "f32"] as const) {
            const r = dijkstraOracle(s, 0, precision, { cutoff: 2 });
            expect(Array.from(r.dist)).toEqual([0, 1, 2, Infinity, Infinity]);
            expect(r.reachedCount).toBe(3);
            expect(Array.from(r.predArc)).toEqual([INVALID_INDEX, 0, 2, INVALID_INDEX, INVALID_INDEX]);
        }
    });

    it("an unweighted snapshot: every arc weighs 1, so dist equals the BFS depth", () => {
        const s = snapshotOf(gridEdges(4, 3));
        const { depth } = bfsOracle(s, 5);
        const r = dijkstraOracle(s, 5, "f32");
        expect(Array.from(r.dist)).toEqual(Array.from(depth));
        expect(r.reachedCount).toBe(12);
        expectTriangleInequality(r.dist, s);
        // The oracle's predArc is the RELAXING arc, not PD-27's pick (the grid has several tight in-arcs per node);
        // it still chains to the source.
        expectPredChainReachesSource(r.predArc, s, 5, Array.from(r.dist, (d) => Number.isFinite(d)));
    });

    it("a weights override replaces the column for the run", () => {
        const s = snapshotOf(pathEdges(4), { weighted: true });
        const weights = new Float32Array(s.arcCount).fill(2);
        const r = dijkstraOracle(s, 0, "f64", { weights });
        expect(Array.from(r.dist)).toEqual([0, 2, 4, 6]);
        expectTriangleInequality(r.dist, s, weights);
    });

    it("PD-10: on path2000 with weights in [0.1, 10] the f32 and f64 results differ, and f32 is the fround chain", () => {
        const n = 2000;
        const rand = xorshift(0x5eed);
        const edges: EdgeSpec[] = [];
        for (let i = 0; i + 1 < n; i++) {
            edges.push([i, i + 1, 0.1 + rand() * 9.9]);
        }
        const s = snapshotOf(edges, { directed: true });
        const f64 = dijkstraOracle(s, 0, "f64");
        const f32 = dijkstraOracle(s, 0, "f32");
        expect(f64.reachedCount).toBe(n);
        expect(f32.reachedCount).toBe(n);
        // The analytic f32 answer on a path: one f32 add per hop (the weight column is already f32).
        let acc = 0;
        for (let v = 1; v < n; v++) {
            acc = Math.fround(acc + s.weights![v - 1]);
            expect(f32.dist[v]).toBe(acc);
        }
        let rel = 0;
        let differ = 0;
        for (let v = 1; v < n; v++) {
            if (f32.dist[v] !== f64.dist[v]) {
                differ += 1;
            }
            rel = Math.max(rel, Math.abs(f32.dist[v] - f64.dist[v]) / f64.dist[v]);
        }
        expect(differ).toBeGreaterThan(0);
        expect(rel).toBeGreaterThan(0);
        console.log(`[traversal-oracle] f32-vs-f64 path2000 rel=${rel.toExponential(3)} (${differ} of ${n - 1} differ)`);
        expectTriangleInequality(f32.dist, s);
        expectPredArcAttains(f32.dist, f32.predArc, s, 0, "plateau");
    });
});

describe("bellmanFordOracle", () => {
    // Directed: 0 -> 1 (1), 1 -> 2 (1), 2 -> 1 (w): the cycle 1 -> 2 -> 1 weighs 1 + w.
    const planted = (w: number): EdgeSpec[] => [
        [0, 1, 1],
        [1, 2, 1],
        [2, 1, w],
    ];

    it("a planted negative cycle sets the flag; the same graph with the cycle's weight raised does not", () => {
        const neg = bellmanFordOracle(snapshotOf(planted(-3), { directed: true }), 0);
        expect(neg.hasNegativeCycle).toBe(true);
        const pos = bellmanFordOracle(snapshotOf(planted(0), { directed: true }), 0);
        expect(pos.hasNegativeCycle).toBe(false);
        expect(Array.from(pos.dist)).toEqual([0, 1, 2]);
        expect(pos.reachedCount).toBe(3);
    });

    it("a negative arc that is not on a cycle is relaxed: 0 -> 1 (5), 0 -> 2 (2), 2 -> 1 (-4)", () => {
        const s = snapshotOf(
            [
                [0, 1, 5],
                [0, 2, 2],
                [2, 1, -4],
            ],
            { directed: true },
        );
        const r = bellmanFordOracle(s, 0);
        expect(r.hasNegativeCycle).toBe(false);
        expect(Array.from(r.dist)).toEqual([0, -2, 2]);
        expectPredArcAttains(r.dist, r.predArc, s, 0, "tight");
    });

    it("agrees with the f32 Dijkstra on a non-negative weighted grid, with and without an override", () => {
        const s = snapshotOf(gridEdges(4, 4), { weighted: true });
        const weights = new Float32Array(s.arcCount);
        const rand = xorshift(7);
        for (let a = 0; a < s.arcCount; a++) {
            weights[a] = Math.fround(0.5 + rand() * 3);
        }
        for (const override of [undefined, weights]) {
            const bf = bellmanFordOracle(s, 0, override);
            const dj = dijkstraOracle(s, 0, "f32", { weights: override });
            expect(bf.hasNegativeCycle).toBe(false);
            expect(Array.from(bf.dist)).toEqual(Array.from(dj.dist));
            expect(bf.reachedCount).toBe(16);
            expectTriangleInequality(bf.dist, s, override);
        }
    });
});

describe("closenessOracle", () => {
    it("path(3): the ends score 1 / 3 and the middle 1 / 2 (the legacy 1 / sumOfDistances, normalized: false)", () => {
        const s = snapshotOf(pathEdges(3));
        const r = closenessOracle(s, false);
        expect(Array.from(r.scores)).toEqual([1 / 3, 0.5, 1 / 3]);
        expect(Array.from(r.sum)).toEqual([3, 2, 3]);
        expect(Array.from(r.reached)).toEqual([2, 2, 2]);
    });

    it("path(n): an end node scores 2 / (n (n - 1))", () => {
        const n = 9;
        const r = closenessOracle(snapshotOf(pathEdges(n)), false);
        expect(r.scores[0]).toBeCloseTo(2 / (n * (n - 1)), 15);
        expect(r.scores[n - 1]).toBeCloseTo(2 / (n * (n - 1)), 15);
        expect(r.sum[0]).toBe((n * (n - 1)) / 2);
    });

    it("star(k): the hub scores 1 / k, a leaf 1 / (2k - 1)", () => {
        const k = 6;
        const r = closenessOracle(snapshotOf(starEdges(k)), false);
        expect(r.scores[0]).toBeCloseTo(1 / k, 15);
        for (let leaf = 1; leaf <= k; leaf++) {
            expect(r.scores[leaf]).toBeCloseTo(1 / (2 * k - 1), 15);
            expect(r.sum[leaf]).toBe(2 * k - 1);
            expect(r.reached[leaf]).toBe(k);
        }
    });

    it("an isolated node scores 0 and every other node's sum excludes it", () => {
        const r = closenessOracle(snapshotOf(pathEdges(3), { nodeCount: 4 }), false);
        expect(Array.from(r.scores)).toEqual([1 / 3, 0.5, 1 / 3, 0]);
        expect(Array.from(r.sum)).toEqual([3, 2, 3, 0]);
        expect(Array.from(r.reached)).toEqual([2, 2, 2, 0]);
    });

    it("complete(n): every node scores 1 / (n - 1)", () => {
        const n = 6;
        const r = closenessOracle(snapshotOf(completeEdges(n)), false);
        for (let v = 0; v < n; v++) {
            expect(r.scores[v]).toBeCloseTo(1 / (n - 1), 15);
        }
    });

    it("weighted: the f32 Dijkstra distances are summed (path(3) at weight 2: 1 / 6, 1 / 4, 1 / 6)", () => {
        const s = snapshotOf(
            [
                [0, 1, 2],
                [1, 2, 2],
            ],
            {},
        );
        const weighted = closenessOracle(s, true);
        expect(Array.from(weighted.scores)).toEqual([1 / 6, 1 / 4, 1 / 6]);
        expect(Array.from(weighted.sum)).toEqual([6, 4, 6]);
        const hops = closenessOracle(s, false);
        expect(Array.from(hops.scores)).toEqual([1 / 3, 0.5, 1 / 3]);
    });
});

describe("the predecessor chain helpers (PD-27)", () => {
    // Undirected, 0 - 1 at weight 0 and 1 - 2 at weight 1, source 2: the CSR arcs are 0: 0 -> 1, 1: 1 -> 0,
    // 2: 1 -> 2, 3: 2 -> 1, and dist = [1, 1, 0]. The 2026-09-23 rule (the smallest attaining arc) answered
    // predArc = [1, 0, INVALID_INDEX], a cycle 0 <-> 1 that never reaches the source; PD-27 answers [1, 3, INVALID_INDEX].
    const plateau = (): { s: ReturnType<typeof snapshotOf>; dist: Float64Array } => ({
        s: snapshotOf([
            [0, 1, 0],
            [1, 2, 1],
        ]),
        dist: Float64Array.of(1, 1, 0),
    });

    it("the fixture is the one the plan describes", () => {
        const { s, dist } = plateau();
        expect(Array.from(s.rowPtr)).toEqual([0, 1, 3, 4]);
        expect(Array.from(s.colIdx)).toEqual([1, 0, 2, 1]);
        expect(Array.from(s.weights!)).toEqual([0, 0, 1, 1]);
        expect(Array.from(dijkstraOracle(s, 2, "f32").dist)).toEqual(Array.from(dist));
    });

    it("expectPredChainReachesSource: the cyclic chain fails naming node 0 and the step bound; PD-27's passes", () => {
        const { s, dist } = plateau();
        const reached = Array.from(dist, (d) => Number.isFinite(d));
        expect(() => {
            expectPredChainReachesSource(Uint32Array.of(1, 0, INVALID_INDEX), s, 2, reached);
        }).toThrow("predArc chain from node 0 did not reach source 2 within 3 steps");
        expectPredChainReachesSource(Uint32Array.of(1, 3, INVALID_INDEX), s, 2, reached);
        // A chain that meets the sentinel before the source fails too.
        expect(() => {
            expectPredChainReachesSource(Uint32Array.of(1, INVALID_INDEX, INVALID_INDEX), s, 2, reached);
        }).toThrow("predArc chain from node 0 did not reach source 2 within 3 steps");
    });

    it("expectPredArcAttains(plateau): [1, 3, INVALID_INDEX] passes and [1, 0, INVALID_INDEX] fails the array comparison", () => {
        const { s, dist } = plateau();
        expectPredArcAttains(dist, Uint32Array.of(1, 3, INVALID_INDEX), s, 2, "plateau");
        expect(() => {
            expectPredArcAttains(dist, Uint32Array.of(1, 0, INVALID_INDEX), s, 2, "plateau");
        }).toThrow(/toEqual|equal/);
    });

    it("expectPredArcAttains(tight): on a directed weighted path the chain is the path", () => {
        const s = snapshotOf(
            [
                [0, 1, 2],
                [1, 2, 3],
                [2, 3, 1],
            ],
            { directed: true },
        );
        const dist = Float64Array.of(0, 2, 5, 6);
        expectPredArcAttains(dist, Uint32Array.of(INVALID_INDEX, 0, 1, 2), s, 0, "tight");
        expectPredArcAttains(dist, Uint32Array.of(INVALID_INDEX, 0, 1, 2), s, 0, "plateau");
        expect(() => {
            expectPredArcAttains(dist, Uint32Array.of(INVALID_INDEX, 0, 0, 2), s, 0, "tight");
        }).toThrow();
    });

    it("expectTriangleInequality: a dropped relaxation is a violated arc", () => {
        const s = snapshotOf(pathEdges(4), { weighted: true });
        expectTriangleInequality(Float64Array.of(0, 1, 2, 3), s);
        expect(() => {
            expectTriangleInequality(Float64Array.of(0, 1, 2, 5), s);
        }).toThrow();
    });
});
