import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import { exactArcWeights } from "../../../src/indexed/facade.js";
import { type LaplacianType, spectralClustering } from "../../../src/indexed/spectral.js";
import { legacyResult } from "../../helpers/golden.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

const TYPES: LaplacianType[] = ["unnormalized", "normalized", "randomWalk"];

/** The Laplacian written out densely from the legacy graph, sharing nothing with the port. */
function denseLaplacian(graph: Graph, s: GraphSnapshot, type: "unnormalized" | "normalized"): number[][] {
    const n = s.nodeCount;
    const a = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    for (const edge of graph.edges()) {
        const u = s.ids.indexOf(edge.source);
        const v = s.ids.indexOf(edge.target);
        a[u][v] += edge.weight ?? 1;
        a[v][u] += edge.weight ?? 1;
    }
    const d = a.map((row) => row.reduce((x, y) => x + y, 0));
    return a.map((row, i) =>
        row.map((aij, j) => {
            if (type === "unnormalized") {
                return (i === j ? d[i] : 0) - aij;
            }
            return (i === j && d[i] > 0 ? 1 : 0) - (d[i] > 0 && d[j] > 0 ? aij / Math.sqrt(d[i] * d[j]) : 0);
        }),
    );
}

/**
 * trace(Q^T L Q) over an orthonormal basis Q of the vectors' span: the relaxed cut the embedding
 * achieves, which spectral clustering minimises. Null when the vectors span fewer than k dimensions.
 */
function ritzTrace(l: number[][], vectors: ArrayLike<number>[]): number | null {
    const q: number[][] = [];
    for (const v of vectors) {
        const w = Array.from(v);
        for (const b of q) {
            const dot = w.reduce((sum, x, i) => sum + x * b[i], 0);
            w.forEach((x, i) => (w[i] = x - dot * b[i]));
        }
        const norm = Math.hypot(...w);
        if (norm < 1e-8) {
            return null;
        }
        q.push(w.map((x) => x / norm));
    }
    let trace = 0;
    for (const b of q) {
        const lb = l.map((row) => row.reduce((sum, x, j) => sum + x * b[j], 0));
        trace += lb.reduce((sum, x, i) => sum + x * b[i], 0);
    }
    return trace;
}

/** Normalised cut: the cut weight of every cluster over its volume, summed. */
function normalisedCut(graph: Graph, s: GraphSnapshot, labels: ArrayLike<number>): number {
    const cut = new Map<number, number>();
    const vol = new Map<number, number>();
    for (const edge of graph.edges()) {
        const [u, v] = [s.ids.indexOf(edge.source), s.ids.indexOf(edge.target)];
        const w = edge.weight ?? 1;
        for (const [x, y] of [
            [u, v],
            [v, u],
        ]) {
            vol.set(labels[x], (vol.get(labels[x]) ?? 0) + w);
            if (labels[x] !== labels[y]) {
                cut.set(labels[x], (cut.get(labels[x]) ?? 0) + w);
            }
        }
    }
    let total = 0;
    for (const [c, w] of cut) {
        total += w / (vol.get(c) ?? 1);
    }
    return total;
}

function legacyLabels(s: GraphSnapshot, communities: unknown[][]): number[] {
    const labels = new Array<number>(s.nodeCount);
    communities.forEach((members, c) => members.forEach((id) => (labels[s.ids.indexOf(id as string)] = c)));
    return labels;
}

describe("indexed.spectralClustering", () => {
    it("finds the known spectrum of a path, with orthonormal eigenvectors", () => {
        const g = undirectedFixtures().find((f) => f.name === "path of six")?.graph as Graph;
        const s = checksummedSnapshot(g);
        const r = spectralClustering(s, { k: 3, laplacianType: "unnormalized" });
        // The path P_n has Laplacian eigenvalues 2 - 2 cos(pi j / n).
        for (let j = 0; j < 3; j++) {
            expect(r.eigenvalues[j]).toBeCloseTo(2 - 2 * Math.cos((Math.PI * j) / 6), 9);
        }
        const l = denseLaplacian(g, s, "unnormalized");
        r.eigenvectors.forEach((v, j) => {
            const lv = l.map((row) => row.reduce((sum, x, c) => sum + x * v[c], 0));
            expect(Math.hypot(...lv.map((x, i) => x - r.eigenvalues[j] * v[i]))).toBeLessThan(1e-8);
            expect(Math.hypot(...v)).toBeCloseTo(1, 12);
        });
        s.validate({ checksum: true });
    });

    it("gives the normalized Laplacian's eigenpairs on the karate club", () => {
        const g = undirectedFixtures().find((f) => f.name === "Zachary's karate club")?.graph as Graph;
        const s = checksummedSnapshot(g);
        const r = spectralClustering(s, { k: 4 });
        const l = denseLaplacian(g, s, "normalized");
        expect(r.eigenvalues[0]).toBeCloseTo(0, 9);
        for (let j = 1; j < 4; j++) {
            expect(r.eigenvalues[j]).toBeGreaterThanOrEqual(r.eigenvalues[j - 1]);
        }
        r.eigenvectors.forEach((v, j) => {
            const lv = l.map((row) => row.reduce((sum, x, c) => sum + x * v[c], 0));
            expect(Math.hypot(...lv.map((x, i) => x - r.eigenvalues[j] * v[i]))).toBeLessThan(1e-7);
        });
    });

    it("gives the random-walk Laplacian's eigenpairs on the karate club", () => {
        const g = undirectedFixtures().find((f) => f.name === "Zachary's karate club")?.graph as Graph;
        const s = checksummedSnapshot(g);
        const r = spectralClustering(s, { k: 4, laplacianType: "randomWalk" });
        expect(r.converged).toBe(true);
        // I - D^-1 A, not symmetric: row i of D - A divided by d(i).
        const l = denseLaplacian(g, s, "unnormalized").map((row, i) => row.map((x) => x / row[i]));
        expect(r.eigenvalues[0]).toBeCloseTo(0, 9);
        r.eigenvectors.forEach((v, j) => {
            const lv = l.map((row) => row.reduce((sum, x, c) => sum + x * v[c], 0));
            expect(Math.hypot(...lv.map((x, i) => x - r.eigenvalues[j] * v[i]))).toBeLessThan(1e-7);
        });
    });

    for (const type of TYPES) {
        it(`labels every node by its nearest k-means centre in the ${type} embedding`, () => {
            // The embedding is the returned eigenvectors, one row per node, scaled to unit length
            // for the normalized Laplacian (Ng, Jordan and Weiss). With tolerance 0 k-means stops
            // only when no node changes cluster, so every node sits nearest its own cluster's mean.
            for (const name of [
                "Zachary's karate club",
                "three four-cliques in a chain",
                "random 80 nodes, 320 weighted edges",
            ]) {
                const s = checksummedSnapshot(undirectedFixtures().find((f) => f.name === name)?.graph as Graph);
                const k = 4;
                const r = spectralClustering(s, { k, laplacianType: type, tolerance: 0, maxIterations: 1000 });
                const rows = Array.from({ length: s.nodeCount }, (_, i) => {
                    const row = r.eigenvectors.map((v) => v[i]);
                    const norm = Math.hypot(...row);
                    return type === "normalized" && norm > 0 ? row.map((x) => x / norm) : row;
                });
                const centres = Array.from({ length: r.count }, (_, c) => {
                    const members = rows.filter((_, i) => r.labels[i] === c);
                    return Array.from(
                        { length: k },
                        (_, t) => members.reduce((sum, row) => sum + row[t], 0) / members.length,
                    );
                });
                const dist = (row: number[], c: number): number =>
                    row.reduce((sum, x, t) => sum + (x - centres[c][t]) ** 2, 0);
                rows.forEach((row, i) => {
                    const own = dist(row, r.labels[i]);
                    for (let c = 0; c < r.count; c++) {
                        expect(own, `${name} node ${i}`).toBeLessThanOrEqual(dist(row, c) + 1e-12);
                    }
                });
            }
        });
    }

    it("reports whether the eigenpairs met the tolerance", () => {
        // A path's small eigenvalues crowd together (2 - 2 cos(pi j / n)), so on a long path
        // subspace iteration reaches its round cap first; a short path converges.
        const path = (n: number): GraphSnapshot => {
            const b = new GraphBuilder({ directed: false });
            for (let i = 0; i + 1 < n; i++) {
                b.addEdge(i, i + 1);
            }
            return b.freeze();
        };
        expect(spectralClustering(path(6), { k: 3, laplacianType: "unnormalized" }).converged).toBe(true);
        const long = spectralClustering(path(250), { k: 3, laplacianType: "unnormalized" });
        expect(long.converged).toBe(false);
        expect(long.eigenvalues.length).toBe(3);
    });

    for (const type of TYPES) {
        it(`recovers planted cliques exactly with the ${type} Laplacian`, () => {
            const planted: [string, number, number[][]][] = [
                [
                    "two five-cliques, disconnected",
                    2,
                    [
                        [0, 1, 2, 3, 4],
                        [5, 6, 7, 8, 9],
                    ],
                ],
                [
                    "three four-cliques in a chain",
                    3,
                    [
                        [0, 1, 2, 3],
                        [4, 5, 6, 7],
                        [8, 9, 10, 11],
                    ],
                ],
                ["two triangles and an isolated node", 3, [[0, 1, 2], [3, 4, 5], [6]]],
            ];
            for (const [name, k, groups] of planted) {
                const s = checksummedSnapshot(undirectedFixtures().find((f) => f.name === name)?.graph as Graph);
                const r = spectralClustering(s, { k, laplacianType: type });
                expect(
                    r.groups().map((group) => [...group]),
                    name,
                ).toEqual(groups);
                s.validate({ checksum: true });
            }
        });
    }

    it("reaches a relaxed cut no larger than legacy's embedding on every undirected fixture", () => {
        // The eigenvector step minimises trace(V^T L V) over orthonormal V; its minimum is the sum
        // of the k smallest eigenvalues. The legacy step does not reach it: for k <= 3 it runs a
        // fixed number of power steps from a random start, and above that it finds the LARGEST.
        for (const { name, graph } of undirectedFixtures()) {
            const s = checksummedSnapshot(graph);
            for (const type of ["unnormalized", "normalized"] as const) {
                const l = denseLaplacian(graph, s, type);
                for (const k of [2, 3, 4]) {
                    const port = ritzTrace(
                        l,
                        spectralClustering(s, { k, laplacianType: type, weights: exactArcWeights(s) }).eigenvectors,
                    );
                    expect(port, name).not.toBeNull();
                    for (let seed = 1; seed <= 5; seed++) {
                        const legacy = ritzTrace(l, (legacyResult() as SpectralClusteringResult).eigenvectors ?? []);
                        if (legacy !== null) {
                            expect(port as number, `${name} ${type} k=${k} seed ${seed}`).toBeLessThanOrEqual(
                                legacy + 1e-9,
                            );
                        }
                    }
                }
            }
        }
    });

    it("cuts no worse than legacy's average on the fixtures with community structure", () => {
        // Left out: the 40-node random graph, whose spectrum has no gap after the first eigenvalue,
        // so neither embedding carries cluster structure and the cut is k-means luck. There the
        // port's normalised cut at k = 2 and 3 is within 6% of legacy's ten-seed average.
        const structured = undirectedFixtures().filter((f) => f.name !== "random 40 nodes, 120 edges");
        for (const { name, graph } of structured) {
            const s = checksummedSnapshot(graph);
            for (const type of TYPES) {
                for (const k of [2, 3, 4]) {
                    const port = normalisedCut(
                        graph,
                        s,
                        spectralClustering(s, { k, laplacianType: type, weights: exactArcWeights(s) }).labels,
                    );
                    let sum = 0;
                    for (let seed = 1; seed <= 10; seed++) {
                        const legacy = legacyResult() as SpectralClusteringResult;
                        sum += normalisedCut(graph, s, legacyLabels(s, legacy.communities));
                    }
                    expect(port, `${name} ${type} k=${k}`).toBeLessThanOrEqual(sum / 10 + 1e-9);
                }
            }
        }
    });

    it("reads a directed snapshot as its undirected counterpart", () => {
        const [chorded] = directedFixtures();
        const u = new Graph({ directed: false });
        for (const node of chorded.graph.nodes()) {
            u.addNode(node.id);
        }
        for (const edge of chorded.graph.edges()) {
            u.addEdge(edge.source, edge.target, edge.weight);
        }
        const directed = spectralClustering(checksummedSnapshot(chorded.graph), { k: 3 });
        const undirected = spectralClustering(checksummedSnapshot(u), { k: 3 });
        expect([...directed.labels]).toEqual([...undirected.labels]);
        // Equal up to summation order: the directed rows list out-arcs before in-arcs.
        directed.eigenvalues.forEach((value, j) => expect(value).toBeCloseTo(undirected.eigenvalues[j], 12));
    });

    it("gives one result per seed", () => {
        const s = checksummedSnapshot(undirectedFixtures()[5].graph);
        const a = spectralClustering(s, { k: 3, seed: 7 });
        const b = spectralClustering(s, { k: 3, seed: 7 });
        expect([...a.labels]).toEqual([...b.labels]);
        expect([...a.eigenvalues]).toEqual([...b.eigenvalues]);
    });

    it("makes every node its own cluster when k reaches the node count", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b");
        const r = spectralClustering(b.freeze(), { k: 2 });
        expect([...r.labels]).toEqual([0, 1]);
        expect(r.count).toBe(2);
        expect(r.eigenvalues.length).toBe(0);
        expect(spectralClustering(new GraphBuilder({ directed: false }).freeze(), { k: 1 }).count).toBe(0);
    });

    it("ignores a self-loop and refuses bad parameters and weights", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge(0, 0, 9);
        b.addEdge(0, 1);
        b.addEdge(1, 2);
        const s = b.freeze();
        expect(spectralClustering(s, { k: 2, laplacianType: "unnormalized" }).eigenvalues[1]).toBeCloseTo(1, 9);
        expect(() => spectralClustering(s, { k: 0 })).toThrow(RangeError);
        expect(() => spectralClustering(s, { k: 1.5 })).toThrow(RangeError);
        expect(() => spectralClustering(s, { k: 2, laplacianType: "other" as never })).toThrow(RangeError);
        expect(() => spectralClustering(s, { k: 2, maxIterations: -1 })).toThrow(RangeError);
        expect(() => spectralClustering(s, { k: 2, weights: new Float64Array(1) })).toThrow(RangeError);
        expect(() => spectralClustering(s, { k: 2, weights: new Float64Array(s.arcCount).fill(-1) })).toThrow(
            RangeError,
        );
    });
});
