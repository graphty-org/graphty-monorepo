import { expandEdges, GraphBuilder, type GraphSnapshot, type NumericVector } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { PathWalkError } from "../../../src/errors.js";
import { allPairsShortestPath, type ApspResult } from "../../../src/indexed/all-pairs.js";
import {
    apspRowsOracle,
    expectMatrixTriangleInequality,
    expectSymmetric,
    floydWarshallOracle,
} from "../../helpers/all-pairs-oracle.js";
import { Graph } from "../../helpers/legacy-graph.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

/**
 * The exact f64 weights, one per arc: the shadow column `toSnapshot` keeps when some weight is not
 * f32-exact, else the arc column itself, which is then exact.
 */
function f64Weights(s: GraphSnapshot): NumericVector {
    const shadow = s.edges.byRole("weight");
    if (shadow !== null && shadow.dtype === "f64") {
        return expandEdges(s, shadow.data);
    }
    if (s.weights === null) {
        throw new Error("expected a weight column");
    }
    return s.weights;
}

function allFixtures(): { name: string; graph: Graph }[] {
    return [...undirectedFixtures(), ...directedFixtures()];
}

function threePath(): Graph {
    const g = new Graph({ directed: false });
    g.addEdge("a", "b", 1);
    g.addEdge("b", "c", 1);
    return g;
}

describe("indexed.allPairsShortestPath -- input checks", () => {
    it("returns an empty matrix for an empty graph", () => {
        const s = checksummedSnapshot(new Graph());
        const r = allPairsShortestPath(s);
        expect(r.n).toBe(0);
        expect(r.dist.length).toBe(0);
        expect(r.hasNegativeCycle).toBe(false);
        s.validate({ checksum: true });
    });

    it("refuses more than maxNodes nodes, naming the size, the bound and the bytes", () => {
        const s = checksummedSnapshot(threePath());
        expect(() => allPairsShortestPath(s, { maxNodes: 2 })).toThrow(RangeError);
        expect(() => allPairsShortestPath(s, { maxNodes: 2 })).toThrow(/3 nodes.*maxNodes 2.*\b72 bytes/);
        expect(() => allPairsShortestPath(s, { maxNodes: 2, paths: true })).toThrow(/\b108 bytes/);
        s.validate({ checksum: true });
    });

    it("refuses a NaN or infinite weight and an override of the wrong length", () => {
        const s = checksummedSnapshot(threePath());
        const bad = (x: number): Float64Array => new Float64Array(s.arcCount).fill(1).fill(x, 0, 1);
        expect(() => allPairsShortestPath(s, { weights: bad(NaN) })).toThrow(RangeError);
        expect(() => allPairsShortestPath(s, { weights: bad(Infinity) })).toThrow(RangeError);
        expect(() => allPairsShortestPath(s, { weights: new Float64Array(s.arcCount + 1) })).toThrow(RangeError);
        s.validate({ checksum: true });
    });

    it("refuses a NaN maxNodes instead of dropping the bound", () => {
        const s = checksummedSnapshot(threePath());
        expect(() => allPairsShortestPath(s, { maxNodes: NaN })).toThrow(/maxNodes NaN/);
        s.validate({ checksum: true });
    });

    it("names f32 overflow and the f64 override for a finite weight above the f32 range", () => {
        const b = new GraphBuilder({ directed: true, weightDtype: "f64" });
        b.addEdge(0, 1, 1e39);
        b.addEdge(1, 2, 1);
        const s = b.freeze();
        expect(() => allPairsShortestPath(s)).toThrow(/f32.*weights override/);
        const w = f64Weights(s);
        expect(allPairsShortestPath(s, { weights: w }).dist[2]).toBe(1e39 + 1);
    });

    it("has an oracle that gets a weighted square right", () => {
        // a-b 1, b-c 2, c-d 3, d-a 10, undirected: a->d is 6 the long way round
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", 1);
        g.addEdge("b", "c", 2);
        g.addEdge("c", "d", 3);
        g.addEdge("d", "a", 10);
        const s = checksummedSnapshot(g);
        expect([...floydWarshallOracle(s, s.weights)]).toEqual([0, 1, 3, 6, 1, 0, 2, 5, 3, 2, 0, 3, 6, 5, 3, 0]);
        s.validate({ checksum: true });
    });
});

describe("indexed.allPairsShortestPath -- Floyd-Warshall", () => {
    const fw = { method: "floyd-warshall" } as const;

    it("equals the reference on every fixture", () => {
        for (const { name, graph } of allFixtures()) {
            const s = checksummedSnapshot(graph);
            const r = allPairsShortestPath(s, fw);
            expect(r.method, name).toBe("floyd-warshall");
            expect(r.hasNegativeCycle, name).toBe(false);
            expect(r.dist, name).toEqual(floydWarshallOracle(s, s.weights));
            expectMatrixTriangleInequality(r.dist, s, s.weights);
            if (!s.directed) {
                expectSymmetric(r.dist, r.n);
            }
            s.validate({ checksum: true });
        }
    });

    it("gives [0] for one node, with or without a positive self-loop", () => {
        const lone = new Graph();
        lone.addNode("a");
        const looped = new Graph({ allowSelfLoops: true });
        looped.addEdge("a", "a", 3);
        for (const g of [lone, looped]) {
            const s = checksummedSnapshot(g);
            expect([...allPairsShortestPath(s, fw).dist]).toEqual([0]);
            s.validate({ checksum: true });
        }
    });

    it("keeps the diagonal 0 under a positive self-loop", () => {
        const g = new Graph({ directed: true, allowSelfLoops: true });
        g.addEdge("a", "b", 2);
        g.addEdge("b", "b", 5);
        const s = checksummedSnapshot(g);
        expect([...allPairsShortestPath(s, fw).dist]).toEqual([0, 2, Infinity, 0]);
        s.validate({ checksum: true });
    });

    it("takes the cheapest of parallel edges", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", 5);
        b.addEdge("a", "b", 2);
        const s = b.freeze({ checksum: true });
        expect([...allPairsShortestPath(s, fw).dist]).toEqual([0, 2, 2, 0]);
        s.validate({ checksum: true });
    });

    it("leaves +Infinity across components and against a one-way chain", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", 1);
        g.addEdge("c", "d", 1);
        g.addNode("z");
        const s = checksummedSnapshot(g);
        const r = allPairsShortestPath(s, fw);
        expect(r.dist[0 * 5 + 1]).toBe(1);
        expect(r.dist[0 * 5 + 2]).toBe(Infinity);
        expect(r.dist[4 * 5 + 0]).toBe(Infinity);
        expect(r.dist[4 * 5 + 4]).toBe(0);
        s.validate({ checksum: true });

        const chain = new Graph({ directed: true });
        chain.addEdge("a", "b", 1);
        chain.addEdge("b", "c", 1);
        const sc = checksummedSnapshot(chain);
        const rc = allPairsShortestPath(sc, fw);
        expect(rc.dist[0 * 3 + 2]).toBe(2);
        expect(rc.dist[2 * 3 + 0]).toBe(Infinity);
        sc.validate({ checksum: true });
    });

    it("reproduces f64 sums exactly through the weights override", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 0.1);
        g.addEdge("b", "c", 0.2);
        const s = checksummedSnapshot(g);
        const w = f64Weights(s);
        const r = allPairsShortestPath(s, { ...fw, weights: w });
        expect(r.dist).toEqual(floydWarshallOracle(s, w));
        expect(r.dist[2]).toBe(0.1 + 0.2);
        s.validate({ checksum: true });
    });

    it("can pick a different path on the f32 arc weights than on the f64 override", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 0.1);
        g.addEdge("b", "c", 0.2);
        g.addEdge("a", "c", 0.3);
        const s = checksummedSnapshot(g);
        const r32 = allPairsShortestPath(s, { paths: true });
        const r64 = allPairsShortestPath(s, { paths: true, weights: f64Weights(s) });
        expect(Array.from(r32.pathTo(0, 2))).toEqual([0, 1, 2]);
        expect(Array.from(r64.pathTo(0, 2))).toEqual([0, 2]);
        expect(r64.dist[2]).toBe(0.3);
        s.validate({ checksum: true });
    });
});

function directed(edges: [string, string, number][], allowSelfLoops = false): Graph {
    const g = new Graph({ directed: true, allowSelfLoops });
    for (const [u, v, w] of edges) {
        g.addEdge(u, v, w);
    }
    return g;
}

function everyCellNaN(dist: ArrayLike<number>): boolean {
    return Array.from(dist).every((x) => Number.isNaN(x));
}

describe("indexed.allPairsShortestPath -- negative weights", () => {
    it("sweeps a directed negative weight with no cycle", () => {
        const s = checksummedSnapshot(
            directed([
                ["a", "b", 4],
                ["a", "c", 2],
                ["c", "b", -1],
            ]),
        );
        const r = allPairsShortestPath(s);
        expect(r.hasNegativeCycle).toBe(false);
        expect(r.dist[0 * 3 + 1]).toBe(1);
        s.validate({ checksum: true });
    });

    it("flags a directed negative cycle and fills the matrix with NaN", () => {
        const s = checksummedSnapshot(
            directed([
                ["a", "b", 1],
                ["b", "c", 1],
                ["c", "a", -10],
            ]),
        );
        const r = allPairsShortestPath(s);
        expect(r.hasNegativeCycle).toBe(true);
        expect(r.dist.length).toBe(9);
        expect(everyCellNaN(r.dist)).toBe(true);
        s.validate({ checksum: true });
    });

    it("flags a negative self-loop, on one node and on four", () => {
        const one = checksummedSnapshot(directed([["a", "a", -1]], true));
        const r1 = allPairsShortestPath(one);
        expect(r1.hasNegativeCycle).toBe(true);
        expect(r1.dist.length).toBe(1);
        expect(Number.isNaN(r1.dist[0])).toBe(true);
        one.validate({ checksum: true });

        const four = checksummedSnapshot(
            directed(
                [
                    ["a", "b", 1],
                    ["b", "c", 1],
                    ["c", "d", 1],
                    ["c", "c", -1],
                ],
                true,
            ),
        );
        const r4 = allPairsShortestPath(four);
        expect(r4.hasNegativeCycle).toBe(true);
        expect(everyCellNaN(r4.dist)).toBe(true);
        four.validate({ checksum: true });
    });

    it("flags any negative edge on an undirected graph", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", 3);
        g.addEdge("b", "c", -1);
        const s = checksummedSnapshot(g);
        const r = allPairsShortestPath(s);
        expect(r.hasNegativeCycle).toBe(true);
        expect(everyCellNaN(r.dist)).toBe(true);
        s.validate({ checksum: true });
    });

    it("stops on Hougardy's graph before any value runs away", () => {
        for (const isDirected of [true, false]) {
            const g = new Graph({ directed: isDirected });
            for (let i = 0; i < 12; i++) {
                for (let j = 0; j < 12; j++) {
                    if (i !== j && (isDirected || i < j)) {
                        g.addEdge(`v${i}`, `v${j}`, -1);
                    }
                }
            }
            const s = checksummedSnapshot(g);
            const r = allPairsShortestPath(s);
            expect(r.hasNegativeCycle).toBe(true);
            expect(r.dist.includes(-Infinity)).toBe(false);
            expect(everyCellNaN(r.dist)).toBe(true);
            s.validate({ checksum: true });
        }
    });

    it("reports no negative cycle when no weight is negative", () => {
        for (const { name, graph } of allFixtures()) {
            const s = checksummedSnapshot(graph);
            expect(allPairsShortestPath(s).hasNegativeCycle, name).toBe(false);
        }
    });
});

function isUnit(w: NumericVector | null): boolean {
    return w === null || Array.from(w).every((x) => x === 1);
}

function allTwos(s: GraphSnapshot): Float64Array {
    return new Float64Array(s.arcCount).fill(2);
}

/** A directed graph on 20 nodes with exactly `arcs` arcs, no self-loop, no parallel edge. */
function directed20(arcs: number): GraphSnapshot {
    const b = new GraphBuilder({ directed: true });
    for (let i = 0; i < 20; i++) {
        b.addNode(`n${i}`);
    }
    let added = 0;
    for (let i = 0; i < 20 && added < arcs; i++) {
        for (let j = 0; j < 20 && added < arcs; j++) {
            if (j !== 0) {
                b.addEdge(`n${i}`, `n${(i + j) % 20}`, 2);
                added++;
            }
        }
    }
    return b.freeze({ checksum: true });
}

function square(weight: number): GraphSnapshot {
    // a-b-d and a-c-d: two routes of equal length from a to d
    const b = new GraphBuilder({ directed: false });
    b.addEdge("a", "b", weight);
    b.addEdge("a", "c", weight);
    b.addEdge("b", "d", weight);
    b.addEdge("c", "d", weight);
    return b.freeze({ checksum: true });
}

describe("indexed.allPairsShortestPath -- per-source strategies and the rule", () => {
    it("per-source equals the reference on every fixture, own weights and all-2", () => {
        for (const { name, graph } of allFixtures()) {
            const s = checksummedSnapshot(graph);
            const own = allPairsShortestPath(s, { method: "per-source" });
            expect(own.method, name).toBe(isUnit(s.weights) ? "bfs" : "dijkstra");
            expect(own.dist, name).toEqual(floydWarshallOracle(s, s.weights));
            const twos = allTwos(s);
            const viaTwos = allPairsShortestPath(s, { method: "per-source", weights: twos });
            expect(viaTwos.method, name).toBe("dijkstra");
            expect(viaTwos.dist, name).toEqual(floydWarshallOracle(s, twos));
            expectMatrixTriangleInequality(viaTwos.dist, s, twos);
            s.validate({ checksum: true });
        }
    });

    it("auto equals the reference on every fixture, and BFS rows on unit weights", () => {
        for (const { name, graph } of allFixtures()) {
            const s = checksummedSnapshot(graph);
            const r = allPairsShortestPath(s);
            expect(r.dist, name).toEqual(floydWarshallOracle(s, s.weights));
            if (isUnit(s.weights)) {
                expect(r.method, name).toBe("bfs");
                expect(r.dist, name).toEqual(apspRowsOracle(s));
            } else {
                const hops = allPairsShortestPath(s, { weighted: false });
                expect(hops.method, name).toBe("bfs");
                expect(hops.dist, name).toEqual(apspRowsOracle(s));
            }
            s.validate({ checksum: true });
        }
    });

    it("switches from Dijkstra to Floyd-Warshall at arcCount n^2 / 3", () => {
        const below = directed20(133);
        expect(below.arcCount).toBe(133);
        expect(allPairsShortestPath(below).method).toBe("dijkstra");
        const at = directed20(134);
        expect(at.arcCount).toBe(134);
        expect(allPairsShortestPath(at).method).toBe("floyd-warshall");
        below.validate({ checksum: true });
        at.validate({ checksum: true });
    });

    it("keeps Dijkstra rows within 1e-12 of the reference on real weights", () => {
        const random = ((): (() => number) => {
            let state = 97;
            return () => {
                state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
                return state / 4294967296;
            };
        })();
        const b = new GraphBuilder({ directed: true });
        for (let i = 0; i < 30; i++) {
            b.addNode(`n${i}`);
        }
        for (let e = 0; e < 90; e++) {
            const u = Math.floor(random() * 30);
            const v = Math.floor(random() * 30);
            if (u !== v) {
                b.addEdge(`n${u}`, `n${v}`, 0.1 + Math.floor(random() * 9) / 10);
            }
        }
        const s = b.freeze({ checksum: true });
        const w = Float64Array.from({ length: s.arcCount }, (_, a) => 0.1 + (a % 9) / 10);
        const r = allPairsShortestPath(s, { method: "per-source", weights: w });
        expect(r.method).toBe("dijkstra");
        const ref = floydWarshallOracle(s, w);
        for (let c = 0; c < ref.length; c++) {
            if (ref[c] === Infinity) {
                expect(r.dist[c]).toBe(Infinity);
            } else {
                expect(Math.abs(r.dist[c] - ref[c])).toBeLessThanOrEqual(1e-12 * ref[c]);
            }
        }
        s.validate({ checksum: true });
    });

    it("gives the same matrix from every strategy on a square of equal routes", () => {
        const s2 = square(2);
        expect(allPairsShortestPath(s2, { method: "per-source" }).dist).toEqual(
            allPairsShortestPath(s2, { method: "floyd-warshall" }).dist,
        );
        const s1 = square(1);
        const bfs = allPairsShortestPath(s1, { method: "per-source" });
        expect(bfs.method).toBe("bfs");
        expect(bfs.dist).toEqual(allPairsShortestPath(s1, { method: "floyd-warshall" }).dist);
        s2.validate({ checksum: true });
        s1.validate({ checksum: true });
    });

    it("refuses per-source on a negative weight and sweeps it under auto", () => {
        const s = checksummedSnapshot(
            directed([
                ["a", "b", 4],
                ["a", "c", 2],
                ["c", "b", -1],
            ]),
        );
        expect(() => allPairsShortestPath(s, { method: "per-source" })).toThrow(/negative/);
        expect(allPairsShortestPath(s).method).toBe("floyd-warshall");
        s.validate({ checksum: true });
    });
});

/** Every reachable pair's path walks from i to j over real edges and weighs exactly `dist`. */
function expectPathsMatchDist(s: GraphSnapshot, r: ApspResult, arcWeights: NumericVector | null, label: string): void {
    const el = s.edgeList();
    // one weight per logical edge, read through the edge's first arc
    const edgeWeight = new Float64Array(s.edgeCount);
    for (let a = 0; a < s.arcCount; a++) {
        edgeWeight[s.arcToEdge[a]] = arcWeights === null ? 1 : arcWeights[a];
    }
    const { n } = r;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const nodes = r.pathTo(i, j);
            const edges = r.pathEdges(i, j);
            const d = r.dist[i * n + j];
            if (d === Infinity) {
                expect(nodes.length, label).toBe(0);
                expect(edges.length, label).toBe(0);
                continue;
            }
            expect(nodes[0], label).toBe(i);
            expect(nodes[nodes.length - 1], label).toBe(j);
            expect(edges.length, label).toBe(nodes.length - 1);
            let sum = 0;
            for (let e = 0; e < edges.length; e++) {
                const [u, v] = [nodes[e], nodes[e + 1]];
                const [a, b] = [el.src[edges[e]], el.dst[edges[e]]];
                expect(a === u && b === v ? true : !s.directed && a === v && b === u, label).toBe(true);
                sum += edgeWeight[edges[e]];
            }
            expect(sum, `${label} ${String(i)}->${String(j)}`).toBe(d);
        }
    }
}

describe("indexed.allPairsShortestPath -- paths", () => {
    it("walks every reachable pair on every fixture and strategy", () => {
        for (const { name, graph } of allFixtures()) {
            const s = checksummedSnapshot(graph);
            for (const method of ["floyd-warshall", "per-source"] as const) {
                const own = allPairsShortestPath(s, { method, paths: true });
                expectPathsMatchDist(s, own, s.weights, `${name} ${method}`);
                const twos = allTwos(s);
                const viaTwos = allPairsShortestPath(s, { method, paths: true, weights: twos });
                expectPathsMatchDist(s, viaTwos, twos, `${name} ${method} all-2`);
            }
            s.validate({ checksum: true });
        }
    });

    it("gives [i] and no edges on the diagonal, nothing when unreachable", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 1);
        g.addNode("z");
        const s = checksummedSnapshot(g);
        for (const method of ["floyd-warshall", "per-source"] as const) {
            const r = allPairsShortestPath(s, { method, paths: true });
            expect([...r.pathTo(1, 1)]).toEqual([1]);
            expect(r.pathEdges(1, 1).length).toBe(0);
            expect(r.pathTo(1, 0).length).toBe(0);
            expect(r.pathEdges(0, 2).length).toBe(0);
        }
        s.validate({ checksum: true });
    });

    it("names the cheaper of two parallel edges on every strategy", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", 5);
        b.addEdge("a", "b", 2);
        const s = b.freeze({ checksum: true });
        const el = s.edgeList();
        for (const method of ["auto", "floyd-warshall", "per-source"] as const) {
            const r = allPairsShortestPath(s, { method, paths: true });
            for (const [i, j] of [
                [0, 1],
                [1, 0],
            ]) {
                const edges = r.pathEdges(i, j);
                expect(edges.length, method).toBe(1);
                expect(el.weights?.[edges[0]], method).toBe(2);
            }
        }
        s.validate({ checksum: true });
    });

    it("takes the cheapest parallel edge when it comes first, on every strategy (issue #567)", () => {
        // 2.x floydWarshall kept the LAST parallel edge, so A->B 1 then A->B 5 gave 5.
        const b = new GraphBuilder({ directed: true });
        b.addEdge("a", "b", 1);
        b.addEdge("a", "b", 5);
        const s = b.freeze({ checksum: true });
        for (const method of ["auto", "floyd-warshall", "per-source"] as const) {
            expect([...allPairsShortestPath(s, { method }).dist], method).toEqual([0, 1, Infinity, 0]);
        }
        s.validate({ checksum: true });
    });

    it("has no predArc and throwing accessors without paths: true", () => {
        const s = square(1);
        const r = allPairsShortestPath(s);
        expect(r.predArc).toBeNull();
        expect(() => r.pathTo(0, 3)).toThrow(/paths: true/);
        expect(() => r.pathEdges(0, 3)).toThrow(/paths: true/);
    });

    it("throws PathWalkError from the accessors under a negative cycle", () => {
        const cycle = checksummedSnapshot(
            directed([
                ["a", "b", 1],
                ["b", "c", 1],
                ["c", "a", -10],
            ]),
        );
        const r = allPairsShortestPath(cycle, { paths: true });
        expect(() => r.pathTo(0, 2)).toThrow(PathWalkError);
        expect(() => r.pathEdges(0, 2)).toThrow(PathWalkError);

        const loop = checksummedSnapshot(directed([["a", "a", -1]], true));
        const rl = allPairsShortestPath(loop, { paths: true });
        expect(() => rl.pathTo(0, 0)).toThrow(PathWalkError);
        cycle.validate({ checksum: true });
        loop.validate({ checksum: true });
    });
});

describe("indexed.allPairsShortestPath -- against the textbook sweep on every port fixture", () => {
    // The textbook k-i-j sweep in node order over the exact f64 weights is what the shipped
    // floydWarshall computed before it delegated here; fixtures are at most 90 nodes.
    it("matches bit for bit with the f64 override, and exactly by default", () => {
        for (const { name, graph } of allFixtures()) {
            const s = checksummedSnapshot(graph);
            const reference = floydWarshallOracle(s, f64Weights(s));
            const exact = allPairsShortestPath(s, { method: "floyd-warshall", weights: f64Weights(s) });
            const auto = allPairsShortestPath(s);
            expect(exact.hasNegativeCycle, name).toBe(false);
            const { n } = exact;
            for (let i = 0; i < n * n; i++) {
                expect(Object.is(exact.dist[i], reference[i]), `${name} ${String(i)}`).toBe(true);
                expect(auto.dist[i], `${name} ${String(i)}`).toBe(reference[i]);
            }
            s.validate({ checksum: true });
        }
    });
});
