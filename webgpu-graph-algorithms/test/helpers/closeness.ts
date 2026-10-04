/**
 * The closeness checks shared by test/algorithms/closeness.test.ts and test/sabotage/closeness.test.ts.
 *
 * The level route is run through the driver's `onBatch` seam, which hands over every source's exact sum of
 * distances and the nodes it reached, folded from the per-level count table; each fixture runs three ways -- the
 * per-level choice, push forced (`pullAt` never reached) and pull forced (`pullAt` 0) -- so both steps of
 * `closeness-level` are checked on every graph. The fixtures: karate, the 70-node path (deep, partial batches at one
 * word per node), the funnel (one vertex claimed concurrently from many frontier entries, the shape that catches a
 * claim counted without its `atomicOr` result), a star (a hub that pulls from every leaf: the early exit) and a
 * seeded directed graph (the pull walks the reverse adjacency). The all-pairs route's `closeness-rowsum` is checked
 * bitwise against an emulation of its f32 tree reduction over the blocked f32 Floyd-Warshall reference, in its three
 * roles. A sampled karate run (a source listed twice) is checked against the CPU port. Every comparison is bitwise
 * (ratioOf(|a - b|, 0): any mismatch is Infinity); a driver refusal is the maximal miss.
 */

import { closenessCentrality as cpuClosenessCentrality } from "@graphty/algorithms";
import { type F32, type GraphSnapshot } from "@graphty/graph-format";

import { type ClosenessTuning, closenessWithTuning } from "../../src/algorithms/closeness.js";
import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { type ClosenessAcceleratorOptions, type HitsOptionsLike } from "../../src/types/accelerator.js";
import { type GpuClosenessResult } from "../../src/types/algorithms.js";
import { type GpuRunOptions } from "../../src/types/run.js";
import { closenessOracle } from "../oracle/traversal.js";
import { blockedF32 } from "./all-pairs.js";
import { bitwiseReports } from "./frontier.js";
import { type EdgeSpec, KARATE_EDGES, pathEdges, randomEdges, snapshotOf, starEdges } from "./graphs.js";
import { type CheckReport, mergeReports } from "./sabotage.js";
import { weightedEdges } from "./sssp.js";

/** One run of the level route with every source's exact sum and reached count. */
export interface LevelRun {
    readonly result: GpuClosenessResult;
    /** `sum[v]`: the exact sum of the distances from `v`. */
    readonly sum: Float64Array;
    /** `reached[v]`: the nodes `v` reached. */
    readonly reached: Uint32Array;
}

/** The three ways the level route runs every fixture: the per-level choice, push only, pull only. */
export const STEPS: readonly (readonly [string, ClosenessTuning])[] = [
    ["auto", {}],
    ["push", { pullAt: 0xffffffff }],
    ["pull", { pullAt: 0 }],
];

/**
 * The level route, forced, through the `onBatch` seam.
 * @param ctx - the context
 * @param s - the snapshot
 * @param options - the run's options
 * @param tuning - the run's tuning (`route` and `onBatch` are this helper's)
 * @returns the run
 */
export async function runLevels(
    ctx: GpuContext,
    s: GraphSnapshot,
    options?: ClosenessAcceleratorOptions & HitsOptionsLike & GpuRunOptions,
    tuning?: Omit<ClosenessTuning, "onBatch" | "route">,
): Promise<LevelRun> {
    const n = s.nodeCount;
    const sum = new Float64Array(n);
    const reached = new Uint32Array(n);
    const result = await closenessWithTuning(ctx, s, options, {
        ...tuning,
        route: "levels",
        onBatch: (batchStart, sums, counts) => {
            sum.set(sums, batchStart);
            reached.set(counts, batchStart);
        },
    });
    return { result, sum, reached };
}

/**
 * The funnel: `0 -- i` and `i -- k + 1` for `i` in 1..k (undirected, `k + 2` nodes). From source 0 the level-1
 * frontier is the whole middle layer and every one of its `k` rows reaches `k + 1` in the same push level.
 * @param k - the middle layer's size
 * @returns the edges
 */
export function funnelEdges(k: number): EdgeSpec[] {
    const edges: EdgeSpec[] = [];
    for (let i = 1; i <= k; i++) {
        edges.push([0, i]);
    }
    for (let i = 1; i <= k; i++) {
        edges.push([i, k + 1]);
    }
    return edges;
}

/**
 * What `closeness-rowsum` returns for one row, emulated in the device's order: lane `l` adds columns `l, l + wg, ...`
 * in f32 (integers for hop counts), then the tree halves the lanes.
 * @param dist - the row-major blocked f32 matrix
 * @param n - the node count
 * @param row - the row
 * @param role - 0 hop counts, 1 f32 distances, 2 reciprocals
 * @param wg - the workgroup size
 * @returns the row's sum
 */
function emulateRow(dist: Float64Array, n: number, row: number, role: number, wg: number): number {
    const lanes = new Float64Array(wg);
    const add = (a: number, b: number): number => (role === 0 ? a + b : Math.fround(a + b));
    for (let lane = 0; lane < wg; lane++) {
        for (let c = lane; c < n; c += wg) {
            const d = dist[row * n + c];
            if (c === row || d === Infinity) {
                continue;
            }
            if (role === 2) {
                if (d > 0) {
                    lanes[lane] = add(lanes[lane], Math.fround(1 / d));
                }
            } else {
                lanes[lane] = add(lanes[lane], d);
            }
        }
    }
    for (let stride = wg / 2; stride >= 1; stride /= 2) {
        for (let lane = 0; lane < stride; lane++) {
            lanes[lane] = add(lanes[lane], lanes[lane + stride]);
        }
    }
    return lanes[0];
}

/**
 * The scores the all-pairs route must return, bitwise: the emulated row sums turned into scores and stored as f32.
 * @param s - the snapshot
 * @param weighted - whether the sweep sums the weights
 * @param harmonic - whether the rows sum reciprocals
 * @param wg - the workgroup size
 * @returns the expected scores
 */
export function allPairsScores(s: GraphSnapshot, weighted: boolean, harmonic: boolean, wg: number): F32 {
    const n = s.nodeCount;
    const dist = blockedF32(s, weighted);
    const role = harmonic ? 2 : Number(weighted);
    return Float32Array.from({ length: n }, (_, row): number => {
        const sum = emulateRow(dist, n, row, role, wg);
        return harmonic || sum === 0 ? sum : 1 / sum;
    });
}

/**
 * One level run against the oracle, every sample bitwise.
 * @param label - the scenario
 * @param run - the run
 * @param want - the oracle's answer
 * @returns the reports
 */
function levelReports(label: string, run: LevelRun, want: ReturnType<typeof closenessOracle>): CheckReport[] {
    return [
        ...bitwiseReports(`${label}.reached`, run.reached, want.reached),
        ...bitwiseReports(`${label}.sum`, run.sum, want.sum),
        ...bitwiseReports(`${label}.scores`, run.result.scores, Float32Array.from(want.scores)),
    ];
}

/** The level fixtures of the report. */
function levelFixtures(): readonly { readonly label: string; readonly s: GraphSnapshot }[] {
    return [
        { label: "karate", s: snapshotOf(KARATE_EDGES, { label: "closeness-report-karate" }) },
        { label: "path70", s: snapshotOf(pathEdges(70), { label: "closeness-report-path70" }) },
        { label: "funnel200", s: snapshotOf(funnelEdges(200), { label: "closeness-report-funnel" }) },
        { label: "star300", s: snapshotOf(starEdges(300), { label: "closeness-report-star" }) },
        {
            label: "directed120",
            s: snapshotOf(randomEdges(120, 360, 5), {
                nodeCount: 120,
                directed: true,
                label: "closeness-report-directed",
            }),
        },
    ];
}

/**
 * The run of one check, a refusal turned into the maximal miss.
 * @param label - the scenario
 * @param run - the check
 * @returns its reports
 */
async function guarded(label: string, run: () => Promise<CheckReport[]>): Promise<CheckReport[]> {
    try {
        return await run();
    } catch (err) {
        if (isWebGpuGraphError(err) && err.code === "E_VALIDATION") {
            return [{ worst: Infinity, worstLabel: `${label} (${err.message})`, samples: 1 }];
        }
        throw err;
    }
}

/**
 * The sabotage check of the two closeness kernels: every level fixture three ways (the per-level choice, push only,
 * pull only, the last at one word per node so the 70-node path spans three batches) against the oracle, a sampled
 * karate run against the CPU port, and the all-pairs row sums in their three roles against the emulation.
 * @param ctx - the context
 * @returns the report
 */
export async function closenessReport(ctx: GpuContext): Promise<CheckReport> {
    const reports: CheckReport[] = [];
    for (const { label, s } of levelFixtures()) {
        const want = closenessOracle(s, false);
        for (const [step, tuning] of STEPS) {
            const words = step === "pull" ? { words: 1 } : {};
            reports.push(
                ...(await guarded(`${label}/${step}`, async () =>
                    levelReports(`${label}/${step}`, await runLevels(ctx, s, undefined, { ...tuning, ...words }), want),
                )),
            );
        }
        ctx.release(s);
    }
    const karate = snapshotOf(KARATE_EDGES, { label: "closeness-report-sampled" });
    const sources = [0, 33, 5, 5, 16];
    for (const [step, tuning] of STEPS) {
        reports.push(
            ...(await guarded(`sampled/${step}`, async () =>
                bitwiseReports(
                    `sampled/${step}.scores`,
                    (await closenessWithTuning(ctx, karate, { sources }, tuning)).scores,
                    Float32Array.from(cpuClosenessCentrality(karate, { sources }).scores),
                ),
            )),
        );
    }
    ctx.release(karate);
    const weighted = snapshotOf(weightedEdges(KARATE_EDGES, "integer", 3), { label: "closeness-report-weighted" });
    // five isolated nodes after the path: every row has unreachable entries
    const path = snapshotOf(pathEdges(70), { nodeCount: 75, label: "closeness-report-rows" });
    const rows: readonly [string, GraphSnapshot, boolean, boolean][] = [
        ["rows/hops", path, false, false],
        ["rows/weighted", weighted, true, false],
        ["rows/harmonic", weighted, true, true],
    ];
    for (const [label, s, isWeighted, harmonic] of rows) {
        reports.push(
            ...(await guarded(label, async () =>
                bitwiseReports(
                    `${label}.scores`,
                    (await closenessWithTuning(ctx, s, { weighted: isWeighted, harmonic }, { route: "all-pairs" }))
                        .scores,
                    allPairsScores(s, isWeighted, harmonic, ctx.workgroupSize),
                ),
            )),
        );
    }
    ctx.release(weighted);
    ctx.release(path);
    return mergeReports(reports);
}
