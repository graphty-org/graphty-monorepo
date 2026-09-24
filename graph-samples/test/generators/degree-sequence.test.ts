import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    bipartiteConfigurationModelGraph,
    chungLuGraph,
    chungLuRows,
    configurationModelGraph,
    degreeCorrectedSbmGraph,
    directedConfigurationModelGraph,
    planChungLu,
    planDegreeCorrectedSbm,
    powerLawDegreeSequence,
    randomRegularGraph,
} from "../../src/generators/degree-sequence.js";
import { EdgeBuffer } from "../../src/generators/util.js";
import { type SampleGraph } from "../../src/types.js";
import { degrees, expectSameGraph, expectSimple, fullGraphHash, graphHash, pairs } from "../helpers/graph.js";

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
 * The out-degree and in-degree of every node of a directed graph.
 * @param g - the graph
 * @returns [out, in]
 */
function directedDegrees(g: SampleGraph): [number[], number[]] {
    const out = new Array<number>(g.nodeCount).fill(0);
    const inn = new Array<number>(g.nodeCount).fill(0);
    for (let e = 0; e < g.src.length; e++) {
        out[g.src[e]]++;
        inn[g.dst[e]]++;
    }
    return [out, inn];
}

const sum = (xs: ArrayLike<number>): number => Array.from(xs).reduce((a, b) => a + b, 0);

describe("powerLawDegreeSequence", () => {
    it("follows the power-law pmf and respects the bounds", () => {
        const n = 200000;
        const seq = powerLawDegreeSequence({ n, exponent: 2.5, minDegree: 2, maxDegree: 12, evenSum: false, seed: 3 });
        expect(seq.length).toBe(n);
        const weights = Array.from({ length: 11 }, (_, k) => (k + 2) ** -2.5);
        const total = sum(weights);
        const counts = new Array<number>(11).fill(0);
        for (const d of seq) {
            counts[d - 2]++;
        }
        expect(seq.reduce((a, b) => Math.min(a, b))).toBe(2);
        expect(seq.reduce((a, b) => Math.max(a, b))).toBe(12);
        for (let k = 0; k < 11; k++) {
            expect(Math.abs(counts[k] / n - weights[k] / total)).toBeLessThan(0.005);
        }
    });

    it("makes the sum even by adjusting the last entry", () => {
        for (let seed = 0; seed < 20; seed++) {
            const odd = powerLawDegreeSequence({ n: 11, exponent: 2, minDegree: 1, maxDegree: 5, evenSum: false, seed });
            const even = powerLawDegreeSequence({ n: 11, exponent: 2, minDegree: 1, maxDegree: 5, seed });
            expect(sum(even) % 2).toBe(0);
            expect(Array.from(even.subarray(0, 10))).toEqual(Array.from(odd.subarray(0, 10)));
            const last = odd[10];
            if (sum(odd) % 2 === 0) {
                expect(even[10]).toBe(last);
            } else {
                expect(even[10]).toBe(last < 5 ? last + 1 : last - 1);
            }
        }
        // a constant sequence with an odd sum cannot be fixed
        expect(() => powerLawDegreeSequence({ n: 3, exponent: 2, minDegree: 3, maxDegree: 3 })).toThrow(RangeError);
        expect(Array.from(powerLawDegreeSequence({ n: 3, exponent: 2, minDegree: 3, maxDegree: 3, evenSum: false }))).toEqual([
            3, 3, 3,
        ]);
        expect(powerLawDegreeSequence({ n: 0, exponent: 2, minDegree: 1, maxDegree: 3 }).length).toBe(0);
    });

    it("rejects bad options", () => {
        expect(() => powerLawDegreeSequence({ n: -1, exponent: 2, minDegree: 1, maxDegree: 3 })).toThrow(RangeError);
        expect(() => powerLawDegreeSequence({ n: 5, exponent: Number.NaN, minDegree: 1, maxDegree: 3 })).toThrow(/exponent/);
        expect(() => powerLawDegreeSequence({ n: 5, exponent: 2, minDegree: 0, maxDegree: 3 })).toThrow(/minDegree/);
        expect(() => powerLawDegreeSequence({ n: 5, exponent: 2, minDegree: 4, maxDegree: 3 })).toThrow(/maxDegree/);
    });
});

describe("configurationModelGraph", () => {
    const degs = [3, 1, 4, 1, 5, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 3, 8, 4, 6];

    it("keeps the exact degree sequence with keep / keep", () => {
        const g = configurationModelGraph({ degrees: degs, selfLoops: "keep", multiEdges: "keep", seed: 1 });
        expect(g.directed).toBe(false);
        expect(g.src.length).toBe(sum(degs) / 2);
        expect(degrees(g)).toEqual(degs);
        expect(fromEdgeArrays(g).edgeCount).toBe(g.src.length);
    });

    it("is simple by default and erases only loops and repeats (first occurrence kept)", () => {
        const multi = configurationModelGraph({ degrees: degs, selfLoops: "keep", multiEdges: "keep", seed: 1 });
        const simple = configurationModelGraph({ degrees: degs, seed: 1 });
        expectSimple(simple);
        const seen = new Set<string>();
        const expected: [number, number][] = [];
        for (const [u, v] of pairs(multi)) {
            const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
            if (u !== v && !seen.has(key)) {
                seen.add(key);
                expected.push([u, v]);
            }
        }
        expect(pairs(simple)).toEqual(expected);
        const loops = configurationModelGraph({ degrees: degs, multiEdges: "keep", seed: 1 });
        expect(pairs(loops)).toEqual(pairs(multi).filter(([u, v]) => u !== v));
    });

    it("pairs a Fisher-Yates shuffle of the ascending stub list", () => {
        // one node with four stubs: every pairing is two self-loops
        const g = configurationModelGraph({ degrees: [0, 4], selfLoops: "keep", multiEdges: "keep" });
        expect(pairs(g)).toEqual([
            [1, 1],
            [1, 1],
        ]);
        expect(configurationModelGraph({ degrees: [0, 4] }).src.length).toBe(0);
        expect(configurationModelGraph({ degrees: [] }).nodeCount).toBe(0);
    });

    it("rejects an odd degree sum and bad degrees", () => {
        expect(() => configurationModelGraph({ degrees: [1, 2] })).toThrow(RangeError);
        expect(() => configurationModelGraph({ degrees: [1, -1] })).toThrow(/degrees\[1\]/);
        expect(() => configurationModelGraph({ degrees: [1, 1.5] })).toThrow(RangeError);
        expect(() => configurationModelGraph({ degrees: [1, 1], selfLoops: "drop" as "keep" })).toThrow(/selfLoops/);
        expect(() => configurationModelGraph({ degrees: [1, 1], multiEdges: "x" as "keep" })).toThrow(/multiEdges/);
    });

    it("builds 100k nodes quickly", () => {
        const seq = powerLawDegreeSequence({ n: 100000, exponent: 2.5, minDegree: 2, maxDegree: 300, seed: 2 });
        const g = configurationModelGraph({ degrees: seq, seed: 2 });
        expect(g.nodeCount).toBe(100000);
        expect(g.src.length).toBeGreaterThan(0.95 * (sum(seq) / 2));
    });
});

describe("directedConfigurationModelGraph", () => {
    const outDegrees = [2, 0, 3, 1, 4, 0, 2];
    const inDegrees = [1, 3, 1, 2, 1, 3, 1];

    it("keeps exact in- and out-degrees with keep / keep, and pairs out-stubs in order", () => {
        const g = directedConfigurationModelGraph({ outDegrees, inDegrees, selfLoops: "keep", multiEdges: "keep", seed: 4 });
        expect(g.directed).toBe(true);
        expect(directedDegrees(g)).toEqual([outDegrees, inDegrees]);
        expect(Array.from(g.src)).toEqual([0, 0, 2, 2, 2, 3, 4, 4, 4, 4, 6, 6]);
        expect(fromEdgeArrays(g).edgeCount).toBe(12);
    });

    it("is simple by default (ordered pairs)", () => {
        for (let seed = 0; seed < 10; seed++) {
            expectSimple(directedConfigurationModelGraph({ outDegrees, inDegrees, seed }));
        }
    });

    it("needs equal sums and equal lengths", () => {
        expect(() => directedConfigurationModelGraph({ outDegrees: [1, 1], inDegrees: [1, 0] })).toThrow(RangeError);
        expect(() => directedConfigurationModelGraph({ outDegrees: [1], inDegrees: [1, 0] })).toThrow(RangeError);
    });
});

describe("bipartiteConfigurationModelGraph", () => {
    it("joins left to right with the exact degrees when multi-edges are kept", () => {
        const leftDegrees = [3, 2, 2, 1];
        const rightDegrees = [2, 2, 2, 1, 1];
        const g = bipartiteConfigurationModelGraph({ leftDegrees, rightDegrees, multiEdges: "keep", seed: 1 });
        expect(g.nodeCount).toBe(9);
        expect(degrees(g)).toEqual([...leftDegrees, ...rightDegrees]);
        expect(Array.from(g.nodeColumns?.side as Uint8Array)).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 1]);
        for (const [u, v] of pairs(g)) {
            expect(u).toBeLessThan(4);
            expect(v).toBeGreaterThanOrEqual(4);
        }
        expectSimple(bipartiteConfigurationModelGraph({ leftDegrees, rightDegrees, seed: 1 }));
        expect(fromEdgeArrays(g).edgeCount).toBe(8);
    });

    it("needs equal sums", () => {
        expect(() => bipartiteConfigurationModelGraph({ leftDegrees: [2], rightDegrees: [1] })).toThrow(RangeError);
    });
});

describe("chungLuGraph", () => {
    it("has mean degree close to the mean weight when weights are well below sqrt(S)", () => {
        const n = 20000;
        const weights = Array.from({ length: n }, (_, i) => 2 + (i % 20));
        const g = chungLuGraph({ expectedDegrees: weights, seed: 5 });
        expectSimple(chungLuGraph({ expectedDegrees: weights.slice(0, 2000), seed: 5 }));
        const mean = (2 * g.src.length) / n;
        expect(Math.abs(mean - sum(weights) / n)).toBeLessThan(0.1);
        // heavier nodes get proportionally more edges
        const d = degrees(g);
        const heavy = d.filter((_, i) => i % 20 === 19);
        const light = d.filter((_, i) => i % 20 === 0);
        expect(sum(heavy) / heavy.length / (sum(light) / light.length)).toBeGreaterThan(8);
    });

    it("joins every pair when the weights saturate, and nothing with zero weights", () => {
        const g = chungLuGraph({ expectedDegrees: [10, 10, 10, 10] });
        expect(g.src.length).toBe(6);
        expect(chungLuGraph({ expectedDegrees: [0, 0, 0] }).src.length).toBe(0);
        expect(chungLuGraph({ expectedDegrees: [] }).nodeCount).toBe(0);
    });

    it("lists rows in weight order with original indices", () => {
        const g = chungLuGraph({ expectedDegrees: [1, 50, 1, 50, 1], seed: 2 });
        // nodes 1 and 3 have p = 1 between them, and row 0 is node 1
        expect(pairs(g)[0]).toEqual([1, 3]);
    });

    it("does not depend on how its rows are chunked", () => {
        const options = { expectedDegrees: Array.from({ length: 700 }, (_, i) => 1 + ((i * 37) % 23)), seed: 8 };
        const plan = planChungLu(options);
        expectChunkInvariant(chungLuGraph(options), (s, e, out) => {
            chungLuRows(plan, s, e, out);
        });
    });

    it("rejects bad weights", () => {
        expect(() => chungLuGraph({ expectedDegrees: [1, -1] })).toThrow(/expectedDegrees\[1\]/);
        expect(() => chungLuGraph({ expectedDegrees: [1, Infinity] })).toThrow(RangeError);
    });

    it("builds 100k nodes quickly", () => {
        const weights = powerLawDegreeSequence({ n: 100000, exponent: 2.5, minDegree: 3, maxDegree: 300, seed: 1 });
        const g = chungLuGraph({ expectedDegrees: weights, seed: 1 });
        expect(g.nodeCount).toBe(100000);
        expect(g.src.length).toBeGreaterThan(100000);
    });
});

describe("degreeCorrectedSbmGraph", () => {
    const sizes = [300, 500, 200];
    const expectedDegrees = Array.from({ length: 1000 }, (_, i) => 4 + (i % 7));

    it("emits the community column and puts about 1 - mu of the edges inside", () => {
        const mixing = 0.2;
        const g = degreeCorrectedSbmGraph({ sizes, expectedDegrees, mixing, seed: 3 });
        expectSimple(g);
        const community = g.nodeColumns?.community as Uint32Array;
        expect(community[0]).toBe(0);
        expect(community[299]).toBe(0);
        expect(community[300]).toBe(1);
        expect(community[999]).toBe(2);
        const inside = pairs(g).filter(([u, v]) => community[u] === community[v]).length;
        // inside expected: (1 - mu) K / 2; outside: mu (K - sum kappa_r^2 / K) / 2
        const kappa = [0, 0, 0];
        expectedDegrees.forEach((d, i) => (kappa[community[i]] += d));
        const K = sum(kappa);
        const outside = (mixing * (K - sum(kappa.map((k) => (k * k) / K)))) / 2;
        const expectedInside = ((1 - mixing) * K) / 2;
        expect(Math.abs(inside / (inside + (g.src.length - inside)) - expectedInside / (expectedInside + outside))).toBeLessThan(
            0.03,
        );
        expect(Math.abs(g.src.length - (expectedInside + outside)) / (expectedInside + outside)).toBeLessThan(0.05);
        expect(fromEdgeArrays(g).edgeCount).toBe(g.src.length);
    });

    it("mu = 0 keeps every edge inside and mu = 1 every edge outside", () => {
        const g0 = degreeCorrectedSbmGraph({ sizes, expectedDegrees, mixing: 0, seed: 3 });
        const g1 = degreeCorrectedSbmGraph({ sizes, expectedDegrees, mixing: 1, seed: 3 });
        const c = g0.nodeColumns?.community as Uint32Array;
        expect(pairs(g0).every(([u, v]) => c[u] === c[v])).toBe(true);
        expect(pairs(g1).every(([u, v]) => c[u] !== c[v])).toBe(true);
        expect(g0.src.length).toBeGreaterThan(2000);
        // an all-zero block draws nothing
        const g = degreeCorrectedSbmGraph({ sizes: [2, 3], expectedDegrees: [0, 0, 1, 1, 1], mixing: 0.5 });
        expectSimple(g);
    });

    it("does not depend on how its rows are chunked", () => {
        const options = { sizes, expectedDegrees, mixing: 0.3, seed: 7 };
        const plan = planDegreeCorrectedSbm(options);
        expectChunkInvariant(degreeCorrectedSbmGraph(options), (s, e, out) => {
            chungLuRows(plan, s, e, out);
        });
    });

    it("rejects bad options", () => {
        expect(() => degreeCorrectedSbmGraph({ sizes: [2], expectedDegrees: [1, 1, 1], mixing: 0 })).toThrow(RangeError);
        expect(() => degreeCorrectedSbmGraph({ sizes: [3], expectedDegrees: [1, 1, 1], mixing: 2 })).toThrow(/mixing/);
        expect(() => degreeCorrectedSbmGraph({ sizes: [-1], expectedDegrees: [], mixing: 0 })).toThrow(/sizes\[0\]/);
    });
});

describe("randomRegularGraph", () => {
    it("is simple with every degree d", () => {
        for (const [n, d] of [
            [10, 3],
            [50, 4],
            [7, 6],
            [200, 7],
            [1000, 3],
        ]) {
            const g = randomRegularGraph({ n, d, seed: n });
            expectSimple(g);
            expect(degrees(g)).toEqual(new Array<number>(n).fill(d));
        }
        expect(randomRegularGraph({ n: 5, d: 0 }).src.length).toBe(0);
        expect(randomRegularGraph({ n: 0, d: 0 }).nodeCount).toBe(0);
    });

    it("lists edges in lexicographic order with u < v", () => {
        const g = randomRegularGraph({ n: 100, d: 5, seed: 2 });
        const keys = pairs(g).map(([u, v]) => {
            expect(u).toBeLessThan(v);
            return u * 100 + v;
        });
        expect(keys).toEqual([...keys].sort((a, b) => a - b));
        expect(fromEdgeArrays(g).edgeCount).toBe(250);
    });

    it("rejects impossible parameters", () => {
        expect(() => randomRegularGraph({ n: 5, d: 3 })).toThrow(RangeError);
        expect(() => randomRegularGraph({ n: 5, d: 5 })).toThrow(/d must/);
    });

    it("builds 100k nodes quickly", () => {
        const g = randomRegularGraph({ n: 100000, d: 4, seed: 1 });
        expect(g.src.length).toBe(200000);
    });
});

describe("determinism", () => {
    /**
     * GOLDEN VALUES: a hash of one graph per generator. A change here means seeded graphs changed,
     * which is a breaking change of the package -- never a test to update.
     */
    const degs = powerLawDegreeSequence({ n: 200, exponent: 2.2, minDegree: 2, maxDegree: 30, seed: 1 });
    const cases: readonly (readonly [string, () => SampleGraph, string])[] = [
        ["configurationModelGraph", () => configurationModelGraph({ degrees: degs, seed: 1 }), "72226822"],
        [
            "directedConfigurationModelGraph",
            () => directedConfigurationModelGraph({ outDegrees: degs, inDegrees: [...degs].reverse(), seed: 1 }),
            "965bafcd",
        ],
        [
            "bipartiteConfigurationModelGraph",
            () => bipartiteConfigurationModelGraph({ leftDegrees: degs, rightDegrees: [...degs].reverse(), seed: 1 }),
            "e9fb99dc",
        ],
        ["chungLuGraph", () => chungLuGraph({ expectedDegrees: degs, seed: 1 }), "1e07ffd6"],
        [
            "degreeCorrectedSbmGraph",
            () => degreeCorrectedSbmGraph({ sizes: [50, 100, 50], expectedDegrees: degs, mixing: 0.2, seed: 1 }),
            "72655d5d",
        ],
        ["randomRegularGraph", () => randomRegularGraph({ n: 200, d: 5, seed: 1 }), "ae8f1ccd"],
    ];

    it("powerLawDegreeSequence reproduces its golden sequence", () => {
        expect(graphHash({ directed: false, nodeCount: degs.length, src: degs, dst: degs })).toMatchInlineSnapshot(`"c936725d"`);
    });

    it.each(cases)("%s reproduces its golden graph", (_name, make, hash) => {
        expect(fullGraphHash(make())).toBe(hash);
    });

    it.each(cases)("%s gives the same graph twice", (_name, make) => {
        expectSameGraph(make(), make());
    });

    it("unseeded equals seed 0 and a different seed differs", () => {
        const base = { degrees: degs };
        expectSameGraph(configurationModelGraph(base), configurationModelGraph({ ...base, seed: 0 }));
        expect(graphHash(configurationModelGraph({ ...base, seed: 2 }))).not.toBe(graphHash(configurationModelGraph(base)));
        expectSameGraph(chungLuGraph({ expectedDegrees: degs }), chungLuGraph({ expectedDegrees: degs, seed: 0 }));
        expect(graphHash(chungLuGraph({ expectedDegrees: degs, seed: 2 }))).not.toBe(
            graphHash(chungLuGraph({ expectedDegrees: degs })),
        );
        expect(graphHash(randomRegularGraph({ n: 50, d: 3, seed: 2 }))).not.toBe(graphHash(randomRegularGraph({ n: 50, d: 3 })));
        expect(Array.from(powerLawDegreeSequence({ n: 50, exponent: 2, minDegree: 1, maxDegree: 9 }))).toEqual(
            Array.from(powerLawDegreeSequence({ n: 50, exponent: 2, minDegree: 1, maxDegree: 9, seed: 0 })),
        );
    });

    it("the weights option applies", () => {
        const g = chungLuGraph({ expectedDegrees: degs, seed: 1, weights: { kind: "uniform" } });
        expect(g.weights?.length).toBe(g.src.length);
    });
});
