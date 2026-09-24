import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    knnGraph,
    planWaxman,
    randomGeometricGraph,
    waxmanGraph,
    waxmanRows,
} from "../../src/generators/geometric.js";
import { EdgeBuffer } from "../../src/generators/util.js";
import { type SampleGraph } from "../../src/types.js";
import { expectSameGraph, expectSimple, fullGraphHash, graphHash } from "../helpers/graph.js";

/**
 * Run a row-range generator over [0, n) split into chunks of `size` rows and concatenate.
 * @param n - the row count
 * @param size - the chunk size
 * @param rows - the row-range function
 * @returns the concatenated endpoint arrays
 */
function chunked(n: number, size: number, rows: (start: number, end: number, out: EdgeBuffer) => void): number[][] {
    const src: number[] = [];
    const dst: number[] = [];
    for (let start = 0; start < n; start += size) {
        const out = new EdgeBuffer(0);
        rows(start, Math.min(n, start + size), out);
        const part = out.finish();
        src.push(...part.src);
        dst.push(...part.dst);
    }
    return [src, dst];
}

/**
 * Assert that every chunking of the rows reproduces the whole graph's edge list.
 * @param whole - the graph generated in one call
 * @param rows - the row-range function
 */
function expectChunkInvariant(whole: SampleGraph, rows: (start: number, end: number, out: EdgeBuffer) => void): void {
    const expected = [Array.from(whole.src), Array.from(whole.dst)];
    for (const size of [1, 7, 333, whole.nodeCount + 1]) {
        expect(chunked(whole.nodeCount, size, rows)).toEqual(expected);
    }
}

/**
 * The coordinate columns of a graph.
 * @param g - the graph
 * @returns x, y and (when present) z
 */
function coords(g: SampleGraph): Float64Array[] {
    const cols = g.nodeColumns ?? {};
    const out = [cols.x, cols.y];
    if (cols.z !== undefined) {
        out.push(cols.z);
    }
    return out as Float64Array[];
}

/**
 * The squared distance of two nodes, computed the same way as the generators do.
 * @param c - the coordinate columns
 * @param u - one node
 * @param v - the other node
 * @param periodic - torus distance
 * @returns the squared distance
 */
function dist2(c: Float64Array[], u: number, v: number, periodic = false): number {
    let s = 0;
    for (const axis of c) {
        let d = Math.abs(axis[u] - axis[v]);
        if (periodic && d > 0.5) {
            d = 1 - d;
        }
        s += d * d;
    }
    return s;
}

/**
 * The O(n^2) reference random geometric graph over the generator's own points.
 * @param g - the generated graph (for its points)
 * @param radius - the radius
 * @param periodic - torus distance
 * @returns the expected endpoint arrays in (u, v) order
 */
function naiveRgg(g: SampleGraph, radius: number, periodic: boolean): number[][] {
    const c = coords(g);
    const src: number[] = [];
    const dst: number[] = [];
    for (let u = 0; u < g.nodeCount; u++) {
        for (let v = u + 1; v < g.nodeCount; v++) {
            if (dist2(c, u, v, periodic) <= radius * radius) {
                src.push(u);
                dst.push(v);
            }
        }
    }
    return [src, dst];
}

/**
 * The brute-force k nearest neighbours of every node (ties by index).
 * @param g - the generated graph (for its points)
 * @param k - neighbours per node
 * @returns neighbour lists, each ascending by index
 */
function naiveKnn(g: SampleGraph, k: number): number[][] {
    const c = coords(g);
    const out: number[][] = [];
    for (let u = 0; u < g.nodeCount; u++) {
        const others: [number, number][] = [];
        for (let v = 0; v < g.nodeCount; v++) {
            if (v !== u) {
                others.push([dist2(c, u, v), v]);
            }
        }
        others.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        out.push(
            others
                .slice(0, k)
                .map(([, v]) => v)
                .sort((a, b) => a - b),
        );
    }
    return out;
}

/**
 * The endpoint arrays of the k-NN graph from neighbour lists.
 * @param lists - neighbour lists, ascending
 * @param directed - arcs, or the undirected union
 * @returns the endpoint arrays
 */
function knnEdges(lists: number[][], directed: boolean): number[][] {
    const src: number[] = [];
    const dst: number[] = [];
    if (directed) {
        lists.forEach((list, u) => {
            for (const v of list) {
                src.push(u);
                dst.push(v);
            }
        });
        return [src, dst];
    }
    const keys = new Set<number>();
    const n = lists.length;
    lists.forEach((list, u) => {
        for (const v of list) {
            keys.add(Math.min(u, v) * n + Math.max(u, v));
        }
    });
    for (const key of [...keys].sort((a, b) => a - b)) {
        src.push(Math.floor(key / n));
        dst.push(key % n);
    }
    return [src, dst];
}

/**
 * Assert every coordinate lies in [0, 1).
 * @param g - the graph
 */
function expectUnitCube(g: SampleGraph): void {
    for (const axis of coords(g)) {
        expect(axis).toBeInstanceOf(Float64Array);
        expect(axis.length).toBe(g.nodeCount);
        for (const value of axis) {
            expect(value >= 0 && value < 1).toBe(true);
        }
    }
}

describe("randomGeometricGraph", () => {
    it.each([
        [2, false, 0.08],
        [3, false, 0.15],
        [2, true, 0.1],
        [3, true, 0.2],
        [2, false, 0.7],
        [2, true, 0.6],
    ] as const)("matches the O(n^2) reference in %iD, periodic %s, radius %s", (dimension, periodic, radius) => {
        const g = randomGeometricGraph({ n: 400, radius, dimension, periodic, seed: 3 });
        expect(g.directed).toBe(false);
        expect(g.nodeCount).toBe(400);
        expect(coords(g).length).toBe(dimension);
        expectUnitCube(g);
        expectSimple(g);
        expect([Array.from(g.src), Array.from(g.dst)]).toEqual(naiveRgg(g, radius, periodic));
    });

    it("draws each node's point from its own block, independent of n and radius", () => {
        const small = randomGeometricGraph({ n: 50, radius: 0.1, seed: 4 });
        const large = randomGeometricGraph({ n: 500, radius: 0.3, seed: 4 });
        expect(Array.from(coords(large)[0].subarray(0, 50))).toEqual(Array.from(coords(small)[0]));
        expect(Array.from(coords(large)[1].subarray(0, 50))).toEqual(Array.from(coords(small)[1]));
    });

    it("handles the edge cases", () => {
        expect(randomGeometricGraph({ n: 0, radius: 0.1 }).src.length).toBe(0);
        expect(randomGeometricGraph({ n: 1, radius: 0.1 }).src.length).toBe(0);
        expect(randomGeometricGraph({ n: 100, radius: 0 }).src.length).toBe(0);
        expect(randomGeometricGraph({ n: 30, radius: 2 }).src.length).toBe(435);
    });

    it("rejects bad options", () => {
        expect(() => randomGeometricGraph({ n: -1, radius: 0.1 })).toThrow(RangeError);
        expect(() => randomGeometricGraph({ n: 10, radius: -0.1 })).toThrow(RangeError);
        expect(() => randomGeometricGraph({ n: 10, radius: Number.NaN })).toThrow(RangeError);
        expect(() => randomGeometricGraph({ n: 10, radius: Infinity })).toThrow(RangeError);
        expect(() => randomGeometricGraph({ n: 10, radius: 0.1, dimension: 4 as 2 })).toThrow(RangeError);
        expect(() => randomGeometricGraph({ n: 10, radius: 0.1, seed: -1 })).toThrow(RangeError);
    });

    it("builds 100,000 nodes with mean degree about 10 quickly, and round-trips through graph-format", () => {
        const n = 100_000;
        const radius = Math.sqrt(10 / (Math.PI * n));
        const g = randomGeometricGraph({ n, radius, seed: 2 });
        const mean = (2 * g.src.length) / n;
        expect(mean).toBeGreaterThan(9.5);
        expect(mean).toBeLessThan(10.2);
        expect(fromEdgeArrays(g).edgeCount).toBe(g.src.length);
    });

    it("feeds the euclidean weights option from its coordinates", () => {
        const g = randomGeometricGraph({ n: 300, radius: 0.1, seed: 1, weights: { kind: "euclidean" } });
        const w = g.weights as Float32Array;
        expect(w.length).toBe(g.src.length);
        expect(Math.max(...w)).toBeLessThanOrEqual(Math.fround(0.1));
    });
});

describe("waxmanGraph", () => {
    it("is simple, ordered row-major, with points in the unit square", () => {
        const g = waxmanGraph({ n: 300, alpha: 0.2, beta: 0.4, seed: 1 });
        expect(g.directed).toBe(false);
        expectSimple(g);
        expectUnitCube(g);
        expect(coords(g).length).toBe(2);
        for (let e = 0; e < g.src.length; e++) {
            expect(g.src[e]).toBeLessThan(g.dst[e]);
            if (e > 0) {
                expect(g.src[e - 1] * 300 + g.dst[e - 1]).toBeLessThan(g.src[e] * 300 + g.dst[e]);
            }
        }
    });

    it("has the edge count of beta exp(-d / (alpha sqrt 2)) summed over the pairs", () => {
        const n = 600;
        const alpha = 0.15;
        const beta = 0.6;
        const g = waxmanGraph({ n, alpha, beta, seed: 7 });
        const c = coords(g);
        let expected = 0;
        let variance = 0;
        for (let u = 0; u < n; u++) {
            for (let v = u + 1; v < n; v++) {
                const p = beta * Math.exp(-Math.sqrt(dist2(c, u, v)) / (alpha * Math.SQRT2));
                expected += p;
                variance += p * (1 - p);
            }
        }
        expect(Math.abs(g.src.length - expected)).toBeLessThan(5 * Math.sqrt(variance));
        // short edges are more likely than long ones
        let short = 0;
        for (let e = 0; e < g.src.length; e++) {
            if (dist2(c, g.src[e], g.dst[e]) < 0.1) {
                short++;
            }
        }
        expect(short / g.src.length).toBeGreaterThan(0.3);
    });

    it("does not depend on how its rows are chunked", () => {
        const options = { n: 700, alpha: 0.1, beta: 0.3, seed: 5 };
        const plan = planWaxman(options);
        expectChunkInvariant(waxmanGraph(options), (s, e, out) => {
            waxmanRows(plan, s, e, out);
        });
    });

    it("handles beta 0 and beta 1", () => {
        expect(waxmanGraph({ n: 100, alpha: 1, beta: 0 }).src.length).toBe(0);
        const full = waxmanGraph({ n: 100, alpha: 1e9, beta: 1 });
        expect(full.src.length).toBe(4950);
    });

    it("rejects bad options and caps the pair walk", () => {
        expect(() => waxmanGraph({ n: -1, alpha: 0.1, beta: 0.1 })).toThrow(RangeError);
        expect(() => waxmanGraph({ n: 10, alpha: 0, beta: 0.1 })).toThrow(RangeError);
        expect(() => waxmanGraph({ n: 10, alpha: Infinity, beta: 0.1 })).toThrow(RangeError);
        expect(() => waxmanGraph({ n: 10, alpha: 0.1, beta: 1.1 })).toThrow(RangeError);
        expect(() => waxmanGraph({ n: 40_000, alpha: 0.1, beta: 1 })).toThrow(/beta n\^2 \/ 2/);
    });

    it("builds 5,000 nodes and round-trips through graph-format", () => {
        const g = waxmanGraph({ n: 5000, alpha: 0.02, beta: 0.5, seed: 3 });
        expect(g.src.length).toBeGreaterThan(0);
        expect(fromEdgeArrays(g).edgeCount).toBe(g.src.length);
    });
});

describe("knnGraph", () => {
    it.each([
        [2, 5, true],
        [2, 5, false],
        [3, 4, true],
        [3, 7, false],
        [2, 1, true],
        [2, 299, false],
    ] as const)("matches brute force in %iD with k %i, directed %s", (dimension, k, directed) => {
        const g = knnGraph({ n: 300, k, dimension, directed, seed: 2 });
        expect(g.directed).toBe(directed);
        expect(coords(g).length).toBe(dimension);
        expectUnitCube(g);
        expectSimple(g);
        expect([Array.from(g.src), Array.from(g.dst)]).toEqual(knnEdges(naiveKnn(g, k), directed));
    });

    it("matches brute force on a Gaussian mixture, with the cluster as ground truth", () => {
        const g = knnGraph({ n: 400, k: 6, clusters: 4, spread: 0.03, seed: 8 });
        const community = g.nodeColumns?.community as Uint32Array;
        expect(community).toBeInstanceOf(Uint32Array);
        expect(new Set(community)).toEqual(new Set([0, 1, 2, 3]));
        expectSimple(g);
        expect([Array.from(g.src), Array.from(g.dst)]).toEqual(knnEdges(naiveKnn(g, 6), true));
        // most neighbours share the cluster
        let same = 0;
        for (let e = 0; e < g.src.length; e++) {
            if (community[g.src[e]] === community[g.dst[e]]) {
                same++;
            }
        }
        expect(same / g.src.length).toBeGreaterThan(0.9);
        // a wide spread and a single cluster also work
        const wide = knnGraph({ n: 200, k: 3, dimension: 3, clusters: 1, spread: 2, directed: false, seed: 1 });
        expect([Array.from(wide.src), Array.from(wide.dst)]).toEqual(knnEdges(naiveKnn(wide, 3), false));
    });

    it("has out-degree exactly k when directed", () => {
        const g = knnGraph({ n: 1000, k: 8, seed: 1 });
        const out = new Array<number>(1000).fill(0);
        for (const u of g.src) {
            out[u]++;
        }
        expect(new Set(out)).toEqual(new Set([8]));
    });

    it("handles the edge cases", () => {
        expect(knnGraph({ n: 0, k: 0 }).src.length).toBe(0);
        expect(knnGraph({ n: 10, k: 0 }).src.length).toBe(0);
        expect(knnGraph({ n: 2, k: 1, directed: false }).src.length).toBe(1);
    });

    it("rejects bad options", () => {
        expect(() => knnGraph({ n: 10, k: 10 })).toThrow(RangeError);
        expect(() => knnGraph({ n: 10, k: -1 })).toThrow(RangeError);
        expect(() => knnGraph({ n: 10, k: 2, dimension: 1 as 2 })).toThrow(RangeError);
        expect(() => knnGraph({ n: 10, k: 2, clusters: 0 })).toThrow(RangeError);
        expect(() => knnGraph({ n: 10, k: 2, clusters: 2, spread: -1 })).toThrow(RangeError);
        expect(() => knnGraph({ n: 10, k: 2, spread: 0.1 })).toThrow(RangeError);
    });

    it("builds 100,000 nodes quickly and round-trips through graph-format", () => {
        const g = knnGraph({ n: 100_000, k: 5, seed: 3 });
        expect(g.src.length).toBe(500_000);
        expect(fromEdgeArrays(g).edgeCount).toBe(500_000);
        const u = knnGraph({ n: 100_000, k: 5, directed: false, clusters: 20, spread: 0.02, seed: 3 });
        expect(u.src.length).toBeGreaterThan(250_000);
        expect(u.src.length).toBeLessThan(500_000);
    });
});

describe("determinism", () => {
    it("gives the same graph twice, equals seed 0 unseeded, and changes with the seed", () => {
        const makers: ((seed?: number) => SampleGraph)[] = [
            (seed) => randomGeometricGraph({ n: 300, radius: 0.1, seed }),
            (seed) => waxmanGraph({ n: 300, alpha: 0.1, beta: 0.5, seed }),
            (seed) => knnGraph({ n: 300, k: 4, clusters: 3, spread: 0.1, seed }),
        ];
        for (const make of makers) {
            expectSameGraph(make(5), make(5));
            expectSameGraph(make(), make(0));
            expect(fullGraphHash(make(1))).not.toBe(fullGraphHash(make(2)));
        }
    });

    /**
     * GOLDEN VALUES: a hash of the edges, the positions and the ground truth of one graph per
     * generator. A change here means seeded graphs changed, which is a breaking change of the
     * package -- never a test to update.
     */
    it("reproduces the golden graphs", () => {
        expect(fullGraphHash(randomGeometricGraph({ n: 300, radius: 0.1, seed: 1 }))).toMatchInlineSnapshot(`"58b5ac32"`);
        expect(
            fullGraphHash(randomGeometricGraph({ n: 300, radius: 0.2, dimension: 3, periodic: true, seed: 1 })),
        ).toMatchInlineSnapshot(`"acdef35e"`);
        expect(fullGraphHash(waxmanGraph({ n: 300, alpha: 0.1, beta: 0.5, seed: 1 }))).toMatchInlineSnapshot(`"1335942d"`);
        expect(fullGraphHash(knnGraph({ n: 300, k: 4, seed: 1 }))).toMatchInlineSnapshot(`"b932861f"`);
        expect(
            fullGraphHash(knnGraph({ n: 300, k: 4, dimension: 3, directed: false, clusters: 3, spread: 0.1, seed: 1 })),
        ).toMatchInlineSnapshot(`"117ab11d"`);
        expect(graphHash(knnGraph({ n: 300, k: 4, seed: 1 }))).toMatchInlineSnapshot(`"4c7e4717"`);
    });
});
