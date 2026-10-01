import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    kroneckerGraph,
    orderDagRows,
    priceGraph,
    randomOrderDagGraph,
    rmatGraph,
} from "../../src/generators/directed.js";
import { erdosRenyiGraph, erdosRenyiRows } from "../../src/generators/erdos-renyi.js";
import { EdgeBuffer } from "../../src/generators/util.js";
import { type SampleGraph } from "../../src/types.js";
import { degrees, edgeKeys, expectSameGraph, expectSimple, fullGraphHash, graphHash, pairs } from "../helpers/graph.js";

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
 * The in-degree of every node.
 * @param g - the graph
 * @returns the in-degrees
 */
function inDegrees(g: SampleGraph): number[] {
    const d = new Array<number>(g.nodeCount).fill(0);
    for (const v of g.dst) {
        d[v]++;
    }
    return d;
}

describe("kroneckerGraph", () => {
    it("has k^power nodes and round(S^power) edges by default", () => {
        const g = kroneckerGraph({ initiator: [[0.9, 0.5], [0.5, 0.1]], power: 10, seed: 1 });
        expect(g.directed).toBe(true);
        expect(g.nodeCount).toBe(1024);
        expect(g.src.length).toBe(Math.round(2 ** 10));
        expect(kroneckerGraph({ initiator: [[1, 1, 0], [1, 0, 1], [0, 1, 1]], power: 3, edges: 50 }).src.length).toBe(50);
        expect(kroneckerGraph({ initiator: [[0.5]], power: 5, seed: 1 }).nodeCount).toBe(1);
    });

    it("never picks a zero cell of the initiator", () => {
        // no (1, 0) cell: every source digit is <= its target digit
        const upper = kroneckerGraph({ initiator: [[0.9, 0.5], [0, 0.6]], power: 8, seed: 2 });
        for (const [u, v] of pairs(upper)) {
            expect(u & ~v).toBe(0);
        }
        // a diagonal initiator gives only self-loops
        const diagonal = kroneckerGraph({ initiator: [[0.9, 0], [0, 0.9]], power: 6, seed: 2 });
        expect(pairs(diagonal).every(([u, v]) => u === v)).toBe(true);
    });

    it("erases self-loops and repeated pairs, keeping the first occurrence", () => {
        const options = { initiator: [[0.9, 0.6], [0.6, 0.2]], power: 5, seed: 4 };
        const raw = kroneckerGraph(options);
        const clean = kroneckerGraph({ ...options, selfLoops: "erase", multiEdges: "erase" });
        const seen = new Set<string>();
        const expected = pairs(raw).filter(([u, v]) => {
            const key = `${u}-${v}`;
            if (u === v || seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
        expect(pairs(clean)).toEqual(expected);
        expectSimple(clean);
        const undirected = kroneckerGraph({ ...options, directed: false, selfLoops: "erase", multiEdges: "erase" });
        expect(undirected.directed).toBe(false);
        expectSimple(undirected);
        expect(undirected.src.length).toBeLessThan(clean.src.length);
    });

    it("permutes node labels without changing the degree sequence", () => {
        const options = { initiator: [[0.9, 0.5], [0.5, 0.1]], power: 8, seed: 3 };
        const plain = kroneckerGraph(options);
        const permuted = kroneckerGraph({ ...options, permute: true });
        expect(graphHash(permuted)).not.toBe(graphHash(plain));
        expect(degrees(permuted).sort((a, b) => a - b)).toEqual(degrees(plain).sort((a, b) => a - b));
    });

    it("rejects bad arguments", () => {
        expect(() => kroneckerGraph({ initiator: [], power: 2 })).toThrow(RangeError);
        expect(() => kroneckerGraph({ initiator: [[0.5, 0.5], [0.5]], power: 2 })).toThrow(RangeError);
        expect(() => kroneckerGraph({ initiator: [[1.5]], power: 2 })).toThrow(RangeError);
        expect(() => kroneckerGraph({ initiator: [[0.5]], power: 0 })).toThrow(RangeError);
        expect(() => kroneckerGraph({ initiator: [[0.5, 0.5], [0.5, 0.5]], power: 33 })).toThrow(RangeError);
        expect(() => kroneckerGraph({ initiator: [[0.5]], power: 2, edges: -1 })).toThrow(RangeError);
        expect(() => kroneckerGraph({ initiator: [[0]], power: 2, edges: 3 })).toThrow(RangeError);
        expect(() =>
            kroneckerGraph({ initiator: [[0.5]], power: 2, selfLoops: "drop" as unknown as "erase" }),
        ).toThrow(RangeError);
        expect(kroneckerGraph({ initiator: [[0]], power: 2 }).src.length).toBe(0);
    });
});

describe("rmatGraph", () => {
    it("has 2^scale nodes and edgeFactor 2^scale edges", () => {
        const g = rmatGraph({ scale: 10, seed: 1 });
        expect(g.nodeCount).toBe(1024);
        expect(g.src.length).toBe(16 * 1024);
        expect(g.directed).toBe(true);
        // the defaults make a skewed, hub-heavy graph
        const d = degrees(g);
        expect(Math.max(...d)).toBeGreaterThan(20 * (d.reduce((a, b) => a + b, 0) / d.length));
    });

    it("sends every edge to the only non-zero quadrant", () => {
        expect(new Set(pairs(rmatGraph({ scale: 5, edgeFactor: 2, a: 1, b: 0, c: 0, d: 0 })).flat())).toEqual(
            new Set([0]),
        );
        expect(edgeKeys(rmatGraph({ scale: 5, edgeFactor: 1, a: 0, b: 1, c: 0, d: 0 }))).toEqual(
            new Array<string>(32).fill("0-31"),
        );
        expect(edgeKeys(rmatGraph({ scale: 5, edgeFactor: 1, a: 0, b: 0, c: 1, d: 0 }))[0]).toBe("31-0");
        expect(edgeKeys(rmatGraph({ scale: 5, edgeFactor: 1, a: 0, b: 0, c: 0, d: 1 }))[0]).toBe("31-31");
    });

    it("erases, permutes and goes undirected", () => {
        const g = rmatGraph({ scale: 8, edgeFactor: 8, seed: 2, selfLoops: "erase", multiEdges: "erase", permute: true });
        expectSimple(g);
        expect(g.src.length).toBeLessThan(8 * 256);
        const u = rmatGraph({ scale: 8, edgeFactor: 8, seed: 2, directed: false, multiEdges: "erase", selfLoops: "erase" });
        expect(u.directed).toBe(false);
        expectSimple(u);
        const weighted = rmatGraph({ scale: 6, seed: 2, selfLoops: "erase", weights: { kind: "integer", min: 1, max: 10 } });
        expect(weighted.weights?.every((w) => w >= 1 && w <= 10 && Number.isInteger(w))).toBe(true);
    });

    it("scales to 131,072 nodes", () => {
        const g = rmatGraph({ scale: 17, edgeFactor: 1, seed: 1 });
        expect(g.nodeCount).toBe(131072);
        expect(g.src.length).toBe(131072);
        expect(fromEdgeArrays(g).edgeCount).toBe(131072);
    });

    it("rejects bad arguments", () => {
        expect(() => rmatGraph({ scale: -1 })).toThrow(RangeError);
        expect(() => rmatGraph({ scale: 32 })).toThrow(RangeError);
        expect(() => rmatGraph({ scale: 4, a: 0.5 })).toThrow(RangeError);
        expect(() => rmatGraph({ scale: 4, d: 1.5 })).toThrow(RangeError);
        expect(() => rmatGraph({ scale: 4, edgeFactor: 1.5 })).toThrow(RangeError);
        expect(() => rmatGraph({ scale: 30 })).toThrow(RangeError);
        expect(() => rmatGraph({ scale: 4, multiEdges: "no" as unknown as "keep" })).toThrow(RangeError);
    });
});

describe("priceGraph", () => {
    it("is a DAG of arcs new -> old, each node citing min(m, t) distinct earlier nodes", () => {
        const n = 2000;
        const m = 3;
        const g = priceGraph({ n, citations: m, seed: 1 });
        expect(g.directed).toBe(true);
        expect(g.src.length).toBe(1 + 2 + (n - 3) * m);
        expectSimple(g);
        const out = new Array<number>(n).fill(0);
        for (const [u, v] of pairs(g)) {
            expect(v).toBeLessThan(u);
            out[u]++;
        }
        expect(out.every((d, t) => d === Math.min(m, t))).toBe(true);
        // the first nodes cite everything before them, ascending
        expect(pairs(g).slice(0, 3)).toEqual([
            [1, 0],
            [2, 0],
            [2, 1],
        ]);
    });

    it("has a heavy-tailed in-degree, heavier with smaller attractiveness", () => {
        const heavy = Math.max(...inDegrees(priceGraph({ n: 5000, citations: 2, attractiveness: 0.5, seed: 2 })));
        const light = Math.max(...inDegrees(priceGraph({ n: 5000, citations: 2, attractiveness: 50, seed: 2 })));
        expect(heavy).toBeGreaterThan(100);
        expect(light).toBeLessThan(heavy);
    });

    it("scales to 100,000 nodes", () => {
        const g = priceGraph({ n: 100000, citations: 3, seed: 1 });
        expect(g.src.length).toBe(1 + 2 + (100000 - 3) * 3);
        expect(fromEdgeArrays(g).nodeCount).toBe(100000);
    });

    it("handles one node and rejects bad arguments", () => {
        expect(priceGraph({ n: 1, citations: 2 }).src.length).toBe(0);
        expect(() => priceGraph({ n: 0, citations: 2 })).toThrow(RangeError);
        expect(() => priceGraph({ n: 10, citations: 0 })).toThrow(RangeError);
        expect(() => priceGraph({ n: 10, citations: 2, attractiveness: 0 })).toThrow(RangeError);
        expect(() => priceGraph({ n: 10, citations: 2, attractiveness: Infinity })).toThrow(RangeError);
    });
});

describe("randomOrderDagGraph", () => {
    it("has only arcs i -> j with i < j, at density p", () => {
        const n = 600;
        const g = randomOrderDagGraph({ n, p: 0.05, seed: 1 });
        expectSimple(g);
        expect(pairs(g).every(([u, v]) => u < v)).toBe(true);
        const density = g.src.length / ((n * (n - 1)) / 2);
        expect(density).toBeGreaterThan(0.045);
        expect(density).toBeLessThan(0.055);
        expect(randomOrderDagGraph({ n: 20, p: 1 }).src.length).toBe(190);
        expect(randomOrderDagGraph({ n: 20, p: 0 }).src.length).toBe(0);
    });

    it("does not depend on how its rows are chunked", () => {
        const options = { n: 700, p: 0.02, seed: 5 };
        expectChunkInvariant(randomOrderDagGraph(options), (s, e, out) => {
            orderDagRows(options, s, e, out);
        });
    });

    it("scales to 100,000 nodes", () => {
        const g = randomOrderDagGraph({ n: 100000, p: 0.00005, seed: 1 });
        expect(fromEdgeArrays(g).nodeCount).toBe(100000);
    });

    it("rejects bad arguments", () => {
        expect(() => randomOrderDagGraph({ n: -1, p: 0.5 })).toThrow(RangeError);
        expect(() => randomOrderDagGraph({ n: 5, p: 1.5 })).toThrow(RangeError);
    });
});

describe("directed Erdos-Renyi", () => {
    it("leaves the undirected graph unchanged by default", () => {
        const options = { n: 200, p: 0.05, seed: 1 };
        expectSameGraph(erdosRenyiGraph({ ...options, directed: false }), erdosRenyiGraph(options));
        expect(erdosRenyiGraph(options).directed).toBe(false);
    });

    it("draws every ordered pair u != v, by u then v ascending", () => {
        const n = 500;
        const g = erdosRenyiGraph({ n, p: 0.04, directed: true, seed: 2 });
        expect(g.directed).toBe(true);
        expectSimple(g);
        const density = g.src.length / (n * (n - 1));
        expect(density).toBeGreaterThan(0.037);
        expect(density).toBeLessThan(0.043);
        const keys = pairs(g).map(([u, v]) => u * n + v);
        expect(keys).toEqual([...keys].sort((a, b) => a - b));
        // both orientations occur: arcs below and above the diagonal
        expect(pairs(g).some(([u, v]) => u > v)).toBe(true);
        expect(pairs(g).some(([u, v]) => u < v)).toBe(true);
        const complete = erdosRenyiGraph({ n: 5, p: 1, directed: true });
        expect(pairs(complete)).toEqual(
            [0, 1, 2, 3, 4].flatMap((u) => [0, 1, 2, 3, 4].filter((v) => v !== u).map((v) => [u, v])),
        );
        expect(erdosRenyiGraph({ n: 5, p: 0, directed: true }).src.length).toBe(0);
    });

    it("does not depend on how its rows are chunked", () => {
        const options = { n: 400, p: 0.03, directed: true, seed: 5 };
        expectChunkInvariant(erdosRenyiGraph(options), (s, e, out) => {
            erdosRenyiRows(options, s, e, out);
        });
    });
});

describe("determinism", () => {
    const makers: readonly (readonly [string, (seed?: number) => SampleGraph])[] = [
        ["kroneckerGraph", (seed) => kroneckerGraph({ initiator: [[0.9, 0.5], [0.5, 0.1]], power: 7, seed })],
        ["rmatGraph", (seed) => rmatGraph({ scale: 7, edgeFactor: 4, permute: true, seed })],
        ["priceGraph", (seed) => priceGraph({ n: 200, citations: 3, seed })],
        ["randomOrderDagGraph", (seed) => randomOrderDagGraph({ n: 200, p: 0.05, seed })],
        ["erdosRenyiGraph (directed)", (seed) => erdosRenyiGraph({ n: 200, p: 0.05, directed: true, seed })],
    ];

    it.each(makers)("%s: same graph twice, unseeded equals seed 0, another seed differs", (_name, make) => {
        expectSameGraph(make(1), make(1));
        expectSameGraph(make(), make(0));
        expect(graphHash(make(2))).not.toBe(graphHash(make(1)));
    });

    /**
     * GOLDEN VALUES: a hash of one graph per generator. A change here means seeded graphs changed,
     * which is a breaking change of the package -- never a test to update.
     */
    it("reproduces the golden graphs", () => {
        expect(fullGraphHash(makers[0][1](1))).toMatchInlineSnapshot(`"2a0ababe"`);
        expect(fullGraphHash(makers[1][1](1))).toMatchInlineSnapshot(`"1a015629"`);
        expect(fullGraphHash(makers[2][1](1))).toMatchInlineSnapshot(`"41feb0ab"`);
        expect(fullGraphHash(makers[3][1](1))).toMatchInlineSnapshot(`"fc50ed5b"`);
        expect(fullGraphHash(makers[4][1](1))).toMatchInlineSnapshot(`"d6ffb461"`);
    });
});
