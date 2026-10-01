import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { hyperbolicGraph, hyperbolicRows, planHyperbolic } from "../../src/generators/hyperbolic.js";
import { EdgeBuffer } from "../../src/generators/util.js";
import { type SampleGraph } from "../../src/types.js";
import { degrees, expectSameGraph, expectSimple, fullGraphHash } from "../helpers/graph.js";

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
 * The disk radius of the paper, computed independently with Math functions.
 * @param n - the node count
 * @param k - the average degree
 * @param gamma - the exponent
 * @param t - the temperature
 * @returns R
 */
function paperRadius(n: number, k: number, gamma: number, t: number): number {
    const alpha = (gamma - 1) / 2;
    const xi = alpha / (alpha - 0.5);
    const correction = t === 0 ? 1 : (Math.PI * t) / Math.sin(Math.PI * t);
    return 2 * Math.log(((2 * xi * xi * n) / (Math.PI * k)) * correction);
}

/**
 * The mean degree of a graph.
 * @param g - the graph
 * @returns 2 m / n
 */
function meanDegree(g: SampleGraph): number {
    return (2 * g.src.length) / g.nodeCount;
}

describe("hyperbolicGraph", () => {
    it("computes the paper's disk radius", () => {
        expect(planHyperbolic({ n: 1000, averageDegree: 8, exponent: 2.5 }).R).toBeCloseTo(
            paperRadius(1000, 8, 2.5, 0),
            10,
        );
        expect(planHyperbolic({ n: 1000, averageDegree: 8, exponent: 2.2, temperature: 0.6 }).R).toBeCloseTo(
            paperRadius(1000, 8, 2.2, 0.6),
            10,
        );
    });

    it("at temperature 0 joins exactly the pairs closer than R in the hyperbolic plane", () => {
        const options = { n: 600, averageDegree: 8, exponent: 2.4, seed: 2 };
        const g = hyperbolicGraph(options);
        expect(g.directed).toBe(false);
        expectSimple(g);
        const R = paperRadius(600, 8, 2.4, 0);
        const cols = g.nodeColumns ?? {};
        const x = cols.x as Float64Array;
        const y = cols.y as Float64Array;
        const r = cols.radius as Float64Array;
        expect(x).toBeInstanceOf(Float64Array);
        expect(Math.max(...r)).toBeLessThanOrEqual(R + 1e-9);
        expect(Math.min(...r)).toBeGreaterThanOrEqual(0);
        const edges = new Set(Array.from(g.src, (u, e) => u * 600 + g.dst[e]));
        let checked = 0;
        for (let u = 0; u < 600; u++) {
            expect(Math.hypot(x[u], y[u])).toBeCloseTo(r[u], 9);
            for (let v = u + 1; v < 600; v++) {
                const dTheta = Math.atan2(y[u], x[u]) - Math.atan2(y[v], x[v]);
                const coshD =
                    Math.cosh(r[u]) * Math.cosh(r[v]) - Math.sinh(r[u]) * Math.sinh(r[v]) * Math.cos(dTheta);
                if (Math.abs(coshD / Math.cosh(R) - 1) < 1e-9) {
                    continue;
                }
                expect(edges.has(u * 600 + v)).toBe(coshD < Math.cosh(R));
                checked++;
            }
        }
        expect(checked).toBeGreaterThan(179_000);
        // edges are the pairs (u, v), u < v, in row-major order
        for (let e = 1; e < g.src.length; e++) {
            expect(g.src[e - 1] * 600 + g.dst[e - 1]).toBeLessThan(g.src[e] * 600 + g.dst[e]);
        }
    });

    it.each([
        [2.5, 0],
        [2.2, 0],
        [2.8, 0.5],
        [3.5, 0.7],
    ])("has about the asked mean degree and a heavy tail (exponent %s, temperature %s)", (exponent, temperature) => {
        const g = hyperbolicGraph({ n: 3000, averageDegree: 10, exponent, temperature, seed: 1 });
        expectSimple(g);
        const mean = meanDegree(g);
        expect(mean).toBeGreaterThan(5);
        expect(mean).toBeLessThan(15);
        expect(Math.max(...degrees(g))).toBeGreaterThan(8 * mean);
    });

    it("does not depend on how its rows are chunked", () => {
        for (const temperature of [0, 0.4]) {
            const options = { n: 700, averageDegree: 6, exponent: 2.6, temperature, seed: 5 };
            const plan = planHyperbolic(options);
            expectChunkInvariant(hyperbolicGraph(options), (s, e, out) => {
                hyperbolicRows(plan, s, e, out);
            });
        }
    });

    it("handles tiny graphs", () => {
        expect(hyperbolicGraph({ n: 0, averageDegree: 5, exponent: 2.5 }).src.length).toBe(0);
        expect(hyperbolicGraph({ n: 1, averageDegree: 5, exponent: 2.5 }).nodeCount).toBe(1);
    });

    it("rejects bad options", () => {
        const ok = { n: 100, averageDegree: 5, exponent: 2.5 };
        expect(() => hyperbolicGraph({ ...ok, n: -1 })).toThrow(RangeError);
        expect(() => hyperbolicGraph({ ...ok, n: 20_001 })).toThrow(/20000/);
        expect(() => hyperbolicGraph({ ...ok, averageDegree: 0 })).toThrow(RangeError);
        expect(() => hyperbolicGraph({ ...ok, exponent: 2 })).toThrow(RangeError);
        expect(() => hyperbolicGraph({ ...ok, exponent: Infinity })).toThrow(RangeError);
        expect(() => hyperbolicGraph({ ...ok, temperature: 1 })).toThrow(RangeError);
        expect(() => hyperbolicGraph({ ...ok, temperature: -0.1 })).toThrow(RangeError);
        expect(() => hyperbolicGraph({ ...ok, averageDegree: 5000 })).toThrow(/averageDegree/);
        expect(() => hyperbolicGraph({ ...ok, exponent: 1e6 })).toThrow(RangeError);
    });

    it("builds 5,000 nodes, round-trips through graph-format, and feeds euclidean weights", () => {
        const g = hyperbolicGraph({ n: 5000, averageDegree: 8, exponent: 2.5, seed: 3, weights: { kind: "euclidean" } });
        expect(fromEdgeArrays(g).edgeCount).toBe(g.src.length);
        expect(g.weights?.length).toBe(g.src.length);
    });
});

describe("determinism", () => {
    it("gives the same graph twice, equals seed 0 unseeded, and changes with the seed", () => {
        for (const temperature of [0, 0.3]) {
            const make = (seed?: number): SampleGraph =>
                hyperbolicGraph({ n: 300, averageDegree: 6, exponent: 2.5, temperature, seed });
            expectSameGraph(make(5), make(5));
            expectSameGraph(make(), make(0));
            expect(fullGraphHash(make(1))).not.toBe(fullGraphHash(make(2)));
        }
    });

    /**
     * GOLDEN VALUES: a hash of the edges and the coordinates of one graph per temperature regime.
     * A change here means seeded graphs changed, which is a breaking change of the package -- never
     * a test to update.
     */
    it("reproduces the golden graphs", () => {
        expect(fullGraphHash(hyperbolicGraph({ n: 300, averageDegree: 6, exponent: 2.5, seed: 1 }))).toMatchInlineSnapshot(`"53427d12"`);
        expect(
            fullGraphHash(hyperbolicGraph({ n: 300, averageDegree: 6, exponent: 2.5, temperature: 0.5, seed: 1 })),
        ).toMatchInlineSnapshot(`"adfe7cf8"`);
    });
});
