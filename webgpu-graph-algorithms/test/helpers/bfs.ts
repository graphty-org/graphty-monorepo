/**
 * The breadth-first-search checks (design 8.4, 9.7; P8-T6 / P8-T7 / P8-T8) shared by test/algorithms/bfs.test.ts
 * and test/sabotage/bfs.test.ts: the host's spelling of the two deterministic arrays PD-14 / PD-24 fix from a
 * settled depth array (`smallestParents`, the smallest predecessor one depth down; `sortedOrder`, the reached nodes
 * by (depth, index)), the level count, the oracle's per-level statistics and the host replay of Beamer's rule
 * (`levelStatsOf`, `directionModel`, `unvisitedListLenAt`), the one-workgroup `sssp-pred` run that proves the
 * predecessor pass strides (rows `WG` and up are reached only through `P.stride`), and the report the sabotage
 * suite measures, bitwise (ratioOf(|a - b|, 0): any mismatch is Infinity): `depth`, `parent`, `order`,
 * `visitedCount` and `levels` of the 30 x 30 grid from its corner and the 500-node path from its LAST index (the
 * last-row mutation of the predecessor pass survives every other source), each traversed TWICE top-down only --
 * with the two-phase path forced (`fusedMax 0`, which is what exercises `bfs-contract`: at the default threshold
 * every level of these fixtures is below it and the contract never runs) and with the fused path forced (`fusedMax
 * U32_MAX`, which is what exercises `bfs-fused`); the choice counters of rmat14 at the DEFAULT threshold, top-down
 * only, against the oracle's level sizes (the only check that sees an inverted threshold: both paths are exact, so
 * no depth does); rmat14 under the default direction rule at the production cadence and at cadence 1, every
 * per-submit `direction`, `unvisitedCount`, `unvisitedDegreeSum` and `switches` word against the host model,
 * `unvisitedListLen` against the oracle's complement and `compactCount` against that word, `depth` against the
 * oracle (the only checks that see an inverted growing test); the 500-node path from its MIDDLE and the hub-clique
 * fixture (source 0, hubs 1 and 2, a clique on 3..255) forced bottom-up (`alpha U32_MAX, beta 0`: every growing
 * boundary switches and nothing switches back), which is what exercises `bfs-bottom-up` and `bfs-bitset-build`,
 * with the clique's `arcsScanned` allowed ONE extra read per bottom-up claim (each clique row's first in-neighbour
 * is hub 1, so the early exit reads exactly one arc per claim; without it every 254-arc row is read whole); the
 * directed path's unvisited words (the in-degree of vertex 0 is 0 where its out-degree is 1, which is what catches
 * an in-degree summed for an out-degree); and the one-workgroup `pred` words (the stride mutation survives every
 * traversal below the dispatch cap).
 */

import { type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

import { type BfsTuning, bfsWithTuning } from "../../src/algorithms/bfs.js";
import { BEAMER_BETA, FUSED_FRONTIER_MAX, MAX_LEVELS_PER_SUBMIT, U32_MAX } from "../../src/constants.js";
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
import { type EdgeSpec, gridEdges, pathEdges, rmatEdges, snapshotOf } from "./graphs.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";
import { expectedDirections } from "./traversal-check.js";

/** The two forced candidate rules the report traverses under, top-down only: the two-phase path only, and the fused path only. */
const FORCED_PATHS: readonly (readonly [string, BfsTuning])[] = [
    ["two-phase", { fusedMax: 0, direction: "top-down" }],
    ["fused", { fusedMax: U32_MAX, direction: "top-down" }],
];

/** Every growing boundary switches to bottom-up (`m_u / U32_MAX` is 0) and nothing switches back before the frontier shrinks (P8-T8 Step 6). */
const FORCED_BOTTOM_UP: BfsTuning = { alpha: U32_MAX, beta: 0 };

/** The hub-clique fixture's last vertex: 0 the source, 1 and 2 the hubs, 3..255 the clique. */
const CLIQUE_LAST = 255;

/**
 * P8-T8 Step 6's fixture: source 0 joined to hubs 1 and 2, both hubs joined to every clique vertex, and every pair
 * of 3..255 joined; undirected. Level 0 claims the hubs top-down; the level-1 boundary sees a growing frontier
 * and goes bottom-up under FORCED_BOTTOM_UP; each clique vertex's reverse row is sorted (graph-format I4), so its
 * FIRST in-neighbour is hub 1, in the frontier bits: the sweep claims all 253 with 253 reads, and without the early
 * exit with 253 x 254.
 * @returns the edges
 */
function hubCliqueEdges(): EdgeSpec[] {
    const edges: EdgeSpec[] = [
        [0, 1],
        [0, 2],
    ];
    for (let v = 3; v <= CLIQUE_LAST; v++) {
        edges.push([1, v], [2, v]);
    }
    for (let a = 3; a <= CLIQUE_LAST; a++) {
        for (let b = a + 1; b <= CLIQUE_LAST; b++) {
            edges.push([a, b]);
        }
    }
    return edges;
}

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
 * The oracle's per-level frontier sizes and out-degree sums from a settled depth array (level 0 the source alone):
 * what `frontier-finalize` sees as `next` and as the previous level's `frontierDegreeSum`.
 * @param s - the snapshot
 * @param depth - the settled depths
 * @returns the sizes and the out-degree sums, indexed by level
 */
function levelStatsOf(s: GraphSnapshot, depth: U32): { readonly sizes: number[]; readonly degreeSums: number[] } {
    const sizes: number[] = [];
    const degreeSums: number[] = [];
    for (let v = 0; v < depth.length; v++) {
        const d = depth[v];
        if (d === INVALID_INDEX) {
            continue;
        }
        while (sizes.length <= d) {
            sizes.push(0);
            degreeSums.push(0);
        }
        sizes[d] += 1;
        degreeSums[d] += s.rowPtr[v + 1] - s.rowPtr[v];
    }
    return { sizes, degreeSums };
}

/**
 * Beamer's rule replayed for one run (P8-T8 Step 5): `expectedDirections` over the oracle's level statistics with
 * the alpha, beta, cadence and mode the driver would use under `tuning`.
 * @param s - the snapshot
 * @param depth - the oracle's depths under the run's cap
 * @param tuning - the run's tuning (alpha, beta, levelsPerSubmit, direction; the rest is ignored)
 * @param maxDepth - the run's raw `maxDepth`
 * @returns the boundaries the model predicts
 */
export function directionModel(
    s: GraphSnapshot,
    depth: U32,
    tuning: BfsTuning,
    maxDepth?: number,
): ReturnType<typeof expectedDirections> {
    const { sizes, degreeSums } = levelStatsOf(s, depth);
    return expectedDirections(
        sizes,
        degreeSums,
        s.nodeCount,
        s.arcCount,
        tuning.alpha ?? Math.max(1, Math.floor(s.arcCount / s.nodeCount)),
        tuning.beta ?? BEAMER_BETA,
        tuning.levelsPerSubmit ?? MAX_LEVELS_PER_SUBMIT,
        maxDepth,
        tuning.direction === "top-down",
    );
}

/**
 * `unvisitedListLen` as the rebuild at the top of a submit counts it: the vertices still unclaimed once every level
 * through `claimedThrough` is claimed, minus those with in-degree 0 (which no sweep could ever claim).
 * @param s - the snapshot
 * @param depth - the oracle's depths
 * @param claimedThrough - the last level claimed when the rebuild runs (`k x levelsPerSubmit` for submit k)
 * @returns the list length
 */
export function unvisitedListLenAt(s: GraphSnapshot, depth: U32, claimedThrough: number): number {
    const inDegree = s.inDegree();
    let len = 0;
    for (let v = 0; v < depth.length; v++) {
        if ((depth[v] === INVALID_INDEX || depth[v] > claimedThrough) && inDegree[v] !== 0) {
            len += 1;
        }
    }
    return len;
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
 * The choice counters of one traversal at the DEFAULT threshold, top-down only, against the oracle's level sizes
 * (P8-T7 Step 4): `fusedLevels` is the number of levels below `FUSED_FRONTIER_MAX`, `twoPhaseLevels` the number at or
 * above it, `bottomUpLevels` 0 (the bottom-up candidate disabled), and the three sum to the level word; the block is the one the
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
            direction: "top-down",
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

/** One `onLevel` call: the block as the submit left it and the total compact wrote at its top. */
interface SubmitBlock {
    readonly block: UniformValues;
    readonly compactCount: number;
}

/**
 * One traversal under a direction rule (P8-T8 Step 5), every per-submit word of the block against the host model
 * of Beamer's rule: `direction`, `unvisitedCount`, `unvisitedDegreeSum` and `switches` against the model's boundary
 * the submit ended on, `unvisitedListLen` against the oracle's complement at the submit's rebuild, `compactCount`
 * against that word, `depth` against the oracle, and the result's `switches` and `bottomUpLevels` against the
 * model's totals; a `maxDepth` option runs the oracle and the model under the same cap. An E_VALIDATION from the
 * driver is the maximal miss, as in `traversalReports`.
 * @param ctx - the context
 * @param label - the scenario
 * @param s - the snapshot
 * @param source - the source vertex
 * @param tuning - the direction rule (alpha, beta, direction, levelsPerSubmit)
 * @param maxDepth - the run's cap, if any
 * @returns the reports and the traversal's last block (null after an E_VALIDATION)
 */
async function directionReports(
    ctx: GpuContext,
    label: string,
    s: GraphSnapshot,
    source: number,
    tuning: BfsTuning,
    maxDepth?: number,
): Promise<{ readonly reports: CheckReport[]; readonly last: UniformValues | null }> {
    const want = bfsOracle(s, source, maxDepth);
    const model = directionModel(s, want.depth, tuning, maxDepth);
    const cadence = tuning.levelsPerSubmit ?? MAX_LEVELS_PER_SUBMIT;
    const submits: SubmitBlock[] = [];
    let got: GpuBfsResult;
    try {
        got = await bfsWithTuning(ctx, s, source, maxDepth === undefined ? undefined : { maxDepth }, {
            ...tuning,
            onLevel: (_level, block, _frontier, compactCount) => {
                submits.push({ block, compactCount });
            },
        });
    } catch (err) {
        if (isWebGpuGraphError(err) && err.code === "E_VALIDATION") {
            return {
                reports: [{ worst: Infinity, worstLabel: `${label}.direction (${err.message})`, samples: 1 }],
                last: null,
            };
        }
        throw err;
    }
    const reports: CheckReport[] = bitwiseReports(`${label}.depth`, got.depth, want.depth);
    const sample = (name: string, actual: number, expected: number): void => {
        reports.push({ worst: ratioOf(Math.abs(actual - expected), 0), worstLabel: `${label}.${name}`, samples: 1 });
    };
    submits.forEach(({ block, compactCount }, k) => {
        const boundary = model[Math.min(model.length - 1, (k + 1) * cadence - 1)];
        sample(`submit${k}.direction`, Number(block.direction), boundary.direction);
        sample(`submit${k}.unvisitedCount`, Number(block.unvisitedCount), boundary.unvisitedCount);
        sample(`submit${k}.unvisitedDegreeSum`, Number(block.unvisitedDegreeSum), boundary.unvisitedDegreeSum);
        sample(`submit${k}.switches`, Number(block.switches), boundary.switches);
        sample(
            `submit${k}.unvisitedListLen`,
            Number(block.unvisitedListLen),
            unvisitedListLenAt(s, want.depth, k * cadence),
        );
        sample(`submit${k}.compactCount`, compactCount, Number(block.unvisitedListLen));
    });
    const last = model[model.length - 1];
    sample("switches", got.switches, last.switches);
    const bottomUpLevels = model.filter((b) => b.direction === 1 && !b.done).length;
    const lastBlock = submits[submits.length - 1].block;
    sample("bottomUpLevels", Number(lastBlock.bottomUpLevels), bottomUpLevels);
    return { reports, last: lastBlock };
}

/**
 * The sabotage check of `bfs-contract`, `bfs-fused`, `sssp-pred` in depth mode, `bfs-bottom-up`, `bfs-bitset-build`,
 * `bfs-unvisited-flags` and the frontier selector (spec 11.9 item 1): the 30 x 30 grid from its corner and the
 * 500-node path from its last index under each forced path, the choice counters of rmat14 at the default threshold,
 * rmat14's direction and unvisited words under the default rule at both cadences, the path from its middle and the
 * hub-clique fixture forced bottom-up (the clique's `arcsScanned` allowed one extra read per claim), the directed
 * path's unvisited words, and the one-workgroup predecessor pass, all bitwise against the oracle and the host rules.
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
    // P8-T8: the path from its middle is bottom-up from level 1 on (growing once, never shrinking) under the forced rule
    const middle = Math.floor(path.nodeCount / 2);
    reports.push(...(await directionReports(ctx, "path500-mid/bottom-up", path, middle, FORCED_BOTTOM_UP)).reports);
    ctx.release(path);
    const rmat = snapshotOf(rmatEdges(14, 10, 7), { label: "bfs-report-rmat14" });
    reports.push(...(await choiceReports(ctx, "rmat14", rmat, 0)));
    // P8-T8: the default rule at the production cadence and at cadence 1 against the host model
    reports.push(...(await directionReports(ctx, "rmat14/auto", rmat, 0, {})).reports);
    reports.push(...(await directionReports(ctx, "rmat14/auto-cadence-1", rmat, 0, { levelsPerSubmit: 1 })).reports);
    ctx.release(rmat);
    // P8-T8 Step 6: the early exit's witness -- one read per bottom-up claim on the hub-clique fixture, each claim
    // allowed one extra read (arcsScanned <= 2 x claimed); maxDepth 4 bounds a mutant that re-claims stale entries
    const clique = snapshotOf(hubCliqueEdges(), { label: "bfs-report-hub-clique" });
    const cliqueRun = await directionReports(ctx, "hub-clique/bottom-up", clique, 0, FORCED_BOTTOM_UP, 4);
    reports.push(...cliqueRun.reports);
    if (cliqueRun.last !== null) {
        const want = bfsOracle(clique, 0, 4);
        const { sizes } = levelStatsOf(clique, want.depth);
        const model = directionModel(clique, want.depth, FORCED_BOTTOM_UP, 4);
        const claimed = model.reduce(
            (sum, b, level) => sum + (b.direction === 1 && !b.done ? (sizes[level + 1] ?? 0) : 0),
            0,
        );
        reports.push({
            worst: ratioOf(Math.max(0, Number(cliqueRun.last.arcsScanned) - claimed), claimed),
            worstLabel: `hub-clique/bottom-up.arcsScanned (${Number(cliqueRun.last.arcsScanned)} reads for ${claimed} claims)`,
            samples: 1,
        });
    }
    ctx.release(clique);
    // P8-T8 Step 6: the directed path's unvisited words (vertex 0's in-degree 0 differs from its out-degree 1)
    const directed = snapshotOf(pathEdges(500), { directed: true, label: "bfs-report-path-directed" });
    reports.push(...(await directionReports(ctx, "path500-directed", directed, 0, {})).reports);
    ctx.release(directed);
    const pred = await runPredOneWorkgroup(ctx);
    const wantPred = new Uint32Array(STRIDE_PATH_NODES).fill(INVALID_INDEX);
    for (let v = 1; v < STRIDE_PATH_NODES; v++) {
        wantPred[v] = v - 1;
    }
    reports.push(...bitwiseReports("one-workgroup.pred", pred, wantPred));
    return mergeReports(reports);
}
