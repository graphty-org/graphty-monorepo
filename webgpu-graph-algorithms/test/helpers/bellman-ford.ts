/**
 * The Bellman-Ford checks (design 8.4, 9.7; P8-T10, the P8 plan's PD-12 / PD-27) shared by
 * test/algorithms/bellman-ford.test.ts and test/sabotage/bellman-ford.test.ts: the negative-weight fixture generators
 * (a directed DAG with negative arcs, a planted negative cycle reachable from the source, the same cycle unreachable,
 * a zero-weight cycle, the fan-in whose candidates land in one round, the rounded cycle PD-27 refuses) and the report the
 * sabotage suite measures, bitwise (ratioOf(|a - b|, 0): any mismatch is Infinity): the `dist` bit patterns against
 * the f32 Bellman-Ford oracle, `predArc` against the host's PD-27 tight-subgraph rule, `reachedCount` and the flag on
 * the uniform-weight grid from both corners and on the negative DAG, the flag on the planted cycle, and -- the row
 * the compare-exchange result guards -- the fan-in under a retry bound of ONE, where the real kernel's losing lanes
 * exhaust the bound (a failed exchange is a lost update the next round repairs, so `dist` never misses; only the
 * bound witnesses the contention) and a kernel that ignores the exchange result never does. A driver refusal is the
 * maximal miss.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { type BellmanFordTuning, bellmanFordWithTuning } from "../../src/algorithms/bellman-ford.js";
import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { type SsspOptions } from "../../src/types/accelerator.js";
import { bellmanFordOracle } from "../oracle/traversal.js";
import { bitwiseReports } from "./frontier.js";
import { type EdgeSpec, gridEdges, snapshotOf, xorshift } from "./graphs.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";
import { weightedEdges } from "./sssp.js";
import { predArcByRule } from "./traversal-check.js";

/**
 * A directed acyclic graph with negative arcs: `m` seeded arcs `u -> v` with `u < v` over `n` nodes, weights uniform
 * in [-3, 10), plus the arc `0 -> 1` at -3 so some distance is negative; acyclic by construction, so no negative
 * cycle exists.
 * @param n - the node count
 * @param m - the arc count (beyond the fixed first arc)
 * @param seed - the generator seed
 * @returns the edges
 */
export function negativeDag(n: number, m: number, seed: number): EdgeSpec[] {
    const random = xorshift(seed);
    const edges: EdgeSpec[] = [[0, 1, -3]];
    const seen = new Set<number>([1]);
    while (edges.length < m + 1) {
        const u = Math.floor(random() * (n - 1));
        const v = u + 1 + Math.floor(random() * (n - 1 - u));
        const key = u * n + v;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        edges.push([u, v, -3 + 13 * random()]);
    }
    return edges;
}

/** The directed integer-weight 30 x 30 grid every cycle fixture is built on (900 nodes, all reachable from 0). */
function directedGridBase(): EdgeSpec[] {
    return weightedEdges(gridEdges(30, 30), "integer", 2);
}

/**
 * The grid plus a three-node cycle at nodes 900, 901, 902 whose weights sum to `sum - 1 - 1` (1, 1, `sum - 2`), joined
 * to the grid's corner by `0 -> 900` at weight 1 when `reachable`.
 * @param sum - the cycle's total weight (negative plants a negative cycle, 0 a zero cycle)
 * @param reachable - whether the cycle hangs off the source's component
 * @returns the edges (node count 903)
 */
export function gridWithCycle(sum: number, reachable: boolean): EdgeSpec[] {
    const edges = directedGridBase();
    if (reachable) {
        edges.push([0, 900, 1]);
    }
    edges.push([900, 901, 1], [901, 902, 1], [902, 900, sum - 2]);
    return edges;
}

/** The node count of every `gridWithCycle` fixture. */
export const GRID_WITH_CYCLE_NODES = 903;

/**
 * The fan-in: `0 -> i` at weight 1 for `i` in 1..k and `i -> k + 1` at weight `i`, so the `k` candidates for node
 * `k + 1` (`1 + i`, distinct, ascending with the edge index, the smallest first) all land in the same round from `k`
 * adjacent lanes (directed, `k + 2` nodes; a weight of 1 everywhere would be the unit-weight BFS route and never
 * reach the kernel). The lanes of one SIMD group load `+Inf` together and exchange one after another, so every lane
 * but the first fails its exchange: under a retry bound of one they exhaust it (measured on lavapipe and the RTX
 * 4070 SUPER: exactly one batch for every k from 8 to 4,096), and under the default bound the reloaded value is the
 * smallest candidate, so no lane retries past its first failure. The DESCENDING order is the adversarial one (each
 * winner is the largest remaining candidate): a 32-lane subgroup then needs 31 attempts, above the default bound,
 * which the driver survives by running on; it is not used here.
 * @param k - the fan width
 * @returns the edges
 */
export function fanIn(k: number): EdgeSpec[] {
    const edges: EdgeSpec[] = [];
    for (let i = 1; i <= k; i++) {
        edges.push([0, i, 1]);
    }
    for (let i = 1; i <= k; i++) {
        edges.push([i, k + 1, i]);
    }
    return edges;
}

/**
 * PD-27's rounded cycle: `0 -> 1` at 2^24, `1 -> 2` at +1, `2 -> 1` at -1 (directed). In f32, `2^24 + 1` rounds to
 * `2^24` and `2^24 - 1` is exact, so the cycle improves `dist[1]` ONCE and stops: the f32 oracle settles at
 * `[0, 2^24 - 1, 2^24]` with the flag false, `0 -> 1` is no longer tight, and the tight subgraph never reaches node 1
 * (an orphan the driver refuses as `bellmanFord.roundedCycle`). The snapshot is frozen with `ROUNDED_CYCLE_NODES`
 * nodes: the improvement is the THIRD relaxation of a walk (`0 -> 1 -> 2 -> 1`), so with exactly three nodes the
 * device's `n - 1 = 2` synchronous rounds leave it to the decision round, which then reads it as a negative cycle
 * (an equally honest f32 answer, but a schedule-dependent one: a lane that runs after its source's lane settles it
 * a round earlier); five spare nodes give the rounds room to settle whatever the schedule.
 * @returns the edges
 */
export function roundedCycle(): EdgeSpec[] {
    return [
        [0, 1, 2 ** 24],
        [1, 2, 1],
        [2, 1, -1],
    ];
}

/** The node count the rounded cycle is frozen with (see `roundedCycle`). */
export const ROUNDED_CYCLE_NODES = 8;

/**
 * The f32 bit patterns of distances (the form PD-9 stores and the bitwise comparison reads).
 * @param values - the distances (any numeric array; each is rounded to f32 first)
 * @returns the bit patterns
 */
function bitsOf(values: ArrayLike<number>): Uint32Array {
    return new Uint32Array(Float32Array.from(values).buffer);
}

/**
 * One run's arrays, count and flag against the f32 oracle and the host's tight-subgraph rule, every sample bitwise;
 * a driver refusal is the maximal miss.
 * @param ctx - the context
 * @param label - the scenario
 * @param s - the snapshot
 * @param source - the source vertex
 * @param options - the run's options
 * @param tuning - the run's tuning
 * @returns the reports
 */
async function runReports(
    ctx: GpuContext,
    label: string,
    s: GraphSnapshot,
    source: number,
    options: SsspOptions | undefined,
    tuning: BellmanFordTuning,
): Promise<CheckReport[]> {
    const want = bellmanFordOracle(s, source, options?.weights);
    let run;
    try {
        run = await bellmanFordWithTuning(ctx, s, source, options, tuning);
    } catch (err) {
        if (isWebGpuGraphError(err) && (err.code === "E_VALIDATION" || err.code === "E_UNSUPPORTED")) {
            return [{ worst: Infinity, worstLabel: `${label}.dist (${err.message})`, samples: 1 }];
        }
        throw err;
    }
    const { result } = run;
    const reports: CheckReport[] = [
        {
            worst: ratioOf(Math.abs(Number(result.hasNegativeCycle) - Number(want.hasNegativeCycle)), 0),
            worstLabel: `${label}.hasNegativeCycle`,
            samples: 1,
        },
        {
            worst: ratioOf(Math.abs(result.reachedCount - want.reachedCount), 0),
            worstLabel: `${label}.reachedCount`,
            samples: 1,
        },
    ];
    if (!want.hasNegativeCycle) {
        reports.push(
            ...bitwiseReports(`${label}.dist`, bitsOf(result.dist), bitsOf(want.dist)),
            ...bitwiseReports(
                `${label}.predArc`,
                result.predArc,
                predArcByRule(result.dist, s, source, "tight", options?.weights),
            ),
        );
    }
    return reports;
}

/**
 * The sabotage check of `bf-relax` (spec 11.9 item 1): the uniform-weight grid from both corners (undirected: the
 * reverse direction of every edge), the negative DAG, the planted negative cycle (the flag), and the fan-in under a
 * retry bound of one (the compare-exchange result: the real kernel's losing lanes exhaust the bound at least once).
 * @param ctx - the context
 * @returns the report
 */
export async function bellmanFordReport(ctx: GpuContext): Promise<CheckReport> {
    const reports: CheckReport[] = [];
    const uniform = snapshotOf(weightedEdges(gridEdges(30, 30), "uniform", 11), { label: "bf-report-uniform" });
    reports.push(...(await runReports(ctx, "grid30-uniform", uniform, 0, undefined, {})));
    reports.push(...(await runReports(ctx, "grid30-uniform-last", uniform, 899, undefined, {})));
    ctx.release(uniform);
    const dag = snapshotOf(negativeDag(300, 1500, 13), { directed: true, label: "bf-report-dag" });
    reports.push(...(await runReports(ctx, "negativeDag", dag, 0, undefined, {})));
    ctx.release(dag);
    const cycle = snapshotOf(gridWithCycle(-3, true), {
        directed: true,
        nodeCount: GRID_WITH_CYCLE_NODES,
        label: "bf-report-cycle",
    });
    reports.push(...(await runReports(ctx, "plantedCycle", cycle, 0, undefined, {})));
    ctx.release(cycle);
    // the compare-exchange result: under maxRetries 1 every lane whose exchange fails exhausts the bound, and a lane
    // whose exchange fails exists whenever the lanes of one SIMD group load the same value before any of them
    // exchanges (the 4,096 candidates for the sink, in one round)
    const fan = snapshotOf(fanIn(4096), { directed: true, label: "bf-report-fan" });
    try {
        const run = await bellmanFordWithTuning(ctx, fan, 0, undefined, { maxRetries: 1 });
        reports.push({
            worst: ratioOf(run.retryExhaustedRounds >= 1 ? 0 : 1, 0),
            worstLabel: "fanIn4096.retryExhaustedRounds (maxRetries 1)",
            samples: 1,
        });
        reports.push(
            ...bitwiseReports("fanIn4096.dist", bitsOf(run.result.dist), bitsOf(bellmanFordOracle(fan, 0).dist)),
        );
    } catch (err) {
        if (isWebGpuGraphError(err) && (err.code === "E_VALIDATION" || err.code === "E_UNSUPPORTED")) {
            reports.push({ worst: Infinity, worstLabel: `fanIn4096.dist (${err.message})`, samples: 1 });
        } else {
            throw err;
        }
    }
    ctx.release(fan);
    return mergeReports(reports);
}
