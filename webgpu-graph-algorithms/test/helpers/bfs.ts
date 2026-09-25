/**
 * The breadth-first-search checks (design 8.4, 9.7; P8-T6 / P8-T7) shared by test/algorithms/bfs.test.ts and
 * test/sabotage/bfs.test.ts: the host's spelling of the two deterministic arrays PD-14 / PD-24 fix from a settled
 * depth array (`smallestParents`, the smallest predecessor one depth down; `sortedOrder`, the reached nodes by
 * (depth, index)), the level count, the one-workgroup `sssp-pred` run that proves the predecessor pass strides (rows
 * `WG` and up are reached only through `P.stride`), and the report the sabotage suite measures, bitwise
 * (ratioOf(|a - b|, 0): any mismatch is Infinity) over `depth`, `parent`, `order`, `visitedCount` and `levels` of the
 * 30 x 30 grid from its corner and the 500-node path from its LAST index (the last-row mutation of the predecessor
 * pass survives every other source), each traversed TWICE -- with the two-phase path forced (`fusedMax 0`, which is
 * what exercises `bfs-contract`: at the default threshold every level of these fixtures is below it and the contract
 * never runs) and with the fused path forced (`fusedMax U32_MAX`, which is what exercises `bfs-fused`) -- plus the
 * choice counters of rmat14 at the DEFAULT threshold against the oracle's level sizes (the only check that sees an
 * inverted threshold: both paths are exact, so no depth does), plus the one-workgroup `pred` words (the stride
 * mutation survives every traversal below the dispatch cap).
 */

import { type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

import { type BfsTuning, bfsWithTuning } from "../../src/algorithms/bfs.js";
import { FUSED_FRONTIER_MAX, U32_MAX } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { CommandBatch } from "../../src/kernel/batch.js";
import { plan1d } from "../../src/kernel/dispatch.js";
import { type UniformValues } from "../../src/kernel/struct-block.js";
import { UniformRing } from "../../src/kernel/uniform-ring.js";
import { FRONTIER_PARAMS, graphBindings, graphOverrides, kernelSpec } from "../../src/kernels.js";
import { type GpuBfsResult } from "../../src/types/traversal.js";
import { bfsOracle } from "../oracle/traversal.js";
import { levelsOf } from "./advance.js";
import { bindingOf, readU32, uploadBuffer } from "./device.js";
import { bitwiseReports } from "./frontier.js";
import { gridEdges, pathEdges, rmatEdges, snapshotOf } from "./graphs.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";

/** The two forced candidate rules the report traverses under: the two-phase path only, and the fused path only. */
const FORCED_PATHS: readonly (readonly [string, BfsTuning])[] = [
    ["two-phase", { fusedMax: 0 }],
    ["fused", { fusedMax: U32_MAX }],
];

/** The path the one-workgroup predecessor case walks: rows `WG` .. 999 are reached only by the stride. */
export const STRIDE_PATH_NODES = 1000;

/**
 * PD-24 on the host: `parent[v]` is the SMALLEST `u` with an arc `u -> v` and `depth[u] + 1 === depth[v]`;
 * `INVALID_INDEX` for the source (depth 0) and for an unreached node.
 * @param s - the snapshot
 * @param depth - the settled depths
 * @returns the expected `parent`
 */
export function smallestParents(s: GraphSnapshot, depth: U32): U32 {
    const n = s.nodeCount;
    const parent = new Uint32Array(n).fill(INVALID_INDEX);
    for (let u = 0; u < n; u++) {
        if (depth[u] === INVALID_INDEX) {
            continue;
        }
        for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
            const v = s.colIdx[a];
            if (depth[v] !== 0 && depth[v] === depth[u] + 1 && u < parent[v]) {
                parent[v] = u;
            }
        }
    }
    return parent;
}

/**
 * PD-14 on the host: the reached nodes grouped by depth, ascending by index within a depth.
 * @param depth - the settled depths
 * @returns the expected `order`
 */
export function sortedOrder(depth: U32): U32 {
    const reached: number[] = [];
    for (let v = 0; v < depth.length; v++) {
        if (depth[v] !== INVALID_INDEX) {
            reached.push(v);
        }
    }
    reached.sort((a, b) => depth[a] - depth[b] || a - b);
    return Uint32Array.from(reached);
}

/**
 * `max depth + 1` over the reached nodes (1 for a source with no out-arcs).
 * @param depth - the settled depths
 * @returns the expected `levels`
 */
export function levelCountOf(depth: U32): number {
    let max = 0;
    for (const d of depth) {
        if (d !== INVALID_INDEX && d > max) {
            max = d;
        }
    }
    return max + 1;
}

/**
 * `sssp-pred` in `MODE 1` bound by hand over ONE workgroup (`plan1d(WG, WG, caps)`) with `dist` the oracle's depths of
 * `pathEdges(1000)` from source 0, `pred` filled with `INVALID_INDEX` and `P.stride = WG`: every row from `WG` up is
 * reached only by the stride, so a per-invocation body leaves it at `INVALID_INDEX`.
 * @param ctx - the context
 * @returns the `pred` buffer read back (1,000 words)
 */
export async function runPredOneWorkgroup(ctx: GpuContext): Promise<U32> {
    const s = snapshotOf(pathEdges(STRIDE_PATH_NODES), { label: "bfs-stride-path" });
    const n = s.nodeCount;
    const want = bfsOracle(s, 0);
    const dist = uploadBuffer(ctx, want.depth, "bfs-stride/dist");
    const pred = uploadBuffer(ctx, new Uint32Array(n).fill(INVALID_INDEX), "bfs-stride/pred");
    const ring = new UniformRing(ctx.device, ctx.allocator, 1, "bfs-stride/ring");
    try {
        const core = ctx.residency.core(s);
        const wg = ctx.workgroupSize;
        const kernel = await ctx.pipelines.kernel(kernelSpec("sssp-pred", { ...graphOverrides(core, null), MODE: 1 }));
        ring.write(0, FRONTIER_PARAMS, {
            n,
            wg,
            stride: wg,
            predKind: 1,
            source: 0,
            arcBase: 0,
            arcEnd: s.arcCount,
        });
        const bound = kernel.bind({
            ...graphBindings(core, null),
            dist: bindingOf(dist),
            pred: bindingOf(pred),
            P: ring.binding(FRONTIER_PARAMS),
        });
        const batch = new CommandBatch(ctx, "bfs-stride");
        const pass = batch.pass("pred");
        kernel.dispatch(pass, bound, plan1d(wg, wg, ctx.caps), [ring.offsetOf(0)]);
        ring.flush();
        await batch.submit().readback;
        return await readU32(ctx, pred, n);
    } finally {
        ring.destroy();
        dist.destroy();
        pred.destroy();
        ctx.release(s);
    }
}

/**
 * The five arrays and counts of one traversal against the oracle, every sample bitwise.
 * @param ctx - the context
 * @param label - the scenario
 * @param s - the snapshot
 * @param source - the source vertex
 * @param tuning - the candidate rule to traverse under
 * @returns the reports
 */
async function traversalReports(
    ctx: GpuContext,
    label: string,
    s: GraphSnapshot,
    source: number,
    tuning: BfsTuning,
): Promise<CheckReport[]> {
    const want = bfsOracle(s, source);
    let got: GpuBfsResult;
    try {
        got = await bfsWithTuning(ctx, s, source, undefined, tuning);
    } catch (err) {
        // the driver refuses a visitedCount above n as E_VALIDATION (a duplicate claim): the maximal miss of that word
        if (isWebGpuGraphError(err) && err.code === "E_VALIDATION") {
            return [{ worst: Infinity, worstLabel: `${label}.visitedCount (${err.message})`, samples: 1 }];
        }
        throw err;
    }
    return [
        ...bitwiseReports(`${label}.depth`, got.depth, want.depth),
        ...bitwiseReports(`${label}.parent`, got.parent, smallestParents(s, want.depth)),
        ...bitwiseReports(`${label}.order`, got.order, sortedOrder(want.depth)),
        {
            worst: ratioOf(Math.abs(got.visitedCount - want.visitedCount), 0),
            worstLabel: `${label}.visitedCount`,
            samples: 1,
        },
        {
            worst: ratioOf(Math.abs(got.levels - levelCountOf(want.depth)), 0),
            worstLabel: `${label}.levels`,
            samples: 1,
        },
    ];
}

/**
 * The choice counters of one traversal at the DEFAULT threshold against the oracle's level sizes (P8-T7 Step 4):
 * `fusedLevels` is the number of levels below `FUSED_FRONTIER_MAX`, `twoPhaseLevels` the number at or above it,
 * `bottomUpLevels` 0 (top-down only until P8-T8), and the three sum to the level word; the block is the one the
 * traversal's last submit left (the choice counters freeze at the done boundary). An E_VALIDATION from the driver
 * is the maximal miss, as in `traversalReports`.
 * @param ctx - the context
 * @param label - the scenario
 * @param s - the snapshot
 * @param source - the source vertex
 * @returns the reports
 */
async function choiceReports(ctx: GpuContext, label: string, s: GraphSnapshot, source: number): Promise<CheckReport[]> {
    const sizes = levelsOf(s, source).map((level) => level.length);
    const fused = sizes.filter((size) => size < FUSED_FRONTIER_MAX).length;
    const blocks: UniformValues[] = [];
    try {
        await bfsWithTuning(ctx, s, source, undefined, {
            onLevel: (_level, block) => {
                blocks.push(block);
            },
        });
    } catch (err) {
        if (isWebGpuGraphError(err) && err.code === "E_VALIDATION") {
            return [{ worst: Infinity, worstLabel: `${label}.choices (${err.message})`, samples: 1 }];
        }
        throw err;
    }
    const block = blocks[blocks.length - 1];
    const words: (readonly [string, number])[] = [
        ["fusedLevels", fused],
        ["twoPhaseLevels", sizes.length - fused],
        ["bottomUpLevels", 0],
        ["level", sizes.length],
    ];
    return words.map(([name, want]) => ({
        worst: ratioOf(Math.abs(Number(block[name]) - want), 0),
        worstLabel: `${label}.${name}`,
        samples: 1,
    }));
}

/**
 * The sabotage check of `bfs-contract`, `bfs-fused`, `sssp-pred` in depth mode and the frontier selector (spec 11.9
 * item 1): the 30 x 30 grid from its corner and the 500-node path from its last index under each forced path, the
 * choice counters of rmat14 at the default threshold, and the one-workgroup predecessor pass, all bitwise against
 * the oracle and the host rules.
 * @param ctx - the context
 * @returns the report
 */
export async function bfsReport(ctx: GpuContext): Promise<CheckReport> {
    const reports: CheckReport[] = [];
    const grid = snapshotOf(gridEdges(30, 30), { label: "bfs-report-grid" });
    const path = snapshotOf(pathEdges(500), { label: "bfs-report-path" });
    for (const [name, tuning] of FORCED_PATHS) {
        reports.push(...(await traversalReports(ctx, `grid30/${name}`, grid, 0, tuning)));
        reports.push(...(await traversalReports(ctx, `path500-last/${name}`, path, path.nodeCount - 1, tuning)));
    }
    ctx.release(grid);
    ctx.release(path);
    const rmat = snapshotOf(rmatEdges(14, 10, 7), { label: "bfs-report-rmat14" });
    reports.push(...(await choiceReports(ctx, "rmat14", rmat, 0)));
    ctx.release(rmat);
    const pred = await runPredOneWorkgroup(ctx);
    const wantPred = new Uint32Array(STRIDE_PATH_NODES).fill(INVALID_INDEX);
    for (let v = 1; v < STRIDE_PATH_NODES; v++) {
        wantPred[v] = v - 1;
    }
    reports.push(...bitwiseReports("one-workgroup.pred", pred, wantPred));
    return mergeReports(reports);
}
