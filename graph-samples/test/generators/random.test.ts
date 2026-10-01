import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { bipartiteRows, plantedMatching } from "../../src/generators/bipartite.js";
import { blockModelRows, planBlocks } from "../../src/generators/block-model.js";
import { erdosRenyiRows } from "../../src/generators/erdos-renyi.js";
import {
    barabasiAlbertGraph,
    erdosRenyiGnmGraph,
    erdosRenyiGraph,
    plantedPartitionGraph,
    randomBipartiteGraph,
    randomDagGraph,
    randomTreeGraph,
    stochasticBlockModelGraph,
    wattsStrogatzGraph,
} from "../../src/generators/index.js";
import { dagRows } from "../../src/generators/trees-and-dags.js";
import { EdgeBuffer } from "../../src/generators/util.js";
import { type SampleGraph } from "../../src/types.js";
import { componentCount, degrees, expectSameGraph, expectSimple, graphHash, pairs } from "../helpers/graph.js";

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
 * The fraction of a graph's pairs that satisfy `inPair` that are edges.
 * @param g - the graph
 * @param inPair - which unordered pairs to count
 * @returns edges / pairs over the selected pairs
 */
function density(g: SampleGraph, inPair: (u: number, v: number) => boolean): number {
    let total = 0;
    for (let u = 0; u < g.nodeCount; u++) {
        for (let v = u + 1; v < g.nodeCount; v++) {
            if (inPair(u, v)) {
                total++;
            }
        }
    }
    const edges = pairs(g).filter(([u, v]) => inPair(Math.min(u, v), Math.max(u, v))).length;
    return edges / total;
}

/**
 * The average local clustering coefficient.
 * @param g - the graph
 * @returns the average
 */
function clustering(g: SampleGraph): number {
    const adj = Array.from({ length: g.nodeCount }, () => new Set<number>());
    for (const [u, v] of pairs(g)) {
        adj[u].add(v);
        adj[v].add(u);
    }
    let sum = 0;
    for (let u = 0; u < g.nodeCount; u++) {
        const nb = [...adj[u]];
        if (nb.length < 2) {
            continue;
        }
        let links = 0;
        for (let i = 0; i < nb.length; i++) {
            for (let j = i + 1; j < nb.length; j++) {
                if (adj[nb[i]].has(nb[j])) {
                    links++;
                }
            }
        }
        sum += (2 * links) / (nb.length * (nb.length - 1));
    }
    return sum / g.nodeCount;
}

/**
 * GOLDEN VALUES: a hash of one graph per generator. A change here means seeded graphs changed,
 * which is a breaking change of the package -- never a test to update.
 */
const GOLDEN: readonly (readonly [string, () => SampleGraph, string])[] = [
    ["erdosRenyiGraph", () => erdosRenyiGraph({ n: 200, p: 0.05, seed: 1 }), "2f80587a"],
    ["erdosRenyiGnmGraph", () => erdosRenyiGnmGraph({ n: 200, m: 500, seed: 1 }), "6eafa4fb"],
    ["barabasiAlbertGraph", () => barabasiAlbertGraph({ n: 200, m: 3, seed: 1 }), "b629766c"],
    [
        "barabasiAlbertGraph (Holme-Kim)",
        () => barabasiAlbertGraph({ n: 200, m: 3, triadProbability: 0.5, seed: 1 }),
        "ed2bdb05",
    ],
    ["wattsStrogatzGraph", () => wattsStrogatzGraph({ n: 200, k: 6, beta: 0.2, seed: 1 }), "99d84b77"],
    [
        "stochasticBlockModelGraph",
        () =>
            stochasticBlockModelGraph({
                sizes: [50, 80, 70],
                probabilities: [
                    [0.2, 0.01, 0.02],
                    [0.01, 0.15, 0.005],
                    [0.02, 0.005, 0.3],
                ],
                seed: 1,
            }),
        "6aa50beb",
    ],
    [
        "randomBipartiteGraph",
        () => randomBipartiteGraph({ n1: 60, n2: 60, p: 0.05, perfectMatching: true, seed: 1 }),
        "e1f5d630",
    ],
    ["randomTreeGraph", () => randomTreeGraph({ n: 200, seed: 1 }), "8a9a5be0"],
    ["randomDagGraph", () => randomDagGraph({ layers: [5, 20, 40, 20, 5], p: 0.1, seed: 1 }), "b4bb666b"],
];

describe("determinism", () => {
    it.each(GOLDEN)("%s reproduces its golden graph", (_name, make, hash) => {
        expect(graphHash(make())).toBe(hash);
    });

    it.each(GOLDEN)("%s gives the same graph twice", (_name, make) => {
        expectSameGraph(make(), make());
    });

    it("a different seed or a seed above 2^32 changes the graph", () => {
        const a = erdosRenyiGraph({ n: 300, p: 0.05, seed: 1 });
        expect(graphHash(erdosRenyiGraph({ n: 300, p: 0.05, seed: 2 }))).not.toBe(graphHash(a));
        expect(graphHash(erdosRenyiGraph({ n: 300, p: 0.05, seed: 2 ** 32 + 1 }))).not.toBe(graphHash(a));
        expect(graphHash(barabasiAlbertGraph({ n: 300, m: 2, seed: 2 ** 53 - 1 }))).not.toBe(
            graphHash(barabasiAlbertGraph({ n: 300, m: 2, seed: 0 })),
        );
    });

    it("G(n, p) does not depend on how its rows are chunked", () => {
        const options = { n: 700, p: 0.02, seed: 5 };
        expectChunkInvariant(erdosRenyiGraph(options), (s, e, out) => {
            erdosRenyiRows(options, s, e, out);
        });
    });

    it("the block model does not depend on how its rows are chunked", () => {
        const options = {
            sizes: [100, 250, 350],
            probabilities: [
                [0.1, 0.01, 0],
                [0.01, 0.05, 0.002],
                [0, 0.002, 1],
            ],
            seed: 9,
        };
        const plan = planBlocks(options);
        expectChunkInvariant(stochasticBlockModelGraph(options), (s, e, out) => {
            blockModelRows(plan, s, e, out);
        });
    });

    it("the bipartite graph does not depend on how its rows are chunked", () => {
        const options = { n1: 400, n2: 400, p: 0.01, perfectMatching: true, seed: 3 };
        const whole = randomBipartiteGraph(options);
        const match = plantedMatching(400, 3);
        const expected = [Array.from(whole.src), Array.from(whole.dst)];
        for (const size of [1, 13, 400]) {
            expect(
                chunked(400, size, (s, e, out) => {
                    bipartiteRows(options, match, s, e, out);
                }),
            ).toEqual(expected);
        }
    });

    it("the layered DAG does not depend on how its rows are chunked", () => {
        const layers = [100, 300, 200];
        const whole = randomDagGraph({ layers, p: 0.03, seed: 4 });
        expectChunkInvariant(whole, (s, e, out) => {
            dagRows([0, 100, 400, 600], whole.nodeColumns?.layer as Uint32Array<ArrayBuffer>, 0.03, 4, s, e, out);
        });
    });
});

describe("erdosRenyiGraph", () => {
    it("draws about p of all pairs, row-major with u < v", () => {
        const g = erdosRenyiGraph({ n: 400, p: 0.1, seed: 11 });
        expectSimple(g);
        const m = g.src.length;
        const mean = 0.1 * ((400 * 399) / 2);
        expect(Math.abs(m - mean)).toBeLessThan(5 * Math.sqrt(mean * 0.9));
        for (let e = 1; e < m; e++) {
            expect(g.src[e] < g.dst[e]).toBe(true);
            expect(g.src[e] > g.src[e - 1] || (g.src[e] === g.src[e - 1] && g.dst[e] > g.dst[e - 1])).toBe(true);
        }
    });

    it("handles p = 0, p = 1 and tiny n", () => {
        expect(erdosRenyiGraph({ n: 50, p: 0, seed: 1 }).src.length).toBe(0);
        expect(erdosRenyiGraph({ n: 20, p: 1, seed: 1 }).src.length).toBe(190);
        expect(erdosRenyiGraph({ n: 0, p: 0.5, seed: 1 }).nodeCount).toBe(0);
        expect(() => erdosRenyiGraph({ n: 10, p: 1.5, seed: 1 })).toThrow(RangeError);
        expect(() => erdosRenyiGraph({ n: 10, p: 0.5, seed: -3 })).toThrow(RangeError);
    });

    it("builds a 100k-node sparse graph", () => {
        const g = erdosRenyiGraph({ n: 100_000, p: 8 / 100_000, seed: 2 });
        expect(Math.abs(g.src.length - 400_000)).toBeLessThan(5000);
        expect(fromEdgeArrays(g).edgeCount).toBe(g.src.length);
    });
});

describe("erdosRenyiGnmGraph", () => {
    it("has exactly m distinct pairs in row-major order", () => {
        const g = erdosRenyiGnmGraph({ n: 100, m: 2000, seed: 3 });
        expectSimple(g);
        expect(g.src.length).toBe(2000);
        const keys = pairs(g).map(([u, v]) => u * 100 + v);
        expect(keys).toEqual([...keys].sort((a, b) => a - b));
    });

    it("can take every pair and no pair", () => {
        expect(erdosRenyiGnmGraph({ n: 30, m: 435, seed: 1 }).src.length).toBe(435);
        expect(erdosRenyiGnmGraph({ n: 30, m: 0, seed: 1 }).src.length).toBe(0);
        expect(() => erdosRenyiGnmGraph({ n: 30, m: 436, seed: 1 })).toThrow(RangeError);
    });

    it("picks every pair about equally often", () => {
        const counts = new Array<number>(10).fill(0);
        for (let seed = 0; seed < 3000; seed++) {
            for (const [u, v] of pairs(erdosRenyiGnmGraph({ n: 5, m: 3, seed }))) {
                counts[(u * (9 - u)) / 2 + v - u - 1]++;
            }
        }
        for (const c of counts) {
            expect(c).toBeGreaterThan(810);
            expect(c).toBeLessThan(990);
        }
    });

    it("builds 100k nodes and 500k edges", () => {
        const g = erdosRenyiGnmGraph({ n: 100_000, m: 500_000, seed: 8 });
        expect(g.src.length).toBe(500_000);
    });
});

describe("barabasiAlbertGraph", () => {
    it("adds m edges per new node, simple and connected, with hubs", () => {
        const g = barabasiAlbertGraph({ n: 2000, m: 3, seed: 7 });
        expectSimple(g);
        expect(g.src.length).toBe((2000 - 3) * 3);
        expect(componentCount(g)).toBe(1);
        const d = degrees(g);
        expect(Math.max(...d)).toBeGreaterThan(10 * 6);
        for (let e = 0; e < g.src.length; e++) {
            expect(g.src[e]).toBeGreaterThan(g.dst[e]);
        }
    });

    it("m = 1 grows a tree", () => {
        const g = barabasiAlbertGraph({ n: 500, m: 1, seed: 1 });
        expect(g.src.length).toBe(499);
        expect(componentCount(g)).toBe(1);
    });

    it("the triad step raises clustering and keeps the edge count", () => {
        const plain = barabasiAlbertGraph({ n: 1500, m: 4, seed: 2 });
        const triads = barabasiAlbertGraph({ n: 1500, m: 4, triadProbability: 0.9, seed: 2 });
        expectSimple(triads);
        expect(triads.src.length).toBe(plain.src.length);
        expect(clustering(triads)).toBeGreaterThan(3 * clustering(plain));
    });

    it("rejects bad options and builds 100k nodes", () => {
        expect(() => barabasiAlbertGraph({ n: 3, m: 3, seed: 1 })).toThrow(RangeError);
        expect(() => barabasiAlbertGraph({ n: 10, m: 2, triadProbability: 2, seed: 1 })).toThrow(RangeError);
        expect(barabasiAlbertGraph({ n: 100_000, m: 3, seed: 1 }).src.length).toBe(299_991);
    });
});

describe("wattsStrogatzGraph", () => {
    it("beta = 0 is the ring lattice", () => {
        const g = wattsStrogatzGraph({ n: 10, k: 4, beta: 0, seed: 1 });
        expect(pairs(g).slice(0, 4)).toEqual([
            [0, 1],
            [0, 2],
            [1, 2],
            [1, 3],
        ]);
        expect(degrees(g).every((d) => d === 4)).toBe(true);
    });

    it("rewiring keeps the edge count, stays simple and lowers clustering", () => {
        const lattice = wattsStrogatzGraph({ n: 1000, k: 10, beta: 0, seed: 1 });
        const small = wattsStrogatzGraph({ n: 1000, k: 10, beta: 0.1, seed: 1 });
        const random = wattsStrogatzGraph({ n: 1000, k: 10, beta: 1, seed: 1 });
        for (const g of [small, random]) {
            expectSimple(g);
            expect(g.src.length).toBe(5000);
        }
        expect(clustering(lattice)).toBeGreaterThan(clustering(small));
        expect(clustering(small)).toBeGreaterThan(clustering(random));
    });

    it("saturated nodes are skipped instead of looping", () => {
        const g = wattsStrogatzGraph({ n: 5, k: 4, beta: 1, seed: 1 });
        expectSimple(g);
        expect(g.src.length).toBe(10);
    });

    it("rejects odd k and too few nodes, builds 100k nodes", () => {
        expect(() => wattsStrogatzGraph({ n: 10, k: 3, beta: 0.1, seed: 1 })).toThrow(RangeError);
        expect(() => wattsStrogatzGraph({ n: 4, k: 4, beta: 0.1, seed: 1 })).toThrow(RangeError);
        expect(wattsStrogatzGraph({ n: 100_000, k: 6, beta: 0.1, seed: 1 }).src.length).toBe(300_000);
    });
});

describe("stochasticBlockModelGraph and plantedPartitionGraph", () => {
    it("matches the block densities and labels the blocks", () => {
        const g = stochasticBlockModelGraph({
            sizes: [150, 150],
            probabilities: [
                [0.2, 0.01],
                [0.01, 0.1],
            ],
            seed: 6,
        });
        expectSimple(g);
        const community = g.nodeColumns?.community as Uint32Array;
        expect(community[0]).toBe(0);
        expect(community[299]).toBe(1);
        expect(density(g, (u, v) => community[u] === 0 && community[v] === 0)).toBeCloseTo(0.2, 1);
        expect(density(g, (u, v) => community[u] === 1 && community[v] === 1)).toBeCloseTo(0.1, 1);
        expect(density(g, (u, v) => community[u] !== community[v])).toBeCloseTo(0.01, 2);
    });

    it("planted partition is the block model with that matrix", () => {
        const planted = plantedPartitionGraph({ groups: 3, groupSize: 20, pIn: 0.5, pOut: 0.05, seed: 2 });
        const sbm = stochasticBlockModelGraph({
            sizes: [20, 20, 20],
            probabilities: [
                [0.5, 0.05, 0.05],
                [0.05, 0.5, 0.05],
                [0.05, 0.05, 0.5],
            ],
            seed: 2,
        });
        expectSameGraph(planted, sbm);
    });

    it("rejects malformed matrices", () => {
        expect(() => stochasticBlockModelGraph({ sizes: [2, 2], probabilities: [[0.1, 0.2]], seed: 1 })).toThrow(
            RangeError,
        );
        expect(() =>
            stochasticBlockModelGraph({
                sizes: [2, 2],
                probabilities: [
                    [0.1, 0.2],
                    [0.3, 0.1],
                ],
                seed: 1,
            }),
        ).toThrow(/symmetric/);
        expect(() => stochasticBlockModelGraph({ sizes: [2, 2], probabilities: [[0.1], [0.1, 0.2]], seed: 1 })).toThrow(
            RangeError,
        );
        expect(() => stochasticBlockModelGraph({ sizes: [], probabilities: [], seed: 1 })).toThrow(RangeError);
    });

    it("builds 100k nodes in 10 blocks", () => {
        const g = plantedPartitionGraph({ groups: 10, groupSize: 10_000, pIn: 1e-3, pOut: 1e-5, seed: 1 });
        expect(g.nodeCount).toBe(100_000);
        expect(g.src.length).toBeGreaterThan(500_000);
    });
});

describe("randomBipartiteGraph", () => {
    it("joins only left to right and labels the sides", () => {
        const g = randomBipartiteGraph({ n1: 50, n2: 80, p: 0.1, seed: 1 });
        expectSimple(g);
        for (const [u, v] of pairs(g)) {
            expect(u).toBeLessThan(50);
            expect(v).toBeGreaterThanOrEqual(50);
        }
        const side = g.nodeColumns?.side as Uint8Array;
        expect(side[49]).toBe(0);
        expect(side[50]).toBe(1);
    });

    it("plants a perfect matching even at p = 0, never twice", () => {
        const g = randomBipartiteGraph({ n1: 40, n2: 40, p: 0, perfectMatching: true, seed: 5 });
        expect(g.src.length).toBe(40);
        expect(new Set(g.dst).size).toBe(40);
        const dense = randomBipartiteGraph({ n1: 30, n2: 30, p: 1, perfectMatching: true, seed: 5 });
        expectSimple(dense);
        expect(dense.src.length).toBe(900);
        const sparse = randomBipartiteGraph({ n1: 300, n2: 300, p: 0.02, perfectMatching: true, seed: 5 });
        expectSimple(sparse);
        const matched = new Set(pairs(sparse).map(([u, v]) => `${u}-${v}`));
        const match = plantedMatching(300, 5);
        for (let u = 0; u < 300; u++) {
            expect(matched.has(`${u}-${300 + match[u]}`)).toBe(true);
        }
        expect(() => randomBipartiteGraph({ n1: 3, n2: 4, p: 0.1, perfectMatching: true, seed: 1 })).toThrow(
            RangeError,
        );
    });
});

describe("randomTreeGraph", () => {
    it("is a spanning tree", () => {
        const g = randomTreeGraph({ n: 1000, seed: 4 });
        expectSimple(g);
        expect(g.src.length).toBe(999);
        expect(componentCount(g)).toBe(1);
        expect(randomTreeGraph({ n: 1, seed: 4 }).src.length).toBe(0);
        expect(pairs(randomTreeGraph({ n: 2, seed: 4 }))).toEqual([[0, 1]]);
    });

    it("draws each of the 16 labelled trees on 4 nodes about equally often", () => {
        const counts = new Map<string, number>();
        for (let seed = 0; seed < 8000; seed++) {
            const key = pairs(randomTreeGraph({ n: 4, seed }))
                .map(([u, v]) => `${Math.min(u, v)}${Math.max(u, v)}`)
                .sort()
                .join(",");
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        expect(counts.size).toBe(16);
        for (const c of counts.values()) {
            expect(c).toBeGreaterThan(400);
            expect(c).toBeLessThan(600);
        }
    });

    it("builds 100k nodes", () => {
        expect(componentCount(randomTreeGraph({ n: 100_000, seed: 1 }))).toBe(1);
    });
});

describe("randomDagGraph", () => {
    it("has arcs only from each layer to the next", () => {
        const g = randomDagGraph({ layers: [3, 10, 10, 2], p: 0.3, seed: 2 });
        expect(g.directed).toBe(true);
        expectSimple(g);
        const layer = g.nodeColumns?.layer as Uint32Array;
        expect(Array.from(layer.slice(0, 4))).toEqual([0, 0, 0, 1]);
        for (const [u, v] of pairs(g)) {
            expect(layer[v]).toBe(layer[u] + 1);
        }
        expect(fromEdgeArrays(g).directed).toBe(true);
    });

    it("handles a single layer, empty layers and p = 1", () => {
        expect(randomDagGraph({ layers: [5], p: 0.5, seed: 1 }).src.length).toBe(0);
        expect(randomDagGraph({ layers: [2, 0, 3], p: 1, seed: 1 }).src.length).toBe(0);
        expect(randomDagGraph({ layers: [2, 3], p: 1, seed: 1 }).src.length).toBe(6);
        expect(() => randomDagGraph({ layers: [], p: 0.5, seed: 1 })).toThrow(RangeError);
    });
});
