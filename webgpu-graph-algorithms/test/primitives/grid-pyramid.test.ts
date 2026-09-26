/**
 * The grid build, part 2 (spec 6 row 12, 7.7 G4-G5, 13 row P4 gate "a 1M-entry hub cell dispatched through G4b";
 * P4-T9): every level of the pyramid of eight positioned fixtures in 2D and 3D within the oracle's analytic bound
 * (two runs bitwise first), the hub list and the counters (`onecell1k` at exactly GRID_HUB_CELL entries stays on
 * G4, `onecell1025` and `hubcell` go through G4b, `hubcell-two` sends TWO cells through G4b so the indirect args
 * must carry one workgroup per hub cell), the empty cells and the pseudo-cell, the subgroup twins in one
 * process, the dispatch count of the `upTo` stops, and the writer cases that record the `grid-downsample` /
 * `random20k-L1` and `grid-centroid-hub` / `hubcell-L0` f32 noise fixtures of this adapter (T11 registers both
 * members; `grid-centroid`'s own row is T11's whole-pyramid stage fixture).
 */

import { type F32 } from "@graphty/graph-format";

import { GRID_HUB_CELL } from "../../src/constants.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { preparePyramid } from "../../src/primitives/grid-pyramid.js";
import { levelOf, PYRAMID_FIXTURES, pyramidCompare, pyramidOracleOf, pyramidScene, runPyramid } from "../helpers/grid-pyramid.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { testReduceScope } from "../helpers/segmented-reduce.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;
/** Every 64th cell of level 1: the committed fixture of the unscaled random20k downsample. */
const CELL_STRIDE = 64;
const POISON_F32 = new Float32Array(new Uint32Array([0xdeadbeef]).buffer)[0];

/**
 * Every `stride`-th cell's four lanes.
 * @param level - a level's floats
 * @param stride - the cell stride
 * @returns the sample
 */
function sampleCells(level: Float32Array | Float64Array, stride: number): number[] {
    const out: number[] = [];
    for (let c = 0; 4 * c < level.length; c += stride) {
        out.push(level[4 * c], level[4 * c + 1], level[4 * c + 2], level[4 * c + 3]);
    }
    return out;
}

describe("gridPyramid (spec 7.7 G4-G5; P4-T9): every level within the analytic bound, twice bitwise", () => {
    for (const name of PYRAMID_FIXTURES) {
        for (const dim of [2, 3] as const) {
            it(
                `${name} in ${dim}D: every level equals gridOraclePyramid within the bound; two runs bitwise equal; the hub list and the counters are the oracle's`,
                async (t) => {
                    requireGpu(t);
                    const ctx = await acquire({ label: `pyramid-${name}-${dim}` });
                    try {
                        const scene = pyramidScene(name, dim, gpuScale());
                        const first = await runPyramid(ctx, scene);
                        const second = await runPyramid(ctx, scene);
                        expectBitwiseEqual(first.pyramid, second.pyramid, "pyramid twice");
                        expectBitwiseEqual(first.hubCounters, second.hubCounters, "hubCounters twice");
                        const want = pyramidOracleOf(scene, ctx.workgroupSize);
                        const report = pyramidCompare(first, scene, want);
                        assertCheckPasses(report);
                        expect(first.hubCounters[0], "hubCount").toBe(want.hubCells.length);
                        expect(first.hubCounters[1], "maxOccupancy").toBe(want.maxOccupancy);
                        expect(Array.from(first.hubList.subarray(0, want.hubCells.length)).sort((a, b) => a - b)).toEqual(
                            want.hubCells,
                        );
                        if (name === "onecell1k") {
                            expect(want.maxOccupancy).toBe(GRID_HUB_CELL);
                            expect(first.hubCounters[0]).toBe(0);
                        }
                        if (name === "onecell1025" || name === "hubcell") {
                            expect(want.maxOccupancy).toBe(scene.n);
                            expect(first.hubCounters[0]).toBe(1);
                            expect(first.hubList[0]).toBe(want.hubCells[0]);
                        }
                        if (name === "hubcell-shifted") {
                            expect(first.hubCounters[0]).toBe(1);
                            expect(want.maxOccupancy).toBeLessThan(scene.n);
                            // the hub cell's sorted range starts above 0: the shifted nodes sort before it
                            expect(want.hubCells[0]).toBeGreaterThan(0);
                        }
                        if (name === "hubcell-two") {
                            // two hub cells: G4a must plan one G4b workgroup per hub cell (wg = 1), or the second is never summed
                            expect(want.hubCells.length).toBe(2);
                            expect(first.hubCounters[0]).toBe(2);
                            const level0 = levelOf(first, scene, 0);
                            for (const cell of want.hubCells) {
                                expect(level0[4 * cell + 3], `cell ${cell} mass`).toBe(want.levels[0][4 * cell + 3]);
                            }
                        }
                    } finally {
                        ctx.dispose();
                    }
                },
                CASE_TIMEOUT,
            );
        }
    }

    it("empty cells hold vec4f(0) at every level; the orthant pseudo-cells of outside5 hold the five outside nodes' sums and are never downsampled", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "pyramid-empty" });
        try {
            for (const dim of [2, 3] as const) {
                const scene = pyramidScene("outside5", dim, gpuScale());
                const run = await runPyramid(ctx, scene);
                const want = pyramidOracleOf(scene, ctx.workgroupSize);
                let empty = 0;
                for (let level = 0; level < scene.spec.levels; level++) {
                    const got = levelOf(run, scene, level);
                    const values = want.levels[level];
                    for (let c = 0; 4 * c < values.length; c++) {
                        if (values[4 * c + 3] === 0) {
                            empty++;
                            for (let a = 0; a < 4; a++) {
                                expect(got[4 * c + a], `${dim}D L${level}[${c}] lane ${a}`).toBe(0);
                            }
                        }
                    }
                }
                expect(empty).toBeGreaterThan(0);
                const { cells, outsideCells } = scene.spec;
                let outsideMass = 0;
                for (let at = 4 * cells; at < 4 * (cells + outsideCells); at += 4) {
                    const pseudo = levelOf(run, scene, 0).subarray(at, at + 4);
                    outsideMass += pseudo[3];
                    expect(pseudo[3]).toBe(want.levels[0][at + 3]);
                    for (let a = 0; a < 3; a++) {
                        expect(Math.abs(pseudo[a] - want.levels[0][at + a])).toBeLessThanOrEqual(want.bounds[0][at + a]);
                    }
                }
                expect(outsideMass).toBe(5); // the five far nodes, spread over the orthant pseudo-cells (issue #90)
                // the top level sums the inside nodes only: karate's 34 minus the 5 outside
                const top = levelOf(run, scene, scene.spec.levels - 1);
                let mass = 0;
                for (let c = 0; 4 * c < top.length; c++) {
                    mass += top[4 * c + 3];
                }
                expect(mass).toBe(scene.n - 5);
            }
        } finally {
            ctx.dispose();
        }
    });

    it(
        "the twins in one process: without subgroups, hubcell's level 0 matches the feature context bitwise outside the hub cell and every level stays within the bound",
        async (t) => {
            requireGpu(t);
            const ctx = await acquire({ label: "pyramid-twin-feature" });
            const twin = await acquire({ subgroups: false, label: "pyramid-twin" });
            try {
                expect(twin.caps.features.has("subgroups")).toBe(false);
                for (const dim of [2, 3] as const) {
                    const scene = pyramidScene("hubcell", dim, 1);
                    const withFeature = await runPyramid(ctx, scene);
                    const withoutFeature = await runPyramid(twin, scene);
                    const want = pyramidOracleOf(scene, ctx.workgroupSize);
                    assertCheckPasses(pyramidCompare(withFeature, scene, want));
                    assertCheckPasses(pyramidCompare(withoutFeature, scene, pyramidOracleOf(scene, twin.workgroupSize)));
                    const [hub] = want.hubCells;
                    const a = levelOf(withFeature, scene, 0);
                    const b = levelOf(withoutFeature, scene, 0);
                    const outsideHub = (level: F32): F32 => {
                        const out = new Float32Array(level.length - 4);
                        out.set(level.subarray(0, 4 * hub));
                        out.set(level.subarray(4 * hub + 4), 4 * hub);
                        return out;
                    };
                    expectBitwiseEqual(outsideHub(a), outsideHub(b), `${dim}D: level 0 outside the hub cell`);
                    expect(withoutFeature.hubCounters).toEqual(withFeature.hubCounters);
                }
            } finally {
                twin.dispose();
                ctx.dispose();
            }
        },
        CASE_TIMEOUT,
    );

    it("lastDispatches is 3 + (levels - 1) for a full record and 3 after upTo: G4, which leaves the coarser levels untouched", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "pyramid-dispatches" });
        try {
            for (const dim of [2, 3] as const) {
                const scene = pyramidScene("random20k", dim, gpuScale());
                const full = await runPyramid(ctx, scene);
                expect(full.dispatches).toBe(3 + (scene.spec.levels - 1));
                const level0 = await runPyramid(ctx, scene, "G4");
                expect(level0.dispatches).toBe(3);
                expectBitwiseEqual(levelOf(level0, scene, 0), levelOf(full, scene, 0), `${dim}D: level 0`);
                for (let level = 1; level < scene.spec.levels; level++) {
                    expect(levelOf(level0, scene, level).every((v) => v === POISON_F32), `${dim}D: L${level} poison`).toBe(true);
                }
            }
        } finally {
            ctx.dispose();
        }
    });

    it("record() before bind() is E_NOT_LOADED and records nothing", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "pyramid-unbound" });
        const scope = testReduceScope(ctx);
        try {
            const planner = await preparePyramid(scope, pyramidScene("outside5", 2, gpuScale()).spec);
            const encoder = ctx.device.createCommandEncoder();
            const pass = encoder.beginComputePass();
            let code: string | null = null;
            try {
                planner.record(pass, 0);
            } catch (e) {
                code = isWebGpuGraphError(e) ? e.code : null;
            }
            expect(code).toBe("E_NOT_LOADED");
            expect(planner.lastDispatches).toBe(0);
            pass.end();
        } finally {
            scope.dispose();
            ctx.dispose();
        }
    });

    it("records the random20k-L1 downsample and the hubcell-L0 hub-centroid f32 fixtures of this adapter (GRAPHTY_NOISE_FLOOR_WRITE=1 only)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "pyramid-noise" });
        try {
            const cls = adapterClass(ctx.caps);
            const random = pyramidScene("random20k", 2, 1);
            const randomRun = await runPyramid(ctx, random);
            const randomWant = pyramidOracleOf(random, ctx.workgroupSize);
            assertCheckPasses(pyramidCompare(randomRun, random, randomWant));
            writeNoiseFixture("grid-downsample", "random20k-L1", cls, sampleCells(levelOf(randomRun, random, 1), CELL_STRIDE), "f32");
            writeNoiseFixture("grid-downsample", "random20k-L1", "oracle-f64", sampleCells(randomWant.levels[1], CELL_STRIDE), "f32");
            const hub = pyramidScene("hubcell", 2, 1);
            const hubRun = await runPyramid(ctx, hub);
            const hubWant = pyramidOracleOf(hub, ctx.workgroupSize);
            assertCheckPasses(pyramidCompare(hubRun, hub, hubWant));
            const [cell] = hubWant.hubCells;
            writeNoiseFixture("grid-centroid-hub", "hubcell-L0", cls, levelOf(hubRun, hub, 0).subarray(4 * cell, 4 * cell + 4), "f32");
            writeNoiseFixture("grid-centroid-hub", "hubcell-L0", "oracle-f64", hubWant.levels[0].subarray(4 * cell, 4 * cell + 4), "f32");
        } finally {
            ctx.dispose();
        }
    }, CASE_TIMEOUT);
});
