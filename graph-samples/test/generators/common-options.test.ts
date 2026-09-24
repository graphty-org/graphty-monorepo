import { describe, expect, it } from "vitest";

import {
    barabasiAlbertGraph,
    cycleGraph,
    erdosRenyiGraph,
    gridGraph,
    petersenGraph,
    plantedPartitionGraph,
    randomTreeGraph,
    wattsStrogatzGraph,
    withWeights,
} from "../../src/generators/index.js";
import { DEFAULT_SEED } from "../../src/random/stream.js";
import { type SampleGraph } from "../../src/types.js";
import { expectSameGraph, fullGraphHash, graphHash } from "../helpers/graph.js";

describe("the default seed", () => {
    it("is 0, so an unseeded call is reproducible and equals seed 0", () => {
        expect(DEFAULT_SEED).toBe(0);
        expectSameGraph(erdosRenyiGraph({ n: 100, p: 0.1 }), erdosRenyiGraph({ n: 100, p: 0.1, seed: 0 }));
        expectSameGraph(barabasiAlbertGraph({ n: 100, m: 2 }), barabasiAlbertGraph({ n: 100, m: 2, seed: 0 }));
        expectSameGraph(randomTreeGraph({ n: 50 }), randomTreeGraph({ n: 50, seed: 0 }));
        expectSameGraph(
            plantedPartitionGraph({ groups: 2, groupSize: 10, pIn: 0.5, pOut: 0.1 }),
            plantedPartitionGraph({ groups: 2, groupSize: 10, pIn: 0.5, pOut: 0.1, seed: 0 }),
        );
        expect(graphHash(erdosRenyiGraph({ n: 100, p: 0.1 }))).not.toBe(
            graphHash(erdosRenyiGraph({ n: 100, p: 0.1, seed: 1 })),
        );
    });

    it("still rejects an invalid seed", () => {
        expect(() => erdosRenyiGraph({ n: 10, p: 0.5, seed: 1.5 })).toThrow(RangeError);
    });
});

describe("the weights option", () => {
    it("never changes the edges, and is reproducible", () => {
        const plain = wattsStrogatzGraph({ n: 200, k: 4, beta: 0.2, seed: 3 });
        const weighted = wattsStrogatzGraph({ n: 200, k: 4, beta: 0.2, seed: 3, weights: { kind: "uniform" } });
        expect(graphHash(weighted)).toBe(graphHash(plain));
        expect(plain.weights).toBeUndefined();
        expect(weighted.weights?.length).toBe(plain.src.length);
        expect(fullGraphHash(weighted)).toBe(
            fullGraphHash(wattsStrogatzGraph({ n: 200, k: 4, beta: 0.2, seed: 3, weights: { kind: "uniform" } })),
        );
    });

    it("draws each distribution in range", () => {
        const g = cycleGraph({ n: 2000 });
        const uniform = withWeights(g, { kind: "uniform", min: -2, max: 3 }, 1).weights as Float32Array;
        expect(Math.min(...uniform)).toBeGreaterThanOrEqual(-2);
        expect(Math.max(...uniform)).toBeLessThan(3);
        expect(Math.min(...uniform)).toBeLessThan(-1.9);
        const integers = withWeights(g, { kind: "integer", min: 1, max: 10 }, 1).weights as Float32Array;
        expect(new Set(integers)).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
        const expo = withWeights(g, { kind: "exponential", mean: 4 }, 1).weights as Float32Array;
        const mean = expo.reduce((a, b) => a + b, 0) / expo.length;
        expect(mean).toBeGreaterThan(3.5);
        expect(mean).toBeLessThan(4.5);
        expect(Math.min(...expo)).toBeGreaterThanOrEqual(0);
        const zeroToOne = withWeights(g, { kind: "uniform" }).weights as Float32Array;
        expect(Math.max(...zeroToOne)).toBeLessThan(1);
    });

    it("works on deterministic generators, which take a seed only for the weights", () => {
        const a = petersenGraph({ weights: { kind: "integer", min: 1, max: 5 }, seed: 2 });
        const b = petersenGraph({ weights: { kind: "integer", min: 1, max: 5 }, seed: 3 });
        expect(graphHash(a)).toBe(graphHash(petersenGraph()));
        expect(fullGraphHash(a)).not.toBe(fullGraphHash(b));
        expect(gridGraph({ rows: 3, cols: 3, weights: { kind: "uniform" } }).weights?.length).toBe(12);
    });

    it("computes euclidean and column weights from node columns", () => {
        const g: SampleGraph = {
            directed: false,
            nodeCount: 3,
            src: new Uint32Array([0, 1]),
            dst: new Uint32Array([1, 2]),
            nodeColumns: {
                x: new Float64Array([0, 3, 3]),
                y: new Float64Array([0, 4, 0]),
                size: new Float64Array([1, 2, 5]),
            },
        };
        expect(Array.from(withWeights(g, { kind: "euclidean" }).weights as Float32Array)).toEqual([5, 4]);
        const combos = ["source", "target", "sum", "mean", "product", "min", "max", "difference"] as const;
        const expected = [
            [1, 2],
            [2, 5],
            [3, 7],
            [1.5, 3.5],
            [2, 10],
            [1, 2],
            [2, 5],
            [1, 3],
        ];
        combos.forEach((combine, i) => {
            const w = withWeights(g, { kind: "column", column: "size", combine }).weights as Float32Array;
            expect(Array.from(w)).toEqual(expected[i]);
        });
        expect(Array.from(withWeights(g, { kind: "column", column: "size" }).weights as Float32Array)).toEqual([
            3, 7,
        ]);
        const g3: SampleGraph = { ...g, nodeColumns: { ...g.nodeColumns, z: new Float64Array([0, 0, 1]) } };
        expect(withWeights(g3, { kind: "euclidean" }).weights?.[1]).toBeCloseTo(Math.sqrt(17), 5);
    });

    it("rejects bad specs", () => {
        const g = cycleGraph({ n: 5 });
        expect(() => withWeights(g, { kind: "uniform", min: 2, max: 1 })).toThrow(RangeError);
        expect(() => withWeights(g, { kind: "integer", min: 1.5, max: 3 })).toThrow(RangeError);
        expect(() => withWeights(g, { kind: "exponential", mean: 0 })).toThrow(RangeError);
        expect(() => withWeights(g, { kind: "euclidean" })).toThrow(/no numeric node column "x"/);
        expect(() => withWeights(g, { kind: "column", column: "nope" })).toThrow(RangeError);
    });
});
