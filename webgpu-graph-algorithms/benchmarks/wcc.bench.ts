/**
 * Weakly connected components benchmarks (spec 10.4 T-9; contract 6.3): Afforest `connectedComponents` at 100k / 1M
 * and 1M / 10M, two rows per tier. The snapshot is built once per tier outside the case.
 *
 * - "core resident": the core stays uploaded across runs (the warm-up uploads it), so the row times the components
 *   kernels and the label readback -- the cost the algorithm controls. T-9 is this row: <= 100 ms at 1M / 10M
 *   (issue #469; the upload is T-1's row, so the end-to-end cost is T-1 + T-9).
 * - end to end: `teardown` releases the core after every run, so each run re-uploads it; recorded, not a target.
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
        const meta = { device: ctx.device, items: tier.nodes, unit: "nodes" } as const;
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
                meta,
            ),
            await bench(
                "wcc",
                `wcc at ${tier.name}, core resident`,
                { setup: () => s, run: (input) => connectedComponents(ctx, input) },
                meta,
            ),
        );
        ctx.release(s);
    }
    return results;
}
