/**
 * Triangle counting, label propagation (design 10.4; issue #422) and minimum spanning tree (issue #646) benchmarks:
 * each call wall end to end INCLUDING
 * the edge-list upload, the simple symmetric graph build and the result readback, on the seeded G(n, m) of every tier
 * (10k / 100k, 100k / 1M, 1M / 10M; the minimum spanning tree runs over the tier's weights 1..10, so ties are
 * common). The snapshot is built once per tier outside the case; `teardown` releases it, so
 * every run re-uploads, as a first call on a fresh snapshot does. Label propagation runs to its fixed point (the
 * passes are printed beside the row, because the wall time is proportional to them). No target: the crossover
 * against the CPU was measured separately, with both arms interleaved in one process, and is recorded in
 * design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md.
 */

import { labelPropagation } from "../src/algorithms/label-propagation.js";
import { minimumSpanningTree } from "../src/algorithms/mst.js";
import { triangleCount } from "../src/algorithms/triangles.js";
import { type GpuContext } from "../src/context.js";
import { randomEdges, snapshotOf, TIERS } from "./datasets.js";
import { bench, type BenchResult } from "./harness.js";

/** The triangle counting group's name. */
export const TRIANGLES_GROUP = "triangles";
/** The label propagation group's name. */
export const LABEL_PROPAGATION_GROUP = "label-propagation";
/** The minimum spanning tree group's name. */
export const MST_GROUP = "mst";

/**
 * Run the minimum spanning tree benchmarks (Boruvka over the weighted edge list, the forest read back).
 * @param ctx - the context (a hardware adapter; run.ts refuses software ones)
 * @returns the results
 */
export async function runMstBenchmarks(ctx: GpuContext): Promise<BenchResult[]> {
    const results: BenchResult[] = [];
    for (const tier of TIERS) {
        const s = snapshotOf(randomEdges(tier.nodes, tier.edges, 4223), { label: `mst/${tier.name}` });
        results.push(
            await bench(
                MST_GROUP,
                `minimumSpanningTree at ${tier.name}`,
                {
                    setup: () => s,
                    run: async (input) => (await minimumSpanningTree(ctx, input)).totalWeight,
                    teardown: (input) => {
                        ctx.release(input);
                    },
                },
                { device: ctx.device, items: tier.edges, unit: "edges" },
            ),
        );
    }
    return results;
}

/**
 * Run the triangle counting benchmarks.
 * @param ctx - the context (a hardware adapter; run.ts refuses software ones)
 * @returns the results
 */
export async function runTriangleBenchmarks(ctx: GpuContext): Promise<BenchResult[]> {
    const results: BenchResult[] = [];
    for (const tier of TIERS) {
        const s = snapshotOf(randomEdges(tier.nodes, tier.edges, 4221), { label: `triangles/${tier.name}` });
        results.push(
            await bench(
                TRIANGLES_GROUP,
                `triangleCount at ${tier.name}`,
                {
                    setup: () => s,
                    run: async (input) => {
                        const r = await triangleCount(ctx, input);
                        return r.total;
                    },
                    teardown: (input) => {
                        ctx.release(input);
                    },
                },
                { device: ctx.device, items: tier.edges, unit: "edges" },
            ),
        );
    }
    return results;
}

/**
 * Run the label propagation benchmarks.
 * @param ctx - the context (a hardware adapter; run.ts refuses software ones)
 * @returns the results
 */
export async function runLabelPropagationBenchmarks(ctx: GpuContext): Promise<BenchResult[]> {
    const results: BenchResult[] = [];
    for (const tier of TIERS) {
        const s = snapshotOf(randomEdges(tier.nodes, tier.edges, 4222), { label: `lpa/${tier.name}` });
        let passes = 0;
        results.push(
            await bench(
                LABEL_PROPAGATION_GROUP,
                `labelPropagation at ${tier.name}`,
                {
                    setup: () => s,
                    run: async (input) =>
                        await labelPropagation(ctx, input, {
                            onProgress: (done) => {
                                passes = done;
                            },
                        }),
                    teardown: (input) => {
                        ctx.release(input);
                    },
                },
                { device: ctx.device, items: tier.edges, unit: "edges" },
            ),
        );
        console.log(`  labelPropagation at ${tier.name}: ${passes} passes`);
    }
    return results;
}
