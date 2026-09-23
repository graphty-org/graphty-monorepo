/**
 * Hand-computed checks of the two CPU references of P1 (spec 11.3 "CPU reference", 5.3): the out-degree oracle over
 * the karate club and small graphs, and the f64 reduce oracle over f32 / u32 / vec4f inputs incl. the identity
 * elements of the empty range; plus the pure reduce-input recipe (test/helpers/reduce-input.ts) that DEFINES the
 * reduce noise fixture, pinned here so P1-T6 / P1-T7 cannot drift from it; plus three hand-computed cases of the P5
 * Fruchterman-Reingold reference (test/oracle/fruchterman-reingold.ts); plus three hand-computed cases of the P4
 * exclusive-scan reference (test/oracle/scan.ts) and two of the histogram / counting-sort references
 * (test/oracle/histogram.ts), plus two of the grid pyramid reference (test/oracle/grid-pyramid.ts). No device.
 */

import { makeMask, maskSet } from "@graphty/graph-format";

import { gridSpecFor } from "../../src/primitives/grid.js";
import { type ReduceDtype } from "../../src/primitives/reduce.js";
import { KARATE_EDGES, pathEdges, snapshotOf, starEdges } from "../helpers/graphs.js";
import {
    INPUT_SEED,
    lanesOf,
    RANDOM1K_COUNT,
    RANDOM1K_SEED,
    REDUCE_NOISE_COUNTS,
    reduceInput,
} from "../helpers/reduce-input.js";
import { outDegreeOracle } from "./degree.js";
import { FruchtermanReingoldOracle } from "./fruchterman-reingold.js";
import { gridOracleBuild } from "./grid.js";
import { gridOraclePyramid } from "./grid-pyramid.js";
import { countingSortOracle, histogramOracle } from "./histogram.js";
import { radixSortOracle } from "./radix-sort.js";
import { reduceIdentity, reduceOracle } from "./reduce.js";
import { scanOracle } from "./scan.js";

const F32_MAX = 3.4028234663852886e38;
const U32_MAX = 4294967295;

describe("outDegreeOracle (5.3)", () => {
    it("karate undirected: the classic degree sequence, arcs 156", () => {
        const s = snapshotOf(KARATE_EDGES);
        const expected = [
            16, 9, 10, 6, 3, 4, 4, 4, 5, 2, 3, 1, 2, 5, 2, 2, 2, 2, 2, 3, 2, 2, 2, 5, 3, 3, 2, 4, 3, 4, 4, 6, 12, 17,
        ];
        const oracle = outDegreeOracle(s);
        expect(oracle).toBeInstanceOf(Uint32Array);
        expect(oracle.buffer).toBeInstanceOf(ArrayBuffer);
        expect(Array.from(oracle)).toEqual(expected);
        expect(expected.reduce((a, b) => a + b, 0)).toBe(156);
        expect(s.arcCount).toBe(156);
        expect(Array.from(oracle)).toEqual(Array.from(s.outDegree()));
    });

    it("karate directed (every edge listed as u < v): out-degrees, arcs 78", () => {
        const s = snapshotOf(KARATE_EDGES, { directed: true });
        const expected = [
            16, 8, 8, 3, 2, 3, 1, 0, 3, 1, 0, 0, 0, 1, 2, 2, 0, 0, 2, 1, 2, 0, 2, 5, 3, 1, 2, 1, 2, 2, 2, 2, 1, 0,
        ];
        expect(Array.from(outDegreeOracle(s))).toEqual(expected);
        expect(expected.reduce((a, b) => a + b, 0)).toBe(78);
        expect(s.arcCount).toBe(78);
    });

    it("path of 5: [1, 2, 2, 2, 1]; star with 4 leaves: [4, 1, 1, 1, 1]", () => {
        expect(Array.from(outDegreeOracle(snapshotOf(pathEdges(5))))).toEqual([1, 2, 2, 2, 1]);
        expect(Array.from(outDegreeOracle(snapshotOf(starEdges(4))))).toEqual([4, 1, 1, 1, 1]);
    });

    it("no arcs: zeros; no nodes: an empty array", () => {
        expect(Array.from(outDegreeOracle(snapshotOf([], { nodeCount: 5 })))).toEqual([0, 0, 0, 0, 0]);
        expect(outDegreeOracle(snapshotOf([], { nodeCount: 0 })).length).toBe(0);
    });

    it("a self-loop is one arc; a parallel edge is one arc per copy", () => {
        // undirected: (0,0) once at row 0; (0,1) twice at row 0 and twice at row 1 -> [3, 2], arcCount 2 * 3 - 1
        const s = snapshotOf(
            [
                [0, 0],
                [0, 1],
                [0, 1],
            ],
            { nodeCount: 2 },
        );
        expect(s.arcCount).toBe(5);
        expect(Array.from(outDegreeOracle(s))).toEqual([3, 2]);
    });
});

describe("reduceInput (test/helpers/reduce-input.ts): the shared, pure input recipe", () => {
    it("is deterministic per (dtype, count, seed), in range, and its dtype union is the contract's ReduceDtype", () => {
        const a = reduceInput("f32", RANDOM1K_COUNT, RANDOM1K_SEED);
        const b = reduceInput("f32", RANDOM1K_COUNT, RANDOM1K_SEED);
        expect(a).toBeInstanceOf(Float32Array);
        expect(a.length).toBe(1000);
        expect(Array.from(a)).toEqual(Array.from(b));
        expect(Array.from(a).every((v) => v >= 1 && v < 2)).toBe(true);
        const u = reduceInput("u32", 4097, INPUT_SEED + 4097);
        expect(u).toBeInstanceOf(Uint32Array);
        expect(Array.from(u).every((v) => v >= 1 && v <= 127)).toBe(true);
        expect(reduceInput("vec4f", 257, INPUT_SEED + 257).length).toBe(257 * lanesOf("vec4f"));
        expect(reduceInput("f32", 0, INPUT_SEED).length).toBe(0);
        expect(REDUCE_NOISE_COUNTS).toEqual([1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1000]);
        // the dtype parameter accepts exactly the contract's ReduceDtype values
        const dtypes: readonly ReduceDtype[] = ["f32", "u32", "vec4f"];
        for (const dtype of dtypes) {
            expect(reduceInput(dtype, 1, 1).length).toBe(lanesOf(dtype));
        }
    });
});

describe("reduceOracle (5.3): f64 sequential reduction", () => {
    it("f32 scalars: sum 6.75, min 1.5, max 3", () => {
        const v = Float32Array.from([1.5, 2.25, 3]);
        expect(reduceOracle(v, "sum", "f32")).toBe(6.75);
        expect(reduceOracle(v, "min", "f32")).toBe(1.5);
        expect(reduceOracle(v, "max", "f32")).toBe(3);
    });

    it("sum is the f64 total: 16777216 + 1 + 1 = 16777218 (an f32 accumulator would lose the ones)", () => {
        expect(reduceOracle(Float32Array.from([16777216, 1, 1]), "sum", "f32")).toBe(16777218);
        expect(Math.fround(Math.fround(16777216 + 1) + 1)).toBe(16777216);
    });

    it("u32 scalars: sum 19, min 3, max 9; exact above 2^31", () => {
        const v = Uint32Array.from([7, 3, 9]);
        expect(reduceOracle(v, "sum", "u32")).toBe(19);
        expect(reduceOracle(v, "min", "u32")).toBe(3);
        expect(reduceOracle(v, "max", "u32")).toBe(9);
        expect(reduceOracle(Uint32Array.from([4000000000, 200000000]), "sum", "u32")).toBe(4200000000);
    });

    it("vec4f: lane-wise over groups of four words", () => {
        const v = Float32Array.from([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(reduceOracle(v, "sum", "vec4f")).toEqual([6, 8, 10, 12]);
        expect(reduceOracle(v, "min", "vec4f")).toEqual([1, 2, 3, 4]);
        expect(reduceOracle(v, "max", "vec4f")).toEqual([5, 6, 7, 8]);
    });

    it("the empty range yields the GPU's identity element (4.5: 0, F32_MAX, -F32_MAX, U32_MAX)", () => {
        expect(reduceIdentity("sum", "f32")).toBe(0);
        expect(reduceIdentity("sum", "u32")).toBe(0);
        expect(reduceIdentity("min", "f32")).toBe(F32_MAX);
        expect(reduceIdentity("max", "f32")).toBe(-F32_MAX);
        expect(reduceIdentity("min", "u32")).toBe(U32_MAX);
        expect(reduceIdentity("max", "u32")).toBe(0);
        expect(reduceIdentity("min", "vec4f")).toBe(F32_MAX);
        expect(reduceOracle(new Float32Array(0), "sum", "f32")).toBe(0);
        expect(reduceOracle(new Float32Array(0), "min", "f32")).toBe(F32_MAX);
        expect(reduceOracle(new Float32Array(0), "max", "f32")).toBe(-F32_MAX);
        expect(reduceOracle(new Uint32Array(0), "min", "u32")).toBe(U32_MAX);
        expect(reduceOracle(new Uint32Array(0), "max", "u32")).toBe(0);
        expect(reduceOracle(new Float32Array(0), "sum", "vec4f")).toEqual([0, 0, 0, 0]);
        expect(reduceOracle(new Float32Array(0), "min", "vec4f")).toEqual([F32_MAX, F32_MAX, F32_MAX, F32_MAX]);
        // F32_MAX is the largest finite f32, the value of the prelude's 0x1.fffffep+127
        expect(Math.fround(F32_MAX)).toBe(F32_MAX);
        expect(Math.fround(F32_MAX * 2)).toBe(Infinity);
    });

    it("a single element is returned exactly for every op", () => {
        expect(reduceOracle(Float32Array.from([0.30000001192092896]), "sum", "f32")).toBe(0.30000001192092896);
        expect(reduceOracle(Uint32Array.from([4294967295]), "max", "u32")).toBe(4294967295);
    });
});

describe("FruchtermanReingoldOracle (spec 7.20; P5-T3 Step 1): hand-computed one-iteration cases", () => {
    /** Two nodes at distance 0.5 on the x axis, k = 0.5; iterations 0 -> dt = 0.1, so t = 0.1 at index 0 and 0 after. */
    const options = { precision: "f64", dim: 2, k: 0.5, iterations: 0, settleThreshold: 0.001 } as const;
    const start = [0, 0, 0, 0.5, 0, 0];

    it("no edge: k^2 / d = 0.5 repels each node; the cap t = 0.1 moves both 0.1 apart; the next temperature is 0", () => {
        const s = snapshotOf([], { nodeCount: 2 });
        const oracle = new FruchtermanReingoldOracle(s, start, options);
        expect(oracle.temperature).toBe(0.1);
        const record = oracle.step();
        expect(record.temperature).toBe(0.1);
        expect(Array.from(oracle.stages.attraction)).toEqual([0, 0, 0, 0, 0, 0]);
        expect(Array.from(oracle.stages.repulsion)).toEqual([-0.5, 0, 0, 0.5, 0, 0]);
        expect(Array.from(oracle.stages.force)).toEqual([-0.5, 0, 0, 0.5, 0, 0]);
        expect(Array.from(oracle.stages.displacement)).toEqual([-0.1, 0, 0, 0.1, 0, 0]);
        expect(Array.from(oracle.positions)).toEqual([-0.1, 0, 0, 0.6, 0, 0]);
        expect(oracle.stages.partials.disp).toBeCloseTo(0.2, 15);
        expect(oracle.stages.partials.free).toBe(2);
        expect(oracle.temperature).toBe(0);
        // the K1 fold of the next step reports the iteration above: mean displacement 0.1 over the two free rows
        const next = oracle.step();
        expect(next.temperature).toBe(0);
        expect(next.meanDisplacement).toBeCloseTo(0.1, 15);
        expect(next.centroid[0]).toBeCloseTo(0.25, 15);
        expect(next.settledCount).toBe(0);
        // at temperature 0 nothing moves
        expect(Array.from(oracle.positions)).toEqual([-0.1, 0, 0, 0.6, 0, 0]);
        expect(oracle.trace).toHaveLength(2);
    });

    it("joined by an edge: the attraction d^2 / k = 0.5 cancels the repulsion exactly; nothing moves", () => {
        const s = snapshotOf([[0, 1]]);
        const oracle = new FruchtermanReingoldOracle(s, start, options);
        oracle.step();
        expect(Array.from(oracle.stages.attraction)).toEqual([0.5, 0, 0, -0.5, 0, 0]);
        expect(Array.from(oracle.stages.repulsion)).toEqual([-0.5, 0, 0, 0.5, 0, 0]);
        expect(Array.from(oracle.stages.force)).toEqual([0, 0, 0, 0, 0, 0]);
        expect(Array.from(oracle.stages.displacement)).toEqual([0, 0, 0, 0, 0, 0]);
        expect(Array.from(oracle.positions)).toEqual(start);
        const next = oracle.step();
        expect(next.meanDisplacement).toBe(0);
        expect(next.settledCount).toBe(1);
    });

    it("a fixed row never moves and is excluded from meanDisplacement", () => {
        const s = snapshotOf([], { nodeCount: 2 });
        const fixed = makeMask(2);
        maskSet(fixed, 0, true);
        const oracle = new FruchtermanReingoldOracle(s, start, { ...options, fixed });
        oracle.step();
        expect(Array.from(oracle.stages.displacement)).toEqual([0, 0, 0, 0.1, 0, 0]);
        expect(Array.from(oracle.positions)).toEqual([0, 0, 0, 0.6, 0, 0]);
        expect(oracle.stages.partials.free).toBe(1);
        expect(oracle.stages.partials.disp).toBeCloseTo(0.1, 15);
        const next = oracle.step();
        expect(next.meanDisplacement).toBeCloseTo(0.1, 15);
        // reheat restarts the temperature index at floor(0.7 * 0) = 0: the temperature is 0.1 again
        oracle.reheat();
        expect(oracle.temperature).toBe(0.1);
        expect(oracle.settledCount).toBe(0);
    });
});

describe("scanOracle (spec 6 row 2; P4-T2 Step 1): the sequential exclusive prefix sum modulo 2^32", () => {
    it("[3, 1, 4, 1, 5] -> [0, 3, 4, 8, 9], total 14", () => {
        const { out, total } = scanOracle(Uint32Array.from([3, 1, 4, 1, 5]));
        expect(out).toBeInstanceOf(Uint32Array);
        expect(Array.from(out)).toEqual([0, 3, 4, 8, 9]);
        expect(total).toBe(14);
    });

    it("the empty array -> empty, total 0", () => {
        const { out, total } = scanOracle(new Uint32Array(0));
        expect(out.length).toBe(0);
        expect(total).toBe(0);
    });

    it("two values summing past 2^32 wrap (as the kernel's u32 addition does)", () => {
        const { out, total } = scanOracle(Uint32Array.from([4294967295, 2, 7]));
        expect(Array.from(out)).toEqual([0, 4294967295, 1]);
        expect(total).toBe(8);
    });
});

describe("histogramOracle / countingSortOracle (spec 6 row 5; P4-T3 Step 1): the bucket loop and the stable counting sort", () => {
    it("keys [2, 0, 2, 1] over 3 bins -> hist [1, 1, 2], start [0, 1, 2], index [1, 3, 0, 2]", () => {
        const keys = Uint32Array.from([2, 0, 2, 1]);
        expect(Array.from(histogramOracle(keys, 3))).toEqual([1, 1, 2]);
        const { hist, outStart, outIndex } = countingSortOracle(keys, 3);
        expect(outStart).toBeInstanceOf(Uint32Array);
        expect(Array.from(hist)).toEqual([1, 1, 2]);
        expect(Array.from(outStart)).toEqual([0, 1, 2]);
        expect(Array.from(outIndex)).toEqual([1, 3, 0, 2]);
    });

    it("the empty input over 3 bins -> zero hist, zero starts, no indices", () => {
        const keys = new Uint32Array(0);
        expect(Array.from(histogramOracle(keys, 3))).toEqual([0, 0, 0]);
        const { outStart, outIndex } = countingSortOracle(keys, 3);
        expect(Array.from(outStart)).toEqual([0, 0, 0]);
        expect(outIndex.length).toBe(0);
    });
});

describe("radixSortOracle (spec 6 row 6; P4-T4 Step 1): a stable sort of pairs by the low bits of the key", () => {
    it("keys [3, 1, 3, 0], vals [10, 11, 12, 13] -> keys [0, 1, 3, 3], vals [13, 11, 10, 12] (the two 3s keep their order)", () => {
        const { keys, vals } = radixSortOracle(Uint32Array.from([3, 1, 3, 0]), Uint32Array.from([10, 11, 12, 13]), 32);
        expect(keys).toBeInstanceOf(Uint32Array);
        expect(Array.from(keys)).toEqual([0, 1, 3, 3]);
        expect(Array.from(vals)).toEqual([13, 11, 10, 12]);
    });

    it("bits 8 orders by the low byte only and keeps the whole key: [0x1FF, 0x001] -> [0x001, 0x1FF] and [0x100, 0x001] -> [0x100, 0x001]", () => {
        expect(Array.from(radixSortOracle(Uint32Array.from([0x1ff, 0x001]), Uint32Array.from([0, 1]), 8).keys)).toEqual([0x001, 0x1ff]);
        expect(Array.from(radixSortOracle(Uint32Array.from([0x100, 0x001]), Uint32Array.from([0, 1]), 8).vals)).toEqual([0, 1]);
    });
});

describe("gridOracleBuild (spec 7.7 G1-G3; P4-T8 Step 1): keys, the stable order, cellHist and cellStart", () => {
    const spec = gridSpecFor(4, 2, { gridMax2D: 512, gridMax3D: 128, deterministic: true }); // G 8, cells 64

    it("four points on the G = 8 grid with gridMin 0 and cellSize 1: keys by hand, one outside point is key 64, cellStart[65] === 4", () => {
        // (0.5, 0.5) -> cell (0, 0) = 0; (2.5, 0.5) -> (2, 0) = 2; (1.5, 3.5) -> (1, 3) = 25; (9, 1) -> outside = 64
        const positions = Float32Array.from([0.5, 0.5, 0, 1, 2.5, 0.5, 0, 1, 1.5, 3.5, 0, 1, 9, 1, 0, 1]);
        const build = gridOracleBuild({ positions, n: 4, spec, gridMin: [0, 0, 0], invCellSize: 1 });
        expect(Array.from(build.cellKey)).toEqual([0, 2, 25, 64]);
        expect(Array.from(build.sortedIdx)).toEqual([0, 1, 2, 3]);
        expect(build.cellHist.length).toBe(66);
        expect(build.cellHist[0]).toBe(1);
        expect(build.cellHist[2]).toBe(1);
        expect(build.cellHist[25]).toBe(1);
        expect(build.cellHist[64]).toBe(1);
        expect(build.cellHist[65]).toBe(0);
        expect(build.cellStart[0]).toBe(0);
        expect(build.cellStart[2]).toBe(1);
        expect(build.cellStart[25]).toBe(2);
        expect(build.cellStart[64]).toBe(3);
        expect(build.cellStart[65]).toBe(4);
        expect(build.outside).toBe(1);
        expect(build.maxOccupancy).toBe(1);
        // a negative coordinate and a NaN are outside too
        const bad = Float32Array.from([-0.5, 1, 0, 1, Number.NaN, 1, 0, 1]);
        expect(Array.from(gridOracleBuild({ positions: bad, n: 2, spec, gridMin: [0, 0, 0], invCellSize: 1 }).cellKey)).toEqual([64, 64]);
    });

    it("two coincident points keep index order inside their cell (the stable order), and a later lower key sorts first", () => {
        const positions = Float32Array.from([3.5, 3.5, 0, 1, 0.5, 0.5, 0, 1, 3.5, 3.5, 0, 1]);
        const build = gridOracleBuild({ positions, n: 3, spec, gridMin: [0, 0, 0], invCellSize: 1 });
        expect(Array.from(build.cellKey)).toEqual([27, 0, 27]);
        expect(Array.from(build.sortedIdx)).toEqual([1, 0, 2]);
        expect(build.cellHist[27]).toBe(2);
        expect(build.cellStart[27]).toBe(1);
        expect(build.cellStart[28]).toBe(3);
        expect(build.maxOccupancy).toBe(2);
        expect(build.outside).toBe(0);
    });

    it("in 3D the key adds G^2 z and a z outside [0, G) is the pseudo-cell", () => {
        const spec3 = gridSpecFor(4, 3, { gridMax2D: 512, gridMax3D: 128, deterministic: true }); // G 8, cells 512
        const positions = Float32Array.from([1.5, 2.5, 3.5, 1, 1.5, 2.5, 8.5, 1]);
        const build = gridOracleBuild({ positions, n: 2, spec: spec3, gridMin: [0, 0, 0], invCellSize: 1 });
        expect(Array.from(build.cellKey)).toEqual([1 + 8 * 2 + 64 * 3, 512]);
        expect(build.cellStart[513]).toBe(2);
    });
});

describe("gridOraclePyramid (spec 7.7 G4-G5; P4-T9): level 0, the pseudo-cell, the parents, the hub list and the bounds", () => {
    const spec = gridSpecFor(4, 2, { gridMax2D: 512, gridMax3D: 128, deterministic: true }); // G 8, cells 64, levels 2 (8 -> 4)
    const WG = 256;

    it("four points with masses 1, 2, 3 and one outside: level 0 is [sum m x, sum m y, sum m z, sum m], the pseudo-cell holds the outside point and is never a child, level 1 sums 2x2 children", () => {
        // (0.5, 0.5) m 1 -> cell 0; (2.5, 0.5) m 2 -> cell 2; (1.5, 3.5) m 3 -> cell 25; (9, 1) m 1 -> the pseudo-cell 64
        const positions = Float32Array.from([0.5, 0.5, 0, 1, 2.5, 0.5, 0, 2, 1.5, 3.5, 0, 3, 9, 1, 0, 1]);
        const input = { positions, n: 4, spec, gridMin: [0, 0, 0] as const, invCellSize: 1 };
        const want = gridOraclePyramid(gridOracleBuild(input), input, WG);
        expect(want.levels.length).toBe(spec.levels);
        expect(want.levels[0].length).toBe(4 * 65);
        expect(Array.from(want.levels[0].subarray(0, 4))).toEqual([0.5, 0.5, 0, 1]);
        expect(Array.from(want.levels[0].subarray(8, 12))).toEqual([5, 1, 0, 2]);
        expect(Array.from(want.levels[0].subarray(100, 104))).toEqual([4.5, 10.5, 0, 3]);
        expect(Array.from(want.levels[0].subarray(256, 260))).toEqual([9, 1, 0, 1]);
        expect(Array.from(want.levels[0].subarray(4, 8))).toEqual([0, 0, 0, 0]);
        // level 1 (side 4): cell 0 <- children (0, 0) and (1, 0) of side 8 = cells 0 and 1; cell 1 <- cells 2, 3, 10, 11; cell 4 <- (0, 1) = cells 16, 17, 24, 25
        expect(want.levels[1].length).toBe(4 * 16);
        expect(Array.from(want.levels[1].subarray(0, 4))).toEqual([0.5, 0.5, 0, 1]);
        expect(Array.from(want.levels[1].subarray(4, 8))).toEqual([5, 1, 0, 2]);
        expect(Array.from(want.levels[1].subarray(16, 20))).toEqual([4.5, 10.5, 0, 3]);
        let mass = 0;
        for (let c = 0; c < 16; c++) {
            mass += want.levels[1][4 * c + 3];
        }
        expect(mass).toBe(6); // the outside point's mass 1 is not downsampled
        expect(want.hubCells).toEqual([]);
        expect(want.maxOccupancy).toBe(1);
        // the bound: roundings * 2^-22 * sum |m x|; a one-point cell has one rounding, its parent 1 + 4, an empty cell 0
        expect(want.bounds[0][8]).toBe(1 * 2 ** -22 * 5);
        expect(want.bounds[0][4]).toBe(0);
        expect(want.bounds[1][4]).toBe(5 * 2 ** -22 * 5);
    });

    it("1025 coincident points of mass 2 are a hub cell: hubCells [0], maxOccupancy 1025, the sum exact, the bound counts the strided partials plus the reduction", () => {
        const n = 1025;
        const positions = new Float32Array(4 * n);
        for (let i = 0; i < n; i++) {
            positions.set([0.5, 0.5, 0, 2], 4 * i);
        }
        const input = { positions, n, spec, gridMin: [0, 0, 0] as const, invCellSize: 1 };
        const want = gridOraclePyramid(gridOracleBuild(input), input, WG);
        expect(want.hubCells).toEqual([0]);
        expect(want.maxOccupancy).toBe(1025);
        expect(Array.from(want.levels[0].subarray(0, 4))).toEqual([1025, 1025, 0, 2050]);
        expect(want.bounds[0][3]).toBe((Math.ceil(n / WG) + WG) * 2 ** -22 * 2050);
        expect(Array.from(want.levels[1].subarray(0, 4))).toEqual([1025, 1025, 0, 2050]);
    });
});
