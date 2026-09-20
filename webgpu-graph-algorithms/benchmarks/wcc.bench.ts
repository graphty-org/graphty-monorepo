/**
 * Weakly connected components benchmarks (spec 10.4 T-9; contract 6.3): Afforest `connectedComponents` at 100k / 1M
 * and 1M / 10M, wall end to end INCLUDING the upload and the label readback. The snapshot is built once per tier
 * outside the case; `teardown` releases it after every run, so the next run re-uploads the core and the median is what
 * T-9 defines. Target: <= 100 ms at 1M / 10M.
 */

import { connectedComponents } from "../src/algorithms/components.js";
import { type GpuContext } from "../src/context.js";
import { randomEdges, snapshotOf, TIERS } from "./datasets.js";
import { bench, type BenchResult } from "./harness.js";

/**
 * Run the WCC benchmarks.
 * @param ctx - the context (a hardware adapter; run.ts refuses software ones)
 * @returns the results
 */
export async function runWccBenchmarks(ctx: GpuContext): Promise<BenchResult[]> {
    const results: BenchResult[] = [];
    for (const tier of TIERS) {
        if (tier.nodes < 100_000) {
            continue; // T-9 names the 100k / 1M and 1M / 10M tiers
        }
        const s = snapshotOf(randomEdges(tier.nodes, tier.edges, 12345), { label: `wcc/${tier.name}` });
        results.push(
            await bench(
                "wcc",
                `wcc at ${tier.name}`,
                {
                    setup: () => s,
                    run: (input) => connectedComponents(ctx, input),
                    teardown: (input) => {
                        ctx.release(input);
                    },
                },
                { device: ctx.device, items: tier.nodes, unit: "nodes" },
            ),
        );
    }
    return results;
}
