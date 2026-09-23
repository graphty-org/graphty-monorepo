/**
 * The grid-pyramid check (spec 7.7 G4-G5; P4-T9) shared by test/primitives/grid-pyramid.test.ts and
 * test/sabotage/grid-pyramid.test.ts: a T8 scene (gridScene), one pass that records the T8 build and then the
 * pyramid (G4, G4a, G4b, G5 x (levels - 1)) into poisoned model buffers (0xdeadbeef in every word of the pyramid, so
 * an unwritten cell is visible; `hubCounters` zeroed), the read-back of every level, and the report against
 * gridOraclePyramid: ratioOf(|got - want|, bound) per value, the bound the oracle's analytic forward-error bound of
 * the kernel's f32 sums (an empty cell has bound 0 and must be exactly 0).
 *
 * `hubcell-shifted` is `hubcell` with its first HUB_SHIFTED nodes moved to (-0.5, -0.5, -0.5), a lower cell, so the
 * hub cell's sorted range starts above 0 (the `hub-range-start-ignored` row is invisible on a range that starts at
 * 0); `hubcell-two` moves HUB_TWO nodes there instead, enough for TWO hub cells, so G4a's indirect args must dispatch
 * one workgroup per hub cell (a finalize planned over nodes instead of hub cells sums hubList[0] only). `hubcell` and
 * its variants always run at scale 1: at a software adapter's 1 / 50 the fixture's 400 nodes would not be a hub cell
 * at all.
 */

import { type F32, type U32 } from "@graphty/graph-format";

import { GRID_HUB_CELL, LAYOUT_TUNING_DEFAULTS } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { BufferUsage } from "../../src/device/webgpu-constants.js";
import { FA2_PARAMS, FA2_STATE } from "../../src/kernels.js";
import { prepareGridBuild } from "../../src/primitives/grid.js";
import { type GridPyramidPlanner, type GridPyramidStage, preparePyramid } from "../../src/primitives/grid-pyramid.js";
import { type GridOraclePyramid, gridOraclePyramid } from "../oracle/grid-pyramid.js";
import { bindingOf, readF32, readU32, uploadBuffer } from "./device.js";
import { gridOracleOf, type GridScene, gridScene } from "./grid.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";
import { testReduceScope } from "./segmented-reduce.js";

/** The poison every pyramid word starts with. */
const POISON = 0xdeadbeef;
/** The nodes `hubcell-shifted` moves out of the hub cell. */
const HUB_SHIFTED = 8;
/** The nodes `hubcell-two` moves into a second hub cell (above GRID_HUB_CELL of them). */
const HUB_TWO = 2000;

/** The positioned fixtures of the pyramid check (case 1 of the primitives test). */
export const PYRAMID_FIXTURES: readonly string[] = Object.freeze([
    "random20k",
    "clumpy100",
    "outside5",
    "onecell1k",
    "onecell1025",
    "hubcell",
    "hubcell-shifted",
    "hubcell-two",
]);

/**
 * The scene of a pyramid fixture: gridScene's, except that the hub fixtures are unscaled and `hubcell-shifted` /
 * `hubcell-two` relocate their first nodes.
 * @param name - a PYRAMID_FIXTURES entry
 * @param dim - 2 or 3
 * @param scale - the fixture scale (ignored by the hub fixtures)
 * @returns the scene
 */
export function pyramidScene(name: string, dim: 2 | 3, scale: number): GridScene {
    if (name === "hubcell-shifted" || name === "hubcell-two") {
        const base = gridScene("hubcell", dim, 1);
        const positions = new Float32Array(base.positions);
        const moved = name === "hubcell-two" ? HUB_TWO : HUB_SHIFTED;
        for (let i = 0; i < moved; i++) {
            positions[4 * i] = -0.5;
            positions[4 * i + 1] = -0.5;
            positions[4 * i + 2] = -0.5;
        }
        return { ...base, name, positions };
    }
    return gridScene(name, dim, name === "hubcell" ? 1 : scale);
}

/**
 * One pyramid run: every level read back as one array (the oracle's layout), the counters, the hub list and the
 * dispatch count. The return type of runPyramid (knip: exported for the signature, not imported by name).
 * @public
 */
export interface PyramidRun {
    /** `4 * pyramidCells` floats, level 0 first. */
    readonly pyramid: F32;
    /** `[hubCount, maxOccupancy, 0, 0]`. */
    readonly hubCounters: U32;
    /** The first `hubCount` entries are the hub cells. */
    readonly hubList: U32;
    /** The pyramid planner's dispatches. */
    readonly dispatches: number;
}

/**
 * Records one T8 build and one pyramid build of the scene into a single pass and reads the pyramid back.
 * @param ctx - the context
 * @param scene - the scene
 * @param upTo - the pyramid's last stage (default "G5")
 * @returns the run
 */
export async function runPyramid(ctx: GpuContext, scene: GridScene, upTo?: GridPyramidStage): Promise<PyramidRun> {
    const { n, spec } = scene;
    const stateBytes = new ArrayBuffer(FA2_STATE.byteLength);
    FA2_STATE.write(new DataView(stateBytes), {
        gridMin: [scene.gridMin[0], scene.gridMin[1], scene.gridMin[2], scene.cellSize],
        invCellSize: scene.invCellSize,
    });
    const paramsBytes = new ArrayBuffer(FA2_PARAMS.byteLength);
    FA2_PARAMS.write(new DataView(paramsBytes), {
        n,
        dim: spec.dim,
        gridMax: spec.g,
        levels: spec.levels,
        nearMax: LAYOUT_TUNING_DEFAULTS.nearMax,
    });
    const pos = uploadBuffer(ctx, scene.positions, "pyramid/pos");
    const state = uploadBuffer(ctx, new Uint8Array(stateBytes), "pyramid/state");
    const params = ctx.device.createBuffer({
        label: "pyramid/params",
        size: FA2_PARAMS.byteLength,
        usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
    });
    ctx.device.queue.writeBuffer(params, 0, paramsBytes);
    const poisoned = (words: number, label: string): GPUBuffer =>
        uploadBuffer(ctx, new Uint32Array(words).fill(POISON), label);
    const cellKey = poisoned(n, "pyramid/cellKey");
    const cellVal = poisoned(n, "pyramid/cellVal");
    const sortedKey = poisoned(n, "pyramid/sortedKey");
    const sortedIdx = poisoned(n, "pyramid/sortedIdx");
    const cellHist = poisoned(spec.histWords, "pyramid/cellHist");
    const cellStart = poisoned(spec.histWords, "pyramid/cellStart");
    const pyramid = poisoned(4 * spec.pyramidCells, "pyramid/pyramid");
    const hubWords = Math.max(1, Math.ceil(n / GRID_HUB_CELL));
    const hubList = poisoned(hubWords, "pyramid/hubList");
    const hubCounters = uploadBuffer(ctx, new Uint32Array(4), "pyramid/hubCounters");
    const hubArgs = uploadBuffer(ctx, new Uint32Array(4), "pyramid/hubArgs", BufferUsage.INDIRECT);
    const scope = testReduceScope(ctx);
    try {
        const build = await prepareGridBuild(scope, spec);
        const planner: GridPyramidPlanner = await preparePyramid(scope, spec);
        build.bind({
            pos: bindingOf(pos),
            state: bindingOf(state),
            params: bindingOf(params),
            cellKey: bindingOf(cellKey),
            cellVal: bindingOf(cellVal),
            sortedKey: bindingOf(sortedKey),
            sortedIdx: bindingOf(sortedIdx),
            cellHist: bindingOf(cellHist),
            cellStart: bindingOf(cellStart),
        });
        planner.bind({
            pos: bindingOf(pos),
            params: bindingOf(params),
            sortedIdx: bindingOf(sortedIdx),
            cellStart: bindingOf(cellStart),
            pyramid: bindingOf(pyramid),
            hubList: bindingOf(hubList),
            hubCounters: bindingOf(hubCounters),
            hubArgs: bindingOf(hubArgs),
        });
        const encoder = ctx.device.createCommandEncoder({ label: "pyramid/test" });
        const pass = encoder.beginComputePass({ label: "pyramid/test" });
        build.record(pass, n, 0);
        planner.record(pass, 0, upTo);
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        return {
            pyramid: await readF32(ctx, pyramid, 4 * spec.pyramidCells),
            hubCounters: await readU32(ctx, hubCounters, 4),
            hubList: await readU32(ctx, hubList, hubWords),
            dispatches: planner.lastDispatches,
        };
    } finally {
        scope.dispose();
        for (const b of [pos, state, params, cellKey, cellVal, sortedKey, sortedIdx, cellHist, cellStart]) {
            b.destroy();
        }
        for (const b of [pyramid, hubList, hubCounters, hubArgs]) {
            b.destroy();
        }
    }
}

/**
 * The oracle's pyramid of a scene (over the T8 oracle's build).
 * @param scene - the scene
 * @param wg - the workgroup size of the context that ran the kernel
 * @returns the pyramid
 */
export function pyramidOracleOf(scene: GridScene, wg: number): GridOraclePyramid {
    return gridOraclePyramid(
        gridOracleOf(scene),
        {
            positions: scene.positions,
            n: scene.n,
            spec: scene.spec,
            gridMin: scene.gridMin,
            invCellSize: scene.invCellSize,
        },
        wg,
    );
}

/**
 * One level of a run's pyramid.
 * @param run - the run
 * @param scene - the scene
 * @param level - the level
 * @returns the level's `4 * cells_L` floats
 */
export function levelOf(run: PyramidRun, scene: GridScene, level: number): F32 {
    const { levelOffsets, pyramidCells } = scene.spec;
    const first = levelOffsets[level];
    const last = level + 1 < levelOffsets.length ? levelOffsets[level + 1] : pyramidCells;
    return run.pyramid.subarray(4 * first, 4 * last);
}

/**
 * The report of a run against the oracle: ratioOf(|got - want|, bound) per value of every level from `minLevel`.
 * @param run - the GPU run
 * @param scene - the scene
 * @param want - the oracle's pyramid
 * @param minLevel - the first level compared (default 0)
 * @returns the report
 */
export function pyramidCompare(run: PyramidRun, scene: GridScene, want: GridOraclePyramid, minLevel?: number): CheckReport {
    const reports: CheckReport[] = [];
    const lanes = ["x", "y", "z", "w"];
    for (let level = minLevel ?? 0; level < scene.spec.levels; level++) {
        const got = levelOf(run, scene, level);
        const values = want.levels[level];
        const bounds = want.bounds[level];
        if (got.length !== values.length) {
            reports.push({ worst: Infinity, worstLabel: `L${level}.length`, samples: 1 });
            continue;
        }
        let worst = 0;
        let worstLabel = `L${level}`;
        for (let k = 0; k < values.length; k++) {
            const ratio = ratioOf(Math.abs(got[k] - values[k]), bounds[k]);
            if (ratio > worst || Number.isNaN(ratio)) {
                worst = ratio;
                worstLabel = `L${level}[${Math.floor(k / 4)}].${lanes[k % 4]}`;
            }
        }
        reports.push({ worst, worstLabel, samples: values.length });
    }
    return mergeReports(reports);
}

/**
 * The check of a fixture in 2D and 3D from `minLevel` up (spec 11.9 item 1: the sabotage suite asserts the same
 * report fails on a mutant).
 * @param ctx - the context
 * @param name - the fixture name
 * @param scale - the fixture scale
 * @param minLevel - the first level compared (default 0)
 * @returns the merged report over both dimensions
 */
export async function pyramidReport(ctx: GpuContext, name: string, scale: number, minLevel?: number): Promise<CheckReport> {
    const reports: CheckReport[] = [];
    for (const dim of [2, 3] as const) {
        const scene = pyramidScene(name, dim, scale);
        const run = await runPyramid(ctx, scene);
        reports.push(pyramidCompare(run, scene, pyramidOracleOf(scene, ctx.workgroupSize), minLevel));
    }
    return mergeReports(reports);
}
