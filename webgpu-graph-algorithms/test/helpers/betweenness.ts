/**
 * The measured check of the betweenness kernels (spec 11.9 item 1): the SAME check passes on the real kernels and
 * must fail on every sabotage row by at least its `minFactor`. Every sample is an error / tolerance ratio at the
 * 1e-4 score tolerance of design 9.7 (a flag that disagrees, or a driver that throws, is the maximal miss):
 * exact karate (vertex and edge, the frontier and the edge-parallel forward pass), the path's closed forms (vertex
 * and edge), a directed random graph run two sources per batch in both forward forms (so the tag, the batch
 * boundary and the gather's running sum all matter), and the overflow flag on the layered fixture and its control.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import {
    type BetweennessTuning,
    betweennessWithTuning,
    edgeBetweennessWithTuning,
} from "../../src/algorithms/betweenness.js";
import { type GpuContext } from "../../src/context.js";
import { brandesOracle } from "../oracle/betweenness.js";
import { edgeConvention, scoreError, vertexConvention } from "./centrality-check.js";
import { KARATE_EDGES, layeredEdges, pathEdges, randomEdges, snapshotOf } from "./graphs.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";

/** Design 9.7's betweenness tolerance. */
const BC_TOLERANCE = 1e-4;

/**
 * Faked limits that make the planner choose exactly `k` sources per batch.
 * @param n - the vertex count
 * @param k - the batch size
 * @returns the limits
 */
export function limitsForK(n: number, k: number): BetweennessTuning["limits"] {
    return { maxStorageBufferBindingSize: 4 * n * k, maxBufferSize: 2 ** 40 };
}

/**
 * One sample, a throw counting as the maximal miss.
 * @param label - the sample's name
 * @param measure - the error / tolerance ratio
 * @returns the report
 */
async function sample(label: string, measure: () => Promise<number>): Promise<CheckReport> {
    let worst: number;
    try {
        worst = await measure();
    } catch {
        worst = Infinity;
    }
    return { worst, worstLabel: label, samples: 1 };
}

/**
 * The vertex scores of a run against the reference.
 * @param ctx - the context
 * @param s - the snapshot
 * @param tuning - the knobs
 * @returns the ratio
 */
async function vertexRatio(ctx: GpuContext, s: GraphSnapshot, tuning: BetweennessTuning): Promise<number> {
    const got = await betweennessWithTuning(ctx, s, undefined, tuning);
    return ratioOf(scoreError(got.scores, vertexConvention(s, brandesOracle(s).vertex)), BC_TOLERANCE);
}

/**
 * The edge scores of a run against the reference.
 * @param ctx - the context
 * @param s - the snapshot
 * @param tuning - the knobs
 * @returns the ratio
 */
async function edgeRatio(ctx: GpuContext, s: GraphSnapshot, tuning: BetweennessTuning): Promise<number> {
    const got = await edgeBetweennessWithTuning(ctx, s, undefined, tuning);
    return ratioOf(scoreError(got.scores, edgeConvention(s, brandesOracle(s).perArc)), BC_TOLERANCE);
}

/**
 * The overflow flag of a one-source run against its expectation.
 * @param ctx - the context
 * @param layers - the layered fixture's depth
 * @param expected - the flag it must raise
 * @returns 0 or Infinity
 */
async function overflowRatio(ctx: GpuContext, layers: number, expected: boolean): Promise<number> {
    const s = snapshotOf(layeredEdges(4, layers));
    const got = await betweennessWithTuning(ctx, s, { sources: [0] }, {});
    return got.sigmaOverflow === expected ? 0 : Infinity;
}

/**
 * The whole check.
 * @param ctx - the context
 * @returns the merged report
 */
export async function betweennessReport(ctx: GpuContext): Promise<CheckReport> {
    const karate = snapshotOf(KARATE_EDGES);
    const path = snapshotOf(pathEdges(40));
    const directed = snapshotOf(randomEdges(60, 240, 11), { directed: true });
    const twoPerBatch = { limits: limitsForK(60, 2) };
    return mergeReports([
        await sample("karate vertex, frontier", () => vertexRatio(ctx, karate, { forward: "frontier" })),
        await sample("karate vertex, edge-parallel", () => vertexRatio(ctx, karate, { forward: "edge" })),
        await sample("karate edges", () => edgeRatio(ctx, karate, {})),
        await sample("path(40) vertex closed form", () => vertexRatio(ctx, path, {})),
        await sample("path(40) edge closed form", () => edgeRatio(ctx, path, {})),
        await sample("directed random, k = 2, frontier", () =>
            vertexRatio(ctx, directed, { ...twoPerBatch, forward: "frontier" }),
        ),
        await sample("directed random, k = 2, edge-parallel", () =>
            vertexRatio(ctx, directed, { ...twoPerBatch, forward: "edge" }),
        ),
        await sample("layered(4, 18) overflows", () => overflowRatio(ctx, 18, true)),
        await sample("layered(4, 16) does not", () => overflowRatio(ctx, 16, false)),
    ]);
}
