import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { lfrGraph, type LfrOptions } from "../../src/generators/lfr.js";
import { type SampleGraph } from "../../src/types.js";
import { degrees, expectSameGraph, expectSimple, fullGraphHash, graphHash, pairs } from "../helpers/graph.js";

const BASE: LfrOptions = {
    n: 5000,
    minDegree: 5,
    maxDegree: 50,
    degreeExponent: 2.5,
    minCommunity: 20,
    maxCommunity: 100,
    communityExponent: 1.5,
    mixing: 0.3,
    seed: 1,
};

/**
 * The share of edges whose endpoints lie in different communities.
 * @param g - the graph
 * @returns the measured mixing
 */
function measuredMixing(g: SampleGraph): number {
    const c = g.nodeColumns?.community as Uint32Array;
    return pairs(g).filter(([u, v]) => c[u] !== c[v]).length / g.src.length;
}

describe("lfrGraph", () => {
    it("has communities within the size bounds and the asked mixing", () => {
        const g = lfrGraph(BASE);
        expectSimple(g);
        expect(g.nodeCount).toBe(5000);
        const community = g.nodeColumns?.community as Uint32Array;
        const sizes = new Map<number, number>();
        for (const c of community) {
            sizes.set(c, (sizes.get(c) ?? 0) + 1);
        }
        for (const size of sizes.values()) {
            expect(size).toBeGreaterThanOrEqual(20);
            expect(size).toBeLessThanOrEqual(100);
        }
        expect(Math.max(...sizes.keys()) + 1).toBe(sizes.size);
        expect(Math.abs(measuredMixing(g) - 0.3)).toBeLessThan(0.05);
        const d = degrees(g);
        expect(Math.max(...d)).toBeLessThanOrEqual(50);
        // the power law's mean on [5, 50] with exponent 2.5, less the erased edges (about 10% here)
        let num = 0;
        let den = 0;
        for (let k = 5; k <= 50; k++) {
            num += k * k ** -2.5;
            den += k ** -2.5;
        }
        const mean = d.reduce((a, b) => a + b, 0) / d.length;
        expect(mean).toBeGreaterThan(0.85 * (num / den));
        expect(mean).toBeLessThanOrEqual(1.02 * (num / den));
        expect(fromEdgeArrays(g).edgeCount).toBe(g.src.length);
    });

    it("tracks other mixing values", () => {
        for (const mixing of [0.1, 0.5]) {
            expect(Math.abs(measuredMixing(lfrGraph({ ...BASE, mixing })) - mixing)).toBeLessThan(0.05);
        }
        // mu = 0 still moves one stub outside in every community whose internal degrees sum to odd
        expect(measuredMixing(lfrGraph({ ...BASE, n: 1000, mixing: 0 }))).toBeLessThan(0.01);
        expect(measuredMixing(lfrGraph({ ...BASE, n: 1000, mixing: 1 }))).toBe(1);
    });

    it("rejects impossible parameters", () => {
        expect(() => lfrGraph({ ...BASE, n: 1_000_001 })).toThrow(/n must/);
        expect(() => lfrGraph({ ...BASE, n: 40, maxDegree: 40 })).toThrow(/maxDegree/);
        expect(() => lfrGraph({ ...BASE, mixing: -0.1 })).toThrow(/mixing/);
        expect(() => lfrGraph({ ...BASE, degreeExponent: -1 })).toThrow(/degreeExponent/);
        expect(() => lfrGraph({ ...BASE, maxCommunity: 10 })).toThrow(/maxCommunity/);
        expect(() => lfrGraph({ ...BASE, maxCommunity: 6000 })).toThrow(/maxCommunity/);
        // no way to split 15 nodes into communities of exactly 10
        expect(() => lfrGraph({ ...BASE, n: 15, minDegree: 1, maxDegree: 3, minCommunity: 10, maxCommunity: 10 })).toThrow(
            /partition/,
        );
        // internal degrees up to 45 do not fit communities of at most 30 nodes
        expect(() => lfrGraph({ ...BASE, maxCommunity: 30, mixing: 0.1 })).toThrow(/assign/);
    });

    it("splits n exactly when the drawn sizes overshoot or when the last one must be dropped", () => {
        for (let seed = 0; seed < 10; seed++) {
            const g = lfrGraph({ ...BASE, n: seed < 5 ? 100 : 300, minCommunity: 40, maxCommunity: 70, seed });
            const counts = new Map<number, number>();
            for (const c of g.nodeColumns?.community as Uint32Array) {
                counts.set(c, (counts.get(c) ?? 0) + 1);
            }
            for (const size of counts.values()) {
                expect(size).toBeGreaterThanOrEqual(40);
                expect(size).toBeLessThanOrEqual(70);
            }
        }
    });

    it("builds 100k nodes quickly", () => {
        const g = lfrGraph({ ...BASE, n: 100000, maxCommunity: 1000 });
        expect(g.nodeCount).toBe(100000);
        expect(g.src.length).toBeGreaterThan(400000);
    });
});

describe("lfrGraph determinism", () => {
    it("reproduces its golden graph", () => {
        // GOLDEN VALUE: a change means seeded graphs changed, which is a breaking change of the
        // package -- never a test to update.
        expect(fullGraphHash(lfrGraph({ ...BASE, n: 500, maxCommunity: 60 }))).toMatchInlineSnapshot(`"6481984e"`);
    });

    it("gives the same graph twice, unseeded equals seed 0, and seeds differ", () => {
        const options = { ...BASE, n: 500, maxCommunity: 60 };
        expectSameGraph(lfrGraph(options), lfrGraph(options));
        expectSameGraph(lfrGraph({ ...options, seed: undefined }), lfrGraph({ ...options, seed: 0 }));
        expect(graphHash(lfrGraph({ ...options, seed: 2 }))).not.toBe(graphHash(lfrGraph(options)));
    });
});
