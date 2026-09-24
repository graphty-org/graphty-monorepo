/**
 * The K2 (`fa2-attraction`) checks of P4-T6, shared by test/layouts/tiers-inspect.test.ts,
 * test/layouts/attraction-windowed.test.ts and test/sabotage/tiers.test.ts (spec 11.9 item 1: the sabotage test
 * asserts the SAME check fails on a mutant). Two legs:
 *
 * 1. `attractionTierWorstFactor`: the layout's K2 stage (debugRunStages("K2") on a fresh ForceAtlas2 simulation,
 *    so the simulation binds `perm` and dispatches every tier the degrees populate, PD-7) on rmat14 against the
 *    f64 oracle's attraction stage, every node within its ANALYTIC bound deg_i x 2^-22 under the floored per-node
 *    metric of spec 11.4 (relTolerance's form in test/helpers/segmented-reduce.ts, per node).
 * 2. `attractionWindowedRun`: the TIER 0 kernel dispatched by the test over arc windows of `arcsPerWindow` arcs
 *    with `arcBase != 0` and `accumulate = 1` (the 4.2 windowed pattern executed at the kernel level: the layout
 *    itself never windows, DEP-P4-B). Each window binds a COPY of its colIdx slice followed by POISON_TAIL words
 *    of INVALID_INDEX, so a read past the window (the `tier0-rebase-ignored` mutation reads `colIdx[a]` instead
 *    of `colIdx[a - P.arcBase]`) hits a neighbour index >= n whose `pos[j]` read is out of bounds; on the real
 *    kernel the tail is never read. A row inside one window folds the same arcs in the same order and adds the
 *    zero it accumulates onto, so it is BITWISE the one-dispatch result; a row split across windows folds each
 *    part from zero and adds the parts, a different association of the same terms, so it is held to the analytic
 *    bound instead (the plan's "bitwise for every row" holds only for rows a window never splits).
 */

import { type F32, type GraphSnapshot, INVALID_INDEX, type NodeMask } from "@graphty/graph-format";

import { type GpuContext } from "../../src/context.js";
import { BufferUsage } from "../../src/device/webgpu-constants.js";
import { plan1d } from "../../src/kernel/dispatch.js";
import { FA2_PARAMS, kernelSpec } from "../../src/kernels.js";
import { type GpuLayoutTuning } from "../../src/types/layout.js";
import { type Binding } from "../../src/types/memory.js";
import { type ForceAtlas2Options } from "../../src/types/options.js";
import { forceAtlas2Oracle } from "../oracle/forceatlas2.js";
import { gpuScale } from "../setup/gpu.js";
import { windowsOf } from "./degree-check.js";
import { bindingOf, readF32, scratchBuffer, uploadBuffer } from "./device.js";
import {
    asF32,
    BASE_OPTIONS,
    debugStages,
    FLOOR_FRACTION,
    oracleOptionsFor,
    PAPER,
    paritySnapshot,
    startPositions,
    withSim,
} from "./fa2-parity.js";
import { type CheckReport, ratioOf } from "./sabotage.js";

/** Poison words appended to every window copy (INVALID_INDEX >= n for every snapshot). */
const POISON_TAIL = 64;
/** The arcs per window of the windowed leg (karate's 156 arcs make three windows with rows split at 63 / 64 and 127 / 128). */
const ARCS_PER_WINDOW = 64;

/**
 * The analytic bound of one node's f32 attraction against the f64 oracle: each of its deg_i terms and partial sums
 * rounds once (2^-24 relative), so deg_i x 2^-22 covers the serial fold of TIER 0 and the trees of TIER 1 / 2
 * with a 4x margin; a node with no arcs has an exact zero and keeps the one-term bound.
 * @param degree - the node's arc count
 * @returns the relative bound
 */
function attractionBound(degree: number): number {
    return Math.max(1, degree) * 2 ** -22;
}

/**
 * The per-node bounds of a snapshot's rows: attractionBound(deg_i) for every row.
 * @param s - the snapshot
 * @returns one bound per node
 */
export function attractionBounds(s: GraphSnapshot): Float64Array {
    const out = new Float64Array(s.nodeCount);
    for (let i = 0; i < s.nodeCount; i++) {
        out[i] = attractionBound(s.rowPtr[i + 1] - s.rowPtr[i]);
    }
    return out;
}

/**
 * The floored per-node error of a stride-3 K2 output against its reference, each node held to its OWN bound:
 * err_i = |a_i - e_i| / max(|e_i|, FLOOR_FRACTION x max_j |e_j|) (spec 11.4), worst = max_i err_i / bound_i. A
 * bound of 0 demands a bitwise match of that node (ratioOf's rule).
 * @param values - the measured stride-3 forces
 * @param expected - the reference stride-3 forces
 * @param bounds - one relative bound per node
 * @param label - the report label
 * @returns the report
 */
export function attractionReport(
    values: ArrayLike<number>,
    expected: ArrayLike<number>,
    bounds: ArrayLike<number>,
    label: string,
): CheckReport {
    const n = bounds.length;
    if (values.length !== 3 * n || expected.length !== 3 * n) {
        return {
            worst: Infinity,
            worstLabel: `${label}: length ${values.length} / ${expected.length} vs ${3 * n}`,
            samples: n,
        };
    }
    const norms = new Float64Array(n);
    let largest = 0;
    for (let i = 0; i < n; i++) {
        norms[i] = Math.hypot(expected[3 * i], expected[3 * i + 1], expected[3 * i + 2]);
        largest = Math.max(largest, norms[i]);
    }
    const floor = FLOOR_FRACTION * largest;
    let worst = 0;
    let worstLabel = label;
    for (let i = 0; i < n; i++) {
        const numerator = Math.hypot(
            values[3 * i] - expected[3 * i],
            values[3 * i + 1] - expected[3 * i + 1],
            values[3 * i + 2] - expected[3 * i + 2],
        );
        const denominator = Math.max(norms[i], floor);
        let error = 0;
        if (denominator > 0) {
            error = numerator / denominator;
        } else if (numerator > 0 || Number.isNaN(numerator)) {
            error = Infinity;
        }
        const ratio = ratioOf(error, bounds[i]);
        if (ratio > worst) {
            worst = ratio;
            worstLabel = `${label}[${i}]: error ${error.toExponential(3)} over bound ${bounds[i].toExponential(3)}`;
        }
    }
    return { worst, worstLabel, samples: n };
}

/**
 * The layout's K2 stage: one fresh ForceAtlas2 simulation (inspect on), load(s, start), the mask when given,
 * debugRunStages("K2"), then `force` (stride-3 f32).
 * @param ctx - the context
 * @param s - the snapshot
 * @param start - the scene start (scale 1, zero center)
 * @param options - the FA2 options
 * @param tuning - the GPU tuning
 * @param mask - the fixed mask or null
 * @returns the attraction forces
 */
async function attractionStage(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    options: ForceAtlas2Options,
    tuning: GpuLayoutTuning,
    mask: NodeMask | null,
): Promise<F32> {
    return await withSim(ctx, options, tuning, async (sim) => {
        sim.load(s, Float32Array.from(start));
        if (mask !== null) {
            sim.setFixed(mask);
        }
        const st = debugStages(sim);
        await st.run("K2");
        return asF32(await st.read("force"));
    });
}

/**
 * The f64 oracle's attraction stage of one iteration from the same start.
 * @param s - the snapshot
 * @param start - the scene start (scale 1, zero center)
 * @param options - the FA2 options
 * @param tuning - the GPU tuning
 * @param mask - the fixed mask or null
 * @returns the attraction forces (stride 3)
 */
function attractionOracle(
    s: GraphSnapshot,
    start: F32,
    options: ForceAtlas2Options,
    tuning: GpuLayoutTuning,
    mask: NodeMask | null,
): Float64Array {
    const run = forceAtlas2Oracle(s, Float32Array.from(start), oracleOptionsFor(s, options, tuning, mask, "f64"), 1);
    return run.oracle.stages.attraction;
}

/**
 * The tier check the K2 rows of SABOTAGE_P4_TIERS must break: the layout's K2 stage on rmat14 at gpuScale()
 * (every tier populated, PD-7) against the f64 oracle, every node within deg_i x 2^-22.
 * @param ctx - a fresh context (mutant or not)
 * @returns the worst error / bound ratio (< 1 on the real kernel)
 */
export async function attractionTierWorstFactor(ctx: GpuContext): Promise<number> {
    const s = paritySnapshot("rmat14", gpuScale(), false);
    try {
        const start = startPositions(s, BASE_OPTIONS, false);
        const gpu = await attractionStage(ctx, s, start, BASE_OPTIONS, PAPER, null);
        const expected = attractionOracle(s, start, BASE_OPTIONS, PAPER, null);
        return attractionReport(gpu, expected, attractionBounds(s), "attraction-tiers/rmat14").worst;
    } finally {
        ctx.release(s);
    }
}

/** The result of the windowed leg. @public returned by attractionWindowedRun */
export interface AttractionWindowedRun {
    /** The window loop's accumulated force. */
    readonly windowed: F32;
    /** The one-dispatch force over [0, arcCount). */
    readonly direct: F32;
    /** windowed against direct: bitwise on a row one window holds, the analytic bound on a split row. */
    readonly report: CheckReport;
    /** How many rows two or more windows hold (the accumulate path). */
    readonly splitRows: number;
}

/**
 * The stride-4 positions the K2 kernel reads (xyz + mass 1 in w) from a stride-3 start.
 * @param start - stride-3 scene positions
 * @param n - node count
 * @returns stride-4 positions
 */
function packVec4(start: F32, n: number): Float32Array<ArrayBuffer> {
    const out = new Float32Array(4 * n);
    for (let i = 0; i < n; i++) {
        out[4 * i] = start[3 * i];
        out[4 * i + 1] = start[3 * i + 1];
        out[4 * i + 2] = start[3 * i + 2];
        out[4 * i + 3] = 1;
    }
    return out;
}

/**
 * The windowed leg: the TIER 0 `fa2-attraction` kernel (USE_PERM false, HAS_WEIGHTS false, the FA2 linear law)
 * dispatched once over every arc and once per window of `arcsPerWindow` arcs (arcBase = start, arcEnd = end,
 * accumulate = 1, rows rowFirst..rowLast through tierStart / tierEnd, a poison tail after every window copy), all
 * recorded into one pass; windowed against direct per row (see the file header).
 * @param ctx - the context
 * @param s - the snapshot
 * @param start - stride-3 positions (scene units; the kernel is dispatched directly, so units are irrelevant)
 * @param arcsPerWindow - arcs per window
 * @param label - the report label
 * @returns both results and the report
 */
export async function attractionWindowedRun(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    arcsPerWindow: number,
    label: string,
): Promise<AttractionWindowedRun> {
    const n = s.nodeCount;
    const { arcCount } = s;
    if (n === 0 || arcCount === 0) {
        throw new Error("attractionWindowedRun: the snapshot needs nodes and arcs");
    }
    const kernel = await ctx.pipelines.kernel(
        kernelSpec("fa2-attraction", {
            LINLOG: false,
            DISTRIBUTED: false,
            TIER: 0,
            LAW: 0,
            USE_PERM: false,
            HAS_WEIGHTS: false,
        }),
    );
    const rowPtrBuf = uploadBuffer(ctx, s.rowPtr, `${label}/rowPtr`);
    const colIdxBuf = uploadBuffer(ctx, s.colIdx, `${label}/colIdx`);
    const posBuf = uploadBuffer(ctx, packVec4(start, n), `${label}/pos`);
    const direct = scratchBuffer(ctx, 12 * n, `${label}/direct`);
    const windowed = scratchBuffer(ctx, 12 * n, `${label}/windowed`);
    const owned: GPUBuffer[] = [rowPtrBuf, colIdxBuf, posBuf, direct, windowed];
    const pooled: GPUBuffer[] = [];
    const rowPtr = bindingOf(rowPtrBuf);
    const pos = bindingOf(posBuf);
    const windows = windowsOf(s.rowPtr, n, arcCount, arcsPerWindow);
    const seen = new Uint32Array(n);
    for (const w of windows) {
        for (let i = w.rowFirst; i <= w.rowLast; i++) {
            seen[i]++;
        }
    }
    const bounds = new Float64Array(n);
    let splitRows = 0;
    for (let i = 0; i < n; i++) {
        if (seen[i] > 1) {
            splitRows++;
            bounds[i] = attractionBound(s.rowPtr[i + 1] - s.rowPtr[i]);
        }
    }
    const dispatch = (
        pass: GPUComputePassEncoder,
        colIdx: Binding,
        force: Binding,
        rows: { readonly first: number; readonly end: number },
        window: { readonly arcBase: number; readonly arcEnd: number; readonly accumulate: number },
    ): void => {
        const params = ctx.pool.acquire(
            FA2_PARAMS.byteLength,
            BufferUsage.UNIFORM | BufferUsage.COPY_DST,
            `${label}/params`,
        );
        pooled.push(params);
        const bytes = new ArrayBuffer(FA2_PARAMS.byteLength);
        FA2_PARAMS.write(new DataView(bytes), {
            n,
            dim: 2,
            tierStart: rows.first,
            tierEnd: rows.end,
            arcBase: window.arcBase,
            arcEnd: window.arcEnd,
            accumulate: window.accumulate,
            hiEnd: 0,
            midEnd: 0,
        });
        ctx.device.queue.writeBuffer(params, 0, bytes);
        const bound = kernel.bind({
            rowPtr,
            colIdx,
            weights: colIdx,
            perm: rowPtr,
            pos,
            force,
            P: { buffer: params, offset: 0, size: FA2_PARAMS.byteLength, window: null },
        });
        kernel.dispatch(pass, bound, plan1d(rows.end - rows.first, ctx.workgroupSize, ctx.caps), [0]);
    };
    try {
        const encoder = ctx.device.createCommandEncoder({ label });
        const pass = encoder.beginComputePass({ label });
        dispatch(
            pass,
            bindingOf(colIdxBuf),
            bindingOf(direct),
            { first: 0, end: n },
            { arcBase: 0, arcEnd: arcCount, accumulate: 0 },
        );
        for (const w of windows) {
            const len = w.end - w.start;
            const words = new Uint32Array(len + POISON_TAIL);
            words.set(s.colIdx.subarray(w.start, w.end));
            words.fill(INVALID_INDEX, len);
            const win = uploadBuffer(ctx, words, `${label}/colIdx[${w.start},${w.end})`);
            owned.push(win);
            dispatch(
                pass,
                bindingOf(win),
                bindingOf(windowed),
                { first: w.rowFirst, end: w.rowLast + 1 },
                { arcBase: w.start, arcEnd: w.end, accumulate: 1 },
            );
        }
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        ctx.assertReady();
        const directOut = await readF32(ctx, direct, 3 * n);
        const windowedOut = await readF32(ctx, windowed, 3 * n);
        return {
            windowed: windowedOut,
            direct: directOut,
            report: attractionReport(windowedOut, directOut, bounds, label),
            splitRows,
        };
    } finally {
        for (const b of pooled) {
            ctx.pool.release(b);
        }
        for (const b of owned) {
            b.destroy();
        }
    }
}

/**
 * The window check the `tier0-rebase-ignored` row must break: the windowed leg over the undirected karate club
 * (156 arcs, three windows of 64, rows split at both boundaries) from the seeded parity start.
 * @param ctx - a fresh context (mutant or not)
 * @returns the worst error / bound ratio (< 1 on the real kernel; Infinity when a bitwise row differs)
 */
export async function attractionWindowedWorstFactor(ctx: GpuContext): Promise<number> {
    const s = paritySnapshot("karate", 1, false);
    try {
        const start = startPositions(s, BASE_OPTIONS, false);
        const run = await attractionWindowedRun(ctx, s, start, ARCS_PER_WINDOW, "attraction-windowed/karate");
        if (run.splitRows === 0) {
            throw new Error("attraction windowed precondition: a row must be split across two windows");
        }
        return run.report.worst;
    } finally {
        ctx.release(s);
    }
}
