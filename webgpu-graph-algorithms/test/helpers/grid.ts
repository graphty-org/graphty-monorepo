/**
 * The grid-build check (spec 7.7 G1-G3; P4-T8) shared by test/primitives/grid.test.ts and
 * test/sabotage/grid-build.test.ts: a positioned fixture expanded to `vec4f` (mass 1), the frame K1 will compute
 * (`extent = max(bboxSide * GRID_BBOX_MARGIN, GRID_EXTENT_FLOOR)`, `gridMin = centroid - extent / 2`, `cellSize =
 * extent / G`, `invCellSize = 1 / cellSize`, every value through Math.fround), a `Fa2State` and a `Fa2Params` record
 * written by the blocks, poisoned model buffers (0xdeadbeef in every word, so an unwritten word is visible), one grid
 * build recorded into a plain encoder through testReduceScope, and the bitwise report against gridOracleBuild
 * (ratioOf(|a - b|, 0) per word of cellKey, sortedIdx, cellHist and cellStart: any mismatch is Infinity). The
 * node-indexed keys come from a second build stopped after G1: the radix sort's passes ping-pong through the
 * `cellKey` / `cellVal` pair, so after a full build that pair holds the sort's even-pass intermediate.
 *
 * Three kinds of fixture take a frame of their own: `outside5` is framed by the unit box `[-1, 1)` (its five far
 * positions would otherwise widen the bbox and land inside), the one-cell fixtures (`onecell1k`, `onecell1025`,
 * `hubcell`) are framed by the unit box too (their bbox IS the 1e-3 box, which would spread them over the grid), and
 * `coincident` collapses every position onto node 0's (the `GRID_EXTENT_FLOOR` case: an extent of 1e-6, every node in
 * one cell).
 */

import { type F32, type U32 } from "@graphty/graph-format";

import { GRID_BBOX_MARGIN, GRID_EXTENT_FLOOR, LAYOUT_TUNING_DEFAULTS } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { BufferUsage } from "../../src/device/webgpu-constants.js";
import { FA2_PARAMS, FA2_STATE } from "../../src/kernels.js";
import {
    type GridBuildPlanner,
    type GridBuildStage,
    type GridSpec,
    gridSpecFor,
    prepareGridBuild,
} from "../../src/primitives/grid.js";
import { type GridOracleBuild, gridOracleBuild } from "../oracle/grid.js";
import { bindingOf, readU32, uploadBuffer } from "./device.js";
import { fixture } from "./graphs.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";
import { testReduceScope } from "./segmented-reduce.js";

/** The poison every model word starts with. */
const POISON = 0xdeadbeef;

/** The positioned fixtures of the build check (every one returns positions). */
export const GRID_FIXTURES: readonly string[] = Object.freeze([
    "random20k",
    "clumpy100",
    "line",
    "outside5",
    "onecell1k",
    "coincident",
]);

/**
 * A fixture's positions as G1 reads them and the frame that keys them. The return type of gridScene (knip: exported
 * for the signature, not imported by name).
 * @public
 */
export interface GridScene {
    readonly name: string;
    readonly n: number;
    /** Stride 4: xyz + mass 1. */
    readonly positions: F32;
    readonly spec: GridSpec;
    readonly gridMin: readonly [number, number, number];
    readonly cellSize: number;
    readonly invCellSize: number;
}

/**
 * The positioned fixture at `scale`, expanded to stride 4 with mass 1; `coincident` collapses onto node 0.
 * @param name - a GRID_FIXTURES entry (or any positioned fixture)
 * @param scale - the fixture scale (gpuScale() or 1)
 * @returns the node count and the stride-4 positions
 */
function gridPositions(name: string, scale: number): { readonly n: number; readonly positions: F32 } {
    const f = fixture(name, scale);
    const n = f.snapshot.nodeCount;
    const p3 = f.positions;
    if (p3 === null) {
        throw new Error(`gridPositions: fixture ${name} supplies no positions`);
    }
    const positions = new Float32Array(4 * n);
    for (let i = 0; i < n; i++) {
        const src = name === "coincident" ? 0 : i;
        positions[4 * i] = p3[3 * src];
        positions[4 * i + 1] = p3[3 * src + 1];
        positions[4 * i + 2] = p3[3 * src + 2];
        positions[4 * i + 3] = 1;
    }
    return { n, positions };
}

/**
 * Whether a fixture is framed by the unit box `[-1, 1)` instead of its bbox.
 * @param name - the fixture name
 * @returns true for `outside5` and the one-cell fixtures
 */
function unitFramed(name: string): boolean {
    return name === "outside5" || name === "hubcell" || name.startsWith("onecell");
}

/**
 * The frame K1 will compute from the bbox (or the unit box, see unitFramed), every value through Math.fround.
 * @param name - the fixture name
 * @param positions - stride-4 positions
 * @param n - the node count
 * @param spec - the grid
 * @returns gridMin, cellSize, invCellSize
 */
function frameOf(
    name: string,
    positions: F32,
    n: number,
    spec: GridSpec,
): { readonly gridMin: readonly [number, number, number]; readonly cellSize: number; readonly invCellSize: number } {
    const centre = [0, 0, 0];
    let side = 2;
    if (!unitFramed(name)) {
        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];
        const sum = [0, 0, 0];
        for (let i = 0; i < n; i++) {
            for (let a = 0; a < 3; a++) {
                const v = positions[4 * i + a];
                min[a] = Math.min(min[a], v);
                max[a] = Math.max(max[a], v);
                sum[a] += v;
            }
        }
        side = 0;
        for (let a = 0; a < spec.dim; a++) {
            side = Math.max(side, max[a] - min[a]);
            centre[a] = sum[a] / n;
        }
    }
    const extent = Math.max(Math.fround(side * GRID_BBOX_MARGIN), GRID_EXTENT_FLOOR);
    const cellSize = Math.fround(extent / spec.g);
    const invCellSize = Math.fround(1 / cellSize);
    const gridMin: [number, number, number] = [
        Math.fround(centre[0] - extent / 2),
        Math.fround(centre[1] - extent / 2),
        spec.dim === 3 ? Math.fround(centre[2] - extent / 2) : 0,
    ];
    return { gridMin, cellSize, invCellSize };
}

/**
 * The scene of a fixture: its positions, its grid and its frame.
 * @param name - the fixture name
 * @param dim - 2 or 3
 * @param scale - the fixture scale
 * @param deterministic - the sort path (default true)
 * @param gridMax2D - an override of the 2D cap (default the tuning default)
 * @returns the scene
 */
export function gridScene(
    name: string,
    dim: 2 | 3,
    scale: number,
    deterministic?: boolean,
    gridMax2D?: number,
): GridScene {
    const { n, positions } = gridPositions(name, scale);
    const spec = gridSpecFor(n, dim, {
        gridMax2D: gridMax2D ?? LAYOUT_TUNING_DEFAULTS.gridMax2D,
        gridMax3D: LAYOUT_TUNING_DEFAULTS.gridMax3D,
        deterministic: deterministic ?? true,
    });
    return { name, n, positions, spec, ...frameOf(name, positions, n, spec) };
}

/**
 * One build run: the named outputs read back, and the dispatch count. The return type of runGridBuild / runGridCheck
 * (knip: exported for the signature, not imported by name).
 * @public
 */
export interface GridRun {
    readonly cellKey: U32;
    readonly sortedKey: U32;
    readonly sortedIdx: U32;
    readonly cellHist: U32;
    readonly cellStart: U32;
    readonly dispatches: number;
}

/**
 * Records one grid build of the scene into a plain encoder and reads the named buffers back.
 * @param ctx - the context
 * @param scene - the scene
 * @param upTo - the last stage (default "G3")
 * @returns the run
 */
export async function runGridBuild(ctx: GpuContext, scene: GridScene, upTo?: GridBuildStage): Promise<GridRun> {
    const { n, spec } = scene;
    const words = Math.max(n, 1);
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
    const pos = uploadBuffer(ctx, scene.positions.length > 0 ? scene.positions : new Float32Array(4), "grid/pos");
    const state = uploadBuffer(ctx, new Uint8Array(stateBytes), "grid/state");
    const params = ctx.device.createBuffer({
        label: "grid/params",
        size: FA2_PARAMS.byteLength,
        usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
    });
    ctx.device.queue.writeBuffer(params, 0, paramsBytes);
    const poisoned = (count: number, label: string): GPUBuffer =>
        uploadBuffer(ctx, new Uint32Array(count).fill(POISON), label);
    const cellKey = poisoned(words, "grid/cellKey");
    const cellVal = poisoned(words, "grid/cellVal");
    const sortedKey = poisoned(words, "grid/sortedKey");
    const sortedIdx = poisoned(words, "grid/sortedIdx");
    const cellHist = poisoned(spec.histWords, "grid/cellHist");
    const cellStart = poisoned(spec.histWords, "grid/cellStart");
    const scope = testReduceScope(ctx);
    try {
        const planner: GridBuildPlanner = await prepareGridBuild(scope, spec);
        planner.bind({
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
        const encoder = ctx.device.createCommandEncoder({ label: "grid/test" });
        const pass = encoder.beginComputePass({ label: "grid/test" });
        planner.record(pass, n, 0, upTo);
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        return {
            cellKey: await readU32(ctx, cellKey, n),
            sortedKey: await readU32(ctx, sortedKey, n),
            sortedIdx: await readU32(ctx, sortedIdx, n),
            cellHist: await readU32(ctx, cellHist, spec.histWords),
            cellStart: await readU32(ctx, cellStart, spec.histWords),
            dispatches: planner.lastDispatches,
        };
    } finally {
        scope.dispose();
        for (const b of [pos, state, params, cellKey, cellVal, sortedKey, sortedIdx, cellHist, cellStart]) {
            b.destroy();
        }
    }
}

/**
 * Two builds of the scene: one stopped after G1 for the node-indexed keys, one in full for the sorted order, the
 * histogram and its scan (`dispatches` is the full build's).
 * @param ctx - the context
 * @param scene - the scene
 * @returns the run
 */
export async function runGridCheck(ctx: GpuContext, scene: GridScene): Promise<GridRun> {
    const keys = await runGridBuild(ctx, scene, "G1");
    const full = await runGridBuild(ctx, scene);
    return { ...full, cellKey: keys.cellKey };
}

/**
 * The oracle's build of a scene.
 * @param scene - the scene
 * @returns the build
 */
export function gridOracleOf(scene: GridScene): GridOracleBuild {
    return gridOracleBuild({
        positions: scene.positions,
        n: scene.n,
        spec: scene.spec,
        gridMin: scene.gridMin,
        invCellSize: scene.invCellSize,
    });
}

/**
 * The bitwise report of a run against the oracle: ratioOf(|a - b|, 0) per word of the four outputs.
 * @param got - the GPU run
 * @param want - the oracle build
 * @returns the report
 */
export function gridCompare(got: GridRun, want: GridOracleBuild): CheckReport {
    const reports: CheckReport[] = [];
    const compare = (name: string, a: U32, b: U32): void => {
        if (a.length !== b.length) {
            reports.push({ worst: Infinity, worstLabel: `${name}.length`, samples: 1 });
            return;
        }
        for (let i = 0; i < b.length; i++) {
            reports.push({ worst: ratioOf(Math.abs(a[i] - b[i]), 0), worstLabel: `${name}[${i}]`, samples: 1 });
        }
    };
    compare("cellKey", got.cellKey, want.cellKey);
    compare("sortedIdx", got.sortedIdx, want.sortedIdx);
    compare("cellHist", got.cellHist, want.cellHist);
    compare("cellStart", got.cellStart, want.cellStart);
    return mergeReports(reports);
}

/**
 * The bitwise check of the deterministic build of a fixture in 2D and 3D (spec 11.9 item 1: the sabotage suite
 * asserts the same report fails on a mutant).
 * @param ctx - the context
 * @param name - the fixture name
 * @param scale - the fixture scale
 * @returns the merged report over both dimensions
 */
export async function gridReport(ctx: GpuContext, name: string, scale: number): Promise<CheckReport> {
    const reports: CheckReport[] = [];
    for (const dim of [2, 3] as const) {
        const scene = gridScene(name, dim, scale);
        const got = await runGridCheck(ctx, scene);
        reports.push(gridCompare(got, gridOracleOf(scene)));
    }
    return mergeReports(reports);
}
