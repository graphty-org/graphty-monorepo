/**
 * Betweenness benchmarks (spec 10.4 T-11: 256 sampled sources at 100k / 1M in 5 s or less, karate exact in 20 ms or
 * less; design 10.3's betweenness column): wall time end to end INCLUDING the upload, as `bfs.bench.ts` does (the
 * snapshot is built once per rung outside the case and `teardown` releases it after every run). Rows:
 *
 *   betweenness exact karate                     every vertex a source, n = 34
 *   betweenness exact random 2k/8k               every vertex a source, seeded G(n, m)
 *   betweenness sampled 256 <form> at <rung>     `sources` = 256 drawn vertices of the RMAT rung, the forward body
 *                                                pinned (`frontier`, `edge`) or chosen per batch (`auto`); `edge` and
 *                                                `frontier` only at 100k / 1M
 *   edge betweenness sampled 256 at 100k/1M      the same sources, per-edge scores
 *
 * Beside every row an untimed run of the same call prints what the batch planner did (`[betweenness] <row> k=<k>
 * batches=<b> forms=<f> resident=<bytes> levels=<max> overflow=<flag>`, resident being the 16 bytes per (node,
 * source) the batch holds) and, from the timed median, the milliseconds per source, which is the unit of design 8.4's
 * cost model. The RMAT rungs are bfs.bench.ts's (2^17 x 8 and 2^20 x 10, undirected, no weight column: betweenness
 * is breadth-first).
 */

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";

import {
    type BetweennessBatchReport,
    betweennessWithTuning,
    edgeBetweennessCentrality,
    type ForwardForm,
} from "../src/algorithms/betweenness.js";
import { type GpuContext } from "../src/context.js";
import { BFS_RMAT_RUNGS } from "./bfs.bench.js";
import { type EdgeArrays, KARATE_EDGES, randomEdges, rmatEdges } from "./datasets.js";
import { bench, type BenchResult } from "./harness.js";

/** The group name. */
export const BETWEENNESS_GROUP = "betweenness";

/** T-11's sample size. */
export const SAMPLED_SOURCES = 256;

/** The seed of the RMAT rungs (bfs.bench.ts's) and of the random graph. */
const SEED = 12345;

/**
 * An undirected snapshot WITHOUT a weight column.
 * @param edges - the edge arrays
 * @param label - the snapshot label
 * @returns the snapshot
 */
function unweightedSnapshotOf(edges: EdgeArrays, label: string): GraphSnapshot {
    return fromEdgeArrays({ directed: false, nodeCount: edges.nodeCount, src: edges.src, dst: edges.dst }, { label });
}

/**
 * `count` distinct vertices spread over [0, n) by a fixed stride (the same list on every run and every card).
 * @param n - the vertex count
 * @param count - how many
 * @returns the sources
 */
export function spreadSources(n: number, count: number): number[] {
    return Array.from({ length: Math.min(n, count) }, (_, i) => Math.floor((i * n) / Math.min(n, count)));
}

/**
 * One row: an untimed run printing the planner's choices, then the timed row.
 * @param ctx - the context
 * @param name - the row name
 * @param s - the snapshot
 * @param sources - the sources, or null for every vertex
 * @param forward - the forward body, or "auto"
 * @param edges - time edge betweenness instead of vertex betweenness
 * @returns the row
 */
async function row(
    ctx: GpuContext,
    name: string,
    s: GraphSnapshot,
    sources: readonly number[] | null,
    forward: ForwardForm | "auto",
    edges = false,
): Promise<BenchResult> {
    const options = sources === null ? undefined : { sources };
    const batches: BetweennessBatchReport[] = [];
    const probe = await betweennessWithTuning(ctx, s, options, { forward, onBatch: (b) => batches.push(b) });
    ctx.release(s);
    const k = batches.length === 0 ? 0 : batches[0].sources.length;
    const forms = [...new Set(batches.map((b) => b.forward))].join("+");
    const levels = Math.max(0, ...batches.map((b) => b.levels));
    const result = await bench(
        BETWEENNESS_GROUP,
        name,
        {
            setup: () => s,
            run: (input) =>
                edges
                    ? edgeBetweennessCentrality(ctx, input, options)
                    : betweennessWithTuning(ctx, input, options, { forward }),
            teardown: (input) => {
                ctx.release(input);
            },
        },
        { device: ctx.device, items: probe.sourcesUsed, unit: "sources" },
    );
    console.log(
        `[betweenness] ${name} k=${k} batches=${batches.length} forms=${forms} resident=${16 * s.nodeCount * k} ` +
            `levels=${levels} overflow=${String(probe.sigmaOverflow)} msPerSource=${(result.medianMs / probe.sourcesUsed).toFixed(3)}`,
    );
    return result;
}

/**
 * Run the betweenness benchmarks.
 * @param ctx - the context (a hardware adapter; run.ts refuses software ones)
 * @returns the results
 */
export async function runBetweennessBenchmarks(ctx: GpuContext): Promise<BenchResult[]> {
    const results: BenchResult[] = [];
    const karate = unweightedSnapshotOf(KARATE_EDGES, "betweenness/karate");
    results.push(await row(ctx, "betweenness exact karate", karate, null, "auto"));
    const random = unweightedSnapshotOf(randomEdges(2000, 8000, SEED), "betweenness/random2k");
    results.push(await row(ctx, "betweenness exact random 2k/8k", random, null, "auto"));
    for (const rung of BFS_RMAT_RUNGS) {
        const s = unweightedSnapshotOf(rmatEdges(rung.scale, rung.edgeFactor, SEED), `betweenness/${rung.name}`);
        const sources = spreadSources(s.nodeCount, SAMPLED_SOURCES);
        const forms: readonly (ForwardForm | "auto")[] =
            rung === BFS_RMAT_RUNGS[0] ? ["auto", "frontier", "edge"] : ["auto"];
        for (const form of forms) {
            results.push(
                await row(ctx, `betweenness sampled ${SAMPLED_SOURCES} ${form} at ${rung.name}`, s, sources, form),
            );
        }
        if (rung === BFS_RMAT_RUNGS[0]) {
            results.push(
                await row(ctx, `edge betweenness sampled ${SAMPLED_SOURCES} at ${rung.name}`, s, sources, "auto", true),
            );
        }
    }
    return results;
}
