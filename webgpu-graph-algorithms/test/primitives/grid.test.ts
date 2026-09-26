/**
 * The grid build, part 1 (spec 6 row 12, 7.7 G1-G3, 13 row P4 gate "cellStart correct with empty cells"; P4-T8):
 * `gridSpecFor` pins (PD-9), the deterministic build of six positioned fixtures in 2D and 3D equal to
 * gridOracleBuild BITWISE (cellKey, sortedIdx -- the sort is stable and the oracle's order is key-then-index --
 * cellHist, cellStart), two runs bitwise identical, `cellStart[histWords - 1] === n`; the set-deterministic path with
 * cellHist / cellStart bitwise and sortedIdx a permutation in key order; the empty cells of clumpy10; the `upTo`
 * stops; `n = 0` refused; and the writer cases that record the `grid-cell-key` / `random20k`, `histogram` /
 * `random20k-cellHist` and `scan-add` / `random20k-cellStart` u32 noise fixtures of this adapter (all three bitwise
 * across adapters by PD-10; strided, as the radix sort's random1m fixture is, since the 262,146-word histogram of a
 * 512-side grid would be 3.8 MB of JSON per adapter).
 */

import { LAYOUT_TUNING_DEFAULTS } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { gridPyramidBytes, gridSpecFor, prepareGridBuild } from "../../src/primitives/grid.js";
import { bindingOf, uploadBuffer } from "../helpers/device.js";
import {
    GRID_FIXTURES,
    gridCompare,
    gridOracleOf,
    gridReport,
    gridScene,
    runGridBuild,
    runGridCheck,
} from "../helpers/grid.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { testReduceScope } from "../helpers/segmented-reduce.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

/** Every 16th key and every 64th histogram / scan word: the committed fixtures of the unscaled random20k build. */
const KEY_STRIDE = 16;
const CELL_STRIDE = 64;

/**
 * Every `stride`-th word.
 * @param words - the words
 * @param stride - the stride
 * @returns the sample
 */
function sample(words: Uint32Array, stride: number): Uint32Array {
    const out = new Uint32Array(Math.ceil(words.length / stride));
    for (let i = 0; i < out.length; i++) {
        out[i] = words[i * stride];
    }
    return out;
}

const DEFAULT_TUNING = {
    gridMax2D: LAYOUT_TUNING_DEFAULTS.gridMax2D,
    gridMax3D: LAYOUT_TUNING_DEFAULTS.gridMax3D,
    deterministic: true,
};

describe("gridSpecFor (spec 7.7 geometry table; P4-T8 PD-9)", () => {
    it("n = 4 in 2D: G 8, levels 2, cells 64 plus 4 orthant pseudo-cells, levelOffsets [0, 68], pyramidCells 84", () => {
        const spec = gridSpecFor(4, 2, DEFAULT_TUNING);
        expect(spec).toMatchObject({ g: 8, levels: 2, cells: 64, outsideCells: 4, histWords: 69, pyramidCells: 84, dim: 2 });
        expect(Array.from(spec.levelOffsets)).toEqual([0, 68]);
        expect(gridPyramidBytes(spec)).toBe(16 * 84);
    });

    it("n = 100,000 in 2D: G 512, levels 8, cells 262,144, pyramidCells 349,524", () => {
        const spec = gridSpecFor(100_000, 2, DEFAULT_TUNING);
        expect(spec).toMatchObject({ g: 512, levels: 8, cells: 262_144, pyramidCells: 349_524 });
        expect(spec.levelOffsets.length).toBe(8);
        expect(spec.levelOffsets[1]).toBe(262_148);
    });

    it("n = 1,000,000 in 3D: G 128, levels 6, pyramidCells 2,396,744, 38,347,904 bytes (<= 40 MB, the gate's bound)", () => {
        const spec = gridSpecFor(1_000_000, 3, DEFAULT_TUNING);
        expect(spec).toMatchObject({ g: 128, levels: 6, cells: 2_097_152, pyramidCells: 2_396_744, dim: 3 });
        expect(gridPyramidBytes(spec)).toBe(38_347_904);
        expect(gridPyramidBytes(spec)).toBeLessThanOrEqual(40 * 1024 * 1024);
    });

    it("gridMax2D 32 caps G at 32 for n = 100,000; gridMax2D 100 rounds down to 64; small n floors at 8", () => {
        expect(gridSpecFor(100_000, 2, { ...DEFAULT_TUNING, gridMax2D: 32 }).g).toBe(32);
        expect(gridSpecFor(100_000, 2, { ...DEFAULT_TUNING, gridMax2D: 100 }).g).toBe(64);
        expect(gridSpecFor(0, 2, DEFAULT_TUNING).g).toBe(8);
        expect(gridSpecFor(1, 3, DEFAULT_TUNING).g).toBe(8);
        expect(gridSpecFor(1000, 2, { ...DEFAULT_TUNING, deterministic: false }).deterministic).toBe(false);
        // 2 * ceil(sqrt(1000)) = 64 exactly: a power of two stays
        expect(gridSpecFor(1000, 2, DEFAULT_TUNING).g).toBe(64);
        expect(gridSpecFor(1001, 2, DEFAULT_TUNING).g).toBe(64);
        expect(gridSpecFor(1025, 2, DEFAULT_TUNING).g).toBe(128);
    });
});

describe("gridBuild (spec 7.7 G1-G3; P4-T8): equals the oracle bitwise, twice bitwise", () => {
    for (const name of GRID_FIXTURES) {
        for (const dim of [2, 3] as const) {
            it(`${name} in ${dim}D, deterministic: cellKey, sortedIdx, cellHist and cellStart equal gridOracleBuild bitwise; two runs bitwise equal; cellStart[histWords - 1] === n`, async (t) => {
                requireGpu(t);
                const ctx = await acquire({ label: `grid-${name}-${dim}` });
                try {
                    const scene = gridScene(name, dim, gpuScale());
                    const first = await runGridCheck(ctx, scene);
                    const second = await runGridCheck(ctx, scene);
                    expectBitwiseEqual(first.cellKey, second.cellKey, "cellKey twice");
                    expectBitwiseEqual(first.sortedKey, second.sortedKey, "sortedKey twice");
                    expectBitwiseEqual(first.sortedIdx, second.sortedIdx, "sortedIdx twice");
                    expectBitwiseEqual(first.cellHist, second.cellHist, "cellHist twice");
                    expectBitwiseEqual(first.cellStart, second.cellStart, "cellStart twice");
                    const want = gridOracleOf(scene);
                    expectBitwiseEqual(first.cellKey, want.cellKey, "cellKey vs oracle");
                    expectBitwiseEqual(first.sortedIdx, want.sortedIdx, "sortedIdx vs oracle");
                    expectBitwiseEqual(first.cellHist, want.cellHist, "cellHist vs oracle");
                    expectBitwiseEqual(first.cellStart, want.cellStart, "cellStart vs oracle");
                    expect(first.cellStart[scene.spec.histWords - 1]).toBe(scene.n);
                    // the sorted keys are the keys in sorted order
                    for (let t2 = 0; t2 < scene.n; t2++) {
                        expect(first.sortedKey[t2]).toBe(want.cellKey[want.sortedIdx[t2]]);
                    }
                    if (name === "outside5") {
                        expect(want.outside).toBe(5);
                        let outside = 0;
                        for (let o = 0; o < scene.spec.outsideCells; o++) {
                            outside += first.cellHist[scene.spec.cells + o];
                        }
                        expect(outside).toBe(5);
                    }
                    if (name === "coincident" || name === "onecell1k") {
                        expect(want.maxOccupancy).toBe(scene.n);
                        expect(want.outside).toBe(0);
                    }
                } finally {
                    ctx.dispose();
                }
            });
        }
    }

    it("deterministic: false (the counting sort): cellHist and cellStart bitwise; sortedIdx a permutation whose keys are sorted", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "grid-counting" });
        try {
            for (const name of ["random20k", "outside5", "clumpy100"]) {
                for (const dim of [2, 3] as const) {
                    const scene = gridScene(name, dim, gpuScale(), false);
                    const first = await runGridBuild(ctx, scene);
                    const second = await runGridBuild(ctx, scene);
                    expectBitwiseEqual(first.cellHist, second.cellHist, `${name} ${dim}D: cellHist twice`);
                    expectBitwiseEqual(first.cellStart, second.cellStart, `${name} ${dim}D: cellStart twice`);
                    const want = gridOracleOf(scene);
                    expectBitwiseEqual(first.cellKey, want.cellKey, `${name} ${dim}D: cellKey vs oracle`);
                    expectBitwiseEqual(first.cellHist, want.cellHist, `${name} ${dim}D: cellHist vs oracle`);
                    expectBitwiseEqual(first.cellStart, want.cellStart, `${name} ${dim}D: cellStart vs oracle`);
                    const seen = new Uint8Array(scene.n);
                    for (let t2 = 0; t2 < scene.n; t2++) {
                        const i = first.sortedIdx[t2];
                        expect(i, `${name} ${dim}D: sortedIdx[${t2}] in range`).toBeLessThan(scene.n);
                        expect(seen[i], `${name} ${dim}D: node ${i} once`).toBe(0);
                        seen[i] = 1;
                        if (t2 > 0) {
                            expect(want.cellKey[i]).toBeGreaterThanOrEqual(want.cellKey[first.sortedIdx[t2 - 1]]);
                        }
                    }
                }
            }
        } finally {
            ctx.dispose();
        }
    });

    it("empty cells (the gate item): on clumpy10 at least 90% of the finest cells count 0 and cellStart increases weakly everywhere", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "grid-empty" });
        try {
            for (const dim of [2, 3] as const) {
                const scene = gridScene("clumpy10", dim, gpuScale());
                const run = await runGridBuild(ctx, scene);
                let empty = 0;
                for (let c = 0; c < scene.spec.cells; c++) {
                    if (run.cellHist[c] === 0) {
                        empty++;
                    }
                }
                expect(empty / scene.spec.cells, `${dim}D: empty fraction`).toBeGreaterThanOrEqual(0.9);
                for (let c = 1; c < scene.spec.histWords; c++) {
                    expect(run.cellStart[c], `${dim}D: cellStart[${c}]`).toBeGreaterThanOrEqual(run.cellStart[c - 1]);
                }
                expect(run.cellStart[scene.spec.histWords - 1]).toBe(scene.n);
                expectBitwiseEqual(run.cellStart, gridOracleOf(scene).cellStart, `${dim}D: cellStart vs oracle`);
            }
        } finally {
            ctx.dispose();
        }
    });

    it("upTo: G1 records one dispatch and leaves the sort and the histogram untouched; G2 leaves the histogram untouched", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "grid-upto" });
        try {
            const scene = gridScene("random20k", 2, gpuScale());
            const poison = 0xdeadbeef;
            const keysOnly = await runGridBuild(ctx, scene, "G1");
            expect(keysOnly.dispatches).toBe(1);
            expectBitwiseEqual(keysOnly.cellKey, gridOracleOf(scene).cellKey, "G1: cellKey");
            expect(keysOnly.sortedIdx.every((w) => w === poison)).toBe(true);
            expect(keysOnly.cellHist.every((w) => w === poison)).toBe(true);
            const sorted = await runGridBuild(ctx, scene, "G2");
            expect(sorted.dispatches).toBeGreaterThan(1);
            expectBitwiseEqual(sorted.sortedIdx, gridOracleOf(scene).sortedIdx, "G2: sortedIdx");
            expect(sorted.cellHist.every((w) => w === poison)).toBe(true);
            expect(sorted.cellStart.every((w) => w === poison)).toBe(true);
            const full = await runGridBuild(ctx, scene, "G3");
            expect(full.dispatches).toBeGreaterThan(sorted.dispatches);
            expect(full.cellHist.every((w) => w === poison)).toBe(false);
        } finally {
            ctx.dispose();
        }
    });

    it("n = 0 is E_INVALID_ARGUMENT before anything is recorded; record() before bind() is E_NOT_LOADED", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "grid-empty-n" });
        const scope = testReduceScope(ctx);
        const spec = gridSpecFor(0, 2, DEFAULT_TUNING);
        const word = uploadBuffer(ctx, new Uint32Array(1), "grid/word");
        const hist = uploadBuffer(ctx, new Uint32Array(spec.histWords), "grid/hist");
        try {
            const planner = await prepareGridBuild(scope, spec);
            const encoder = ctx.device.createCommandEncoder();
            const pass = encoder.beginComputePass();
            const codeOf = (fn: () => void): string | null => {
                try {
                    fn();
                    return null;
                } catch (e) {
                    if (isWebGpuGraphError(e)) {
                        return e.code;
                    }
                    throw e;
                }
            };
            expect(codeOf(() => planner.record(pass, 1, 0))).toBe("E_NOT_LOADED");
            const b = bindingOf(word);
            planner.bind({
                pos: b,
                state: b,
                params: b,
                cellKey: b,
                cellVal: b,
                sortedKey: b,
                sortedIdx: b,
                cellHist: bindingOf(hist),
                cellStart: bindingOf(hist),
            });
            expect(codeOf(() => planner.record(pass, 0, 0))).toBe("E_INVALID_ARGUMENT");
            expect(codeOf(() => planner.record(pass, 2, 0))).toBe("E_INVALID_ARGUMENT");
            expect(planner.lastDispatches).toBe(0);
            pass.end();
        } finally {
            scope.dispose();
            word.destroy();
            hist.destroy();
            ctx.dispose();
        }
    });

    it("records the random20k u32 fixtures of this adapter: the keys, the histogram and its scan (GRAPHTY_NOISE_FLOOR_WRITE=1 only)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "grid-noise" });
        try {
            const scene = gridScene("random20k", 2, 1);
            const run = await runGridCheck(ctx, scene);
            const want = gridOracleOf(scene);
            expectBitwiseEqual(run.cellKey, want.cellKey, "random20k cellKey vs oracle");
            expectBitwiseEqual(run.cellHist, want.cellHist, "random20k cellHist vs oracle");
            expectBitwiseEqual(run.cellStart, want.cellStart, "random20k cellStart vs oracle");
            const cls = adapterClass(ctx.caps);
            writeNoiseFixture("grid-cell-key", "random20k", cls, sample(run.cellKey, KEY_STRIDE), "u32");
            writeNoiseFixture("histogram", "random20k-cellHist", cls, sample(run.cellHist, CELL_STRIDE), "u32");
            writeNoiseFixture("scan-add", "random20k-cellStart", cls, sample(run.cellStart, CELL_STRIDE), "u32");
            writeNoiseFixture("grid-cell-key", "random20k", "oracle-f64", sample(want.cellKey, KEY_STRIDE), "u32");
            writeNoiseFixture("histogram", "random20k-cellHist", "oracle-f64", sample(want.cellHist, CELL_STRIDE), "u32");
            writeNoiseFixture("scan-add", "random20k-cellStart", "oracle-f64", sample(want.cellStart, CELL_STRIDE), "u32");
        } finally {
            ctx.dispose();
        }
    });

    it("the sabotage report of random20k + outside5 is exact (factor 0)", async (t) => {
        requireGpu(t);
        const ctx: GpuContext = await acquire({ label: "grid-report" });
        try {
            for (const name of ["random20k", "outside5"]) {
                const report = await gridReport(ctx, name, gpuScale());
                expect(report.worst, name).toBe(0);
                assertCheckPasses(report);
            }
            const scene = gridScene("outside5", 2, gpuScale());
            expect(gridCompare(await runGridCheck(ctx, scene), gridOracleOf(scene)).worst).toBe(0);
            // after a full deterministic build the input pair holds the sort's even-pass intermediate: the same multiset
            const full = await runGridBuild(ctx, scene);
            expect(Array.from(full.cellKey).sort((a, b) => a - b)).toEqual(
                Array.from(gridOracleOf(scene).cellKey).sort((a, b) => a - b),
            );
        } finally {
            ctx.dispose();
        }
    });
});
